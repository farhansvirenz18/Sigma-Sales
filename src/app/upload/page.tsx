"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import FileDropzone from "@/components/upload/FileDropzone";
import FilePreview from "@/components/upload/FilePreview";
import Button from "@/components/ui/Button";
import Card, { CardHeader, CardContent, CardFooter } from "@/components/ui/Card";
import ProgressBar from "@/components/ui/ProgressBar";

interface UploadState {
  files: File[];
  uploading: boolean;
  progress: number;
  sessionId: string | null;
}

export default function UploadPage() {
  const router = useRouter();
  const [state, setState] = useState<UploadState>({
    files: [],
    uploading: false,
    progress: 0,
    sessionId: null,
  });

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

  const handleUpload = async () => {
    if (state.files.length !== 3) {
      toast.error("Harap upload tepat 3 file Excel");
      return;
    }

    setState((prev) => ({ ...prev, uploading: true, progress: 0 }));

    try {
      const formData = new FormData();
      state.files.forEach((file) => {
        formData.append("files", file);
      });

      setState((prev) => ({ ...prev, progress: 30 }));

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const error = await uploadRes.json();
        throw new Error(error.error || "Upload failed");
      }

      const uploadData = await uploadRes.json();
      setState((prev) => ({ ...prev, progress: 60, sessionId: uploadData.sessionId }));

      toast.success(`Berhasil upload ${uploadData.totalRows} baris data`);

      setState((prev) => ({ ...prev, progress: 100 }));

      setTimeout(() => {
        router.push(`/results/${uploadData.sessionId}`);
      }, 1000);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Upload gagal");
      setState((prev) => ({ ...prev, uploading: false, progress: 0 }));
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload File Excel</h1>
        <p className="text-gray-600 mt-1">
          Upload 3 file sales: SALES DAILY, SALES MP, dan SALES Produk
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <FileDropzone
            onFilesSelected={handleFilesSelected}
            disabled={state.uploading}
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
            <FilePreview
              files={state.files}
              onRemove={state.uploading ? () => {} : handleRemoveFile}
            />
          </CardContent>
        </Card>
      )}

      {state.uploading && (
        <Card>
          <CardContent className="p-6">
            <ProgressBar value={state.progress} showLabel size="lg" />
            <p className="text-sm text-gray-600 mt-2 text-center">
              {state.progress < 30
                ? "Mengupload file..."
                : state.progress < 60
                ? "Memproses data..."
                : state.progress < 100
                ? "Generate output..."
                : "Selesai!"}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardFooter className="flex justify-end space-x-3">
          <Button
            variant="secondary"
            onClick={() => setState({ files: [], uploading: false, progress: 0, sessionId: null })}
            disabled={state.uploading}
          >
            Reset
          </Button>
          <Button
            onClick={handleUpload}
            loading={state.uploading}
            disabled={state.files.length !== 3 || state.uploading}
          >
            Upload & Process
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="font-medium text-gray-900 mb-2">Format File yang Diterima:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• <strong>SALES DAILY.xlsx</strong> - Data penjualan harian</li>
            <li>• <strong>SALES MP.xlsx</strong> - Data marketplace (Shopee)</li>
            <li>• <strong>SALES Produk.xlsx</strong> - Data produk (TikTok Shop)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
