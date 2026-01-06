"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Users,
  UserCheck,
  UserX,
  Calendar,
  Database,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

interface ValidationStats {
  totalEmployees: number;
  employeesWithPayroll: number;
  missingEmployees: number;
  percentage: number;
}

interface MissingEmployee {
  employee_id: string;
  full_name: string;
  department: string;
  chuc_vu: string;
  is_active: boolean;
}

interface ValidationData {
  success: boolean;
  stats: ValidationStats;
  missingEmployees: MissingEmployee[];
  selectedMonth: string;
  cacheTimestamp?: string;
}

export default function DataValidationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<ValidationData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [error, setError] = useState("");

  // Generate month options (current month and previous 12 months)
  const generateMonthOptions = () => {
    const options = [];
    const now = new Date();

    for (let i = 0; i < 13; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const value = `${year}-${month}`;
      const label = `${month}/${year}`;

      options.push({ value, label });
    }

    return options;
  };

  const monthOptions = generateMonthOptions();

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem("admin_token");
    const userStr = localStorage.getItem("user_info");

    if (!token || !userStr) {
      router.push("/admin/login");
      return;
    }

    try {
      const userData = JSON.parse(userStr);
      if (userData.role !== "admin") {
        router.push("/admin/login");
        return;
      }
    } catch (error) {
      console.error("Error parsing user info:", error);
      router.push("/admin/login");
      return;
    }

    // Set default month to current month
    if (!selectedMonth) {
      const currentMonth = getCurrentMonth();
      setSelectedMonth(currentMonth);
    }
  }, [router, selectedMonth]);

  useEffect(() => {
    if (selectedMonth) {
      fetchValidationData(false);
    }
  }, [selectedMonth]);

  const getCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  };

  const fetchValidationData = async (forceRefresh = false) => {
    if (!selectedMonth) return;

    try {
      setLoading(!forceRefresh);
      setRefreshing(forceRefresh);
      setError("");

      const token = localStorage.getItem("admin_token");
      const url = `/api/admin/data-validation?month=${selectedMonth}${forceRefresh ? "&force_refresh=true" : ""}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setData(result);
      } else if (response.status === 401) {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("user_info");
        router.push("/admin/login");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Lỗi khi tải dữ liệu");
      }
    } catch (error) {
      console.error("Error fetching validation data:", error);
      setError("Lỗi kết nối server");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchValidationData(true);
  };

  const getStatusColor = (percentage: number) => {
    if (percentage >= 95) return "text-green-600";
    if (percentage >= 80) return "text-yellow-600";
    return "text-red-600";
  };

  const getStatusIcon = (percentage: number) => {
    if (percentage >= 95)
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
  };

  const formatChucVu = (chucVu: string) => {
    const mapping: { [key: string]: string } = {
      admin: "Admin",
      giam_doc: "Giám Đốc",
      ke_toan: "Kế Toán",
      nguoi_lap_bieu: "Người Lập Biểu",
      truong_phong: "Trưởng Phòng",
      to_truong: "Tổ Trưởng",
      nhan_vien: "Nhân Viên",
    };
    return mapping[chucVu] || chucVu;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-2">
            <Spinner size="lg" />
            <span>Đang tải dữ liệu...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
            Kiểm Tra Dữ Liệu Lương
          </h1>
          <p className="text-muted-foreground">
            So sánh danh sách nhân viên với dữ liệu lương để phát hiện thiếu sót
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Chọn tháng" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
            />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      {data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Tổng Nhân Viên
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-2xl font-bold">
                  {data.stats.totalEmployees}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Nhân viên đang hoạt động
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Có Dữ Liệu Lương
                </CardTitle>
                <UserCheck className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-2xl font-bold text-green-600">
                  {data.stats.employeesWithPayroll}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Đã có lương tháng {selectedMonth.split("-")[1]}/
                  {selectedMonth.split("-")[0]}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Thiếu Dữ Liệu
                </CardTitle>
                <UserX className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-2xl font-bold text-red-600">
                  {data.stats.missingEmployees}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Nhân viên chưa có lương
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Tỷ Lệ Hoàn Thành
                </CardTitle>
                {getStatusIcon(data.stats.percentage)}
              </CardHeader>
              <CardContent>
                <div
                  className={`text-lg sm:text-2xl font-bold ${getStatusColor(data.stats.percentage)}`}
                >
                  {data.stats.percentage}%
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Dữ liệu đã được nhập
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Cache Info */}
          {data.cacheTimestamp && (
            <Alert>
              <Database className="h-4 w-4" />
              <AlertDescription>
                Dữ liệu được cache lúc:{" "}
                {new Date(data.cacheTimestamp).toLocaleString("vi-VN")} (Cache
                24h để tối ưu hiệu suất)
              </AlertDescription>
            </Alert>
          )}

          {/* Missing Employees Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserX className="h-5 w-5 text-red-600" />
                Danh Sách Nhân Viên Thiếu Dữ Liệu Lương
                <Badge variant="destructive" className="ml-2">
                  {data.stats.missingEmployees} người
                </Badge>
              </CardTitle>
              <CardDescription>
                Những nhân viên chưa có dữ liệu lương cho tháng{" "}
                {selectedMonth.split("-")[1]}/{selectedMonth.split("-")[0]}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.missingEmployees.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-green-600 mb-2">
                    Hoàn Hảo! 🎉
                  </h3>
                  <p className="text-muted-foreground">
                    Tất cả nhân viên đều đã có dữ liệu lương cho tháng này.
                  </p>
                </div>
              ) : (
                <>
                  <div className="hidden md:block rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[120px]">Mã NV</TableHead>
                          <TableHead>Họ Tên</TableHead>
                          <TableHead>Phòng Ban</TableHead>
                          <TableHead>Chức Vụ</TableHead>
                          <TableHead className="text-center">
                            Trạng Thái
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.missingEmployees.map((employee) => (
                          <TableRow key={employee.employee_id}>
                            <TableCell className="font-mono text-sm">
                              {employee.employee_id}
                            </TableCell>
                            <TableCell className="font-medium">
                              {employee.full_name}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {employee.department}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  employee.chuc_vu === "nhan_vien"
                                    ? "secondary"
                                    : "default"
                                }
                              >
                                {formatChucVu(employee.chuc_vu)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant={
                                  employee.is_active ? "default" : "destructive"
                                }
                                className={
                                  employee.is_active
                                    ? "bg-green-100 text-green-800"
                                    : ""
                                }
                              >
                                {employee.is_active
                                  ? "Hoạt động"
                                  : "Không hoạt động"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="md:hidden space-y-3">
                    {data.missingEmployees.map((employee) => (
                      <Card
                        key={employee.employee_id}
                        className="border-l-4 border-l-red-500"
                      >
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-sm font-semibold">
                              {employee.employee_id}
                            </span>
                            <Badge
                              variant={
                                employee.is_active ? "default" : "destructive"
                              }
                              className={
                                employee.is_active
                                  ? "bg-green-100 text-green-800"
                                  : ""
                              }
                            >
                              {employee.is_active
                                ? "Hoạt động"
                                : "Không hoạt động"}
                            </Badge>
                          </div>
                          <div className="text-sm font-medium">
                            {employee.full_name}
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <Badge variant="outline">
                              {employee.department}
                            </Badge>
                            <Badge
                              variant={
                                employee.chuc_vu === "nhan_vien"
                                  ? "secondary"
                                  : "default"
                              }
                            >
                              {formatChucVu(employee.chuc_vu)}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Summary and Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Tóm Tắt & Hành Động</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Thống Kê Chi Tiết:</h4>
                  <ul className="text-sm space-y-1">
                    <li>
                      • Tổng số nhân viên:{" "}
                      <strong>{data.stats.totalEmployees}</strong>
                    </li>
                    <li>
                      • Đã có lương:{" "}
                      <strong className="text-green-600">
                        {data.stats.employeesWithPayroll}
                      </strong>
                    </li>
                    <li>
                      • Chưa có lương:{" "}
                      <strong className="text-red-600">
                        {data.stats.missingEmployees}
                      </strong>
                    </li>
                    <li>
                      • Tỷ lệ hoàn thành:{" "}
                      <strong className={getStatusColor(data.stats.percentage)}>
                        {data.stats.percentage}%
                      </strong>
                    </li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">Hành Động Tiếp Theo:</h4>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        router.push("/admin/payroll-import-export")
                      }
                      className="w-full justify-start"
                    >
                      📁 Nhập Dữ Liệu Lương
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push("/admin/payroll-management")}
                      className="w-full justify-start"
                    >
                      📊 Quản Lý Lương
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push("/admin/dashboard")}
                      className="w-full justify-start"
                    >
                      🏠 Về Dashboard
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
