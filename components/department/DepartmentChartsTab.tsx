"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts";
import { BarChart3, PieChart } from "lucide-react";

interface SalaryRange {
  range: string;
  min: number;
  max: number;
  count: number;
}

interface MonthlyTrend {
  month: string;
  totalSalary: number;
  employeeCount: number;
  signedCount: number;
  averageSalary: number;
  signedPercentage: string;
}

interface DepartmentStats {
  totalEmployees: number;
  payrollCount: number;
  signedCount: number;
  signedPercentage: string;
  totalSalary: number;
  averageSalary: number;
}

interface DepartmentChartsTabProps {
  stats: DepartmentStats;
  salaryDistribution: SalaryRange[];
  monthlyTrends: MonthlyTrend[];
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export default function DepartmentChartsTab({
  stats,
  salaryDistribution,
  monthlyTrends,
}: DepartmentChartsTabProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
              Phân Bố Lương
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer
              width="100%"
              height={200}
              className="sm:h-[250px]"
            >
              <BarChart data={salaryDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="range"
                  fontSize={10}
                  tick={{ fontSize: 10 }}
                  className="sm:text-sm"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  fontSize={10}
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
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <PieChart className="w-4 h-4 sm:w-5 sm:h-5" />
              Tỷ Lệ Ký Lương
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer
              width="100%"
              height={200}
              className="sm:h-[250px]"
            >
              <RechartsPieChart>
                <Tooltip
                  contentStyle={{
                    fontSize: "12px",
                    padding: "8px",
                    borderRadius: "6px",
                  }}
                />
                <Pie
                  data={[
                    { name: "Đã ký", value: stats.signedCount },
                    {
                      name: "Chưa ký",
                      value: stats.payrollCount - stats.signedCount,
                    },
                  ]}
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  className="sm:outerRadius-80"
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {[
                    { name: "Đã ký", value: stats.signedCount },
                    {
                      name: "Chưa ký",
                      value: stats.payrollCount - stats.signedCount,
                    },
                  ].map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {monthlyTrends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">
              Xu Hướng Lương Theo Tháng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer
              width="100%"
              height={250}
              className="sm:h-[300px]"
            >
              <BarChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  fontSize={10}
                  tick={{ fontSize: 10 }}
                  className="sm:text-sm"
                />
                <YAxis
                  fontSize={10}
                  tick={{ fontSize: 10 }}
                  className="sm:text-sm"
                />
                <Tooltip
                  formatter={(value, name) => [
                    name === "averageSalary"
                      ? formatCurrency(value as number)
                      : value,
                    name === "averageSalary" ? "Lương TB" : "Số NV",
                  ]}
                  contentStyle={{
                    fontSize: "12px",
                    padding: "8px",
                    borderRadius: "6px",
                  }}
                />
                <Bar dataKey="averageSalary" fill="#8884d8" name="Lương TB" />
                <Bar dataKey="employeeCount" fill="#82ca9d" name="Số NV" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
