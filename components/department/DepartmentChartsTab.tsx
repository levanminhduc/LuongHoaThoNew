"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart as RechartsPieChart, Pie, Cell } from "recharts"
import { BarChart3, PieChart } from "lucide-react"

interface SalaryRange {
  range: string
  min: number
  max: number
  count: number
}

interface MonthlyTrend {
  month: string
  totalSalary: number
  employeeCount: number
  signedCount: number
  averageSalary: number
  signedPercentage: string
}

interface DepartmentStats {
  totalEmployees: number
  payrollCount: number
  signedCount: number
  signedPercentage: string
  totalSalary: number
  averageSalary: number
}

interface DepartmentChartsTabProps {
  stats: DepartmentStats
  salaryDistribution: SalaryRange[]
  monthlyTrends: MonthlyTrend[]
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

export default function DepartmentChartsTab({ 
  stats, 
  salaryDistribution, 
  monthlyTrends 
}: DepartmentChartsTabProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount)
  }

  return (
    <div className="space-y-6">
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
              <BarChart data={salaryDistribution}>
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
                  data={[
                    { name: 'Đã ký', value: stats.signedCount },
                    { name: 'Chưa ký', value: stats.payrollCount - stats.signedCount }
                  ]}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[
                    { name: 'Đã ký', value: stats.signedCount },
                    { name: 'Chưa ký', value: stats.payrollCount - stats.signedCount }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
            <CardTitle>Xu Hướng Lương Theo Tháng</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'averageSalary' ? formatCurrency(value as number) : value,
                    name === 'averageSalary' ? 'Lương TB' : 'Số NV'
                  ]}
                />
                <Bar dataKey="averageSalary" fill="#8884d8" name="Lương TB" />
                <Bar dataKey="employeeCount" fill="#82ca9d" name="Số NV" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
