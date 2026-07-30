import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { parseExcelFile, detectSourceFile } from "@/lib/excel/parser";
import { inngest } from "@/inngest/client";
import { SourceFile } from "@/types";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files uploaded" },
        { status: 400 }
      );
    }

    const sessionRes = await supabaseAdmin
      .from("upload_sessions")
      .insert({
        status: "pending",
        files_uploaded: [],
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

    for (const file of files) {
      const source = detectSourceFile(file.name);
      if (!source) {
        allErrors.push({
          row: 0,
          message: `Cannot detect source file type: ${file.name}`,
          file: file.name,
        });
        continue;
      }

      const buffer = Buffer.from(await file.arrayBuffer());

      const parseResult = parseExcelFile(buffer, source);

      if (parseResult.errors.length > 0) {
        allErrors.push(
          ...parseResult.errors.map((e) => ({ ...e, file: file.name }))
        );
      }

      if (parseResult.rows.length > 0) {
        const insertData = parseResult.rows.map((row) => ({
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
            `Failed to insert rows: ${insertResult.error.message}`
          );
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

    await inngest.send({
      name: "upload.completed",
      data: { sessionId },
    });

    return NextResponse.json({
      sessionId,
      files: uploadedFiles,
      totalRows,
      errors: allErrors,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
