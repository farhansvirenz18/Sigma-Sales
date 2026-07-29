"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Card, { CardHeader, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { UploadSession } from "@/types";

interface SessionsResponse {
  sessions: UploadSession[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function HistoryPage() {
  const [data, setData] = useState<SessionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
      });
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/sessions?${params}`);
      const result = await res.json();
      setData(result);
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSessions();
  }, [fetchSessions]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: "bg-green-100 text-green-700",
      failed: "bg-red-100 text-red-700",
      processing: "bg-blue-100 text-blue-700",
      pending: "bg-yellow-100 text-yellow-700",
      validating: "bg-purple-100 text-purple-700",
      rolled_back: "bg-gray-100 text-gray-700",
    };
    return styles[status] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">History</h1>
          <p className="text-gray-600 mt-1">Riwayat upload dan pemrosesan data</p>
        </div>
        <Link href="/upload">
          <Button>Upload Baru</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Status</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="processing">Processing</option>
              <option value="pending">Pending</option>
              <option value="rolled_back">Rolled Back</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : data && data.sessions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      Session ID
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      Tanggal
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      Status
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                      Total Rows
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                      Valid
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                      Errors
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.sessions.map((session) => (
                    <tr
                      key={session.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4">
                        <span className="text-sm font-mono text-gray-900">
                          {session.id.slice(0, 8)}...
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(session.created_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(
                            session.status
                          )}`}
                        >
                          {session.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-gray-900">
                        {session.total_rows}
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-green-600">
                        {session.valid_rows}
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-red-600">
                        {session.error_rows}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Link href={`/results/${session.id}`}>
                          <Button variant="ghost" size="sm">
                            Detail
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">
              Belum ada riwayat upload
            </p>
          )}
        </CardContent>
      </Card>

      {data && data.totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-600">
            Page {page} of {data.totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page === data.totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
