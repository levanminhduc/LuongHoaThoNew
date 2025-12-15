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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Shield,
  RefreshCw,
  Search,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Network,
} from "lucide-react";

interface SecurityLog {
  id: number;
  employee_id: string | null;
  action: string;
  ip_address: string | null;
  details: string | null;
  created_at: string;
  employee?: {
    full_name: string;
    department: string;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function PasswordResetHistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    employeeCode: "",
    status: "all",
    startDate: "",
    endDate: "",
    ipAddress: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    const userStr = localStorage.getItem("user_info");

    if (!token || !userStr) {
      router.push("/admin/login");
      return;
    }

    try {
      const userData = JSON.parse(userStr);
      if (userData.role !== "admin") {
        router.push("/admin/dashboard");
        return;
      }
    } catch (error) {
      console.error("Error parsing user info:", error);
      router.push("/admin/login");
      return;
    }

    loadData();
  }, [router, pagination.page]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("admin_token");
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (filters.employeeCode) {
        params.append("employee_code", filters.employeeCode);
      }
      if (filters.status !== "all") {
        params.append("status", filters.status);
      }
      if (filters.startDate) {
        params.append("start_date", filters.startDate);
      }
      if (filters.endDate) {
        params.append("end_date", filters.endDate);
      }
      if (filters.ipAddress) {
        params.append("ip_address", filters.ipAddress.trim());
      }

      const response = await fetch(
        `/api/admin/password-reset-history?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
        setPagination(data.pagination);
      } else if (response.status === 401) {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("user_info");
        router.push("/admin/login");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Lỗi khi tải dữ liệu");
      }
    } catch (err) {
      console.error("Load data error:", err);
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    loadData();
  };

  const handleResetFilters = () => {
    setFilters({
      employeeCode: "",
      status: "all",
      startDate: "",
      endDate: "",
      ipAddress: "",
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
    setTimeout(() => loadData(), 100);
  };

  const getStatusBadge = (action: string) => {
    switch (action) {
      case "forgot_password_success":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="w-3 h-3 mr-1" />
            Thành công
          </Badge>
        );
      case "forgot_password_failed":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <XCircle className="w-3 h-3 mr-1" />
            Thất bại
          </Badge>
        );
      case "forgot_password_blocked":
        return (
          <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
            <AlertCircle className="w-3 h-3 mr-1" />
            Bị khóa
          </Badge>
        );
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const parseDetails = (details: string | null) => {
    if (!details) return null;
    try {
      return JSON.parse(details);
    } catch {
      return null;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
          Lịch Sử Đổi Mật Khẩu
        </h1>
        <p className="text-sm text-gray-600">
          Theo dõi các hoạt động đổi mật khẩu qua chức năng Quên Mật Khẩu
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Bộ Lọc</CardTitle>
          <CardDescription>
            Lọc lịch sử theo mã nhân viên, IP address, trạng thái, và khoảng
            thời gian
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employee-code">Mã Nhân Viên</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="employee-code"
                  placeholder="Nhập mã NV..."
                  value={filters.employeeCode}
                  onChange={(e) =>
                    handleFilterChange("employeeCode", e.target.value)
                  }
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ip-address">IP Address</Label>
              <div className="relative">
                <Network className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="ip-address"
                  placeholder="VD: 192.168.1.1"
                  value={filters.ipAddress}
                  onChange={(e) =>
                    handleFilterChange("ipAddress", e.target.value)
                  }
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Trạng Thái</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => handleFilterChange("status", value)}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="forgot_password_success">
                    Thành công
                  </SelectItem>
                  <SelectItem value="forgot_password_failed">
                    Thất bại
                  </SelectItem>
                  <SelectItem value="forgot_password_blocked">
                    Bị khóa
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start-date">Từ Ngày</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="start-date"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) =>
                    handleFilterChange("startDate", e.target.value)
                  }
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">Đến Ngày</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="end-date"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) =>
                    handleFilterChange("endDate", e.target.value)
                  }
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={handleApplyFilters} className="flex-1">
              <Search className="w-4 h-4 mr-2" />
              Áp Dụng Bộ Lọc
            </Button>
            <Button
              variant="outline"
              onClick={handleResetFilters}
              className="flex-1"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Đặt Lại
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Danh Sách Lịch Sử</CardTitle>
              <CardDescription>
                Tổng số: {pagination.total} bản ghi
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Làm mới
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Không có dữ liệu lịch sử</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thời Gian</TableHead>
                      <TableHead>Mã NV</TableHead>
                      <TableHead>Tên NV</TableHead>
                      <TableHead>Phòng Ban</TableHead>
                      <TableHead>Trạng Thái</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Chi Tiết</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => {
                      const details = parseDetails(log.details);
                      return (
                        <TableRow key={log.id}>
                          <TableCell className="whitespace-nowrap">
                            {formatDateTime(log.created_at)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {log.employee_id || "N/A"}
                          </TableCell>
                          <TableCell>
                            {log.employee?.full_name || "N/A"}
                          </TableCell>
                          <TableCell>
                            {log.employee?.department || "N/A"}
                          </TableCell>
                          <TableCell>{getStatusBadge(log.action)}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {log.ip_address || "N/A"}
                          </TableCell>
                          <TableCell>
                            {details && (
                              <div className="text-xs text-gray-600 space-y-1">
                                {details.user_agent && (
                                  <div>
                                    <span className="font-semibold">
                                      User Agent:
                                    </span>{" "}
                                    {details.user_agent}
                                  </div>
                                )}
                                {details.reason && (
                                  <div>
                                    <span className="font-semibold">
                                      Lý do:
                                    </span>{" "}
                                    {details.reason}
                                  </div>
                                )}
                                {details.fail_count !== undefined && (
                                  <div>
                                    <span className="font-semibold">
                                      Số lần thất bại:
                                    </span>{" "}
                                    {details.fail_count}
                                  </div>
                                )}
                                {details.first_time_change !== undefined && (
                                  <div>
                                    <span className="font-semibold">
                                      Lần đầu đổi:
                                    </span>{" "}
                                    {details.first_time_change ? "Có" : "Không"}
                                  </div>
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {pagination.totalPages > 1 && (
                <div className="flex justify-between items-center mt-4 pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    Trang {pagination.page} / {pagination.totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPagination((prev) => ({
                          ...prev,
                          page: prev.page - 1,
                        }))
                      }
                      disabled={pagination.page === 1}
                    >
                      Trang trước
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPagination((prev) => ({
                          ...prev,
                          page: prev.page + 1,
                        }))
                      }
                      disabled={pagination.page === pagination.totalPages}
                    >
                      Trang sau
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
