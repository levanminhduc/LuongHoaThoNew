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
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Dashboard Quản Trị
              </h1>
              <p className="text-sm text-gray-600">
                MAY HÒA THỌ ĐIỆN BÀN - Hệ thống quản lý lương
              </p>
            </div>
            <div className="flex items-center gap-3">
              <AdminSystemMenu />
              <Button
                variant="outline"
                onClick={handleDownloadSyncTemplate}
                disabled={downloadingSyncTemplate}
                className="flex items-center gap-2 bg-transparent"
              >
                {downloadingSyncTemplate ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang tạo...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4" />
                    Template Mẫu Lương
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Đăng Xuất
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Message */}
        {message && (
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <AlertDescription className="text-blue-800">
              {message}
            </AlertDescription>
          </Alert>
        )}

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Tổng Bản Ghi
              </CardTitle>
              <FileSpreadsheet className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRecords}</div>
              <p className="text-xs text-blue-100">
                Batch: {stats.lastImportBatch}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Số Nhân Viên
              </CardTitle>
              <Users className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEmployees}</div>
              <p className="text-xs text-green-100">
                Tháng: {stats.currentMonth}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng Lương</CardTitle>
              <DollarSign className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.totalSalary)}
              </div>
              <p className="text-xs text-purple-100">Thực nhận</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tỷ Lệ Ký</CardTitle>
              <TrendingUp className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.signatureRate.toFixed(1)}%
              </div>
              <p className="text-xs text-orange-100">Đã ký nhận</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="employee-import" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger
              value="employee-import"
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              Import Nhân Viên
            </TabsTrigger>
            <TabsTrigger
              value="employee-management"
              className="flex items-center gap-2"
            >
              <UserCheck className="h-4 w-4" />
              Quản Lý NV
            </TabsTrigger>
            <TabsTrigger
              value="data-overview"
              className="flex items-center gap-2"
            >
              <Database className="h-4 w-4" />
              Tổng Quan Dữ Liệu
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Báo Cáo
            </TabsTrigger>
          </TabsList>

          {/* Employee Import Tab */}
          <TabsContent value="employee-import" className="space-y-6">
            <EmployeeImportSection />
          </TabsContent>

          {/* Employee Management Tab */}
          <TabsContent value="employee-management" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Quản Lý Thông Tin Nhân Viên
                </CardTitle>
                <CardDescription>
                  Quản lý thông tin chi tiết của tất cả nhân viên trong hệ thống
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  <Button
                    onClick={() => router.push("/admin/employee-management")}
                    className="flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Mở Trang Quản Lý Nhân Viên
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Overview Tab */}
          <TabsContent value="data-overview" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Dữ Liệu Lương Theo Tháng</CardTitle>
                  <CardDescription>
                    {selectedMonth
                      ? `Hiển thị dữ liệu tháng ${selectedMonth}`
                      : "Chọn tháng để xem dữ liệu lương cụ thể"}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={handlePayrollManagement}
                    className="flex items-center gap-2 bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
                  >
                    <Edit className="h-4 w-4" />
                    Quản Lý Lương Chi Tiết
                  </Button>
                  <Button variant="outline" onClick={fetchDashboardData}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Làm Mới
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Month Filter */}
                <div className="mb-6">
                  <MonthSelector
                    value={selectedMonth}
                    onValueChange={handleMonthChange}
                    placeholder="Chọn tháng để xem dữ liệu"
                    label="Lọc Theo Tháng Lương"
                    allowEmpty={true}
                  />
                </div>

                {/* Data Display */}
                {!selectedMonth ? (
                  <div className="text-center py-12 text-gray-500">
                    <Filter className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium mb-2">
                      Chọn Tháng Để Xem Dữ Liệu
                    </h3>
                    <p>
                      Vui lòng chọn tháng lương từ dropdown phía trên để hiển
                      thị dữ liệu chi tiết.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
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

                    {filteredPayrolls.length === 0 && selectedMonth && (
                      <div className="text-center py-8 text-gray-500">
                        Không có dữ liệu lương cho tháng {selectedMonth}.
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Báo Cáo Tổng Quan</CardTitle>
                  <CardDescription>Thống kê tổng quan hệ thống</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Tổng số bản ghi lương:
                      </span>
                      <span className="font-semibold">
                        {stats.totalRecords}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Tổng số nhân viên:
                      </span>
                      <span className="font-semibold">
                        {stats.totalEmployees}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Tổng lương thực nhận:
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(stats.totalSalary)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Tỷ lệ ký nhận:
                      </span>
                      <span className="font-semibold">
                        {stats.signatureRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Hướng Dẫn Sử Dụng</CardTitle>
                  <CardDescription>
                    Các tính năng chính của hệ thống
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <ArrowUpDown className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">
                        Import/Export Lương: Hệ thống import/export lương hoàn
                        chỉnh
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4 text-green-600" />
                      <span className="text-sm">
                        Import Nhân Viên: Quản lý danh sách nhân viên
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <UserCheck className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm">
                        Quản Lý CCCD: Cập nhật số CCCD cho nhân viên
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Database className="h-4 w-4 text-purple-600" />
                      <span className="text-sm">
                        Template Đồng Bộ: Tạo template từ dữ liệu hiện tại
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="h-4 w-4 text-orange-600" />
                      <span className="text-sm">
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
