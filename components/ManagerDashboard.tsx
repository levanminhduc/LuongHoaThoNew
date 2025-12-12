"use client";

import { useState, useEffect, useMemo } from "react";
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Building2,
  Users,
  DollarSign,
  FileCheck,
  LogOut,
  Eye,
  Download,
} from "lucide-react";
import { DepartmentDetailModalRefactored } from "./department";
import { getPreviousMonth } from "@/utils/dateUtils";
import { PayrollDetailModal } from "@/app/employee/lookup/payroll-detail-modal";
import {
  transformPayrollRecordToResult,
  type PayrollResult,
} from "@/lib/utils/payroll-transformer";
import DashboardCache from "@/utils/dashboardCache";

interface User {
  employee_id: string;
  username: string;
  role: string;
  department: string;
  allowed_departments?: string[];
  permissions: string[];
}

interface DepartmentStats {
  name: string;
  employeeCount: number;
  payrollCount: number;
  signedCount: number;
  signedPercentage: string;
  totalSalary: number;
  averageSalary: number;
}

interface ManagerDashboardProps {
  user: User;
  onLogout: () => void;
}

interface PayrollRecord {
  id: number;
  employee_id: string;
  salary_month: string;
  tien_luong_thuc_nhan_cuoi_ky: number;
  tien_khen_thuong_chuyen_can?: number;
  he_so_lam_viec?: number;
  is_signed: boolean;
  signed_at: string | null;
  employees?: {
    employee_id: string;
    full_name: string;
    department: string;
    chuc_vu: string;
  };
}

