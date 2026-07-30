"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface MonthlyData {
  month: string;
  total: number;
  success: number;
  error: number;
}

const monthNames = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

function getMonthLabel(key: string) {
  const [, m] = key.split("-");
  return monthNames[parseInt(m, 10) - 1] || key;
}

interface Props {
  data: MonthlyData[];
}

export default function MonthlyChart({ data }: Props) {
  const chartData = data.map((d) => ({
    ...d,
    label: getMonthLabel(d.month),
  }));

  return (
    <div className="w-full h-[260px] sm:h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 20px -4px rgba(0,0,0,0.1)",
              fontSize: "13px",
            }}
            formatter={(value, name) => [
              `${Number(value)} sesi`,
              name === "total" ? "Total" : name === "success" ? "Berhasil" : "Error",
            ]}
            labelFormatter={(label) => `Bulan: ${label}`}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#2563eb"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#colorTotal)"
            dot={{ r: 4, fill: "#2563eb", strokeWidth: 2, stroke: "#fff" }}
            activeDot={{ r: 6, fill: "#2563eb", strokeWidth: 2, stroke: "#fff" }}
          />
          <Area
            type="monotone"
            dataKey="success"
            stroke="#10b981"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorSuccess)"
            dot={{ r: 3, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }}
            activeDot={{ r: 5, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
