"use client";

interface FilePreviewProps {
  files: File[];
  onRemove: (index: number) => void;
}

export default function FilePreview({ files, onRemove }: FilePreviewProps) {
  if (files.length === 0) return null;

  const getFileIcon = (name: string) => {
    if (name.toLowerCase().includes("daily")) return "bg-green-100 text-green-700";
    if (name.toLowerCase().includes("mp")) return "bg-purple-100 text-purple-700";
    if (name.toLowerCase().includes("produk")) return "bg-orange-100 text-orange-700";
    return "bg-gray-100 text-gray-700";
  };

  const getFileLabel = (name: string) => {
    if (name.toLowerCase().includes("daily")) return "SALES DAILY";
    if (name.toLowerCase().includes("mp")) return "SALES MP";
    if (name.toLowerCase().includes("produk")) return "SALES PRODUK";
    return "UNKNOWN";
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {files.map((file, index) => (
        <div
          key={`${file.name}-${index}`}
          className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between"
        >
          <div className="flex items-center space-x-3">
            <div
              className={`px-2 py-1 rounded text-xs font-medium ${getFileIcon(
                file.name
              )}`}
            >
              {getFileLabel(file.name)}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 truncate max-w-[150px]">
                {file.name}
              </p>
              <p className="text-xs text-gray-500">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <button
            onClick={() => onRemove(index)}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
