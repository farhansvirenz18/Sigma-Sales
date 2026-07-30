"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface StatusItem {
  name: string;
  value: number;
  color: string;
}

interface Props {
  data: StatusItem[];
}

export default function StatusChart({ data }: Props) {
  const filtered = data.filter((d) => d.value > 0);
  const total = filtered.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-12">
        Belum ada data
      </p>
    );
  }

  return (
    <div className="w-full h-[260px] sm:h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={filtered}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 12, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12, fill: "#64748b", fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
            width={90}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 20px -4px rgba(0,0,0,0.1)",
              fontSize: "13px",
            }}
            formatter={(value, name, props) => {
              const v = Number(value);
              const pct = total > 0 ? Math.round((v / total) * 100) : 0;
              return [`${v} sesi (${pct}%)`, (props?.payload as StatusItem)?.name || name];
            }}
            cursor={{ fill: "rgba(0,0,0,0.02)" }}
          />
          <Bar
            dataKey="value"
            radius={[0, 8, 8, 0]}
            barSize={32}
          >
            {filtered.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
