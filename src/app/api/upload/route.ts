import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { parseExcelFile, detectSourceFile } from "@/lib/excel/parser";
import { validateAllRows } from "@/lib/excel/validator";
import {
  loadTransformContext,
  applyFinanceTransforms,
  applyMarketingTransforms,
} from "@/lib/excel/mapper";
import { generateFinanceExcel, generateMarketingExcel } from "@/lib/excel/generator";
import { FinanceRow, MarketingRow, SourceFile } from "@/types";
import { createHash } from "crypto";

export const maxDuration = 60;

const MAX_ROWS_PER_FILE = 50000;
const CHUNK_SIZE = 500;

async function computeFileHash(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return createHash("sha256").update(buffer).digest("hex");
}

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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const sourceTypesStr = formData.get("sourceTypes") as string | null;
    const sourceTypes: Record<string, string> = sourceTypesStr
      ? JSON.parse(sourceTypesStr)
      : {};

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files uploaded" },
        { status: 400 }
      );
    }

    // Compute hashes and check for duplicates
    const fileHashes: string[] = [];
    for (const file of files) {
      const hash = await computeFileHash(file);
      fileHashes.push(hash);

      const dup = await checkDuplicate(hash, file.name);
      if (dup.isDuplicate) {
        return NextResponse.json(
          {
            error: `File "${file.name}" sudah pernah di-upload sebelumnya (session: ${dup.existingSessionId?.slice(0, 8)}). Gunakan file berbeda atau rename file.`,
            isDuplicate: true,
            existingSessionId: dup.existingSessionId,
          },
          { status: 409 }
        );
      }
    }

    // Compute combined hash for the batch
    const combinedHash = createHash("sha256")
      .update(fileHashes.join("|"))
      .digest("hex");

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

    const sessionId = sessionRes.data.id;
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
      let source: SourceFile = detectSourceFile(file.name) || sourceTypes[file.name] || file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();

      const buffer = Buffer.from(await file.arrayBuffer());
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
        // Chunked insert
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

    await supabaseAdmin
      .from("upload_sessions")
      .update({
        files_uploaded: uploadedFiles,
        total_rows: totalRows,
        error_summary: allErrors,
      })
      .eq("id", sessionId);

    await supabaseAdmin.from("processing_logs").insert({
      session_id: sessionId,
      step: "validation",
      status: "started",
      details: {},
    });

    const { validCount, errorCount } = await validateAllRows(sessionId);

    await supabaseAdmin.from("processing_logs").insert({
      session_id: sessionId,
      step: "validation",
      status: "completed",
      details: { valid: validCount, errors: errorCount },
    });

    await supabaseAdmin
      .from("upload_sessions")
      .update({ valid_rows: validCount, error_rows: errorCount })
      .eq("id", sessionId);

    if (validCount === 0) {
      await supabaseAdmin
        .from("upload_sessions")
        .update({ status: "failed", completed_at: new Date().toISOString() })
        .eq("id", sessionId);

      return NextResponse.json({
        sessionId,
        files: uploadedFiles,
        totalRows,
        validRows: 0,
        errorRows: errorCount,
        errors: allErrors,
        status: "failed",
        message: "No valid rows to process",
      });
    }

    await supabaseAdmin.from("processing_logs").insert({
      session_id: sessionId,
      step: "transform",
      status: "started",
      details: {},
    });

    const ctx = await loadTransformContext();

    const { data: validRows } = await supabaseAdmin
      .from("sales_raw")
      .select("id, raw_data, source_file")
      .eq("session_id", sessionId)
      .eq("validation_status", "valid");

    const financeData = applyFinanceTransforms(validRows || [], ctx);
    const marketingData = applyMarketingTransforms(validRows || [], ctx);

    await supabaseAdmin.from("processing_logs").insert({
      session_id: sessionId,
      step: "transform",
      status: "completed",
      details: { financeRows: financeData.length, marketingRows: marketingData.length },
    });

    await supabaseAdmin.from("processing_logs").insert({
      session_id: sessionId,
      step: "generate",
      status: "started",
      details: {},
    });

    const financePath = await generateFinanceExcel(
      financeData as unknown as FinanceRow[],
      sessionId
    );

    const marketingPath = await generateMarketingExcel(
      marketingData as unknown as MarketingRow[],
      sessionId
    );

    await supabaseAdmin.from("processing_logs").insert({
      session_id: sessionId,
      step: "generate",
      status: "completed",
      details: { financePath, marketingPath },
    });

    await supabaseAdmin
      .from("upload_sessions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    await supabaseAdmin.from("processing_logs").insert({
      session_id: sessionId,
      step: "complete",
      status: "completed",
      details: {
        validRows: validCount,
        financeRows: financeData.length,
        marketingRows: marketingData.length,
      },
    });

    return NextResponse.json({
      sessionId,
      files: uploadedFiles,
      totalRows,
      validRows: validCount,
      errorRows: errorCount,
      errors: allErrors,
      status: "completed",
      financeRows: financeData.length,
      marketingRows: marketingData.length,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
