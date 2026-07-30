"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import FileDropzone from "@/components/upload/FileDropzone";
import FilePreview from "@/components/upload/FilePreview";
import ColumnMapper, {
  DetectedFile,
  MappingEntry,
} from "@/components/upload/ColumnMapper";
import Button from "@/components/ui/Button";
import Card, { CardHeader, CardContent, CardFooter } from "@/components/ui/Card";
import ProgressBar from "@/components/ui/ProgressBar";

type Step = "upload" | "mapping" | "preview" | "processing" | "done";

interface UploadState {
  files: File[];
  step: Step;
  progress: number;
  detectedFiles: DetectedFile[];
  previewData: Record<string, unknown> | null;
  sessionId: string | null;
  useCustomMapping: boolean;
}

interface DuplicateInfo {
  existingSessionId: string;
  pendingFiles: File[];
}

export default function UploadPage() {
  const router = useRouter();
  const [state, setState] = useState<UploadState>({
    files: [],
    step: "upload",
    progress: 0,
    detectedFiles: [],
    previewData: null,
    sessionId: null,
    useCustomMapping: false,
  });
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateInfo | null>(null);

  const handleFilesSelected = useCallback((newFiles: File[]) => {
    setState((prev) => {
      const existing = prev.files.map((f) => f.name);
      const unique = newFiles.filter((f) => !existing.includes(f.name));
      return { ...prev, files: [...prev.files, ...unique].slice(0, 3) };
    });
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index),
    }));
  }, []);

  const handleMappingSave = async (mappings: MappingEntry[]) => {
    setState((prev) => ({ ...prev, progress: 50 }));
    setLoadingPreview(true);

    try {
      if (mappings.length > 0) {
        const res = await fetch("/api/mappings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mappings }),
        });
        if (!res.ok) throw new Error("Save mappings failed");
      }

      const fileDataPromises = state.files.map(async (file) => ({
        name: file.name,
        data: await file.arrayBuffer().then((buf) =>
          btoa(String.fromCharCode(...new Uint8Array(buf)))
        ),
      }));
      const fileData = await Promise.all(fileDataPromises);

      const previewRes = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: fileData, mappings }),
      });

      if (previewRes.ok) {
        const previewJson = await previewRes.json();
        setState((prev) => ({
          ...prev,
          previewData: previewJson,
          step: "preview",
          progress: 60,
        }));
      } else {
        await handleProcess();
      }
    } catch (error) {
      console.error("Preview error:", error);
      await handleProcess();
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSkipMapping = async () => {
    setState((prev) => ({ ...prev, progress: 50 }));
    await handleProcess();
  };

  const handleProcessDirectly = async () => {
    if (state.files.length === 0) {
      toast.error("Pilih file terlebih dahulu");
      return;
    }
    setState((prev) => ({ ...prev, progress: 30 }));
    await handleProcess();
  };

  const handleOpenMapping = async () => {
    if (state.files.length === 0) {
      toast.error("Pilih file terlebih dahulu");
      return;
    }

    setState((prev) => ({ ...prev, progress: 20 }));

    try {
      const formData = new FormData();
      state.files.forEach((file) => formData.append("files", file));

      const res = await fetch("/api/detect-columns", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Detect failed");

      const data = await res.json();
      setState((prev) => ({
        ...prev,
        detectedFiles: data.files,
        step: "mapping",
        progress: 40,
        useCustomMapping: true,
      }));
    } catch (error) {
      console.error("Detect error:", error);
      toast.error("Gagal mendeteksi kolom");
    }
  };

  const handleProcess = async (forceUpsert = false) => {
    setState((prev) => ({ ...prev, step: "processing", progress: 70 }));

    try {
      const formData = new FormData();
      state.files.forEach((file) => formData.append("files", file));
      if (forceUpsert) {
        formData.append("forceUpsert", "true");
      }

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const error = await uploadRes.json();
        if (uploadRes.status === 409 && error.canUpsert) {
          setDuplicateInfo({
            existingSessionId: error.existingSessionId,
            pendingFiles: state.files,
          });
          setState((prev) => ({ ...prev, step: "upload", progress: 0 }));
          return;
        }
        throw new Error(error.error || "Upload failed");
      }

      const uploadData = await uploadRes.json();
      setState((prev) => ({
        ...prev,
        progress: 100,
        sessionId: uploadData.sessionId,
        step: "done",
      }));

      toast.success(
        uploadData.isUpsert
          ? `Data lama diupdate! ${uploadData.totalRows} baris diproses ulang.`
          : `Upload ${uploadData.totalRows} baris berhasil! Sedang diproses...`
      );

      setTimeout(() => {
        router.push(`/results/${uploadData.sessionId}`);
      }, 1500);
    } catch (error) {
      console.error("Process error:", error);
      toast.error(error instanceof Error ? error.message : "Proses gagal");
      setState((prev) => ({
        ...prev,
        step: "upload",
        progress: 0,
      }));
    }
  };

  const handleUpsertConfirm = async () => {
    setDuplicateInfo(null);
    await handleProcess(true);
  };

  const handleUpsertCancel = () => {
    setDuplicateInfo(null);
  };

  const steps = state.useCustomMapping
    ? [
        { key: "upload", label: "Pilih File" },
        { key: "mapping", label: "Mapping" },
        { key: "preview", label: "Preview" },
        { key: "processing", label: "Proses" },
        { key: "done", label: "Selesai" },
      ]
    : [
        { key: "upload", label: "Pilih File" },
        { key: "processing", label: "Proses" },
        { key: "done", label: "Selesai" },
      ];

  const getStepIndex = () => {
    const idx = steps.findIndex((s) => s.key === state.step);
    return idx >= 0 ? idx : 0;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Upload File Excel
        </h1>
        <p className="text-gray-500 mt-1">
          Upload 3 file sales, lalu proses otomatis
        </p>
      </div>

      {/* Duplicate Confirmation Modal */}
      {duplicateInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <Card className="max-w-md w-full mx-4">
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">
                File Sudah Ada
              </h2>
              <p className="text-sm text-gray-500">
                File yang diupload sudah diproses sebelumnya (session: {duplicateInfo.existingSessionId.slice(0, 8)}...)
              </p>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Ingin menghapus data lama dan memproses ulang dengan file ini?
              </p>
            </CardContent>
            <CardFooter className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={handleUpsertCancel}>
                Batal
              </Button>
              <Button onClick={handleUpsertConfirm}>
                Ya, Proses Ulang
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Step Indicator */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {steps.map((step, i) => {
              const stepIdx = getStepIndex();
              const isActive = i === stepIdx;
              const isDone = i < stepIdx;

              return (
                <div key={step.key} className="flex items-center flex-1 last:flex-none">
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                        isDone
                          ? "bg-emerald-500 text-white"
                          : isActive
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                            : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {isDone ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </div>
                    <span
                      className={`text-sm font-medium hidden sm:block ${
                        isActive
                          ? "text-gray-900"
                          : isDone
                            ? "text-emerald-600"
                            : "text-gray-400"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className="flex-1 mx-3">
                      <div
                        className={`h-0.5 rounded-full transition-all duration-500 ${
                          isDone ? "bg-emerald-500" : "bg-gray-100"
                        }`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upload Step */}
      {state.step === "upload" && (
        <div className="space-y-6 animate-fade-in">
          <Card>
            <CardContent className="p-6">
              <FileDropzone
                onFilesSelected={handleFilesSelected}
                disabled={false}
              />
            </CardContent>
          </Card>

          {state.files.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900">
                  File Terpilih ({state.files.length}/3)
                </h2>
              </CardHeader>
              <CardContent>
                <FilePreview files={state.files} onRemove={handleRemoveFile} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardFooter className="flex justify-between">
              <div>
                <button
                  onClick={handleOpenMapping}
                  disabled={state.files.length === 0}
                  className="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Custom Mapping (Advanced)
                </button>
              </div>
              <div className="flex space-x-3">
                <Button
                  variant="secondary"
                  onClick={() =>
                    setState({
                      files: [],
                      step: "upload",
                      progress: 0,
                      detectedFiles: [],
                      previewData: null,
                      sessionId: null,
                      useCustomMapping: false,
                    })
                  }
                >
                  Reset
                </Button>
                <Button
                  onClick={handleProcessDirectly}
                  disabled={state.files.length === 0}
                >
                  Proses Sekarang →
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Mapping Step */}
      {state.step === "mapping" && (
        <div className="animate-fade-in">
          <ColumnMapper
            files={state.detectedFiles}
            onSave={handleMappingSave}
            onSkip={handleSkipMapping}
            loading={loadingPreview}
          />
        </div>
      )}

      {/* Preview Step */}
      {state.step === "preview" && state.previewData && (
        <div className="space-y-4 animate-fade-in">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">
                Preview Hasil Transformasi
              </h2>
              <p className="text-sm text-gray-500">
                Periksa hasil sebelum generate file final
              </p>
            </CardHeader>
            <CardContent>
              {Object.entries(
                (state.previewData as { previews: Record<string, unknown> })
                  .previews || {}
              ).map(([fileName, preview]) => {
                const p = preview as {
                  source: string;
                  financeRows: Record<string, unknown>[];
                  marketingRows: Record<string, unknown>[];
                };
                return (
                  <div key={fileName} className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <span className="badge badge-gray">{p.source}</span>
                      <span className="text-sm font-medium text-gray-700">
                        {fileName}
                      </span>
                    </div>

                    {p.financeRows.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-blue-700 mb-2">
                          Finance Output ({p.financeRows.length} baris preview)
                        </h3>
                        <div className="overflow-x-auto border border-gray-200 rounded-lg">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-blue-50">
                                {Object.keys(p.financeRows[0]).map((col) => (
                                  <th
                                    key={col}
                                    className="px-3 py-2 text-left font-medium text-blue-700 whitespace-nowrap"
                                  >
                                    {col}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {p.financeRows.slice(0, 5).map((row, i) => (
                                <tr key={i} className="border-t border-gray-100">
                                  {Object.values(row).map((val, j) => (
                                    <td
                                      key={j}
                                      className="px-3 py-2 text-gray-600 whitespace-nowrap"
                                    >
                                      {String(val ?? "-").slice(0, 30)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {p.marketingRows.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-purple-700 mb-2">
                          Marketing Output ({p.marketingRows.length} baris
                          preview)
                        </h3>
                        <div className="overflow-x-auto border border-gray-200 rounded-lg">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-purple-50">
                                {Object.keys(p.marketingRows[0]).map((col) => (
                                  <th
                                    key={col}
                                    className="px-3 py-2 text-left font-medium text-purple-700 whitespace-nowrap"
                                  >
                                    {col}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {p.marketingRows.slice(0, 5).map((row, i) => (
                                <tr key={i} className="border-t border-gray-100">
                                  {Object.values(row).map((val, j) => (
                                    <td
                                      key={j}
                                      className="px-3 py-2 text-gray-600 whitespace-nowrap"
                                    >
                                      {String(val ?? "-").slice(0, 30)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardFooter className="flex justify-between">
              <Button
                variant="secondary"
                onClick={() =>
                  setState((prev) => ({
                    ...prev,
                    step: prev.useCustomMapping ? "mapping" : "upload",
                    progress: prev.useCustomMapping ? 40 : 0,
                  }))
                }
              >
                {state.useCustomMapping ? "← Kembali ke Mapping" : "← Kembali ke Upload"}
              </Button>
              <Button onClick={() => handleProcess()}>Konfirmasi & Proses →</Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Processing / Done */}
      {(state.step === "processing" || state.step === "done") && (
        <Card className="animate-fade-in">
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              {state.step === "done" ? (
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : (
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto pulse-soft">
                  <svg className="w-8 h-8 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              )}
              <div>
                <p className="text-lg font-semibold text-gray-900">
                  {state.step === "done" ? "Selesai!" : "Memproses..."}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {state.step === "done"
                    ? "Mengalihkan ke halaman hasil..."
                    : "Mohon tunggu, sedang memproses data Anda"}
                </p>
              </div>
              <div className="max-w-xs mx-auto">
                <ProgressBar value={state.progress} size="lg" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <Card className="animate-fade-in">
        <CardContent className="p-4">
          <h3 className="font-medium text-gray-900 mb-2">
            Format File yang Didukung:
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span className="text-sm text-gray-600">
                <strong>SALES DAILY.xlsx</strong> — Harian
              </span>
            </div>
            <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-purple-500 rounded-full" />
              <span className="text-sm text-gray-600">
                <strong>SALES MP.xlsx</strong> — Marketplace
              </span>
            </div>
            <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-amber-500 rounded-full" />
              <span className="text-sm text-gray-600">
                <strong>SALES Produk.xlsx</strong> — Produk
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Upload ulang file yang sama? Data lama akan otomatis diganti.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
