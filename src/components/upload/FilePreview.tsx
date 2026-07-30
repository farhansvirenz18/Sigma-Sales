"use client";

interface FilePreviewProps {
  files: File[];
  onRemove: (index: number) => void;
}

export default function FilePreview({ files, onRemove }: FilePreviewProps) {
  if (files.length === 0) return null;

  const getFileConfig = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("daily"))
      return { color: "from-emerald-500 to-emerald-600", badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200", label: "SALES DAILY", icon: "📊" };
    if (lower.includes("mp"))
      return { color: "from-purple-500 to-purple-600", badge: "bg-purple-50 text-purple-700 ring-1 ring-purple-200", label: "SALES MP", icon: "🛒" };
    if (lower.includes("produk"))
      return { color: "from-amber-500 to-amber-600", badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-200", label: "SALES PRODUK", icon: "📦" };
    return { color: "from-gray-400 to-gray-500", badge: "bg-gray-50 text-gray-700 ring-1 ring-gray-200", label: "FILE", icon: "📄" };
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
      {files.map((file, index) => {
        const config = getFileConfig(file.name);
        return (
          <div
            key={`${file.name}-${index}`}
            className="bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-between hover:shadow-md transition-all duration-200 group"
          >
            <div className="flex items-center space-x-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center text-white text-lg shadow-sm flex-shrink-0`}
              >
                {config.icon}
              </div>
              <div className="min-w-0">
                <span className={`inline-block text-[10px] font-bold tracking-wider ${config.badge} px-2 py-0.5 rounded-full mb-1`}>
                  {config.label}
                </span>
                <p className="text-sm font-medium text-gray-900 truncate max-w-[140px] sm:max-w-[180px]">
                  {file.name}
                </p>
                <p className="text-xs text-gray-400">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <button
              onClick={() => onRemove(index)}
              className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all flex-shrink-0 active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
