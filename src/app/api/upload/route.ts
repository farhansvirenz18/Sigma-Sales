import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { detectSourceFile, parseExcelFileStreaming } from "@/lib/excel/parser";
import { inngest } from "@/inngest/client";
import { SourceFile } from "@/types";
import { createHash } from "crypto";

export const maxDuration = 60;

const MAX_ROWS_PER_FILE = 50000;
const CHUNK_SIZE = 500;
const STREAMING_THRESHOLD = 10 * 1024 * 1024; // 10MB

async function checkDuplicate(
  fileHash: string,
  fileName: string
): Promise<{ isDuplicate: boolean; existingSessionId?: string }> {
  const { data } = await supabaseAdmin
    .from("upload_sessions")
    .select("id, files_uploaded")
    .eq("file_hash", fileHash)
    .in("status", ["completed", "failed"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (data) {
    const files = data.files_uploaded as { name: string }[];
    if (files?.some((f) => f.name === fileName)) {
      return { isDuplicate: true, existingSessionId: data.id };
    }
  }

  return { isDuplicate: false };
}

async function cleanupOldSession(sessionId: string): Promise<void> {
  await supabaseAdmin.from("sales_raw").delete().eq("session_id", sessionId);
  await supabaseAdmin.from("output_files").delete().eq("session_id", sessionId);
  await supabaseAdmin.from("processing_logs").delete().eq("session_id", sessionId);
  await supabaseAdmin
    .from("upload_sessions")
    .update({
      status: "processing",
      valid_rows: 0,
      error_rows: 0,
      total_rows: 0,
      files_uploaded: [],
      error_summary: [],
      started_at: null,
      completed_at: null,
    })
    .eq("id", sessionId);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const sourceTypesStr = formData.get("sourceTypes") as string | null;
    const sourceTypes: Record<string, string> = sourceTypesStr
      ? JSON.parse(sourceTypesStr)
      : {};
    const forceUpsert = formData.get("forceUpsert") === "true";

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files uploaded" },
        { status: 400 }
      );
    }

    // Compute hashes and check for duplicates
    const fileHashes: string[] = [];
    let existingSessionId: string | null = null;

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const hash = createHash("sha256").update(buffer).digest("hex");
      fileHashes.push(hash);

      const dup = await checkDuplicate(hash, file.name);
      if (dup.isDuplicate) {
        if (forceUpsert && dup.existingSessionId) {
          existingSessionId = dup.existingSessionId;
          await cleanupOldSession(dup.existingSessionId);
        } else {
          return NextResponse.json(
            {
              error: `File "${file.name}" sudah pernah di-upload sebelumnya (session: ${dup.existingSessionId?.slice(0, 8)}).`,
              isDuplicate: true,
              existingSessionId: dup.existingSessionId,
              canUpsert: true,
            },
            { status: 409 }
          );
        }
      }
    }

    // Compute combined hash for the batch
    const combinedHash = createHash("sha256")
      .update(fileHashes.join("|"))
      .digest("hex");

    let sessionId: string;

    if (existingSessionId) {
      sessionId = existingSessionId;
      await supabaseAdmin
        .from("upload_sessions")
        .update({ file_hash: combinedHash })
        .eq("id", sessionId);
    } else {
      const sessionRes = await supabaseAdmin
        .from("upload_sessions")
        .insert({
          status: "processing",
          files_uploaded: [],
          file_hash: combinedHash,
        })
        .select()
        .single();

      if (sessionRes.error) {
        throw new Error(`Failed to create session: ${sessionRes.error.message}`);
      }
      sessionId = sessionRes.data.id;
    }

    const uploadedFiles: {
      name: string;
      path: string;
      row_count: number;
      source: SourceFile;
    }[] = [];
    const allErrors: { row: number; message: string; file: string }[] = [];
    let totalRows = 0;

    for (let fi = 0; fi < files.length; fi++) {
      const file = files[fi];
      const source: SourceFile =
        detectSourceFile(file.name) ||
        sourceTypes[file.name] ||
        file.name
          .replace(/\.[^.]+$/, "")
          .replace(/[^a-zA-Z0-9]/g, "_")
          .toUpperCase();

      const buffer = Buffer.from(await file.arrayBuffer());
      const useStreaming = buffer.byteLength > STREAMING_THRESHOLD;

      if (useStreaming) {
        // Streaming mode for large files
        let rowOffset = 0;
        const result = await parseExcelFileStreaming(
          buffer,
          source,
          async (chunk) => {
            const insertData = chunk.map((row) => ({
              session_id: sessionId,
              source_file: source,
              row_number: row._rowNumber as number,
              raw_data: row,
              validation_status: "pending" as const,
            }));

            const insertResult = await supabaseAdmin
              .from("sales_raw")
              .insert(insertData);

            if (insertResult.error) {
              throw new Error(
                `Failed to insert rows (chunk at row ${rowOffset}): ${insertResult.error.message}`
              );
            }
            rowOffset += chunk.length;
          },
          CHUNK_SIZE
        );

        if (result.errors.length > 0) {
          allErrors.push(
            ...result.errors.map((e) => ({ ...e, file: file.name }))
          );
        }

        totalRows += result.totalRows;
        uploadedFiles.push({
          name: file.name,
          path: `${sessionId}/${file.name}`,
          row_count: result.totalRows,
          source,
        });
      } else {
        // Regular mode for smaller files
        const { parseExcelFile } = await import("@/lib/excel/parser");
        const parseResult = parseExcelFile(buffer, source);

        if (parseResult.errors.length > 0) {
          allErrors.push(
            ...parseResult.errors.map((e) => ({ ...e, file: file.name }))
          );
        }

        if (parseResult.rows.length > MAX_ROWS_PER_FILE) {
          allErrors.push({
            row: 0,
            message: `File "${file.name}" memiliki ${parseResult.rows.length} baris (maksimum ${MAX_ROWS_PER_FILE}). File dipotong.`,
            file: file.name,
          });
          parseResult.rows.splice(MAX_ROWS_PER_FILE);
        }

        if (parseResult.rows.length > 0) {
          for (let i = 0; i < parseResult.rows.length; i += CHUNK_SIZE) {
            const chunk = parseResult.rows.slice(i, i + CHUNK_SIZE);
            const insertData = chunk.map((row) => ({
              session_id: sessionId,
              source_file: source,
              row_number: row._rowNumber as number,
              raw_data: row,
              validation_status: "pending" as const,
            }));

            const insertResult = await supabaseAdmin
              .from("sales_raw")
              .insert(insertData);

            if (insertResult.error) {
              throw new Error(
                `Failed to insert rows (chunk ${Math.floor(i / CHUNK_SIZE) + 1}): ${insertResult.error.message}`
              );
            }
          }

          uploadedFiles.push({
            name: file.name,
            path: `${sessionId}/${file.name}`,
            row_count: parseResult.rows.length,
            source,
          });
          totalRows += parseResult.rows.length;
        }
      }
    }

    await supabaseAdmin
      .from("upload_sessions")
      .update({
        files_uploaded: uploadedFiles,
        total_rows: totalRows,
        error_summary: allErrors,
      })
      .eq("id", sessionId);

    // Send event to Inngest for async processing
    await inngest.send({
      name: "upload.completed",
      data: { sessionId },
    });

    return NextResponse.json({
      sessionId,
      files: uploadedFiles,
      totalRows,
      errorRows: allErrors.length,
      errors: allErrors,
      status: "processing",
      isUpsert: !!existingSessionId,
      message: existingSessionId
        ? "Data lama diupdate, file sedang diproses ulang."
        : "File uploaded. Processing in background via Inngest.",
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
