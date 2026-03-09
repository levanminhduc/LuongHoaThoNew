"use client";

import { memo, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SignatureRateChartProps {
  data?: Array<{
    week: string;
    signatureRate: number;
  }>;
  className?: string;
}

const defaultData = [
  { week: "Tuần 1", signatureRate: 65 },
  { week: "Tuần 2", signatureRate: 72 },
  { week: "Tuần 3", signatureRate: 78 },
  { week: "Tuần 4", signatureRate: 85 },
  { week: "Tuần 5", signatureRate: 88 },
  { week: "Tuần 6", signatureRate: 92 },
];

export const SignatureRateChart = memo(function SignatureRateChart({
  data = defaultData,
  className = "",
}: SignatureRateChartProps) {
  const chartData = useMemo(() => data, [data]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Tỷ Lệ Ký Nhận</CardTitle>
        <CardDescription>Tiến độ ký nhận theo tuần</CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
            >
              <defs>
                <linearGradient id="colorSignature" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="week"
                stroke="#6b7280"
                style={{ fontSize: "12px" }}
              />
              <YAxis
                stroke="#6b7280"
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
                style={{ fontSize: "12px" }}
              />
              <Tooltip
                formatter={(value) => `${(value as number).toFixed(1)}%`}
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Area
                type="monotone"
                dataKey="signatureRate"
                stroke="#f97316"
                fillOpacity={1}
                fill="url(#colorSignature)"
                name="Tỷ Lệ Ký (%)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
});
