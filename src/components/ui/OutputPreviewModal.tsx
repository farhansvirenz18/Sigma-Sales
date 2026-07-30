"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Button from "./Button";

interface PreviewData {
  fileName: string;
  fileType: string;
  columns: string[];
  rows: Record<string, unknown>[];
  totalRows: number;
  offset: number;
  limit: number;
}

interface OutputPreviewModalProps {
  isOpen: boolean;
  fileId: string | null;
  fileType: string;
  onClose: () => void;
}

const PAGE_SIZE = 100;

export default function OutputPreviewModal({
  isOpen,
  fileId,
  fileType,
  onClose,
}: OutputPreviewModalProps) {
  const [data, setData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const prevOpenRef = useRef(false);
  const prevFileIdRef = useRef<string | null>(null);

  const fetchData = useCallback(async (offset: number) => {
    if (!fileId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/preview-output/${fileId}?offset=${offset}&limit=${PAGE_SIZE}`
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal memuat preview");
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat preview");
    } finally {
      setLoading(false);
    }
  }, [fileId]);

  useEffect(() => {
    if (!isOpen) {
      prevOpenRef.current = false;
      return;
    }

    const justOpened = !prevOpenRef.current;
    const fileChanged = fileId !== prevFileIdRef.current;
    prevOpenRef.current = true;
    prevFileIdRef.current = fileId;

    if (justOpened || fileChanged) {
      setPage(0);
      void fetchData(0);
    }
  }, [isOpen, fileId, fetchData]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  const handlePrev = () => {
    const newPage = page - 1;
    setPage(newPage);
    void fetchData(newPage * PAGE_SIZE);
  };

  const handleNext = () => {
    const newPage = page + 1;
    setPage(newPage);
    void fetchData(newPage * PAGE_SIZE);
  };

  if (!isOpen) return null;

  const totalPages = data ? Math.ceil(data.totalRows / PAGE_SIZE) : 0;
  const startRow = data ? data.offset + 1 : 0;
  const endRow = data ? Math.min(data.offset + data.rows.length, data.totalRows) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100">
          <div className="flex items-center space-x-3 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                fileType === "FINANCE"
                  ? "bg-blue-100 text-blue-600"
                  : "bg-purple-100 text-purple-600"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                {data?.fileName || "Loading..."}
              </h2>
              {data && (
                <p className="text-xs text-gray-500">
                  {data.totalRows.toLocaleString("id-ID")} baris • {data.columns.length} kolom
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {loading && !data ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3">
                <svg className="w-8 h-8 text-blue-600 animate-spin mx-auto" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <p className="text-sm text-gray-500">Memuat data...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <p className="text-sm text-red-600">{error}</p>
                <Button variant="secondary" size="sm" onClick={() => void fetchData(page * PAGE_SIZE)}>
                  Coba Lagi
                </Button>
              </div>
            </div>
          ) : data && data.rows.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-gray-400">Tidak ada data</p>
            </div>
          ) : data ? (
            <div className="h-full overflow-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2.5 text-left font-semibold text-gray-600 w-12">
                      #
                    </th>
                    {data.columns.map((col) => (
                      <th
                        key={col}
                        className="px-3 py-2.5 text-left font-semibold text-gray-600 whitespace-nowrap"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.rows.map((row, i) => (
                    <tr
                      key={i}
                      className="hover:bg-blue-50/40 transition-colors"
                    >
                      <td className="px-3 py-2 text-gray-400 font-mono">
                        {data.offset + i + 1}
                      </td>
                      {data.columns.map((col) => (
                        <td
                          key={col}
                          className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[200px] truncate"
                          title={String(row[col] ?? "")}
                        >
                          {row[col] != null ? String(row[col]) : "-"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

        {/* Footer / Pagination */}
        {data && data.totalRows > 0 && (
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs text-gray-500">
              Menampilkan {startRow.toLocaleString("id-ID")} - {endRow.toLocaleString("id-ID")} dari {data.totalRows.toLocaleString("id-ID")} baris
            </p>
            <div className="flex items-center space-x-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handlePrev}
                disabled={page === 0 || loading}
              >
                ← Prev
              </Button>
              <span className="text-xs text-gray-500 px-2">
                {page + 1} / {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleNext}
                disabled={page >= totalPages - 1 || loading}
              >
                Next →
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
