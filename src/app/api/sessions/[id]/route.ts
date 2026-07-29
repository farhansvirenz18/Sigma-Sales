import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: session, error: sessionError } = await supabaseAdmin
      .from("upload_sessions")
      .select("*")
      .eq("id", id)
      .single();

    if (sessionError) {
      throw new Error(sessionError.message);
    }

    const { data: outputs, error: outputsError } = await supabaseAdmin
      .from("output_files")
      .select("*")
      .eq("session_id", id);

    if (outputsError) {
      throw new Error(outputsError.message);
    }

    const { data: logs, error: logsError } = await supabaseAdmin
      .from("processing_logs")
      .select("*")
      .eq("session_id", id)
      .order("created_at", { ascending: true });

    if (logsError) {
      throw new Error(logsError.message);
    }

    const { data: errorRows } = await supabaseAdmin
      .from("sales_raw")
      .select("id, source_file, row_number, validation_errors")
      .eq("session_id", id)
      .eq("validation_status", "error")
      .limit(50);

    return NextResponse.json({
      session,
      outputs: outputs || [],
      logs: logs || [],
      errorRows: errorRows || [],
    });
  } catch (error) {
    console.error("Fetch session detail error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch" },
      { status: 500 }
    );
  }
}
