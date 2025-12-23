"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  DollarSign,
  FileCheck,
  TrendingUp,
  Clock,
  Zap,
  Gift,
  Minus,
} from "lucide-react";

interface DepartmentStats {
  totalEmployees: number;
  payrollCount: number;
  signedCount: number;
  signedPercentage: string;
  totalSalary: number;
  averageSalary: number;
  // Thêm các stats mới
  totalWorkDays?: number;
  totalOvertimeHours?: number;
  totalAllowances?: number;
  totalDeductions?: number;
}

interface DepartmentSummaryCardsProps {
  stats: DepartmentStats;
  month: string;
  payrollType?: "monthly" | "t13";
}

export default function DepartmentSummaryCards({
  stats,
  month,
  payrollType = "monthly",
}: DepartmentSummaryCardsProps) {
  const isT13 = payrollType === "t13";

  return (
    <div className="space-y-4">
      {/* Row 1: Basic Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">
              Tổng Nhân Viên
            </CardTitle>
            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            <div className="text-base sm:text-xl lg:text-2xl font-bold">
              {stats.totalEmployees}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {stats.payrollCount} có bảng lương
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">
              Tỷ Lệ Ký
            </CardTitle>
            <FileCheck className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            <div className="text-base sm:text-xl lg:text-2xl font-bold">
              {stats.signedPercentage}%
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {stats.signedCount}/{stats.payrollCount} đã ký
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">
              {isT13 ? "Tổng Lương T13" : "Tổng Lương"}
            </CardTitle>
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            <div className="text-base sm:text-xl lg:text-2xl font-bold">
              {(stats.totalSalary / 1000000).toFixed(1)}M
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {isT13 ? `VND lương T13` : `VND tháng ${month}`}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">
              {isT13 ? "Lương TB T13" : "Lương TB"}
            </CardTitle>
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            <div className="text-base sm:text-xl lg:text-2xl font-bold">
              {(stats.averageSalary / 1000).toFixed(0)}K
            </div>
            <p className="text-xs text-muted-foreground truncate">VND/người</p>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Detailed Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">
              Tổng Ngày Công
            </CardTitle>
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            <div className="text-base sm:text-xl lg:text-2xl font-bold">
              {stats.totalWorkDays || 0}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              Ngày công tháng {month}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">
              Tổng Giờ TC
            </CardTitle>
            <Zap className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            <div className="text-base sm:text-xl lg:text-2xl font-bold">
              {stats.totalOvertimeHours || 0}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              Giờ tăng ca tháng {month}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">
              Tổng Phụ Cấp
            </CardTitle>
            <Gift className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            <div className="text-base sm:text-xl lg:text-2xl font-bold">
              {((stats.totalAllowances || 0) / 1000000).toFixed(1)}M
            </div>
            <p className="text-xs text-muted-foreground truncate">
              VND tháng {month}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">
              Tổng Khấu Trừ
            </CardTitle>
            <Minus className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            <div className="text-base sm:text-xl lg:text-2xl font-bold">
              {((stats.totalDeductions || 0) / 1000000).toFixed(1)}M
            </div>
            <p className="text-xs text-muted-foreground truncate">
              VND tháng {month}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
