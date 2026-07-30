"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { isValidExcelFile } from "@/lib/utils/format";

interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export default function FileDropzone({
  onFilesSelected,
  disabled = false,
}: FileDropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const validFiles = acceptedFiles.filter((f) => isValidExcelFile(f.name));
      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    },
    [onFilesSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 3,
    disabled,
  });

  return (
    <div
      {...getRootProps()}
      className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all duration-200 cursor-pointer group ${
        isDragActive
          ? "border-blue-500 bg-blue-50/80 scale-[1.01]"
          : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/30"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <input {...getInputProps()} />

      {/* Decorative corner accents */}
      <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-gray-200 rounded-tl-lg group-hover:border-blue-300 transition-colors" />
      <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-gray-200 rounded-tr-lg group-hover:border-blue-300 transition-colors" />
      <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-gray-200 rounded-bl-lg group-hover:border-blue-300 transition-colors" />
      <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-gray-200 rounded-br-lg group-hover:border-blue-300 transition-colors" />

      <div className="flex flex-col items-center">
        <div
          className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center mb-4 sm:mb-5 transition-all duration-200 ${
            isDragActive
              ? "bg-blue-100 text-blue-600 scale-110"
              : "bg-gray-100 text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-500 group-hover:scale-105"
          }`}
        >
          <svg
            className="w-8 h-8 sm:w-10 sm:h-10"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>

        {isDragActive ? (
          <p className="text-lg font-semibold text-blue-600">
            Lepaskan file di sini...
          </p>
        ) : (
          <>
            <p className="text-base sm:text-lg font-semibold text-gray-700">
              Drag & drop file Excel di sini
            </p>
            <p className="text-sm text-gray-400 mt-2">
              atau <span className="text-blue-600 font-medium">klik untuk memilih</span> file (.xlsx, .xls)
            </p>
            <p className="text-xs text-gray-300 mt-3">
              Maks. 3 file sekaligus
            </p>
          </>
        )}
      </div>
    </div>
  );
}
