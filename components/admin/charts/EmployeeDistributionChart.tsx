"use client";

import { memo, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface EmployeeDistributionChartProps {
  data?: Array<{
    name: string;
    value: number;
  }>;
  className?: string;
}

const defaultData = [
  { name: "IT", value: 45 },
  { name: "HR", value: 28 },
  { name: "Finance", value: 32 },
  { name: "Sales", value: 55 },
  { name: "Operations", value: 38 },
];

const COLORS = ["#3b82f6", "#10b981", "#f97316", "#8b5cf6", "#ec4899"];

export const EmployeeDistributionChart = memo(function EmployeeDistributionChart({
  data = defaultData,
  className = "",
}: EmployeeDistributionChartProps) {
  const chartData = useMemo(() => data, [data]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Phân Bố Nhân Viên</CardTitle>
        <CardDescription>Số nhân viên theo phòng ban</CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                formatter={(value) => [`${value} người`, "Nhân viên"]}
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: "12px" }}
                verticalAlign="bottom"
                height={36}
              />
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
});
