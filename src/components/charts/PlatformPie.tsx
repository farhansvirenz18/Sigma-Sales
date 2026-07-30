"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface Props {
  data: Record<string, number>;
}

const COLORS: Record<string, string> = {
  SALES_DAILY: "#2563eb",
  SALES_MP: "#8b5cf6",
  SALES_PRODUK: "#f59e0b",
  UNKNOWN: "#94a3b8",
};

const LABELS: Record<string, string> = {
  SALES_DAILY: "Sales Daily",
  SALES_MP: "Marketplace",
  SALES_PRODUK: "Sales Produk",
  UNKNOWN: "Lainnya",
};

export default function PlatformPie({ data }: Props) {
  const pieData = Object.entries(data)
    .map(([key, value]) => ({
      name: LABELS[key] || key,
      value,
      color: COLORS[key] || "#94a3b8",
    }))
    .sort((a, b) => b.value - a.value);

  const total = pieData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="w-full h-[260px] sm:h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={95}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 20px -4px rgba(0,0,0,0.1)",
              fontSize: "13px",
            }}
            formatter={(value, name) => {
              const v = Number(value);
              const pct = total > 0 ? Math.round((v / total) * 100) : 0;
              return [`${v.toLocaleString("id-ID")} baris (${pct}%)`, name];
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            iconSize={8}
            formatter={(value) => (
              <span className="text-xs text-gray-600">{value}</span>
            )}
          />
          {/* Center label */}
          <text
            x="50%"
            y="48%"
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-gray-400 text-xs"
          >
            Total
          </text>
          <text
            x="50%"
            y="56%"
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-gray-900 text-lg font-bold"
          >
            {total.toLocaleString("id-ID")}
          </text>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
