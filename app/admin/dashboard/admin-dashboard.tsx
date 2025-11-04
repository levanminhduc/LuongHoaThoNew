"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  LogOut,
  RefreshCw,
  Database,
  FileSpreadsheet,
  Users,
  DollarSign,
  TrendingUp,
  Settings,
  Shield,
  ArrowUpDown,
  UserCheck,
  Edit,
  Filter,
} from "lucide-react";
import { EmployeeImportSection } from "@/components/employee-import-section";
import { MonthSelector } from "../payroll-management/components/MonthSelector";
import { AdminSystemMenu } from "@/components/admin-system-menu";

interface PayrollRecord {
  id: number;
  employee_id: string;
  salary_month: string;
  tien_luong_thuc_nhan_cuoi_ky: number;
  source_file: string;
  created_at: string;
  import_batch_id: string;
  import_status: string;
}

interface DashboardStats {
  totalRecords: number;
  totalEmployees: number;
  totalSalary: number;
  currentMonth: string;
  lastImportBatch: string;
  signatureRate: number;
}

export function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalRecords: 0,
    totalEmployees: 0,
    totalSalary: 0,
    currentMonth: "",
    lastImportBatch: "",
    signatureRate: 0,
  });
  const [downloadingSyncTemplate, setDownloadingSyncTemplate] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [filteredPayrolls, setFilteredPayrolls] = useState<PayrollRecord[]>([]);
  const router = useRouter();

  useEffect(() => {
    // Check authentication and role
    const token = localStorage.getItem("admin_token");
    const userStr = localStorage.getItem("user_info");

    if (!token || !userStr) {
      router.push("/admin/login");
      return;
    }

    try {
      const userData = JSON.parse(userStr);

      // Check if user has admin role
      if (userData.role !== "admin") {
        // Redirect based on actual role
        switch (userData.role) {
          case "truong_phong":
            router.push("/manager/dashboard");
            break;
          case "to_truong":
            router.push("/supervisor/dashboard");
            break;
          case "nhan_vien":
            router.push("/employee/dashboard");
            break;
          default:
            router.push("/admin/login");
        }
        return;
      }
    } catch (error) {
      console.error("Error parsing user info:", error);
      localStorage.removeItem("admin_token");
      localStorage.removeItem("user_info");
      router.push("/admin/login");
      return;
    }

    fetchDashboardData();
  }, [router]);

  // Filter payrolls when selectedMonth changes
  useEffect(() => {
    if (!selectedMonth) {
      setFilteredPayrolls([]);
    } else {
      const filtered = payrolls.filter(
        (payroll) => payroll.salary_month === selectedMonth,
      );
      setFilteredPayrolls(filtered);
    }
  }, [selectedMonth, payrolls]);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const response = await fetch("/api/admin/dashboard-stats", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPayrolls(data.payrolls || []);
        setStats(data.stats || {});
      } else if (response.status === 401) {
        localStorage.removeItem("admin_token");
        router.push("/admin/login");
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setMessage("Lỗi khi tải dữ liệu dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSyncTemplate = async () => {
    setDownloadingSyncTemplate(true);
    try {
      const token = localStorage.getItem("admin_token");
      const response = await fetch("/api/admin/sync-template", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `template-luong-dong-bo-${new Date().toISOString().substr(0, 10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setMessage("Đã tải template đồng bộ thành công!");
      } else {
        setMessage("Lỗi khi tải template đồng bộ");
      }
    } catch (error) {
      setMessage("Có lỗi xảy ra khi tải template đồng bộ");
    } finally {
      setDownloadingSyncTemplate(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    router.push("/");
  };

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
  };

  const handlePayrollManagement = () => {
    router.push("/admin/payroll-management");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Mobile Optimized */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 sm:py-4 gap-3">
            {/* Title Section */}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">
                Dashboard Quản Trị
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 truncate">
                MAY HÒA THỌ ĐIỆN BÀN - Hệ thống quản lý lương
              </p>
            </div>

            {/* Action Buttons - Mobile Optimized */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <AdminSystemMenu className="flex-shrink-0" />

              {/* Template Button - Hidden text on mobile */}
              <Button
                variant="outline"
                onClick={handleDownloadSyncTemplate}
                disabled={downloadingSyncTemplate}
                className="flex items-center gap-2 bg-transparent flex-shrink-0"
                size="sm"
              >
                {downloadingSyncTemplate ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="hidden sm:inline">Đang tạo...</span>
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4" />
                    <span className="hidden md:inline">Template Mẫu Lương</span>
                    <span className="md:hidden">Template</span>
                  </>
                )}
              </Button>

              {/* Logout Button - Icon only on mobile */}
              <Button
                variant="outline"
                onClick={handleLogout}
                size="sm"
                className="flex-shrink-0"
              >
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Đăng Xuất</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Status Message */}
        {message && (
          <Alert className="mb-4 sm:mb-6 border-blue-200 bg-blue-50">
            <AlertDescription className="text-blue-800 text-sm">
              {message}
            </AlertDescription>
          </Alert>
        )}

        {/* Enhanced Stats Cards - Mobile Optimized Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 lg:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Tổng Bản Ghi
              </CardTitle>
              <FileSpreadsheet className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold">
                {stats.totalRecords}
              </div>
              <p className="text-[10px] sm:text-xs text-blue-100 truncate">
                Batch: {stats.lastImportBatch}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 lg:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Số Nhân Viên
              </CardTitle>
              <Users className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold">
                {stats.totalEmployees}
              </div>
              <p className="text-[10px] sm:text-xs text-green-100 truncate">
                Tháng: {stats.currentMonth}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 lg:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Tổng Lương
              </CardTitle>
              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
              <div className="text-sm sm:text-lg lg:text-2xl font-bold break-words">
                {formatCurrency(stats.totalSalary)}
              </div>
              <p className="text-[10px] sm:text-xs text-purple-100">
                Thực nhận
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 lg:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Tỷ Lệ Ký
              </CardTitle>
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold">
                {stats.signatureRate.toFixed(1)}%
              </div>
              <p className="text-[10px] sm:text-xs text-orange-100">
                Đã ký nhận
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs - Mobile Optimized */}
        <Tabs defaultValue="employee-import" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1 h-auto p-1">
            <TabsTrigger
              value="employee-import"
              className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2 sm:py-2.5"
            >
              <Users className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden xs:inline">Import NV</span>
              <span className="xs:hidden">Import</span>
            </TabsTrigger>
            <TabsTrigger
              value="employee-management"
              className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2 sm:py-2.5"
            >
              <UserCheck className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden xs:inline">Quản Lý NV</span>
              <span className="xs:hidden">QL NV</span>
            </TabsTrigger>
            <TabsTrigger
              value="data-overview"
              className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2 sm:py-2.5"
            >
              <Database className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden xs:inline">Tổng Quan</span>
              <span className="xs:hidden">Dữ Liệu</span>
            </TabsTrigger>
            <TabsTrigger
              value="reports"
              className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2 sm:py-2.5"
            >
              <FileSpreadsheet className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span>Báo Cáo</span>
            </TabsTrigger>
          </TabsList>

          {/* Employee Import Tab */}
          <TabsContent
            value="employee-import"
            className="space-y-4 sm:space-y-6"
          >
            <EmployeeImportSection />
          </TabsContent>

          {/* Employee Management Tab */}
          <TabsContent
            value="employee-management"
            className="space-y-4 sm:space-y-6"
          >
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  <span>Quản Lý Thông Tin Nhân Viên</span>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Quản lý thông tin chi tiết của tất cả nhân viên trong hệ thống
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="flex justify-center">
                  <Button
                    onClick={() => router.push("/admin/employee-management")}
                    className="flex items-center gap-2 w-full sm:w-auto"
                    size="sm"
                  >
                    <Settings className="h-4 w-4" />
                    <span className="text-sm">Mở Trang Quản Lý Nhân Viên</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Overview Tab - Mobile Optimized */}
          <TabsContent value="data-overview" className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                {/* Title and Description */}
                <div>
                  <CardTitle className="text-base sm:text-lg lg:text-xl">
                    Dữ Liệu Lương Theo Tháng
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm mt-1">
                    {selectedMonth
                      ? `Hiển thị dữ liệu tháng ${selectedMonth}`
                      : "Chọn tháng để xem dữ liệu lương cụ thể"}
                  </CardDescription>
                </div>

                {/* Action Buttons - Stacked on mobile */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                  <Button
                    variant="outline"
                    onClick={handlePayrollManagement}
                    className="flex items-center justify-center gap-2 bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 w-full sm:w-auto"
                    size="sm"
                  >
                    <Edit className="h-4 w-4" />
                    <span className="text-xs sm:text-sm">
                      Quản Lý Lương Chi Tiết
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={fetchDashboardData}
                    className="w-full sm:w-auto"
                    size="sm"
                  >
                    <RefreshCw className="w-4 h-4 sm:mr-2" />
                    <span className="text-xs sm:text-sm">Làm Mới</span>
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-6">
                {/* Month Filter */}
                <div className="mb-4 sm:mb-6">
                  <MonthSelector
                    value={selectedMonth}
                    onValueChange={handleMonthChange}
                    placeholder="Chọn tháng để xem dữ liệu"
                    label="Lọc Theo Tháng Lương"
                    allowEmpty={true}
                  />
                </div>

                {/* Data Display - Mobile Optimized */}
                {!selectedMonth ? (
                  <div className="text-center py-8 sm:py-12 text-gray-500">
                    <Filter className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-gray-300" />
                    <h3 className="text-base sm:text-lg font-medium mb-2">
                      Chọn Tháng Để Xem Dữ Liệu
                    </h3>
                    <p className="text-xs sm:text-sm px-4">
                      Vui lòng chọn tháng lương từ dropdown phía trên để hiển
                      thị dữ liệu chi tiết.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Mã NV</TableHead>
                            <TableHead>Tháng Lương</TableHead>
                            <TableHead>Lương Thực Nhận</TableHead>
                            <TableHead>Batch ID</TableHead>
                            <TableHead>Trạng Thái</TableHead>
                            <TableHead>Ngày Tạo</TableHead>
                            <TableHead>File Nguồn</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredPayrolls.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell className="font-medium">
                                {record.employee_id}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {record.salary_month}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-semibold">
                                {formatCurrency(
                                  record.tien_luong_thuc_nhan_cuoi_ky,
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-gray-600">
                                {record.import_batch_id?.slice(-8) || "N/A"}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    record.import_status === "signed"
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {record.import_status === "signed"
                                    ? "Đã ký"
                                    : "Chưa ký"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-gray-600">
                                {formatDate(record.created_at)}
                              </TableCell>
                              <TableCell className="text-sm text-gray-500 truncate max-w-[200px]">
                                {record.source_file}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3">
                      {filteredPayrolls.map((record) => (
                        <Card
                          key={record.id}
                          className="border-l-4 border-l-blue-500"
                        >
                          <CardContent className="p-3 space-y-2">
                            {/* Employee ID and Status */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">
                                  Mã NV:
                                </span>
                                <span className="font-semibold text-sm">
                                  {record.employee_id}
                                </span>
                              </div>
                              <Badge
                                variant={
                                  record.import_status === "signed"
                                    ? "default"
                                    : "secondary"
                                }
                                className="text-xs"
                              >
                                {record.import_status === "signed"
                                  ? "Đã ký"
                                  : "Chưa ký"}
                              </Badge>
                            </div>

                            {/* Salary Month */}
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">
                                Tháng:
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {record.salary_month}
                              </Badge>
                            </div>

                            {/* Salary Amount */}
                            <div className="flex items-center justify-between py-2 border-t border-b">
                              <span className="text-xs text-gray-500">
                                Lương thực nhận:
                              </span>
                              <span className="font-bold text-sm text-green-600">
                                {formatCurrency(
                                  record.tien_luong_thuc_nhan_cuoi_ky,
                                )}
                              </span>
                            </div>

                            {/* Additional Info */}
                            <div className="space-y-1 text-xs text-gray-600">
                              <div className="flex justify-between">
                                <span>Batch ID:</span>
                                <span className="font-mono">
                                  {record.import_batch_id?.slice(-8) || "N/A"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Ngày tạo:</span>
                                <span>{formatDate(record.created_at)}</span>
                              </div>
                              <div className="flex flex-col gap-1">
                                <span>File nguồn:</span>
                                <span className="text-[10px] text-gray-500 break-all">
                                  {record.source_file}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {filteredPayrolls.length === 0 && selectedMonth && (
                      <div className="text-center py-6 sm:py-8 text-gray-500">
                        <p className="text-sm">
                          Không có dữ liệu lương cho tháng {selectedMonth}.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab - Mobile Optimized */}
          <TabsContent value="reports" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg">
                    Báo Cáo Tổng Quan
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Thống kê tổng quan hệ thống
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-xs sm:text-sm text-gray-600">
                        Tổng số bản ghi lương:
                      </span>
                      <span className="font-semibold text-sm sm:text-base">
                        {stats.totalRecords}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-xs sm:text-sm text-gray-600">
                        Tổng số nhân viên:
                      </span>
                      <span className="font-semibold text-sm sm:text-base">
                        {stats.totalEmployees}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-xs sm:text-sm text-gray-600">
                        Tổng lương thực nhận:
                      </span>
                      <span className="font-semibold text-xs sm:text-sm break-words text-right">
                        {formatCurrency(stats.totalSalary)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-xs sm:text-sm text-gray-600">
                        Tỷ lệ ký nhận:
                      </span>
                      <span className="font-semibold text-sm sm:text-base">
                        {stats.signatureRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg">
                    Hướng Dẫn Sử Dụng
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Các tính năng chính của hệ thống
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <div className="space-y-2.5 sm:space-y-3">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <ArrowUpDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span className="text-xs sm:text-sm">
                        Import/Export Lương: Hệ thống import/export lương hoàn
                        chỉnh
                      </span>
                    </div>
                    <div className="flex items-start gap-2 sm:gap-3">
                      <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-xs sm:text-sm">
                        Import Nhân Viên: Quản lý danh sách nhân viên
                      </span>
                    </div>
                    <div className="flex items-start gap-2 sm:gap-3">
                      <UserCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-xs sm:text-sm">
                        Quản Lý CCCD: Cập nhật số CCCD cho nhân viên
                      </span>
                    </div>
                    <div className="flex items-start gap-2 sm:gap-3">
                      <Database className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-600 flex-shrink-0 mt-0.5" />
                      <span className="text-xs sm:text-sm">
                        Template Đồng Bộ: Tạo template từ dữ liệu hiện tại
                      </span>
                    </div>
                    <div className="flex items-start gap-2 sm:gap-3">
                      <FileSpreadsheet className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                      <span className="text-xs sm:text-sm">
                        Báo Cáo: Thống kê và phân tích dữ liệu
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
