"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, DollarSign, FileCheck, TrendingUp } from "lucide-react"

interface DepartmentStats {
  totalEmployees: number
  payrollCount: number
  signedCount: number
  signedPercentage: string
  totalSalary: number
  averageSalary: number
}

interface DepartmentSummaryCardsProps {
  stats: DepartmentStats
  month: string
}

export default function DepartmentSummaryCards({ stats, month }: DepartmentSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tổng Nhân Viên</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalEmployees}</div>
          <p className="text-xs text-muted-foreground">
            {stats.payrollCount} có bảng lương
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tỷ Lệ Ký</CardTitle>
          <FileCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.signedPercentage}%</div>
          <p className="text-xs text-muted-foreground">
            {stats.signedCount}/{stats.payrollCount} đã ký
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tổng Lương</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {(stats.totalSalary / 1000000).toFixed(1)}M
          </div>
          <p className="text-xs text-muted-foreground">
            VND tháng {month}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Lương TB</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {(stats.averageSalary / 1000).toFixed(0)}K
          </div>
          <p className="text-xs text-muted-foreground">
            VND/người
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
