import { ReactNode } from "react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  change?: number;
  changeLabel?: string;
}

export default function StatsCard({
  title,
  value,
  icon,
  change,
  changeLabel = "dari bulan lalu",
}: StatsCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
          {change !== undefined && (
            <div className="flex items-center mt-2">
              <span
                className={`text-sm font-medium ${
                  change >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {change >= 0 ? "+" : ""}
                {change}%
              </span>
              <span className="text-sm text-gray-500 ml-2">{changeLabel}</span>
            </div>
          )}
        </div>
        <div className="p-3 bg-blue-50 rounded-lg text-blue-600">{icon}</div>
      </div>
    </div>
  );
}
