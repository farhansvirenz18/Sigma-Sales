import { NextRequest, NextResponse } from "next/server";
import { parseExcelFile, detectSourceFile } from "@/lib/excel/parser";
import { loadTransformContext, applyTransform } from "@/lib/excel/mapper";
import { ColumnMapping } from "@/types";

interface PreviewRequest {
  files: { name: string; data: string }[];
  mappings?: {
    source_file: string;
    source_column: string;
    target_table: string;
    target_column: string;
    transform_rule: Record<string, unknown>;
  }[];
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PreviewRequest;

    if (!body.files || body.files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    const ctx = await loadTransformContext();
    const previewResults: Record<
      string,
      {
        source: string;
        columns: string[];
        rawRows: Record<string, unknown>[];
        financeRows: Record<string, unknown>[];
        marketingRows: Record<string, unknown>[];
      }
    > = {};

    for (const fileInfo of body.files) {
      const buffer = Buffer.from(fileInfo.data, "base64");
      const source = detectSourceFile(fileInfo.name);

      if (!source) continue;

      const parseResult = parseExcelFile(buffer, source);
      const previewRows = parseResult.rows.slice(0, 10);

      // Use custom mappings if provided, otherwise use DB mappings
      let financeMappings: ColumnMapping[];
      let marketingMappings: ColumnMapping[];

      if (body.mappings && body.mappings.length > 0) {
        financeMappings = body.mappings
          .filter(
            (m) => m.target_table === "finance" && m.source_file === source
          )
          .map((m) => ({
            id: 0,
            source_file: m.source_file as ColumnMapping["source_file"],
            source_column: m.source_column,
            target_table: "finance" as const,
            target_column: m.target_column,
            transform_rule: m.transform_rule as unknown as ColumnMapping["transform_rule"],
            is_required: false,
            default_value: null,
            created_at: "",
          }));

        marketingMappings = body.mappings
          .filter(
            (m) => m.target_table === "marketing" && m.source_file === source
          )
          .map((m) => ({
            id: 0,
            source_file: m.source_file as ColumnMapping["source_file"],
            source_column: m.source_column,
            target_table: "marketing" as const,
            target_column: m.target_column,
            transform_rule: m.transform_rule as unknown as ColumnMapping["transform_rule"],
            is_required: false,
            default_value: null,
            created_at: "",
          }));
      } else {
        financeMappings = ctx.mappings.filter(
          (m) => m.target_table === "finance" && m.source_file === source
        );
        marketingMappings = ctx.mappings.filter(
          (m) => m.target_table === "marketing" && m.source_file === source
        );
      }

      const financeRows = previewRows.map((row) => {
        const financeRow: Record<string, unknown> = {};
        for (const mapping of financeMappings) {
          financeRow[mapping.target_column] = applyTransform(
            row,
            mapping,
            ctx
          );
        }
        return financeRow;
      });

      const marketingRows = previewRows.map((row) => {
        const marketingRow: Record<string, unknown> = {};
        for (const mapping of marketingMappings) {
          marketingRow[mapping.target_column] = applyTransform(
            row,
            mapping,
            ctx
          );
        }
        return marketingRow;
      });

      previewResults[fileInfo.name] = {
        source,
        columns: Object.keys(previewRows[0] || {}),
        rawRows: previewRows,
        financeRows,
        marketingRows,
      };
    }

    return NextResponse.json({ previews: previewResults });
  } catch (error) {
    console.error("Preview error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Preview failed",
      },
      { status: 500 }
    );
  }
}
