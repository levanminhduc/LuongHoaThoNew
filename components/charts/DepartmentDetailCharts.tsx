"use client";

import { BarChart3, PieChart } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface SalaryRange {
  range: string;
  count: number;
}

interface MonthlyTrend {
  month: string;
  averageSalary: number;
  employeeCount: number;
}

interface DepartmentChartsData {
  salaryDistribution: SalaryRange[];
  monthlyTrends: MonthlyTrend[];
  stats: {
    signedCount: number;
    payrollCount: number;
  };
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

export default function DepartmentDetailCharts({
  departmentData,
}: {
  departmentData: DepartmentChartsData;
}) {
  const signedData = [
    {
      name: "Đã ký",
      value: departmentData.stats.signedCount,
    },
    {
      name: "Chưa ký",
      value:
        departmentData.stats.payrollCount - departmentData.stats.signedCount,
    },
  ];

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Phân Bố Lương
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={departmentData.salaryDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-4 h-4" />
              Tỷ Lệ Ký Lương
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <RechartsPieChart>
                <Tooltip />
                <Pie
                  data={signedData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {signedData.map((_, index) => (
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

      {departmentData.monthlyTrends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Xu Hướng Lương Theo Tháng</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={departmentData.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value, name) => [
                    name === "averageSalary"
                      ? formatCurrency(value as number)
                      : value,
                    name === "averageSalary" ? "Lương TB" : "Số NV",
                  ]}
                />
                <Bar dataKey="averageSalary" fill="#8884d8" name="Lương TB" />
                <Bar dataKey="employeeCount" fill="#82ca9d" name="Số NV" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </>
  );
}
