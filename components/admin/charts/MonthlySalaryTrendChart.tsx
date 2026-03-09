"use client";

import { memo, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface MonthlySalaryTrendChartProps {
  data?: Array<{
    month: string;
    totalSalary: number;
    averageSalary?: number;
  }>;
  className?: string;
}

const defaultData = [
  { month: "Tháng 1", totalSalary: 2400000000, averageSalary: 2800000 },
  { month: "Tháng 2", totalSalary: 2350000000, averageSalary: 2750000 },
  { month: "Tháng 3", totalSalary: 2500000000, averageSalary: 2900000 },
  { month: "Tháng 4", totalSalary: 2420000000, averageSalary: 2850000 },
  { month: "Tháng 5", totalSalary: 2600000000, averageSalary: 3000000 },
  { month: "Tháng 6", totalSalary: 2700000000, averageSalary: 3100000 },
];

const formatCurrency = (value: number) => {
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(1)}B`;
  }
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(0)}M`;
  }
  return `${(value / 1000).toFixed(0)}K`;
};

export const MonthlySalaryTrendChart = memo(function MonthlySalaryTrendChart({
  data = defaultData,
  className = "",
}: MonthlySalaryTrendChartProps) {
  const chartData = useMemo(() => data, [data]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Xu Hướng Lương Hàng Tháng</CardTitle>
        <CardDescription>Tổng và trung bình lương theo tháng</CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="month"
                stroke="#6b7280"
                style={{ fontSize: "12px" }}
              />
              <YAxis
                stroke="#6b7280"
                tickFormatter={formatCurrency}
                style={{ fontSize: "12px" }}
              />
              <Tooltip
                formatter={(value) => formatCurrency(value as number)}
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: "12px" }}
                iconType="line"
              />
              <Line
                type="monotone"
                dataKey="totalSalary"
                stroke="#3b82f6"
                dot={{ fill: "#3b82f6", r: 4 }}
                activeDot={{ r: 6 }}
                strokeWidth={2}
                name="Tổng Lương"
              />
              <Line
                type="monotone"
                dataKey="averageSalary"
                stroke="#10b981"
                dot={{ fill: "#10b981", r: 4 }}
                activeDot={{ r: 6 }}
                strokeWidth={2}
                name="Lương Trung Bình"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
});
