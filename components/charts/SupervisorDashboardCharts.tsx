"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
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

interface DepartmentStats {
  totalEmployees: number;
  signedCount: number;
  signedPercentage: string;
  totalSalary: number;
  averageSalary: number;
}

interface TrendItem {
  month: string;
  monthLabel: string;
  totalEmployees: number;
  signedCount: number;
  signedPercentage: number;
  totalSalary: number;
}

type SupervisorDashboardChartsProps =
  | {
      type: "signature";
      departmentStats: DepartmentStats | null;
    }
  | {
      type: "trend";
      monthlyTrend: TrendItem[];
    };

export default function SupervisorDashboardCharts(
  props: SupervisorDashboardChartsProps,
) {
  if (props.type === "signature") {
    const departmentStats = props.departmentStats;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">
            Tình Trạng Ký Lương
          </CardTitle>
          <CardDescription className="text-sm">
            Phân bố theo trạng thái ký
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[220px] sm:h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  {
                    name: "Đã ký",
                    count: departmentStats?.signedCount || 0,
                    percentage: parseFloat(
                      departmentStats?.signedPercentage || "0",
                    ),
                  },
                  {
                    name: "Chưa ký",
                    count:
                      (departmentStats?.totalEmployees || 0) -
                      (departmentStats?.signedCount || 0),
                    percentage:
                      100 -
                      parseFloat(departmentStats?.signedPercentage || "0"),
                  },
                ]}
              >
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
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Xu Hướng Tỷ Lệ Ký</CardTitle>
          <CardDescription>6 tháng gần nhất</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[220px] sm:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={props.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="monthLabel" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="signedPercentage"
                  stroke="#8884d8"
                  strokeWidth={2}
                  name="Tỷ lệ ký (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Xu Hướng Tổng Lương</CardTitle>
          <CardDescription>6 tháng gần nhất (triệu VND)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[220px] sm:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={props.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="monthLabel" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="totalSalary"
                  stroke="#82ca9d"
                  strokeWidth={2}
                  name="Tổng lương (M VND)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
