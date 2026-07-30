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

    const { data: logs, error } = await supabaseAdmin
      .from("processing_logs")
      .select("*")
      .eq("session_id", id)
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);

    if (!logs || logs.length === 0) {
      return NextResponse.json(
        { error: "No logs found" },
        { status: 404 }
      );
    }

    if (format === "json") {
      const jsonData = JSON.stringify(logs, null, 2);
      const headers = new Headers();
      headers.set("Content-Type", "application/json");
      headers.set(
        "Content-Disposition",
        `attachment; filename="processing-logs-${id.slice(0, 8)}.json"`
      );
      return new NextResponse(jsonData, { headers });
    }

    // Default: CSV
    const csvRows: string[] = [];
    csvRows.push("Step,Status,Duration (ms),Timestamp,Error Message,Details");

    for (const log of logs) {
      const step = `"${log.step}"`;
      const status = `"${log.status}"`;
      const duration = log.duration_ms || "";
      const timestamp = `"${new Date(log.created_at).toLocaleString("id-ID")}"`;
      const errorMsg = `"${(log.error_message || "").replace(/"/g, '""')}"`;
      const details = `"${JSON.stringify(log.details || {}).replace(/"/g, '""')}"`;

      csvRows.push(
        `${step},${status},${duration},${timestamp},${errorMsg},${details}`
      );
    }

    const csvContent = csvRows.join("\n");
    const headers = new Headers();
    headers.set("Content-Type", "text/csv; charset=utf-8");
    headers.set(
      "Content-Disposition",
      `attachment; filename="processing-logs-${id.slice(0, 8)}.csv"`
    );

    return new NextResponse(csvContent, { headers });
  } catch (error) {
    console.error("Logs download error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Download failed",
      },
      { status: 500 }
    );
  }
}
