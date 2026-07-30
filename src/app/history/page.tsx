"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import Card, { CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface Session {
  id: string;
  status: string;
  total_rows: number;
  valid_rows: number;
  error_rows: number;
  created_at: string;
  files_uploaded: { name: string }[];
}

const statusColors: Record<string, string> = {
  completed: "badge-success",
  failed: "badge-error",
  processing: "badge-info",
  pending: "badge-warning",
  rolled_back: "badge-purple",
};

const statusLabels: Record<string, string> = {
  completed: "Selesai",
  failed: "Gagal",
  processing: "Proses",
  pending: "Menunggu",
  rolled_back: "Dibatalkan",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const statusOptions = [
  { value: "", label: "Semua Status" },
  { value: "completed", label: "Selesai" },
  { value: "failed", label: "Gagal" },
  { value: "processing", label: "Proses" },
  { value: "pending", label: "Menunggu" },
  { value: "rolled_back", label: "Dibatalkan" },
];

export default function HistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: "10",
        });
        if (statusFilter) params.set("status", statusFilter);

        const res = await fetch(`/api/sessions?${params}`);
        const data = await res.json();
        if (!cancelled) {
          setSessions(data.sessions || []);
          setTotal(data.total || 0);
          setTotalPages(data.totalPages || 1);
        }
      } catch {
        if (!cancelled) toast.error("Gagal memuat sesi");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [page, statusFilter, refreshKey]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === sessions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sessions.map((s) => s.id)));
    }
  };

  const handleBulkDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/sessions/batch-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionIds: Array.from(selected) }),
      });
      if (!res.ok) throw new Error("Delete failed");
      const data = await res.json();
      toast.success(`${data.deletedCount} sesi berhasil dihapus`);
      if (data.failedCount > 0) {
        toast.error(`${data.failedCount} sesi gagal dihapus`);
      }
      setSelected(new Set());
      setShowDelete(false);
      setRefreshKey((k) => k + 1);
    } catch {
      toast.error("Gagal menghapus sesi");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">History</h1>
          <p className="text-sm text-gray-500 mt-1">
            Riwayat upload dan pemrosesan data
          </p>
        </div>
        <Link href="/upload">
          <Button>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload Baru
          </Button>
        </Link>
      </div>

      {/* Filters + Bulk Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center space-x-3">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <span className="text-sm text-gray-500">
                {total} sesi ditemukan
              </span>
            </div>

            {selected.size > 0 && (
              <div className="flex items-center space-x-2 animate-fade-in">
                <span className="text-sm text-gray-600">
                  {selected.size} dipilih
                </span>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShowDelete(true)}
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Hapus
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 rounded-lg shimmer" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-500">Tidak ada sesi ditemukan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/50">
                    <th className="py-3 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={
                          sessions.length > 0 &&
                          selected.size === sessions.length
                        }
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      Session ID
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      Tanggal
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      Status
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">
                      Total
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">
                      Valid
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">
                      Error
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr
                      key={session.id}
                      className={`border-b border-gray-100 table-row-hover ${
                        selected.has(session.id) ? "bg-blue-50/50" : ""
                      }`}
                    >
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selected.has(session.id)}
                          onChange={() => toggleSelect(session.id)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          href={`/results/${session.id}`}
                          className="font-mono text-sm text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          {session.id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {formatDate(session.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`badge ${
                            statusColors[session.status] || "badge-gray"
                          }`}
                        >
                          {statusLabels[session.status] || session.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-gray-700">
                        {session.total_rows.toLocaleString("id-ID")}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-600 font-medium">
                        {session.valid_rows.toLocaleString("id-ID")}
                      </td>
                      <td className="py-3 px-4 text-right text-red-600 font-medium">
                        {session.error_rows.toLocaleString("id-ID")}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Link
                          href={`/results/${session.id}`}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium hover:underline"
                        >
                          Detail →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Halaman {page} dari {totalPages}
          </p>
          <div className="flex space-x-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              ← Sebelumnya
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Selanjutnya →
            </Button>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={showDelete}
        title={`Hapus ${selected.size} Sesi?`}
        message="Semua data terkait (file output, log, data mentah) akan dihapus permanen. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Ya, Hapus Semua"
        cancelLabel="Batal"
        variant="danger"
        onConfirm={handleBulkDelete}
        onCancel={() => setShowDelete(false)}
        loading={deleting}
      />
    </div>
  );
}
