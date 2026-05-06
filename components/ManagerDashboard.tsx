"use client";

import dynamic from "next/dynamic";
import { useState, useMemo } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  Users,
  DollarSign,
  FileCheck,
  Eye,
  Download,
} from "lucide-react";
import { DepartmentDetailModalRefactored } from "./department";
import {
  formatVietnamMonthLabel,
  getPayrollMonthOptionsWithT13,
  getPreviousMonth,
} from "@/utils/dateUtils";
import { PayrollDetailModal } from "@/app/employee/lookup/payroll-detail-modal";
import { PayrollDetailModalT13 } from "@/app/employee/lookup/payroll-detail-modal-t13";
import {
  transformPayrollRecordToResult,
  type PayrollResult,
} from "@/lib/utils/payroll-transformer";
import { PageLoading } from "@/components/patterns/skeleton-patterns";
import {
  payrollExportFilenamePrefix,
  useManagerDepartmentsQuery,
  useManagerPayrollQuery,
  usePayrollExportMutation,
} from "@/lib/hooks/use-role-payroll";

const ManagerDashboardCharts = dynamic(
  () => import("./charts/ManagerDashboardCharts"),
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
  allowed_departments?: string[];
  permissions: string[];
}

interface ManagerDashboardProps {
  user: User;
}

