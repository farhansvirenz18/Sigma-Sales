"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Card, { CardHeader, CardContent } from "@/components/ui/Card";
import StatsCard from "@/components/ui/StatsCard";
import ProgressBar from "@/components/ui/ProgressBar";
import { DashboardStats } from "@/types";
import { formatNumber } from "@/lib/utils/date";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/stats");
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Selamat datang di Sigma Sales Processing System
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard
          title="Total Sessions"
          value={stats?.totalSessions || 0}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
        <StatsCard
          title="Total Rows Processed"
          value={formatNumber(stats?.totalRowsProcessed || 0)}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
          }
        />
        <StatsCard
          title="Error Rows"
          value={stats?.totalErrors || 0}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link
                href="/upload"
                className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <div className="p-2 bg-blue-600 rounded-lg text-white mr-4">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Upload File Excel</p>
                  <p className="text-sm text-gray-600">Import 3 file sales sekaligus</p>
                </div>
              </Link>
              <Link
                href="/history"
                className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="p-2 bg-gray-600 rounded-lg text-white mr-4">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">View History</p>
                  <p className="text-sm text-gray-600">Lihat riwayat upload dan hasil</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Recent Sessions</h2>
          </CardHeader>
          <CardContent>
            {stats?.recentSessions && stats.recentSessions.length > 0 ? (
              <div className="space-y-3">
                {stats.recentSessions.map((session) => (
                  <Link
                    key={session.id}
                    href={`/results/${session.id}`}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Session {session.id.slice(0, 8)}...
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(session.created_at).toLocaleDateString("id-ID")}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        session.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : session.status === "failed"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {session.status}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">
                Belum ada sesi upload
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Processing Activity</h2>
        </CardHeader>
        <CardContent>
          {stats?.monthlyProcessing && stats.monthlyProcessing.length > 0 ? (
            <div className="space-y-4">
              {stats.monthlyProcessing.map((item) => (
                <div key={item.month} className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600 w-20">{item.month}</span>
                  <div className="flex-1">
                    <ProgressBar
                      value={item.count}
                      max={Math.max(...stats.monthlyProcessing.map((m) => m.count), 1)}
                      showLabel={false}
                      size="sm"
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-10 text-right">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">Belum ada data</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
