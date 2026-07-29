import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;

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

    if (downloadError) {
      throw new Error(downloadError.message);
    }

    const headers = new Headers();
    headers.set(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    headers.set(
      "Content-Disposition",
      `attachment; filename="${outputFile.file_name}"`
    );

    return new NextResponse(fileData, { headers });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Download failed" },
      { status: 500 }
    );
  }
}
