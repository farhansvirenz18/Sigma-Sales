import { ReactNode } from "react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  change?: number;
  changeLabel?: string;
  color?: "blue" | "green" | "red" | "purple" | "amber";
}

const colorMap = {
  blue: {
    bg: "bg-blue-50",
    text: "text-blue-600",
    ring: "ring-blue-100",
  },
  green: {
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    ring: "ring-emerald-100",
  },
  red: {
    bg: "bg-red-50",
    text: "text-red-600",
    ring: "ring-red-100",
  },
  purple: {
    bg: "bg-purple-50",
    text: "text-purple-600",
    ring: "ring-purple-100",
  },
  amber: {
    bg: "bg-amber-50",
    text: "text-amber-600",
    ring: "ring-amber-100",
  },
};

export default function StatsCard({
  title,
  value,
  icon,
  change,
  changeLabel = "dari bulan lalu",
  color = "blue",
}: StatsCardProps) {
  const colors = colorMap[color];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 card-hover">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2 tracking-tight">
            {value}
          </p>
          {change !== undefined && (
            <div className="flex items-center mt-3">
              <span
                className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${
                  change >= 0
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {change >= 0 ? "↑" : "↓"} {Math.abs(change)}%
              </span>
              <span className="text-xs text-gray-400 ml-2">{changeLabel}</span>
            </div>
          )}
        </div>
        <div
          className={`flex-shrink-0 p-3 rounded-xl ring-1 ${colors.bg} ${colors.ring} ${colors.text}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
