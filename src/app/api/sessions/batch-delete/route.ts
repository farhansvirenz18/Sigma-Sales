import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { sessionIds } = (await request.json()) as {
      sessionIds: string[];
    };

    if (!sessionIds || !Array.isArray(sessionIds) || sessionIds.length === 0) {
      return NextResponse.json(
        { error: "No session IDs provided" },
        { status: 400 }
      );
    }

    let deletedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const id of sessionIds) {
      try {
        // 1. Fetch output files to delete from storage
        const { data: outputs } = await supabaseAdmin
          .from("output_files")
          .select("file_path")
          .eq("session_id", id);

        // 2. Delete files from storage
        if (outputs && outputs.length > 0) {
          const filePaths = outputs.map((o) => o.file_path);
          await supabaseAdmin.storage.from("output-files").remove(filePaths);
        }

        // 3. Delete from tables (order matters due to FK)
        await supabaseAdmin.from("output_files").delete().eq("session_id", id);
        await supabaseAdmin
          .from("processing_logs")
          .delete()
          .eq("session_id", id);
        await supabaseAdmin.from("sales_raw").delete().eq("session_id", id);
        await supabaseAdmin.from("upload_sessions").delete().eq("id", id);

        deletedCount++;
      } catch (err) {
        failedCount++;
        errors.push(
          `Session ${id.slice(0, 8)}: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      deletedCount,
      failedCount,
      errors,
    });
  } catch (error) {
    console.error("Batch delete error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Batch delete failed",
      },
      { status: 500 }
    );
  }
}
