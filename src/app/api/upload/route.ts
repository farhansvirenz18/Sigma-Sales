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

export const maxDuration = 60;

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

    const sessionRes = await supabaseAdmin
      .from("upload_sessions")
      .insert({
        status: "processing",
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
      let source = detectSourceFile(file.name);
      if (!source && sourceTypes[file.name]) {
        source = sourceTypes[file.name] as SourceFile;
      }
      if (!source) {
        allErrors.push({
          row: 0,
          message: `Cannot detect source file type: ${file.name}. Provide sourceTypes mapping.`,
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
