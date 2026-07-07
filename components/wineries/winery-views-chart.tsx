"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WineryDailyViewStat } from "@/lib/winery-analytics-dashboard";

interface WineryViewsChartProps {
  data: WineryDailyViewStat[];
}

export function WineryViewsChart({ data }: WineryViewsChartProps) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
          <XAxis
            dataKey="label"
            tick={{ fill: "#78716c", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "#78716c", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={32}
          />
          <Tooltip
            cursor={{ fill: "rgba(124, 45, 18, 0.06)" }}
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid #e7e5e4",
              boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
            }}
            formatter={(value) => [`${value ?? 0} vizualizari`, "Pagina cramei"]}
            labelFormatter={(label) => String(label)}
          />
          <Bar
            dataKey="views"
            fill="#7C2D12"
            radius={[6, 6, 0, 0]}
            maxBarSize={28}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
