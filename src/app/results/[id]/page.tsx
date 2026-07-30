"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Card, { CardHeader, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface OutputFile {
  id: string;
  file_type: string;
  file_name: string;
  file_size: number | null;
  row_count: number | null;
}

interface ProcessingLog {
  id: number;
  step: string;
  status: string;
  details: Record<string, unknown>;
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
}

interface ErrorRow {
  id: number;
  source_file: string;
  row_number: number;
  validation_errors: unknown;
}

interface SessionData {
  session: {
    id: string;
    status: string;
    total_rows: number;
    valid_rows: number;
    error_rows: number;
    files_uploaded: { name: string; source: string; row_count: number }[];
    created_at: string;
    completed_at: string | null;
  };
  outputs: OutputFile[];
  logs: ProcessingLog[];
  errorRows: ErrorRow[];
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
  processing: "Memproses",
  pending: "Menunggu",
  rolled_back: "Dibatalkan",
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [data, setData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRollback, setShowRollback] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "errors" | "logs">(
    "overview"
  );
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) toast.error("Gagal memuat data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [sessionId, refreshKey]);

  // Polling
  useEffect(() => {
    if (!data) return;
    if (["processing", "pending", "validating"].includes(data.session.status)) {
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/sessions/${sessionId}`);
          if (res.ok) {
            const json = await res.json();
            setData(json);
          }
        } catch {
          // ignore polling errors
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [data, sessionId]);

  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      const res = await fetch(`/api/download/${fileId}`);
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${fileName}`);
    } catch {
      toast.error("Gagal download file");
    }
  };

  const handleRollback = async () => {
    setRollingBack(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/rollback`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Rollback failed");
      }
      toast.success("Sesi berhasil dibatalkan");
      setShowRollback(false);
      setRefreshKey((k) => k + 1);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal membatalkan sesi"
      );
    } finally {
      setRollingBack(false);
    }
  };

  const handleDownloadLogs = async (format: "csv" | "json") => {
    try {
      const res = await fetch(
        `/api/sessions/${sessionId}/logs?format=${format}`
      );
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `processing-logs-${sessionId.slice(0, 8)}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Logs downloaded (${format.toUpperCase()})`);
    } catch {
      toast.error("Gagal download logs");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-12 w-64 rounded-xl shimmer" />
        <div className="h-48 rounded-2xl shimmer" />
        <div className="h-64 rounded-2xl shimmer" />
      </div>
    );
  }

  if (!data) return null;

  const { session, outputs, logs, errorRows } = data;
  const isProcessing = ["processing", "pending", "validating"].includes(
    session.status
  );
  const progress = session.total_rows
    ? Math.round((session.valid_rows / session.total_rows) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-gray-900">
              Sesi {sessionId.slice(0, 8)}
            </h1>
            <span className={`badge ${statusColors[session.status] || "badge-gray"}`}>
              {statusLabels[session.status] || session.status}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {formatDate(session.created_at)}
          </p>
        </div>
        <div className="flex space-x-2">
          {session.status === "completed" && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowRollback(true)}
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              Rollback
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => router.back()}>
            ← Kembali
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(["overview", "errors", "logs"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "overview" && "Ringkasan"}
            {tab === "errors" && `Error${errorRows.length > 0 ? ` (${errorRows.length})` : ""}`}
            {tab === "logs" && "Log"}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6 animate-fade-in">
          {/* Progress */}
          <Card>
            <CardContent className="p-6">
              {isProcessing ? (
                <div className="space-y-3">
                  <ProgressBar value={50} size="lg" showLabel />
                  <p className="text-sm text-gray-500 text-center">
                    Memproses data...
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-xl">
                    <p className="text-2xl font-bold text-gray-900">
                      {session.total_rows.toLocaleString("id-ID")}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Total Baris</p>
                  </div>
                  <div className="text-center p-4 bg-emerald-50 rounded-xl">
                    <p className="text-2xl font-bold text-emerald-600">
                      {session.valid_rows.toLocaleString("id-ID")}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Valid</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-xl">
                    <p className="text-2xl font-bold text-red-600">
                      {session.error_rows.toLocaleString("id-ID")}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Error</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-xl">
                    <p className="text-2xl font-bold text-blue-600">
                      {progress}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Success Rate</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Output Files */}
          {outputs.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900">
                  File Output
                </h2>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {outputs.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            file.file_type === "FINANCE"
                              ? "bg-blue-100 text-blue-600"
                              : "bg-purple-100 text-purple-600"
                          }`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {file.file_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {file.row_count?.toLocaleString("id-ID")} baris •{" "}
                            {file.file_size ? formatBytes(file.file_size) : "-"}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() =>
                          handleDownload(file.id, file.file_name)
                        }
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Files Uploaded */}
          {session.files_uploaded && session.files_uploaded.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900">
                  File yang Diupload
                </h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {session.files_uploaded.map(
                    (file: { name: string; source: string; row_count: number }, i: number) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="badge badge-gray text-xs">
                            {file.source}
                          </span>
                          <span className="text-sm text-gray-700">
                            {file.name}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {file.row_count.toLocaleString("id-ID")} baris
                        </span>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Errors Tab */}
      {activeTab === "errors" && (
        <div className="animate-fade-in">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">
                Data dengan Error
              </h2>
              <p className="text-sm text-gray-500">
                {errorRows.length} baris dengan error validasi
              </p>
            </CardHeader>
            <CardContent>
              {errorRows.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-500">Tidak ada error</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-600">
                          File
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">
                          Baris
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">
                          Error
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {errorRows.map((row) => {
                        const errors = Array.isArray(row.validation_errors)
                          ? row.validation_errors
                          : [];
                        return (
                          <tr
                            key={row.id}
                            className="border-b border-gray-100 table-row-hover"
                          >
                            <td className="py-3 px-4">
                              <span className="badge badge-gray text-xs">
                                {row.source_file}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-gray-700">
                              #{row.row_number}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap gap-1">
                                {errors.map(
                                  (
                                    err: { field?: string; message?: string },
                                    i: number
                                  ) => (
                                    <span
                                      key={i}
                                      className="badge badge-error text-xs"
                                    >
                                      {err.field}: {err.message}
                                    </span>
                                  )
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === "logs" && (
        <div className="animate-fade-in">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Processing Logs
                  </h2>
                  <p className="text-sm text-gray-500">
                    {logs.length} langkah pemrosesan
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDownloadLogs("csv")}
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    CSV
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDownloadLogs("json")}
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    JSON
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">
                  Belum ada log
                </p>
              ) : (
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50"
                    >
                      <div
                        className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${
                          log.status === "completed"
                            ? "bg-emerald-500"
                            : log.status === "failed"
                              ? "bg-red-500"
                              : "bg-amber-500"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">
                            {log.step}
                          </span>
                          <span
                            className={`badge text-xs ${
                              log.status === "completed"
                                ? "badge-success"
                                : log.status === "failed"
                                  ? "badge-error"
                                  : "badge-warning"
                            }`}
                          >
                            {log.status}
                          </span>
                          {log.duration_ms && (
                            <span className="text-xs text-gray-400">
                              {log.duration_ms}ms
                            </span>
                          )}
                        </div>
                        {log.error_message && (
                          <p className="text-xs text-red-500 mt-1">
                            {log.error_message}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {new Date(log.created_at).toLocaleTimeString("id-ID")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rollback Dialog */}
      <ConfirmDialog
        isOpen={showRollback}
        title="Batalkan Sesi Ini?"
        message="Semua file output akan dihapus dan status sesi akan diubah menjadi 'Dibatalkan'. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Ya, Batalkan"
        cancelLabel="Tidak"
        variant="danger"
        onConfirm={handleRollback}
        onCancel={() => setShowRollback(false)}
        loading={rollingBack}
      />
    </div>
  );
}
