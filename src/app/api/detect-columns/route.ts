import { NextRequest, NextResponse } from "next/server";
import { parseExcelFile, detectSourceFile } from "@/lib/excel/parser";

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

    const detectedFiles: {
      name: string;
      source: string | null;
      columns: string[];
      sampleData: Record<string, unknown>[];
      rowCount: number;
    }[] = [];

    for (const file of files) {
      const source = detectSourceFile(file.name);
      const buffer = Buffer.from(await file.arrayBuffer());
      const parseResult = parseExcelFile(buffer, source || "SALES_DAILY");

      const columns =
        parseResult.rows.length > 0
          ? Object.keys(parseResult.rows[0]).filter(
              (k) => !k.startsWith("_")
            )
          : [];

      const sampleData = parseResult.rows.slice(0, 3).map((row) => {
        const cleaned: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(row)) {
          if (!key.startsWith("_")) {
            cleaned[key] = value;
          }
        }
        return cleaned;
      });

      detectedFiles.push({
        name: file.name,
        source,
        columns,
        sampleData,
        rowCount: parseResult.rows.length,
      });
    }

    return NextResponse.json({ files: detectedFiles });
  } catch (error) {
    console.error("Detect columns error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Detect failed" },
      { status: 500 }
    );
  }
}
