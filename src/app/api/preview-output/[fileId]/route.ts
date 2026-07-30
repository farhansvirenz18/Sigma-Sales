import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import * as XLSX from "xlsx";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    const { searchParams } = new URL(request.url);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const { data: outputFile, error } = await supabaseAdmin
      .from("output_files")
      .select("*")
      .eq("id", fileId)
      .single();

    if (error || !outputFile) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from(outputFile.storage_bucket)
      .download(outputFile.file_path);

    if (downloadError || !fileData) {
      throw new Error(downloadError?.message || "Failed to download file");
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const workbook = XLSX.read(buffer, {
      type: "buffer",
      cellDates: true,
      cellNF: false,
      cellText: false,
    });

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json(
        { error: "No sheets found in file" },
        { status: 400 }
      );
    }

    const sheet = workbook.Sheets[sheetName];
    const allRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: null,
      raw: false,
    });

    const columns = allRows.length > 0 ? Object.keys(allRows[0]) : [];
    const paginatedRows = allRows.slice(offset, offset + limit);

    return NextResponse.json({
      fileName: outputFile.file_name,
      fileType: outputFile.file_type,
      columns,
      rows: paginatedRows,
      totalRows: allRows.length,
      offset,
      limit,
    });
  } catch (error) {
    console.error("Preview error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Preview failed" },
      { status: 500 }
    );
  }
}
