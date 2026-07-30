"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StatsCard from "@/components/ui/StatsCard";
import Card, { CardHeader, CardContent } from "@/components/ui/Card";

interface Session {
  id: string;
  status: string;
  total_rows: number;
  valid_rows: number;
  error_rows: number;
  created_at: string;
  files_uploaded: { name: string }[];
}

interface MonthlyData {
  month: string;
  total: number;
  success: number;
}

interface Stats {
  totalSessions: number;
  totalRowsProcessed: number;
  totalErrors: number;
  successRate: number;
  completedSessions: number;
  failedSessions: number;
  rolledBackSessions: number;
  recentSessions: Session[];
  monthlyProcessing: MonthlyData[];
  platformBreakdown: Record<string, number>;
  revenue: { totalOmzet: number; totalHPP: number; profit: number };
}

function formatCurrency(val: number) {
  if (val >= 1_000_000_000)
    return `Rp ${(val / 1_000_000_000).toFixed(1)}M`;
  if (val >= 1_000_000) return `Rp ${(val / 1_000_000).toFixed(1)}jt`;
  if (val >= 1_000) return `Rp ${(val / 1_000).toFixed(0)}rb`;
  return `Rp ${val}`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const monthNames = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

function getMonthLabel(key: string) {
  const [, m] = key.split("-");
  return monthNames[parseInt(m, 10) - 1] || key;
}

const statusColors: Record<string, string> = {
  completed: "badge-success",
  failed: "badge-error",
  processing: "badge-info",
  pending: "badge-warning",
  rolled_back: "badge-purple",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-40 sm:h-48 rounded-3xl shimmer" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 sm:h-32 rounded-2xl shimmer" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="h-64 rounded-2xl shimmer" />
          <div className="h-64 rounded-2xl shimmer" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const maxMonthly = Math.max(
    ...stats.monthlyProcessing.map((m) => m.total),
    1
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Hero Header */}
      <div className="bg-gradient-hero rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-48 sm:w-64 h-48 sm:h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-36 sm:w-48 h-36 sm:h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-white/50 rounded-full -translate-x-1/2 -translate-y-1/2 blur-2xl" />
        </div>
        <div className="relative">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-blue-100 mt-2 text-sm sm:text-base">
            Selamat datang di Sigma Sales Processing System
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <Link
              href="/upload"
              className="inline-flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium backdrop-blur-sm transition-all"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload File
            </Link>
            <Link
              href="/history"
              className="inline-flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-medium backdrop-blur-sm transition-all"
            >
              Lihat History →
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 stagger-children">
        <StatsCard
          title="Total Sesi"
          value={stats.totalSessions}
          color="blue"
          icon={
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
        <StatsCard
          title="Baris Diproses"
          value={stats.totalRowsProcessed.toLocaleString("id-ID")}
          color="green"
          icon={
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
          }
        />
        <StatsCard
          title="Success Rate"
          value={`${stats.successRate}%`}
          color="purple"
          icon={
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatsCard
          title="Error Rows"
          value={stats.totalErrors.toLocaleString("id-ID")}
          color="red"
          icon={
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          }
        />
      </div>

      {/* Revenue Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 ring-1 ring-gray-900/[0.03] p-5 card-hover">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl text-white shadow-sm shadow-emerald-600/20">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Omzet</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">
                {formatCurrency(stats.revenue.totalOmzet)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 ring-1 ring-gray-900/[0.03] p-5 card-hover">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl text-white shadow-sm shadow-amber-600/20">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Sesi Selesai</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">
                {stats.completedSessions}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 ring-1 ring-gray-900/[0.03] p-5 card-hover">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-br from-red-500 to-red-600 rounded-xl text-white shadow-sm shadow-red-600/20">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Gagal / Dibatalkan</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">
                {stats.failedSessions + stats.rolledBackSessions}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Monthly Processing Chart */}
        <Card>
          <CardHeader>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">
              Aktivitas Pemrosesan
            </h2>
            <p className="text-xs sm:text-sm text-gray-500">6 bulan terakhir</p>
          </CardHeader>
          <CardContent>
            {stats.monthlyProcessing.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                Belum ada data
              </p>
            ) : (
              <div className="space-y-3">
                {stats.monthlyProcessing.map((item) => (
                  <div key={item.month} className="flex items-center space-x-3">
                    <span className="text-xs font-medium text-gray-500 w-8 flex-shrink-0">
                      {getMonthLabel(item.month)}
                    </span>
                    <div className="flex-1 h-7 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-primary rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-2.5"
                        style={{
                          width: `${Math.max((item.total / maxMonthly) * 100, 10)}%`,
                        }}
                      >
                        <span className="text-[10px] font-bold text-white drop-shadow-sm">
                          {item.total}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 w-6 text-right flex-shrink-0">
                      {item.success}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Platform Breakdown */}
        <Card>
          <CardHeader>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">
              Platform Breakdown
            </h2>
            <p className="text-xs sm:text-sm text-gray-500">Distribusi data per sumber</p>
          </CardHeader>
          <CardContent>
            {Object.keys(stats.platformBreakdown).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                Belum ada data
              </p>
            ) : (
              <div className="space-y-4">
                {Object.entries(stats.platformBreakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([platform, count]) => {
                    const total = Object.values(stats.platformBreakdown).reduce(
                      (a, b) => a + b,
                      0
                    );
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    const colors: Record<string, string> = {
                      SALES_DAILY: "bg-blue-500",
                      SALES_MP: "bg-purple-500",
                      SALES_PRODUK: "bg-amber-500",
                    };
                    const labels: Record<string, string> = {
                      SALES_DAILY: "Sales Daily",
                      SALES_MP: "Marketplace",
                      SALES_PRODUK: "Sales Produk",
                    };
                    return (
                      <div key={platform}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center space-x-2">
                            <div
                              className={`w-2.5 h-2.5 rounded-full ${colors[platform] || "bg-gray-400"}`}
                            />
                            <span className="text-sm font-medium text-gray-700">
                              {labels[platform] || platform}
                            </span>
                          </div>
                          <span className="text-xs sm:text-sm text-gray-500">
                            {count.toLocaleString("id-ID")} <span className="text-gray-400">({pct}%)</span>
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ease-out ${colors[platform] || "bg-gray-400"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions + Recent Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">
              Quick Actions
            </h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Link
                href="/upload"
                className="flex items-center space-x-4 p-3.5 rounded-xl hover:bg-blue-50 transition-all group"
              >
                <div className="p-2.5 bg-blue-100 rounded-xl text-blue-600 group-hover:bg-blue-200 group-hover:scale-105 transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Upload File Excel
                  </p>
                  <p className="text-xs text-gray-500">
                    Import 3 file sales sekaligus
                  </p>
                </div>
              </Link>
              <Link
                href="/history"
                className="flex items-center space-x-4 p-3.5 rounded-xl hover:bg-gray-50 transition-all group"
              >
                <div className="p-2.5 bg-gray-100 rounded-xl text-gray-600 group-hover:bg-gray-200 group-hover:scale-105 transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    View History
                  </p>
                  <p className="text-xs text-gray-500">
                    Lihat riwayat upload dan hasil
                  </p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Sessions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                  Sesi Terakhir
                </h2>
                <p className="text-xs sm:text-sm text-gray-500">5 sesi terbaru</p>
              </div>
              <Link
                href="/history"
                className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Lihat Semua →
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {stats.recentSessions.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-400">Belum ada sesi upload</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {stats.recentSessions.map((session) => (
                  <Link
                    key={session.id}
                    href={`/results/${session.id}`}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-all group"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-gray-100 group-hover:bg-blue-50 flex items-center justify-center flex-shrink-0 transition-colors">
                        <span className="text-xs font-bold text-gray-500 group-hover:text-blue-600 transition-colors">
                          {session.files_uploaded?.[0]?.name?.slice(0, 2)?.toUpperCase() || "?"}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate font-mono">
                          {session.id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatDate(session.created_at)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`badge text-xs flex-shrink-0 ${
                        statusColors[session.status] || "badge-gray"
                      }`}
                    >
                      {session.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
