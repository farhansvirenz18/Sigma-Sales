import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [
      sessionsRes,
      rowsRes,
      completedRes,
      failedRes,
      rolledBackRes,
      recentRes,
      platformRes,
    ] = await Promise.all([
      supabaseAdmin
        .from("upload_sessions")
        .select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("sales_raw")
        .select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("upload_sessions")
        .select("id", { count: "exact", head: true })
        .eq("status", "completed"),
      supabaseAdmin
        .from("upload_sessions")
        .select("id", { count: "exact", head: true })
        .eq("status", "failed"),
      supabaseAdmin
        .from("upload_sessions")
        .select("id", { count: "exact", head: true })
        .eq("status", "rolled_back"),
      supabaseAdmin
        .from("upload_sessions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5),
      supabaseAdmin.from("sales_raw").select("source_file"),
    ]);

    const totalSessions = sessionsRes.count || 0;
    const totalRows = rowsRes.count || 0;
    const completedSessions = completedRes.count || 0;
    const failedSessions = failedRes.count || 0;
    const rolledBackSessions = rolledBackRes.count || 0;
    const pendingSessions = totalSessions - completedSessions - failedSessions - rolledBackSessions;
    const successRate =
      totalSessions > 0
        ? Math.round((completedSessions / totalSessions) * 100)
        : 0;

    const totalErrors =
      (await supabaseAdmin
        .from("sales_raw")
        .select("id", { count: "exact", head: true })
        .eq("validation_status", "error")).count || 0;

    // Platform breakdown
    const platformCounts: Record<string, number> = {};
    for (const row of platformRes.data || []) {
      const src = row.source_file || "UNKNOWN";
      platformCounts[src] = (platformCounts[src] || 0) + 1;
    }

    // Revenue: fetch completed sessions' valid rows to sum omzet
    const completedSessionIds = (await supabaseAdmin
      .from("upload_sessions")
      .select("id")
      .eq("status", "completed")
    ).data?.map((s: { id: string }) => s.id) || [];

    let totalOmzet = 0;
    if (completedSessionIds.length > 0) {
      const { data: validRows } = await supabaseAdmin
        .from("sales_raw")
        .select("raw_data")
        .in("session_id", completedSessionIds)
        .eq("validation_status", "valid");

      totalOmzet = (validRows || []).reduce((sum: number, row: { raw_data: Record<string, unknown> }) => {
        const amount = Number(row.raw_data?.Totalperline || row.raw_data?.Subtotal || 0);
        return sum + amount;
      }, 0);
    }

    const monthlyData = await calculateMonthlyStats();

    return NextResponse.json({
      totalSessions,
      totalRowsProcessed: totalRows,
      totalErrors,
      successRate,
      completedSessions,
      failedSessions,
      rolledBackSessions,
      pendingSessions,
      recentSessions: recentRes.data || [],
      monthlyProcessing: monthlyData,
      platformBreakdown: platformCounts,
      statusBreakdown: [
        { name: "Selesai", value: completedSessions, color: "#10b981" },
        { name: "Gagal", value: failedSessions, color: "#ef4444" },
        { name: "Dibatalkan", value: rolledBackSessions, color: "#8b5cf6" },
        { name: "Menunggu", value: pendingSessions > 0 ? pendingSessions : 0, color: "#f59e0b" },
      ],
      revenue: {
        totalOmzet,
        totalHPP: 0,
        profit: totalOmzet,
      },
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch stats",
      },
      { status: 500 }
    );
  }
}

async function calculateMonthlyStats() {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { data } = await supabaseAdmin
    .from("upload_sessions")
    .select("created_at, status")
    .gte("created_at", sixMonthsAgo.toISOString())
    .order("created_at");

  const monthCounts: Record<string, { total: number; success: number; error: number }> = {};

  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthCounts[key] = { total: 0, success: 0, error: 0 };
  }

  for (const session of data || []) {
    const date = new Date(session.created_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (monthCounts[key] !== undefined) {
      monthCounts[key].total++;
      if (session.status === "completed") {
        monthCounts[key].success++;
      } else if (session.status === "failed") {
        monthCounts[key].error++;
      }
    }
  }

  return Object.entries(monthCounts).map(([month, counts]) => ({
    month,
    ...counts,
  }));
}
