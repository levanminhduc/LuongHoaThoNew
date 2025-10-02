"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
  totalWorkDays?: number;
  totalOvertimeHours?: number;
  totalAllowances?: number;
  totalDeductions?: number;
}

interface SalaryAnalysisTabProps {
  stats: DepartmentStats;
  salaryDistribution: SalaryRange[];
  monthlyTrends: MonthlyTrend[];
}

export default function SalaryAnalysisTab({
  stats,
  salaryDistribution,
  monthlyTrends,
}: SalaryAnalysisTabProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Salary Components Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">
              Phân Tích Thành Phần Lương
            </CardTitle>
            <CardDescription className="text-sm">
              Tổng quan các khoản thu nhập và khấu trừ
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Income Components */}
              <div>
                <h4 className="font-medium text-sm mb-3 text-green-700">
                  Thu Nhập
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Tổng lương cơ bản</span>
                    <span className="font-medium">
                      {((stats.totalSalary || 0) / 1000000).toFixed(1)}M
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Phụ cấp & hỗ trợ</span>
                    <span className="font-medium">
                      {((stats.totalAllowances || 0) / 1000000).toFixed(1)}M
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{
                        width: `${stats.totalSalary > 0 ? ((stats.totalAllowances || 0) / stats.totalSalary) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Phụ cấp chiếm{" "}
                    {stats.totalSalary > 0
                      ? (
                          ((stats.totalAllowances || 0) / stats.totalSalary) *
                          100
                        ).toFixed(1)
                      : 0}
                    % tổng lương
                  </p>
                </div>
              </div>

              {/* Deduction Components */}
              <div>
                <h4 className="font-medium text-sm mb-3 text-red-700">
                  Khấu Trừ
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">BHXH, BHTN, BHYT</span>
                    <span className="font-medium">
                      {(((stats.totalDeductions || 0) * 0.6) / 1000000).toFixed(
                        1,
                      )}
                      M
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Thuế TNCN</span>
                    <span className="font-medium">
                      {(((stats.totalDeductions || 0) * 0.3) / 1000000).toFixed(
                        1,
                      )}
                      M
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Tạm ứng & khác</span>
                    <span className="font-medium">
                      {(((stats.totalDeductions || 0) * 0.1) / 1000000).toFixed(
                        1,
                      )}
                      M
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-red-600 h-2 rounded-full"
                      style={{
                        width: `${stats.totalSalary > 0 ? ((stats.totalDeductions || 0) / stats.totalSalary) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Khấu trừ chiếm{" "}
                    {stats.totalSalary > 0
                      ? (
                          ((stats.totalDeductions || 0) / stats.totalSalary) *
                          100
                        ).toFixed(1)
                      : 0}
                    % tổng lương
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">
              Thống Kê Thời Gian
            </CardTitle>
            <CardDescription className="text-sm">
              Phân tích ngày công và giờ tăng ca
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.totalWorkDays || 0}
                  </div>
                  <div className="text-xs text-blue-600">Tổng ngày công</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {stats.totalOvertimeHours || 0}
                  </div>
                  <div className="text-xs text-orange-600">
                    Tổng giờ tăng ca
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Ngày công TB/người</span>
                    <span className="font-medium">
                      {stats.payrollCount > 0
                        ? (
                            (stats.totalWorkDays || 0) / stats.payrollCount
                          ).toFixed(1)
                        : 0}{" "}
                      ngày
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${Math.min(100, ((stats.totalWorkDays || 0) / (stats.payrollCount * 22)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Giờ TC TB/người</span>
                    <span className="font-medium">
                      {stats.payrollCount > 0
                        ? (
                            (stats.totalOvertimeHours || 0) / stats.payrollCount
                          ).toFixed(1)
                        : 0}{" "}
                      giờ
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-orange-600 h-2 rounded-full"
                      style={{
                        width: `${Math.min(100, ((stats.totalOvertimeHours || 0) / (stats.payrollCount * 40)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Original Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">
              Phân Bố Lương
            </CardTitle>
            <CardDescription className="text-sm">
              Số lượng nhân viên theo khoảng lương
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4">
              {salaryDistribution.map((range) => (
                <div key={range.range} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm font-medium truncate flex-1 mr-2">
                      {range.range}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold min-w-[2rem] text-right">
                      {range.count}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
                    <div
                      className="bg-blue-600 h-2 sm:h-3 rounded-full transition-all duration-300"
                      style={{
                        width: `${stats.payrollCount > 0 ? (range.count / stats.payrollCount) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {stats.payrollCount > 0
                        ? ((range.count / stats.payrollCount) * 100).toFixed(1)
                        : 0}
                      %
                    </span>
                    <span>{range.count} người</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">
              Xu Hướng 6 Tháng
            </CardTitle>
            <CardDescription className="text-sm">
              Lương trung bình và tỷ lệ ký theo tháng
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4">
              {monthlyTrends.slice(-6).map((trend) => (
                <div key={trend.month} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm font-medium">
                      {trend.month}
                    </span>
                    <div className="text-right">
                      <div className="text-sm sm:text-base font-semibold">
                        {(trend.averageSalary / 1000).toFixed(0)}K
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {trend.signedPercentage}% ký
                      </div>
                    </div>
                  </div>

                  {/* Progress bar for signing percentage */}
                  <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                    <div
                      className="bg-green-600 h-1.5 sm:h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${parseFloat(trend.signedPercentage)}%`,
                      }}
                    />
                  </div>

                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{trend.employeeCount} nhân viên</span>
                    <span>{trend.signedCount} đã ký</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
