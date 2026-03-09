"use client";

import { memo, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ImportBatchChartProps {
  data?: Array<{
    batch: string;
    success: number;
    failed: number;
  }>;
  className?: string;
}

const defaultData = [
  { batch: "Batch 1", success: 245, failed: 12 },
  { batch: "Batch 2", success: 198, failed: 8 },
  { batch: "Batch 3", success: 267, failed: 15 },
  { batch: "Batch 4", success: 223, failed: 5 },
  { batch: "Batch 5", success: 289, failed: 18 },
];

export const ImportBatchChart = memo(function ImportBatchChart({
  data = defaultData,
  className = "",
}: ImportBatchChartProps) {
  const chartData = useMemo(() => data, [data]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Tóm Tắt Import Batch</CardTitle>
        <CardDescription>Tỷ lệ thành công/thất bại theo batch</CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="batch"
                stroke="#6b7280"
                style={{ fontSize: "12px" }}
              />
              <YAxis
                stroke="#6b7280"
                style={{ fontSize: "12px" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: "12px" }}
              />
              <Bar
                dataKey="success"
                fill="#10b981"
                name="Thành Công"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="failed"
                fill="#ef4444"
                name="Thất Bại"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
});
