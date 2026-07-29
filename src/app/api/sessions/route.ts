import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status");

    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from("upload_sessions")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      sessions: data,
      total: count,
      page,
      limit,
      totalPages: count ? Math.ceil(count / limit) : 0,
    });
  } catch (error) {
    console.error("Fetch sessions error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch" },
      { status: 500 }
    );
  }
}
