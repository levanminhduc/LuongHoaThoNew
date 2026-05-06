"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  DollarSign,
  FileCheck,
  Eye,
  TrendingUp,
  Download,
  Loader2,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatVietnamMonthLabel,
  getPayrollMonthOptionsWithT13,
  getPreviousMonth,
  getRecentMonthValues,
} from "@/utils/dateUtils";
import { PayrollDetailModal } from "@/app/employee/lookup/payroll-detail-modal";
import { PayrollDetailModalT13 } from "@/app/employee/lookup/payroll-detail-modal-t13";
import DepartmentDetailModalRefactored from "@/components/department/DepartmentDetailModalRefactored";
import {
  transformPayrollRecordToResult,
  type PayrollResult,
} from "@/lib/utils/payroll-transformer";
import { PageLoading } from "@/components/patterns/skeleton-patterns";
import {
  payrollExportFilenamePrefix,
  usePayrollExportMutation,
  useSupervisorPayrollQuery,
  useSupervisorStatsQuery,
  useSupervisorTrendQuery,
} from "@/lib/hooks/use-role-payroll";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

const SupervisorDashboardCharts = dynamic(
  () => import("./charts/SupervisorDashboardCharts"),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[300px] w-full" />,
  },
);

interface User {
  employee_id: string;
  username: string;
  role: string;
  department: string;
  permissions: string[];
}

interface SupervisorDashboardProps {
  user: User;
}

