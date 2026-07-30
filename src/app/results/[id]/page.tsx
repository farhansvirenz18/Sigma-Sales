"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Card, { CardHeader, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import { UploadSession, OutputFile, ProcessingLog } from "@/types";

interface SessionDetail {
  session: UploadSession;
  outputs: OutputFile[];
  logs: ProcessingLog[];
  errorRows: {
    id: number;
    source_file: string;
    row_number: number;
    validation_errors: { field: string; message: string; value: unknown }[];
  }[];
}

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      if (!res.ok) throw new Error("Session not found");
      const data = await res.json();
      setDetail(data);
    } catch (error) {
      console.error("Failed to fetch detail:", error);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDetail();
    const interval = setInterval(fetchDetail, 5000);
    return () => clearInterval(interval);
  }, [fetchDetail]);

  const handleDownload = async (fileId: string) => {
    try {
      const res = await fetch(`/api/download/${fileId}`);
      if (!res.ok) throw new Error("Download failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("File downloaded!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Download gagal");
    }
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Session tidak ditemukan</p>
        <Button onClick={() => router.push("/history")} className="mt-4">
          Kembali ke History
        </Button>
      </div>
    );
  }

  const { session, outputs, logs, errorRows } = detail;
  const progress =
    session.status === "completed"
      ? 100
      : session.total_rows > 0
      ? Math.round((session.valid_rows / session.total_rows) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Session {sessionId.slice(0, 8)}...
          </h1>
          <p className="text-gray-600 mt-1">
            {new Date(session.created_at).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <span
          className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusBadge(
            session.status
          )}`}
        >
          {session.status}
        </span>
      </div>

      <Card>
        <CardContent className="p-6">
          <ProgressBar value={progress} size="lg" />
          <div className="grid grid-cols-3 gap-4 mt-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">{session.total_rows}</p>
              <p className="text-sm text-gray-600">Total Rows</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{session.valid_rows}</p>
              <p className="text-sm text-gray-600">Valid</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{session.error_rows}</p>
              <p className="text-sm text-gray-600">Errors</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {outputs.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Output Files</h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {outputs.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        file.file_type === "FINANCE"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-purple-100 text-purple-700"
                      }`}
                    >
                      {file.file_type}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {file.file_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {file.row_count} rows •{" "}
                        {file.file_size
                          ? `${(file.file_size / 1024).toFixed(1)} KB`
                          : "-"}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDownload(file.id)}
                  >
                    Download
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {errorRows.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">
              Error Rows ({errorRows.length})
            </h2>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">
                      File
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">
                      Row
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">
                      Errors
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {errorRows.map((row) => (
                    <tr key={row.id} className="border-b border-gray-100">
                      <td className="py-2 px-3 text-gray-600">{row.source_file}</td>
                      <td className="py-2 px-3 text-gray-900">{row.row_number}</td>
                      <td className="py-2 px-3">
                        {row.validation_errors.map((err, i) => (
                          <span
                            key={i}
                            className="inline-block bg-red-50 text-red-700 px-2 py-0.5 rounded text-xs mr-1 mb-1"
                          >
                            {err.field}: {err.message}
                          </span>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Processing Logs</h2>
        </CardHeader>
        <CardContent>
          {logs.length > 0 ? (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        log.status === "completed"
                          ? "bg-green-500"
                          : log.status === "failed"
                          ? "bg-red-500"
                          : "bg-yellow-500"
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900 capitalize">
                        {log.step}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(log.created_at).toLocaleTimeString("id-ID")}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded ${
                      log.status === "completed"
                        ? "bg-green-100 text-green-700"
                        : log.status === "failed"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {log.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">
              Belum ada log pemrosesan
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
