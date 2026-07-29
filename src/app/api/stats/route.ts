import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  try {
    const [sessionsRes, rowsRes, recentRes] = await Promise.all([
      supabaseAdmin
        .from("upload_sessions")
        .select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("sales_raw")
        .select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("upload_sessions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const totalSessions = sessionsRes.count || 0;
    const totalRows = rowsRes.count || 0;

    const monthlyData = await calculateMonthlyStats();

    return NextResponse.json({
      totalSessions,
      totalRowsProcessed: totalRows,
      recentSessions: recentRes.data || [],
      monthlyProcessing: monthlyData,
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch stats" },
      { status: 500 }
    );
  }
}

async function calculateMonthlyStats() {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { data } = await supabaseAdmin
    .from("upload_sessions")
    .select("created_at")
    .gte("created_at", sixMonthsAgo.toISOString())
    .order("created_at");

  const monthCounts: Record<string, number> = {};

  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthCounts[key] = 0;
  }

  for (const session of data || []) {
    const date = new Date(session.created_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (monthCounts[key] !== undefined) {
      monthCounts[key]++;
    }
  }

  return Object.entries(monthCounts).map(([month, count]) => ({
    month,
    count,
  }));
}