export default function SupervisorDashboard({
  user,
}: SupervisorDashboardProps) {
  const searchParams = useSearchParams();
  const [selectedMonth, setSelectedMonth] =
    useState<string>(getPreviousMonth());
  const trendMonths = getRecentMonthValues(6);
  const payrollQuery = useSupervisorPayrollQuery(selectedMonth);
  const statsQuery = useSupervisorStatsQuery(selectedMonth);
  const trendQuery = useSupervisorTrendQuery(trendMonths);
  const exportMutation = usePayrollExportMutation();
  const payrollData = payrollQuery.data?.data ?? [];
  const departmentStats = statsQuery.data?.statistics ?? null;
  const monthlyTrend = trendQuery.data ?? [];
  const loading = payrollQuery.isLoading || statsQuery.isLoading;
  const exportingExcel = exportMutation.isPending;
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [showPayrollModalT13, setShowPayrollModalT13] = useState(false);
  const [selectedPayrollData, setSelectedPayrollData] =
    useState<PayrollResult | null>(null);

  const [showT13Modal, setShowT13Modal] = useState(false);
  const [t13PayrollData, setT13PayrollData] = useState<PayrollResult | null>(
    null,
  );
  const [showT13PayrollDetail, setShowT13PayrollDetail] = useState(false);

  useEffect(() => {
    const tab = searchParams?.get("tab");
    if (tab === "t13") {
      setShowT13Modal(true);
    }
  }, [searchParams]);

  const handleViewEmployee = (employeeId: string) => {
    const payrollRecord = payrollData.find((p) => p.employee_id === employeeId);
    if (payrollRecord?.employees) {
      const payrollResult = transformPayrollRecordToResult(
        payrollRecord as Parameters<typeof transformPayrollRecordToResult>[0],
      );
      payrollResult.source_file = "Supervisor Dashboard";

      if (selectedMonth.endsWith("-13")) {
        payrollResult.payroll_type = "t13";
        setSelectedPayrollData(payrollResult);
        setShowPayrollModalT13(true);
      } else {
        setSelectedPayrollData(payrollResult);
        setShowPayrollModal(true);
      }
    }
  };

  const handleViewT13Employee = (payrollResult: PayrollResult) => {
    setT13PayrollData(payrollResult);
    setShowT13PayrollDetail(true);
  };

  const handleExportExcel = async (
    exportType: "employees" | "overview" | "trends" = "employees",
  ) => {
    try {
      await exportMutation.mutateAsync({
        selectedMonth,
        department: user.department,
        filenamePrefix: payrollExportFilenamePrefix({
          selectedMonth,
          department: user.department,
          exportType,
        }),
      });
    } catch (error) {
      console.error("Error exporting Excel:", error);
    }
  };

  const getStatusColor = (isSigned: boolean) => {
    return isSigned ? "default" : "secondary";
  };

  const getChucVuBadge = (
    chucVu: string,
  ): "default" | "secondary" | "destructive" | "outline" => {
    const colors = {
      nhan_vien: "secondary" as const,
      to_truong: "default" as const,
      truong_phong: "destructive" as const,
    };
    return colors[chucVu as keyof typeof colors] || "secondary";
  };

  if (loading) {
    return <PageLoading variant="dashboard" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Dashboard Tổ Trưởng
          </h1>
          <p className="text-sm text-gray-600">
            Xin chào, {user.username} | Department: {user.department}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getPayrollMonthOptionsWithT13(2).map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className={
                    option.value.endsWith("-13")
                      ? "text-amber-600 font-semibold"
                      : ""
                  }
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overview Stats */}
      {departmentStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium truncate">
                Tổng Nhân Viên
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">
                {departmentStats.totalEmployees}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                Department {departmentStats.department}
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium truncate">
                {selectedMonth.endsWith("-13")
                  ? "Tổng Lương T13"
                  : "Tổng Lương"}
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">
                {(departmentStats.totalSalary / 1000000).toFixed(1)}M
              </div>
              <p className="text-xs text-muted-foreground truncate">
                VND {formatVietnamMonthLabel(selectedMonth)}
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium truncate">
                Đã Ký
              </CardTitle>
              <FileCheck className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">
                {departmentStats.signedPercentage}%
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {departmentStats.signedCount}/{departmentStats.totalEmployees}{" "}
                nhân viên
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium truncate">
                Lương TB
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">
                {(departmentStats.averageSalary / 1000).toFixed(0)}K
              </div>
              <p className="text-xs text-muted-foreground truncate">
                VND/người/tháng
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="employees" className="space-y-4 sm:space-y-6">
        <TabsList className="flex flex-wrap w-full h-auto gap-2 bg-muted p-1">
          <TabsTrigger
            value="overview"
            className="flex-1 min-w-[100px] text-xs sm:text-sm px-2 py-2.5 touch-manipulation data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            <span className="hidden sm:inline">Tổng Quan</span>
            <span className="sm:hidden">Tổng Quan</span>
          </TabsTrigger>
          <TabsTrigger
            value="employees"
            className="flex-1 min-w-[100px] text-xs sm:text-sm px-2 py-2.5 touch-manipulation data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            <span className="hidden sm:inline">Danh Sách Nhân Viên</span>
            <span className="sm:hidden">Nhân Viên</span>
          </TabsTrigger>
          <TabsTrigger
            value="trends"
            className="flex-1 min-w-[100px] text-xs sm:text-sm px-2 py-2.5 touch-manipulation data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            <span className="hidden sm:inline">Xu Hướng</span>
            <span className="sm:hidden">Xu Hướng</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h3 className="text-base sm:text-lg font-semibold">
                Tổng Quan Department
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Thống kê tổng quan {formatVietnamMonthLabel(selectedMonth)}
              </p>
            </div>
            <Button
              onClick={() => handleExportExcel("overview")}
              disabled={exportingExcel}
              variant="outline"
              className="flex items-center gap-2 w-full sm:w-auto min-h-[44px] sm:h-9 sm:min-h-0 touch-manipulation"
            >
              {exportingExcel ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="hidden sm:inline">Đang xuất...</span>
                  <span className="sm:hidden">Xuất...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Xuất Tổng Quan</span>
                  <span className="sm:hidden">Xuất</span>
                </>
              )}
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <SupervisorDashboardCharts
              type="signature"
              departmentStats={departmentStats}
            />

            <Card>
              <CardHeader>
                <CardTitle>Thông Tin Department</CardTitle>
                <CardDescription>Chi tiết về {user.department}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Tổng nhân viên
                    </p>
                    <p className="text-2xl font-bold">
                      {departmentStats?.totalEmployees || 0}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Tỷ lệ ký</p>
                    <p className="text-2xl font-bold">
                      {departmentStats?.signedPercentage || 0}%
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Tổng lương</p>
                    <p className="text-lg font-semibold">
                      {((departmentStats?.totalSalary || 0) / 1000000).toFixed(
                        1,
                      )}
                      M VND
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Lương trung bình
                    </p>
                    <p className="text-lg font-semibold">
                      {((departmentStats?.averageSalary || 0) / 1000).toFixed(
                        0,
                      )}
                      K VND
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="employees" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-base sm:text-lg">
                  {selectedMonth.endsWith("-13")
                    ? "Danh Sách Nhân Viên (Lương T13)"
                    : "Danh Sách Nhân Viên"}{" "}
                  - {user.department}
                </CardTitle>
                <CardDescription className="text-sm">
                  {formatVietnamMonthLabel(selectedMonth)}
                </CardDescription>
              </div>
              <Button
                onClick={() => handleExportExcel("employees")}
                disabled={exportingExcel}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto min-h-[44px] sm:h-9 sm:min-h-0 touch-manipulation"
              >
                {exportingExcel ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="hidden sm:inline">Đang xuất...</span>
                    <span className="sm:hidden">Xuất...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Xuất Excel</span>
                    <span className="sm:hidden">Xuất</span>
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="block lg:hidden space-y-3">
                {payrollData.map((payroll, index) => (
                  <Card key={payroll.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">
                            {payroll.employees?.full_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            #{index + 1} • Mã: {payroll.employee_id}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleViewEmployee(payroll.employee_id)
                          }
                          className="ml-2 h-11 w-11 sm:h-8 sm:w-8 p-0 touch-manipulation"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">
                            Chức vụ:
                          </span>
                          <Badge
                            variant={getChucVuBadge(
                              payroll.employees?.chuc_vu || "nhan_vien",
                            )}
                            className="ml-1 text-xs"
                          >
                            {payroll.employees?.chuc_vu === "nhan_vien"
                              ? "NV"
                              : payroll.employees?.chuc_vu === "to_truong"
                                ? "TT"
                                : payroll.employees?.chuc_vu === "truong_phong"
                                  ? "TP"
                                  : payroll.employees?.chuc_vu}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Trạng thái:
                          </span>
                          <Badge
                            variant={getStatusColor(payroll.is_signed)}
                            className="ml-1 text-xs"
                          >
                            {payroll.is_signed ? "Đã ký" : "Chưa ký"}
                          </Badge>
                        </div>
                        {selectedMonth.endsWith("-13") ? (
                          <>
                            <div>
                              <span className="text-muted-foreground">
                                Số Tháng:
                              </span>
                              <p className="font-medium mt-1">
                                {payroll.so_thang_chia_13 || 0}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Tổng SP 12T:
                              </span>
                              <p className="font-medium mt-1">
                                {formatCurrency(payroll.tong_sp_12_thang || 0)}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Chi Đợt 1:
                              </span>
                              <p className="font-medium mt-1">
                                {formatCurrency(payroll.chi_dot_1_13 || 0)}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Chi Đợt 2:
                              </span>
                              <p className="font-medium mt-1">
                                {formatCurrency(payroll.chi_dot_2_13 || 0)}
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <span className="text-muted-foreground">
                                Ngày công:
                              </span>
                              <p className="font-medium mt-1">
                                {payroll.ngay_cong_trong_gio || 0} ngày
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Thưởng Chuyên Cần:
                              </span>
                              <p className="font-medium mt-1">
                                {formatCurrency(
                                  payroll.tien_khen_thuong_chuyen_can || 0,
                                )}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Hệ số LV:
                              </span>
                              <p className="font-medium mt-1">
                                {(payroll.he_so_lam_viec || 0).toFixed(2)}
                              </p>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="pt-2 border-t">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {selectedMonth.endsWith("-13")
                                ? "Tổng Lương T13"
                                : "Lương thực nhận"}
                            </p>
                            <p className="text-sm font-semibold">
                              {formatCurrency(
                                selectedMonth.endsWith("-13")
                                  ? payroll.tong_luong_13 || 0
                                  : payroll.tien_luong_thuc_nhan_cuoi_ky || 0,
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center w-16">STT</TableHead>
                      <TableHead className="text-left min-w-[100px]">
                        Mã NV
                      </TableHead>
                      <TableHead className="text-left min-w-[150px]">
                        Họ Tên
                      </TableHead>
                      <TableHead className="text-left min-w-[120px]">
                        Chức Vụ
                      </TableHead>
                      {selectedMonth.endsWith("-13") ? (
                        <>
                          <TableHead className="text-center min-w-[80px]">
                            Số Tháng
                          </TableHead>
                          <TableHead className="text-right min-w-[140px]">
                            Tổng SP 12 Tháng
                          </TableHead>
                          <TableHead className="text-right min-w-[120px]">
                            Chi Đợt 1
                          </TableHead>
                          <TableHead className="text-right min-w-[120px]">
                            Chi Đợt 2
                          </TableHead>
                          <TableHead className="text-right min-w-[140px]">
                            Tổng Lương T13
                          </TableHead>
                        </>
                      ) : (
                        <>
                          <TableHead className="text-center min-w-[90px]">
                            Ngày Công
                          </TableHead>
                          <TableHead className="text-right min-w-[120px]">
                            Thưởng Chuyên Cần
                          </TableHead>
                          <TableHead className="text-center min-w-[80px]">
                            Hệ Số LV
                          </TableHead>
                          <TableHead className="text-right min-w-[140px]">
                            Lương Thực Nhận
                          </TableHead>
                        </>
                      )}
                      <TableHead className="text-center min-w-[100px]">
                        Trạng Thái
                      </TableHead>
                      <TableHead className="text-center min-w-[80px]">
                        Thao Tác
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollData.map((payroll, index) => (
                      <TableRow key={payroll.id}>
                        <TableCell className="text-center font-medium text-gray-500">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-medium font-mono text-xs sm:text-sm">
                          {payroll.employee_id}
                        </TableCell>
                        <TableCell>{payroll.employees?.full_name}</TableCell>
                        <TableCell>
                          <Badge
                            variant={getChucVuBadge(
                              payroll.employees?.chuc_vu || "nhan_vien",
                            )}
                          >
                            {payroll.employees?.chuc_vu === "nhan_vien"
                              ? "Nhân viên"
                              : payroll.employees?.chuc_vu === "to_truong"
                                ? "Tổ trưởng"
                                : payroll.employees?.chuc_vu === "truong_phong"
                                  ? "Trưởng phòng"
                                  : payroll.employees?.chuc_vu}
                          </Badge>
                        </TableCell>
                        {selectedMonth.endsWith("-13") ? (
                          <>
                            <TableCell className="text-center font-medium">
                              {payroll.so_thang_chia_13 || 0}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(payroll.tong_sp_12_thang || 0)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(payroll.chi_dot_1_13 || 0)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(payroll.chi_dot_2_13 || 0)}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(payroll.tong_luong_13 || 0)}
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="text-center font-medium">
                              {payroll.ngay_cong_trong_gio || 0} ngày
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(
                                payroll.tien_khen_thuong_chuyen_can || 0,
                              )}
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {(payroll.he_so_lam_viec || 0).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(
                                payroll.tien_luong_thuc_nhan_cuoi_ky || 0,
                              )}
                            </TableCell>
                          </>
                        )}
                        <TableCell className="text-center">
                          <Badge variant={getStatusColor(payroll.is_signed)}>
                            {payroll.is_signed ? "Đã ký" : "Chưa ký"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleViewEmployee(payroll.employee_id)
                            }
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-semibold">Xu Hướng Department</h3>
              <p className="text-sm text-muted-foreground">
                Phân tích xu hướng 6 tháng gần nhất
              </p>
            </div>
            <Button
              onClick={() => handleExportExcel("trends")}
              disabled={exportingExcel}
              variant="outline"
              className="flex items-center gap-2 w-full sm:w-auto min-h-[44px] sm:h-9 sm:min-h-0 touch-manipulation"
            >
              {exportingExcel ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang xuất...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Xuất Xu Hướng
                </>
              )}
            </Button>
          </div>

          <SupervisorDashboardCharts type="trend" monthlyTrend={monthlyTrend} />
        </TabsContent>
      </Tabs>
      {selectedPayrollData && (
        <>
          <PayrollDetailModal
            isOpen={showPayrollModal}
            onClose={() => {
              setShowPayrollModal(false);
              setSelectedPayrollData(null);
            }}
            payrollData={selectedPayrollData}
          />
          <PayrollDetailModalT13
            isOpen={showPayrollModalT13}
            onClose={() => {
              setShowPayrollModalT13(false);
              setSelectedPayrollData(null);
            }}
            payrollData={selectedPayrollData}
          />
        </>
      )}

      {/* Department Detail Modal for T13 */}
      <DepartmentDetailModalRefactored
        isOpen={showT13Modal}
        onClose={() => setShowT13Modal(false)}
        departmentName={user.department}
        month={selectedMonth}
        initialPayrollType="t13"
        onViewEmployee={handleViewT13Employee}
      />

      {/* T13 Payroll Detail Modal */}
      {t13PayrollData && (
        <PayrollDetailModalT13
          isOpen={showT13PayrollDetail}
          onClose={() => {
            setShowT13PayrollDetail(false);
            setT13PayrollData(null);
          }}
          payrollData={t13PayrollData}
        />
      )}
    </div>
  );
}