export default function ManagerDashboard({ user }: ManagerDashboardProps) {
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] =
    useState<string>(getPreviousMonth());
  const departmentsQuery = useManagerDepartmentsQuery(selectedMonth);
  const payrollQuery = useManagerPayrollQuery(
    selectedMonth,
    selectedDepartment,
  );
  const exportMutation = usePayrollExportMutation();
  const departments = departmentsQuery.data?.departments ?? [];
  const payrollData = payrollQuery.data?.data ?? [];
  const loading = departmentsQuery.isLoading;
  const exportingData =
    exportMutation.isPending && !exportMutation.variables?.department;
  const exportingDepartment =
    exportMutation.isPending && exportMutation.variables?.department
      ? exportMutation.variables.department
      : null;

  // Department Detail Modal state
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDepartmentForDetail, setSelectedDepartmentForDetail] =
    useState<string>("");

  // Payroll Detail Modal state (from payroll tab)
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [showPayrollModalT13, setShowPayrollModalT13] = useState(false);
  const [selectedPayrollData, setSelectedPayrollData] =
    useState<PayrollResult | null>(null);

  // Payroll Detail Modal state (from department detail modal)
  const [showDepartmentPayrollModal, setShowDepartmentPayrollModal] =
    useState(false);
  const [showDepartmentPayrollModalT13, setShowDepartmentPayrollModalT13] =
    useState(false);
  const [selectedDepartmentPayrollData, setSelectedDepartmentPayrollData] =
    useState<PayrollResult | null>(null);

  const handleViewPayroll = (department: string) => {
    setSelectedDepartmentForDetail(department);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedDepartmentForDetail("");
  };

  const handleExportDepartment = async (departmentName: string) => {
    try {
      await exportMutation.mutateAsync({
        selectedMonth,
        department: departmentName,
        filenamePrefix: payrollExportFilenamePrefix({
          selectedMonth,
          department: departmentName,
        }),
      });
    } catch (error) {
      console.error("Error exporting department data:", error);
    }
  };

  const handleExportData = async () => {
    try {
      const department =
        selectedDepartment !== "all" ? selectedDepartment : undefined;
      await exportMutation.mutateAsync({
        selectedMonth,
        department,
        filenamePrefix: payrollExportFilenamePrefix({
          selectedMonth,
          department,
        }),
      });
    } catch (error) {
      console.error("Error exporting data:", error);
    }
  };

  const handleViewEmployee = (employeeId: string) => {
    // Find the payroll record for this employee
    const payrollRecord = payrollData.find((p) => p.employee_id === employeeId);
    if (payrollRecord && payrollRecord.employees) {
      // Transform to PayrollResult format and open modal
      const payrollResult = transformPayrollRecordToResult(
        payrollRecord as Parameters<typeof transformPayrollRecordToResult>[0],
      );
      // Set source file to indicate Manager Dashboard
      payrollResult.source_file = "Manager Dashboard";
      setSelectedPayrollData(payrollResult);
      if (payrollResult.payroll_type === "t13") {
        setShowPayrollModalT13(true);
      } else {
        setShowPayrollModal(true);
      }
    }
  };

  const handleViewEmployeeFromDepartment = (payrollData: PayrollResult) => {
    // Handle payroll detail modal from department detail modal
    setSelectedDepartmentPayrollData(payrollData);
    if (payrollData.payroll_type === "t13") {
      setShowDepartmentPayrollModalT13(true);
    } else {
      setShowDepartmentPayrollModal(true);
    }
  };

  const totalStats = useMemo(
    () =>
      departments.reduce(
        (acc, dept) => ({
          totalEmployees: acc.totalEmployees + dept.employeeCount,
          totalPayroll: acc.totalPayroll + dept.payrollCount,
          totalSigned: acc.totalSigned + dept.signedCount,
          totalSalary: acc.totalSalary + dept.totalSalary,
        }),
        { totalEmployees: 0, totalPayroll: 0, totalSigned: 0, totalSalary: 0 },
      ),
    [departments],
  );

  const chartData = useMemo(
    () =>
      departments.map((dept) => ({
        name: dept.name,
        employees: dept.employeeCount,
        signed: dept.signedCount,
        unsigned: dept.payrollCount - dept.signedCount,
        totalSalary: dept.totalSalary / 1000000,
      })),
    [departments],
  );

  const pieData = useMemo(
    () =>
      departments.map((dept) => ({
        name: dept.name,
        value: dept.totalSalary,
        percentage:
          totalStats.totalSalary > 0
            ? ((dept.totalSalary / totalStats.totalSalary) * 100).toFixed(1)
            : "0",
      })),
    [departments, totalStats.totalSalary],
  );

  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884D8",
    "#82CA9D",
  ];

  if (loading) {
    return <PageLoading variant="dashboard" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Dashboard Trưởng Phòng
          </h1>
          <p className="text-sm text-gray-600">
            Xin chào, {user.username} | Quản lý{" "}
            {user.allowed_departments?.length || 0} Bộ Phận
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-48">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium truncate">
              Tổng Departments
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {departments.length}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              Được phân quyền quản lý
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium truncate">
              Tổng Nhân Viên
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {totalStats.totalEmployees}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              Trong tất cả departments
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium truncate">
              {selectedMonth.endsWith("-13") ? "Tổng Lương T13" : "Tổng Lương"}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {(totalStats.totalSalary / 1000000).toFixed(1)}M
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
              {totalStats.totalPayroll > 0
                ? (
                    (totalStats.totalSigned / totalStats.totalPayroll) *
                    100
                  ).toFixed(1)
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {totalStats.totalSigned}/{totalStats.totalPayroll} bảng lương
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="departments" className="space-y-4 sm:space-y-6">
        <TabsList className="flex flex-wrap w-full h-auto gap-2 bg-muted p-1">
          <TabsTrigger
            value="overview"
            className="flex-1 min-w-[100px] text-xs sm:text-sm px-2 py-2.5 touch-manipulation data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            <span className="hidden sm:inline">Tổng Quan</span>
            <span className="sm:hidden">Tổng Quan</span>
          </TabsTrigger>
          <TabsTrigger
            value="departments"
            className="flex-1 min-w-[100px] text-xs sm:text-sm px-2 py-2.5 touch-manipulation data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            <span className="hidden sm:inline">Chi Tiết Các Bộ Phận</span>
            <span className="sm:hidden">Departments</span>
          </TabsTrigger>
          <TabsTrigger
            value="payroll"
            className="flex-1 min-w-[100px] text-xs sm:text-sm px-2 py-2.5 touch-manipulation data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            <span className="hidden sm:inline">Dữ Liệu Lương</span>
            <span className="sm:hidden">Lương</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 sm:space-y-6">
          <ManagerDashboardCharts
            chartData={chartData}
            pieData={pieData}
            colors={COLORS}
          />
        </TabsContent>

        <TabsContent value="departments" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {departments.map((dept) => (
              <Card
                key={dept.name}
                className="hover:shadow-md transition-shadow duration-200"
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <span className="truncate text-sm sm:text-base">
                      {dept.name}
                    </span>
                    <Badge
                      variant={
                        parseInt(dept.signedPercentage) >= 80
                          ? "default"
                          : "secondary"
                      }
                      className="self-start sm:self-center"
                    >
                      {dept.signedPercentage}% ký
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs sm:text-sm">
                        Nhân viên
                      </p>
                      <p className="font-semibold text-sm sm:text-base">
                        {dept.employeeCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs sm:text-sm">
                        Bảng lương
                      </p>
                      <p className="font-semibold text-sm sm:text-base">
                        {dept.payrollCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs sm:text-sm">
                        Tổng lương
                      </p>
                      <p className="font-semibold text-sm sm:text-base">
                        {(dept.totalSalary / 1000000).toFixed(1)}M
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs sm:text-sm">
                        TB/người
                      </p>
                      <p className="font-semibold text-sm sm:text-base">
                        {(dept.averageSalary / 1000).toFixed(0)}K
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-row gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-12 sm:h-8 text-xs sm:text-sm touch-manipulation"
                      onClick={() => handleViewPayroll(dept.name)}
                    >
                      <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Xem Chi Tiết</span>
                      <span className="sm:hidden">Xem Chi Tiết</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-12 sm:h-8 text-xs sm:text-sm touch-manipulation"
                      onClick={() => handleExportDepartment(dept.name)}
                      disabled={exportingDepartment === dept.name}
                    >
                      {exportingDepartment === dept.name ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1 sm:mr-2"></div>
                          <span className="hidden sm:inline">Xuất...</span>
                          <span className="sm:hidden">...</span>
                        </>
                      ) : (
                        <>
                          <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          <span className="hidden sm:inline">Xuất Excel</span>
                          <span className="sm:hidden">Xuất Excel</span>
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="payroll" className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="flex items-center space-x-4">
              <Select
                value={selectedDepartment}
                onValueChange={setSelectedDepartment}
              >
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Chọn department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả Bộ Phận</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.name} value={dept.name}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleExportData}
              disabled={exportingData}
              className="flex items-center gap-2 w-full sm:w-auto h-12 sm:h-8 touch-manipulation"
            >
              {exportingData ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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
          </div>

          {selectedDepartment !== "all" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">
                  {selectedMonth.endsWith("-13")
                    ? "Dữ Liệu Lương T13"
                    : "Dữ Liệu Lương"}{" "}
                  - {selectedDepartment}
                </CardTitle>
                <CardDescription className="text-sm">
                  {formatVietnamMonthLabel(selectedMonth)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Mobile Card Layout - Show on screens smaller than lg */}
                <div className="block lg:hidden space-y-3">
                  {payrollData.map((payroll) => (
                    <Card key={payroll.id} className="p-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm">
                              {payroll.employees?.full_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Mã: {payroll.employee_id}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                payroll.is_signed ? "default" : "secondary"
                              }
                              className="text-xs"
                            >
                              {payroll.is_signed ? "Đã ký" : "Chưa ký"}
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleViewEmployee(payroll.employee_id)
                              }
                              className="h-11 w-11 sm:h-8 sm:w-8 p-0 touch-manipulation"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="pt-2 border-t">
                          <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                            <div>
                              <span className="text-muted-foreground">
                                Khen thưởng:
                              </span>
                              <p className="font-medium">
                                {(
                                  payroll.tien_khen_thuong_chuyen_can || 0
                                ).toLocaleString()}{" "}
                                VND
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Hệ số LV:
                              </span>
                              <p className="font-medium">
                                {(payroll.he_so_lam_viec || 0).toFixed(2)}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm font-semibold">
                            Lương thực nhận:{" "}
                            {(
                              payroll.tien_luong_thuc_nhan_cuoi_ky || 0
                            ).toLocaleString()}{" "}
                            VND
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Desktop Table Layout - Show on lg screens and up */}
                <div className="hidden lg:block overflow-x-auto">
                  <Table className="w-full text-sm">
                    <TableHeader>
                      <TableRow className="border-b">
                        <TableHead className="text-left p-2 sm:p-3 min-w-[100px]">
                          Mã NV
                        </TableHead>
                        <TableHead className="text-left p-2 sm:p-3 min-w-[150px]">
                          Họ Tên
                        </TableHead>
                        <TableHead className="text-right p-2 sm:p-3 min-w-[120px]">
                          Khen Thưởng
                        </TableHead>
                        <TableHead className="text-center p-2 sm:p-3 min-w-[80px]">
                          Hệ Số LV
                        </TableHead>
                        <TableHead className="text-right p-2 sm:p-3 min-w-[140px]">
                          Lương Thực Nhận
                        </TableHead>
                        <TableHead className="text-center p-2 sm:p-3 min-w-[100px]">
                          Trạng Thái
                        </TableHead>
                        <TableHead className="text-center p-2 sm:p-3 min-w-[80px]">
                          Thao Tác
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payrollData.map((payroll) => (
                        <TableRow
                          key={payroll.id}
                          className="border-b hover:bg-gray-50"
                        >
                          <TableCell className="p-2 sm:p-3 font-mono text-xs sm:text-sm">
                            {payroll.employee_id}
                          </TableCell>
                          <TableCell className="p-2 sm:p-3">
                            {payroll.employees?.full_name}
                          </TableCell>
                          <TableCell className="p-2 sm:p-3 text-right font-medium">
                            {(
                              payroll.tien_khen_thuong_chuyen_can || 0
                            ).toLocaleString()}{" "}
                            VND
                          </TableCell>
                          <TableCell className="p-2 sm:p-3 text-center font-medium">
                            {(payroll.he_so_lam_viec || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="p-2 sm:p-3 text-right font-semibold">
                            {(
                              payroll.tien_luong_thuc_nhan_cuoi_ky || 0
                            ).toLocaleString()}{" "}
                            VND
                          </TableCell>
                          <TableCell className="p-2 sm:p-3 text-center">
                            <Badge
                              variant={
                                payroll.is_signed ? "default" : "secondary"
                              }
                            >
                              {payroll.is_signed ? "Đã ký" : "Chưa ký"}
                            </Badge>
                          </TableCell>
                          <TableCell className="p-2 sm:p-3 text-center">
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
          )}
        </TabsContent>
      </Tabs>
      {/* Department Detail Modal */}
      <DepartmentDetailModalRefactored
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        departmentName={selectedDepartmentForDetail}
        month={selectedMonth}
        onViewEmployee={handleViewEmployeeFromDepartment}
        initialPayrollType={selectedMonth.endsWith("-13") ? "t13" : "monthly"}
      />

      {/* Payroll Detail Modal (from payroll tab) */}
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

      {/* Payroll Detail Modal (from department detail modal) */}
      {selectedDepartmentPayrollData && (
        <>
          <PayrollDetailModal
            isOpen={showDepartmentPayrollModal}
            onClose={() => {
              setShowDepartmentPayrollModal(false);
              setSelectedDepartmentPayrollData(null);
            }}
            payrollData={selectedDepartmentPayrollData}
          />
          <PayrollDetailModalT13
            isOpen={showDepartmentPayrollModalT13}
            onClose={() => {
              setShowDepartmentPayrollModalT13(false);
              setSelectedDepartmentPayrollData(null);
            }}
            payrollData={selectedDepartmentPayrollData}
          />
        </>
      )}
    </div>
  );
}
