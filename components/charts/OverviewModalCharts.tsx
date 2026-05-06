"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ChartPoint {
  name: string;
  employees: number;
  signed: number;
  unsigned: number;
  totalSalary: number;
}

interface PiePoint {
  name: string;
  value: number;
  percentage: string;
}

interface OverviewModalChartsProps {
  chartData: ChartPoint[];
  pieData: PiePoint[];
  colors: string[];
}

export default function OverviewModalCharts({
  chartData,
  pieData,
  colors,
}: OverviewModalChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">
            Thống Kê Theo Department
          </CardTitle>
          <CardDescription className="text-sm">
            Số lượng nhân viên và tỷ lệ ký
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                fontSize={12}
                tick={{ fontSize: 10 }}
                className="sm:text-sm"
              />
              <YAxis
                fontSize={12}
                tick={{ fontSize: 10 }}
                className="sm:text-sm"
              />
              <Tooltip
                contentStyle={{
                  fontSize: "12px",
                  padding: "8px",
                  borderRadius: "6px",
                }}
              />
              <Bar dataKey="employees" fill="#8884d8" name="Nhân viên" />
              <Bar dataKey="signed" fill="#82ca9d" name="Đã ký" />
              <Bar dataKey="unsigned" fill="#ffc658" name="Chưa ký" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">
            Phân Bố Lương Theo Bộ Phận
          </CardTitle>
          <CardDescription className="text-sm">
            Tỷ lệ tổng lương theo từng Bộ Phận
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name}: ${percentage}%`}
                outerRadius={60}
                className="sm:outerRadius-80"
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={colors[index % colors.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) =>
                  `${(value / 1000000).toFixed(1)}M VND`
                }
                contentStyle={{
                  fontSize: "12px",
                  padding: "8px",
                  borderRadius: "6px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
