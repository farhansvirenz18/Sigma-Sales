import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: session, error: fetchError } = await supabaseAdmin
      .from("upload_sessions")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    if (session.status === "rolled_back") {
      return NextResponse.json(
        { error: "Session already rolled back" },
        { status: 400 }
      );
    }

    if (!["completed", "failed"].includes(session.status)) {
      return NextResponse.json(
        {
          error: `Cannot rollback session with status: ${session.status}`,
        },
        { status: 400 }
      );
    }

    // 1. Fetch output files to delete from storage
    const { data: outputs } = await supabaseAdmin
      .from("output_files")
      .select("*")
      .eq("session_id", id);

    // 2. Delete files from Supabase Storage
    if (outputs && outputs.length > 0) {
      const filePaths = outputs.map((o) => o.file_path);
      const { error: storageError } = await supabaseAdmin.storage
        .from("output-files")
        .remove(filePaths);

      if (storageError) {
        console.error("Storage delete error:", storageError);
      }
    }

    // 3. Delete from output_files table
    await supabaseAdmin.from("output_files").delete().eq("session_id", id);

    // 4. Delete processing logs
    await supabaseAdmin.from("processing_logs").delete().eq("session_id", id);

    // 5. Delete raw sales data
    await supabaseAdmin.from("sales_raw").delete().eq("session_id", id);

    // 6. Update session status
    const { error: updateError } = await supabaseAdmin
      .from("upload_sessions")
      .update({
        status: "rolled_back",
        completed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      throw new Error(`Failed to update session: ${updateError.message}`);
    }

    // 7. Add rollback log
    await supabaseAdmin.from("processing_logs").insert({
      session_id: id,
      step: "rollback",
      status: "completed",
      details: {
        rolled_back_at: new Date().toISOString(),
        files_deleted: outputs?.length || 0,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Session rolled back successfully",
      filesDeleted: outputs?.length || 0,
    });
  } catch (error) {
    console.error("Rollback error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Rollback failed",
      },
      { status: 500 }
    );
  }
}