export default function ManagerDashboard({
  user,
  onLogout,
}: ManagerDashboardProps) {
  const [departments, setDepartments] = useState<DepartmentStats[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] =
    useState<string>(getPreviousMonth());
  const [loading, setLoading] = useState(true);
  const [payrollData, setPayrollData] = useState<PayrollRecord[]>([]);

  // Department Detail Modal state
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDepartmentForDetail, setSelectedDepartmentForDetail] =
    useState<string>("");

  // Export state
  const [exportingData, setExportingData] = useState(false);
  const [exportingDepartment, setExportingDepartment] = useState<string | null>(
    null,
  );

  // Payroll Detail Modal state (from payroll tab)
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [selectedPayrollData, setSelectedPayrollData] =
    useState<PayrollResult | null>(null);

  // Payroll Detail Modal state (from department detail modal)
  const [showDepartmentPayrollModal, setShowDepartmentPayrollModal] =
    useState(false);
  const [selectedDepartmentPayrollData, setSelectedDepartmentPayrollData] =
    useState<PayrollResult | null>(null);

  useEffect(() => {
    loadDepartmentStats();
  }, [selectedMonth]);

  useEffect(() => {
    // Auto-detect latest available month on component mount
    detectLatestMonth();
  }, []);

  const detectLatestMonth = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const response = await fetch("/api/debug/payroll-data", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.availableMonths && data.availableMonths.length > 0) {
          const latestMonth = data.availableMonths[0]; // Already sorted desc
          if (latestMonth !== selectedMonth) {
            setSelectedMonth(latestMonth);
          }
        }
      }
    } catch (error) {
      console.log("Could not detect latest month, using default");
    }
  };

  useEffect(() => {
    if (selectedDepartment !== "all") {
      loadPayrollData();
    }
  }, [selectedDepartment, selectedMonth]);

  const loadDepartmentStats = async () => {
    setLoading(true);
    const cachedData = DashboardCache.getCacheData<DepartmentStats[]>(
      "manager",
      selectedMonth,
      "departments",
    );

    if (cachedData) {
      setDepartments(cachedData);
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("admin_token");
      const response = await fetch(
        `/api/admin/departments?include_stats=true&month=${selectedMonth}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        const depts = data.departments || [];
        setDepartments(depts);
        DashboardCache.setCacheData(
          "manager",
          selectedMonth,
          "departments",
          depts,
        );
      }
    } catch (error) {
      console.error("Error loading department stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPayrollData = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const url =
        selectedDepartment === "all"
          ? `/api/payroll/my-departments?month=${selectedMonth}&limit=50`
          : `/api/payroll/my-departments?month=${selectedMonth}&department=${selectedDepartment}&limit=50`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPayrollData(data.data || []);
      }
    } catch (error) {
      console.error("Error loading payroll data:", error);
    }
  };

  const handleViewPayroll = (department: string) => {
    setSelectedDepartmentForDetail(department);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedDepartmentForDetail("");
  };

  const handleExportDepartment = async (departmentName: string) => {
    setExportingDepartment(departmentName);
    try {
      const token = localStorage.getItem("admin_token");
      const response = await fetch(
        `/api/admin/payroll-export?month=${selectedMonth}&department=${encodeURIComponent(departmentName)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `payroll-${departmentName}-${selectedMonth}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorData = await response.json();
        console.error(
          "Export error:",
          errorData.error || "Lỗi khi xuất dữ liệu",
        );

        // Show user-friendly error message
        if (errorData.message) {
          alert(
            `Lỗi xuất Excel: ${errorData.message}${errorData.suggestion ? "\n\n" + errorData.suggestion : ""}`,
          );
        } else {
          alert("Lỗi khi xuất dữ liệu Excel. Vui lòng thử lại.");
        }
      }
    } catch (error) {
      console.error("Error exporting department data:", error);
    } finally {
      setExportingDepartment(null);
    }
  };

  const handleExportData = async () => {
    setExportingData(true);
    try {
      const token = localStorage.getItem("admin_token");

      let url = `/api/admin/payroll-export?month=${selectedMonth}`;
      let filename = `payroll-${selectedMonth}`;

      if (selectedDepartment !== "all") {
        url += `&department=${encodeURIComponent(selectedDepartment)}`;
        filename = `payroll-${selectedDepartment}-${selectedMonth}`;
      } else {
        filename = `payroll-all-departments-${selectedMonth}`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `${filename}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(a);
      } else {
        const errorData = await response.json();
        console.error(
          "Export error:",
          errorData.error || "Lỗi khi xuất dữ liệu",
        );

        // Show user-friendly error message
        if (errorData.message) {
          alert(
            `Lỗi xuất Excel: ${errorData.message}${errorData.suggestion ? "\n\n" + errorData.suggestion : ""}`,
          );
        } else {
          alert("Lỗi khi xuất dữ liệu Excel. Vui lòng thử lại.");
        }
      }
    } catch (error) {
      console.error("Error exporting data:", error);
    } finally {
      setExportingData(false);
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
      setShowPayrollModal(true);
    }
  };

  const handleViewEmployeeFromDepartment = (payrollData: PayrollResult) => {
    // Handle payroll detail modal from department detail modal
    setSelectedDepartmentPayrollData(payrollData);
    setShowDepartmentPayrollModal(true);
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 space-y-4 sm:space-y-0">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                Dashboard Trưởng Phòng
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 truncate">
                Xin chào, {user.username} | Bạn đang Quản lý{" "}
                {user.allowed_departments?.length || 0} Bộ Phận
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => {
                    const date = new Date();
                    date.setMonth(date.getMonth() - i);
                    const value = date.toISOString().slice(0, 7);
                    const label = date.toLocaleDateString("vi-VN", {
                      year: "numeric",
                      month: "long",
                    });
                    return (
                      <SelectItem key={`month-${i}-${value}`} value={value}>
                        {label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={onLogout}
                className="w-full sm:w-auto"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Đăng xuất
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                Tổng Lương
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">
                {(totalStats.totalSalary / 1000000).toFixed(1)}M
              </div>
              <p className="text-xs text-muted-foreground truncate">
                VND tháng {selectedMonth}
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
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger
              value="overview"
              className="text-xs sm:text-sm px-2 py-2"
            >
              <span className="hidden sm:inline">Tổng Quan</span>
              <span className="sm:hidden">Tổng Quan</span>
            </TabsTrigger>
            <TabsTrigger
              value="departments"
              className="text-xs sm:text-sm px-2 py-2"
            >
              <span className="hidden sm:inline">Chi Tiết Các Bộ Phận</span>
              <span className="sm:hidden">Departments</span>
            </TabsTrigger>
            <TabsTrigger
              value="payroll"
              className="text-xs sm:text-sm px-2 py-2"
            >
              <span className="hidden sm:inline">Dữ Liệu Lương</span>
              <span className="sm:hidden">Lương</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">
                    Thống Kê Theo Department
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Số lượng nhân viên và tỷ lệ ký
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer
                    width="100%"
                    height={250}
                    className="sm:h-[300px]"
                  >
                    <BarChart data={chartData}>
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
                      <Bar
                        dataKey="employees"
                        fill="#8884d8"
                        name="Nhân viên"
                      />
                      <Bar dataKey="signed" fill="#82ca9d" name="Đã ký" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">
                    Phân Bố Lương Theo Bộ Phận
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Tỷ lệ tổng lương theo từng Bộ Phận
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer
                    width="100%"
                    height={250}
                    className="sm:h-[300px]"
                  >
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) =>
                          `${name}: ${percentage}%`
                        }
                        outerRadius={60}
                        className="sm:outerRadius-80"
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) =>
                          `${(value / 1000000).toFixed(1)}M VND`
                        }
                        contentStyle={{
                          fontSize: "12px",
                          padding: "8px",
                          borderRadius: "6px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
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
                    Dữ Liệu Lương - {selectedDepartment}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Tháng {selectedMonth}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Mobile Card Layout */}
                  <div className="block sm:hidden space-y-3">
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
                                className="h-8 w-8 p-0 touch-manipulation"
                              >
                                <Eye className="h-3 w-3" />
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

                  {/* Desktop Table Layout */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 sm:p-3 min-w-[100px]">
                            Mã NV
                          </th>
                          <th className="text-left p-2 sm:p-3 min-w-[150px]">
                            Họ Tên
                          </th>
                          <th className="text-right p-2 sm:p-3 min-w-[120px]">
                            Khen Thưởng
                          </th>
                          <th className="text-center p-2 sm:p-3 min-w-[80px]">
                            Hệ Số LV
                          </th>
                          <th className="text-right p-2 sm:p-3 min-w-[140px]">
                            Lương Thực Nhận
                          </th>
                          <th className="text-center p-2 sm:p-3 min-w-[100px]">
                            Trạng Thái
                          </th>
                          <th className="text-center p-2 sm:p-3 min-w-[80px]">
                            Thao Tác
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {payrollData.map((payroll) => (
                          <tr
                            key={payroll.id}
                            className="border-b hover:bg-gray-50"
                          >
                            <td className="p-2 sm:p-3 font-mono text-xs sm:text-sm">
                              {payroll.employee_id}
                            </td>
                            <td className="p-2 sm:p-3">
                              {payroll.employees?.full_name}
                            </td>
                            <td className="p-2 sm:p-3 text-right font-medium">
                              {(
                                payroll.tien_khen_thuong_chuyen_can || 0
                              ).toLocaleString()}{" "}
                              VND
                            </td>
                            <td className="p-2 sm:p-3 text-center font-medium">
                              {(payroll.he_so_lam_viec || 0).toFixed(2)}
                            </td>
                            <td className="p-2 sm:p-3 text-right font-semibold">
                              {(
                                payroll.tien_luong_thuc_nhan_cuoi_ky || 0
                              ).toLocaleString()}{" "}
                              VND
                            </td>
                            <td className="p-2 sm:p-3 text-center">
                              <Badge
                                variant={
                                  payroll.is_signed ? "default" : "secondary"
                                }
                              >
                                {payroll.is_signed ? "Đã ký" : "Chưa ký"}
                              </Badge>
                            </td>
                            <td className="p-2 sm:p-3 text-center">
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
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Department Detail Modal */}
      <DepartmentDetailModalRefactored
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        departmentName={selectedDepartmentForDetail}
        month={selectedMonth}
        onViewEmployee={handleViewEmployeeFromDepartment}
      />

      {/* Payroll Detail Modal (from payroll tab) */}
      {selectedPayrollData && (
        <PayrollDetailModal
          isOpen={showPayrollModal}
          onClose={() => {
            setShowPayrollModal(false);
            setSelectedPayrollData(null);
          }}
          payrollData={selectedPayrollData}
        />
      )}

      {/* Payroll Detail Modal (from department detail modal) */}
      {selectedDepartmentPayrollData && (
        <PayrollDetailModal
          isOpen={showDepartmentPayrollModal}
          onClose={() => {
            setShowDepartmentPayrollModal(false);
            setSelectedDepartmentPayrollData(null);
          }}
          payrollData={selectedDepartmentPayrollData}
        />
      )}
    </div>
  );
}
