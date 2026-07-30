import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get("format") || "csv";

    const { data: errorRows, error } = await supabaseAdmin
      .from("sales_raw")
      .select("source_file, row_number, raw_data, validation_errors")
      .eq("session_id", id)
      .eq("validation_status", "error")
      .order("row_number", { ascending: true });

    if (error) throw new Error(error.message);

    if (!errorRows || errorRows.length === 0) {
      return NextResponse.json(
        { error: "No error rows found" },
        { status: 404 }
      );
    }

    if (format === "json") {
      const jsonData = JSON.stringify(
        errorRows.map((r) => ({
          source_file: r.source_file,
          row_number: r.row_number,
          raw_data: r.raw_data,
          validation_errors: r.validation_errors,
        })),
        null,
        2
      );
      const headers = new Headers();
      headers.set("Content-Type", "application/json");
      headers.set(
        "Content-Disposition",
        `attachment; filename="error-report-${id.slice(0, 8)}.json"`
      );
      return new NextResponse(jsonData, { headers });
    }

    // CSV format
    const csvRows: string[] = [];
    csvRows.push("Source File,Row Number,Field,Error Message,Raw Data Summary");

    for (const row of errorRows) {
      const errors = Array.isArray(row.validation_errors)
        ? row.validation_errors
        : [];
      const rawSummary = Object.entries(row.raw_data as Record<string, unknown>)
        .slice(0, 5)
        .map(([k, v]) => `${k}=${String(v ?? "").slice(0, 30)}`)
        .join("; ");

      if (errors.length === 0) {
        csvRows.push(
          `"${row.source_file}",${row.row_number},"-","Unknown error","${rawSummary.replace(/"/g, '""')}"`
        );
      } else {
        for (const err of errors) {
          const e = err as { field?: string; message?: string };
          csvRows.push(
            `"${row.source_file}",${row.row_number},"${(e.field || "").replace(/"/g, '""')}","${(e.message || "").replace(/"/g, '""')}","${rawSummary.replace(/"/g, '""')}"`
          );
        }
      }
    }

    const csvContent = csvRows.join("\n");
    const headers = new Headers();
    headers.set("Content-Type", "text/csv; charset=utf-8");
    headers.set(
      "Content-Disposition",
      `attachment; filename="error-report-${id.slice(0, 8)}.csv"`
    );

    return new NextResponse(csvContent, { headers });
  } catch (error) {
    console.error("Error report download error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Download failed",
      },
      { status: 500 }
    );
  }
}
