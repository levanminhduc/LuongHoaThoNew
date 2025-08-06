"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

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

interface SalaryAnalysisTabProps {
  stats: DepartmentStats
  salaryDistribution: SalaryRange[]
  monthlyTrends: MonthlyTrend[]
}

export default function SalaryAnalysisTab({ 
  stats, 
  salaryDistribution, 
  monthlyTrends 
}: SalaryAnalysisTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Phân Bố Lương</CardTitle>
          <CardDescription>Số lượng nhân viên theo khoảng lương</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {salaryDistribution.map((range, index) => (
              <div key={range.range} className="flex justify-between items-center">
                <span className="text-sm">{range.range}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${stats.payrollCount > 0 ? (range.count / stats.payrollCount) * 100 : 0}%`
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8">{range.count}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Xu Hướng 6 Tháng</CardTitle>
          <CardDescription>Lương trung bình và tỷ lệ ký theo tháng</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {monthlyTrends.slice(-6).map((trend) => (
              <div key={trend.month} className="flex justify-between items-center">
                <span className="text-sm">{trend.month}</span>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {(trend.averageSalary / 1000).toFixed(0)}K
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {trend.signedPercentage}% ký
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
