"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Users,
  DollarSign,
  TrendingUp,
  FileCheck,
  Search,
  Download,
  Eye,
  Building2,
  Calendar,
  BarChart3,
  PieChart,
  X,
  ArrowUpDown,
  Filter,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts";

interface Employee {
  employee_id: string;
  full_name: string;
  chuc_vu: string;
  department: string;
  is_active: boolean;
}

interface PayrollRecord {
  id: number;
  employee_id: string;
  salary_month: string;
  tien_luong_thuc_nhan_cuoi_ky: number;
  is_signed: boolean;
  signed_at: string | null;
  employees: {
    employee_id: string;
    full_name: string;
    department: string;
    chuc_vu: string;
  };
}

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
}

interface DepartmentDetail {
  name: string;
  month: string;
  stats: DepartmentStats;
  employees: Employee[];
  payrolls: PayrollRecord[];
  salaryDistribution: SalaryRange[];
  monthlyTrends: MonthlyTrend[];
}

interface DepartmentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  departmentName: string;
  month: string;
}

export default function DepartmentDetailModal({
  isOpen,
  onClose,
  departmentName,
  month,
}: DepartmentDetailModalProps) {
  const [departmentData, setDepartmentData] = useState<DepartmentDetail | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  useEffect(() => {
    if (isOpen && departmentName) {
      loadDepartmentDetail();
    }
    // Reset states when modal opens
    if (isOpen) {
      setSearchTerm("");
      setStatusFilter("all");
      setSortBy("name");
      setSortOrder("asc");
      setCurrentPage(1);
    }
  }, [isOpen, departmentName, month]);

  const loadDepartmentDetail = async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("admin_token");
      const response = await fetch(
        `/api/admin/departments/${encodeURIComponent(departmentName)}?month=${month}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setDepartmentData(data.department);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Lỗi khi tải dữ liệu department");
      }
    } catch (error) {
      console.error("Error loading department detail:", error);
      setError("Có lỗi xảy ra khi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem("admin_token");
      const response = await fetch(
        `/api/admin/payroll-export?month=${month}&department=${departmentName}`,
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
        a.download = `department-${departmentName}-${month}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setError("Lỗi khi xuất dữ liệu");
      }
    } catch (error) {
      console.error("Error exporting data:", error);
      setError("Có lỗi xảy ra khi xuất dữ liệu");
    } finally {
      setExporting(false);
    }
  };

  const filteredAndSortedPayrolls = (() => {
    if (!departmentData?.payrolls) return [];

    // Filter by search term
    let filtered = departmentData.payrolls.filter(
      (payroll) =>
        payroll.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payroll.employees?.full_name
          .toLowerCase()
          .includes(searchTerm.toLowerCase()),
    );

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((payroll) => {
        if (statusFilter === "signed") return payroll.is_signed;
        if (statusFilter === "unsigned") return !payroll.is_signed;
        return true;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: string | number = "";
      let bValue: string | number = "";

      switch (sortBy) {
        case "name":
          aValue = a.employees?.full_name || "";
          bValue = b.employees?.full_name || "";
          break;
        case "employee_id":
          aValue = a.employee_id;
          bValue = b.employee_id;
          break;
        case "salary":
          aValue = a.tien_luong_thuc_nhan_cuoi_ky;
          bValue = b.tien_luong_thuc_nhan_cuoi_ky;
          break;
        case "position":
          aValue = a.employees?.chuc_vu || "";
          bValue = b.employees?.chuc_vu || "";
          break;
        case "status":
          aValue = a.is_signed ? 1 : 0;
          bValue = b.is_signed ? 1 : 0;
          break;
        default:
          aValue = a.employees?.full_name || "";
          bValue = b.employees?.full_name || "";
      }

      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  })();

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedPayrolls.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedPayrolls = filteredAndSortedPayrolls.slice(
    startIndex,
    endIndex,
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, sortBy, sortOrder]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              <span className="truncate">
                Chi Tiết Bộ Phận - {departmentName}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            Tháng: {month}
            {error && (
              <Badge variant="destructive" className="ml-2">
                Có lỗi
              </Badge>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="h-[75vh] pr-4">
          {loading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
              <Skeleton className="h-96" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600">{error}</p>
              <Button onClick={loadDepartmentDetail} className="mt-4">
                Thử Lại
              </Button>
            </div>
          ) : departmentData ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Tổng Nhân Viên
                    </CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {departmentData.stats.totalEmployees}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {departmentData.stats.payrollCount} có bảng lương
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Tỷ Lệ Ký
                    </CardTitle>
                    <FileCheck className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {departmentData.stats.signedPercentage}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {departmentData.stats.signedCount}/
                      {departmentData.stats.payrollCount} đã ký
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Tổng Lương
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {(departmentData.stats.totalSalary / 1000000).toFixed(1)}M
                    </div>
                    <p className="text-xs text-muted-foreground">
                      VND tháng {month}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Lương TB
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {(departmentData.stats.averageSalary / 1000).toFixed(0)}K
                    </div>
                    <p className="text-xs text-muted-foreground">VND/người</p>
                  </CardContent>
                </Card>
              </div>

              {/* Tabs Content */}
              <Tabs defaultValue="employees" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="employees">👥 Nhân Viên</TabsTrigger>
                  <TabsTrigger value="analysis">💰 Phân Tích</TabsTrigger>
                  <TabsTrigger value="charts">📊 Biểu Đồ</TabsTrigger>
                  <TabsTrigger value="export">📋 Xuất Dữ Liệu</TabsTrigger>
                </TabsList>

                <TabsContent value="employees" className="space-y-4">
                  {/* Search and Filter Controls */}
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div className="flex flex-col sm:flex-row gap-2 flex-1">
                      <div className="relative w-full sm:w-72">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Tìm kiếm nhân viên..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-8"
                        />
                      </div>

                      <Select
                        value={statusFilter}
                        onValueChange={setStatusFilter}
                      >
                        <SelectTrigger className="w-full sm:w-40">
                          <Filter className="w-4 h-4 mr-2" />
                          <SelectValue placeholder="Lọc trạng thái" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tất cả</SelectItem>
                          <SelectItem value="signed">Đã ký</SelectItem>
                          <SelectItem value="unsigned">Chưa ký</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-full sm:w-40">
                          <ArrowUpDown className="w-4 h-4 mr-2" />
                          <SelectValue placeholder="Sắp xếp" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="name">Họ tên</SelectItem>
                          <SelectItem value="employee_id">Mã NV</SelectItem>
                          <SelectItem value="salary">Lương</SelectItem>
                          <SelectItem value="position">Chức vụ</SelectItem>
                          <SelectItem value="status">Trạng thái</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                        }
                        className="w-full sm:w-auto"
                      >
                        {sortOrder === "asc" ? "↑" : "↓"}
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="whitespace-nowrap">
                        {filteredAndSortedPayrolls.length} nhân viên
                      </Badge>
                      {totalPages > 1 && (
                        <Badge
                          variant="secondary"
                          className="whitespace-nowrap"
                        >
                          Trang {currentPage}/{totalPages}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Mã NV</TableHead>
                            <TableHead>Họ Tên</TableHead>
                            <TableHead>Chức Vụ</TableHead>
                            <TableHead className="text-right">Lương</TableHead>
                            <TableHead className="text-center">
                              Trạng Thái
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedPayrolls.length > 0 ? (
                            paginatedPayrolls.map((payroll) => (
                              <TableRow key={payroll.id}>
                                <TableCell className="font-medium">
                                  {payroll.employee_id}
                                </TableCell>
                                <TableCell>
                                  {payroll.employees?.full_name}
                                </TableCell>
                                <TableCell>
                                  {payroll.employees?.chuc_vu}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(
                                    payroll.tien_luong_thuc_nhan_cuoi_ky,
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge
                                    variant={
                                      payroll.is_signed
                                        ? "default"
                                        : "secondary"
                                    }
                                  >
                                    {payroll.is_signed ? "Đã ký" : "Chưa ký"}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell
                                colSpan={5}
                                className="text-center py-8 text-muted-foreground"
                              >
                                {filteredAndSortedPayrolls.length === 0
                                  ? "Không tìm thấy nhân viên nào phù hợp với bộ lọc"
                                  : "Không có dữ liệu"}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex justify-center">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() =>
                                setCurrentPage(Math.max(1, currentPage - 1))
                              }
                              className={
                                currentPage === 1
                                  ? "pointer-events-none opacity-50"
                                  : "cursor-pointer"
                              }
                            />
                          </PaginationItem>

                          {Array.from(
                            { length: Math.min(5, totalPages) },
                            (_, i) => {
                              let pageNum;
                              if (totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (currentPage <= 3) {
                                pageNum = i + 1;
                              } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                              } else {
                                pageNum = currentPage - 2 + i;
                              }

                              return (
                                <PaginationItem key={pageNum}>
                                  <PaginationLink
                                    onClick={() => setCurrentPage(pageNum)}
                                    isActive={currentPage === pageNum}
                                    className="cursor-pointer"
                                  >
                                    {pageNum}
                                  </PaginationLink>
                                </PaginationItem>
                              );
                            },
                          )}

                          <PaginationItem>
                            <PaginationNext
                              onClick={() =>
                                setCurrentPage(
                                  Math.min(totalPages, currentPage + 1),
                                )
                              }
                              className={
                                currentPage === totalPages
                                  ? "pointer-events-none opacity-50"
                                  : "cursor-pointer"
                              }
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="analysis" className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Phân Bố Lương</CardTitle>
                        <CardDescription>
                          Số lượng nhân viên theo khoảng lương
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {departmentData.salaryDistribution.map(
                            (range, index) => (
                              <div
                                key={range.range}
                                className="flex justify-between items-center"
                              >
                                <span className="text-sm">{range.range}</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-20 bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-blue-600 h-2 rounded-full"
                                      style={{
                                        width: `${(range.count / departmentData.stats.payrollCount) * 100}%`,
                                      }}
                                    />
                                  </div>
                                  <span className="text-sm font-medium w-8">
                                    {range.count}
                                  </span>
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Xu Hướng 6 Tháng</CardTitle>
                        <CardDescription>
                          Lương trung bình và tỷ lệ ký theo tháng
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {departmentData.monthlyTrends
                            .slice(-6)
                            .map((trend) => (
                              <div
                                key={trend.month}
                                className="flex justify-between items-center"
                              >
                                <span className="text-sm">{trend.month}</span>
                                <div className="text-right">
                                  <div className="text-sm font-medium">
                                    {(trend.averageSalary / 1000).toFixed(0)}K
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {trend.signedPercentage}% ký
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="charts" className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="w-4 h-4" />
                          Phân Bố Lương
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={departmentData.salaryDistribution}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="range" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="count" fill="#8884d8" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <PieChart className="w-4 h-4" />
                          Tỷ Lệ Ký Lương
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                          <RechartsPieChart>
                            <Tooltip />
                            <Pie
                              data={[
                                {
                                  name: "Đã ký",
                                  value: departmentData.stats.signedCount,
                                },
                                {
                                  name: "Chưa ký",
                                  value:
                                    departmentData.stats.payrollCount -
                                    departmentData.stats.signedCount,
                                },
                              ]}
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {[
                                {
                                  name: "Đã ký",
                                  value: departmentData.stats.signedCount,
                                },
                                {
                                  name: "Chưa ký",
                                  value:
                                    departmentData.stats.payrollCount -
                                    departmentData.stats.signedCount,
                                },
                              ].map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={COLORS[index % COLORS.length]}
                                />
                              ))}
                            </Pie>
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>

                  {departmentData.monthlyTrends.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Xu Hướng Lương Theo Tháng</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={departmentData.monthlyTrends}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip
                              formatter={(value, name) => [
                                name === "averageSalary"
                                  ? formatCurrency(value as number)
                                  : value,
                                name === "averageSalary" ? "Lương TB" : "Số NV",
                              ]}
                            />
                            <Bar
                              dataKey="averageSalary"
                              fill="#8884d8"
                              name="Lương TB"
                            />
                            <Bar
                              dataKey="employeeCount"
                              fill="#82ca9d"
                              name="Số NV"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="export" className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Download className="w-4 h-4" />
                          Xuất Dữ Liệu Bộ Phận
                        </CardTitle>
                        <CardDescription>
                          Xuất dữ liệu chi tiết của bộ phận {departmentName}{" "}
                          tháng {month}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <h4 className="font-medium">Thông Tin Xuất</h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            <li>
                              • Danh sách nhân viên (
                              {departmentData.stats.totalEmployees})
                            </li>
                            <li>
                              • Dữ liệu lương chi tiết (
                              {departmentData.stats.payrollCount})
                            </li>
                            <li>• Trạng thái ký lương</li>
                            <li>• Thống kê tổng hợp</li>
                            <li>• Phân tích xu hướng</li>
                          </ul>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-medium">Định Dạng File</h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            <li>• Excel (.xlsx)</li>
                            <li>• Multiple sheets cho từng loại dữ liệu</li>
                            <li>• Định dạng chuẩn Việt Nam</li>
                            <li>• Tương thích Excel, LibreOffice</li>
                          </ul>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={handleExport}
                            disabled={exporting}
                            className="flex items-center gap-2"
                          >
                            <Download className="w-4 h-4" />
                            {exporting ? "Đang xuất..." : "Xuất Excel"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                        <CardDescription>
                          Các thao tác nhanh cho bộ phận này
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-1 gap-2">
                          <Button
                            variant="outline"
                            className="justify-start"
                            onClick={() => {
                              setSearchTerm("");
                              setStatusFilter("unsigned");
                              setSortBy("name");
                              setSortOrder("asc");
                            }}
                          >
                            <FileCheck className="w-4 h-4 mr-2" />
                            Xem nhân viên chưa ký (
                            {departmentData.stats.payrollCount -
                              departmentData.stats.signedCount}
                            )
                          </Button>

                          <Button
                            variant="outline"
                            className="justify-start"
                            onClick={() => {
                              setSearchTerm("");
                              setStatusFilter("all");
                              setSortBy("salary");
                              setSortOrder("desc");
                            }}
                          >
                            <DollarSign className="w-4 h-4 mr-2" />
                            Sắp xếp theo lương cao nhất
                          </Button>

                          <Button
                            variant="outline"
                            className="justify-start"
                            onClick={() => {
                              setSearchTerm("");
                              setStatusFilter("signed");
                              setSortBy("name");
                              setSortOrder("asc");
                            }}
                          >
                            <Users className="w-4 h-4 mr-2" />
                            Xem nhân viên đã ký (
                            {departmentData.stats.signedCount})
                          </Button>
                        </div>

                        <div className="pt-4 border-t">
                          <Button
                            variant="outline"
                            onClick={onClose}
                            className="w-full"
                          >
                            Đóng Modal
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : null}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
