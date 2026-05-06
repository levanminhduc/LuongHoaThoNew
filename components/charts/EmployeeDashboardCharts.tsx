"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ChartPoint {
  month: string;
  grossSalary: number;
  netSalary: number;
  tax: number;
  insurance: number;
}

export default function EmployeeDashboardCharts({
  data,
}: {
  data: ChartPoint[];
}) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip
          formatter={(value: number) => [`${value.toFixed(1)}M VND`, ""]}
          labelFormatter={(label) => `Tháng ${label}`}
        />
        <Line
          type="monotone"
          dataKey="grossSalary"
          stroke="#8884d8"
          strokeWidth={2}
          name="Lương gốc"
        />
        <Line
          type="monotone"
          dataKey="netSalary"
          stroke="#82ca9d"
          strokeWidth={2}
          name="Lương thực nhận"
        />
        <Line
          type="monotone"
          dataKey="tax"
          stroke="#ff7300"
          strokeWidth={2}
          name="Thuế TNCN"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
