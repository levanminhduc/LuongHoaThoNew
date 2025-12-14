"use client";

import { useState, useEffect, useCallback } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  Database,
  FileSpreadsheet,
  Users,
  DollarSign,
  TrendingUp,
  Settings,
  UserCheck,
  Edit,
  Filter,
  LayoutDashboard,
  ArrowUpDown,
} from "lucide-react";
import { EmployeeImportSection } from "@/components/employee-import-section";
import { MonthSelector } from "../payroll-management/components/MonthSelector";
import {
  StatsCard,
  StatsGrid,
  DataTableToolbar,
  PayrollListItem,
} from "@/components/admin";

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

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("vi-VN");
};

export function AdminDashboardV2() {
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
  const [message, setMessage] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [filteredPayrolls, setFilteredPayrolls] = useState<PayrollRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

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
    } catch {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("user_info");
      router.push("/admin/login");
      return;
    }

    fetchDashboardData();
  }, [router]);

  useEffect(() => {
    let filtered = payrolls;
    if (selectedMonth) {
      filtered = filtered.filter((p) => p.salary_month === selectedMonth);
    }
    if (searchQuery) {
      filtered = filtered.filter((p) =>
        p.employee_id.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }
    setFilteredPayrolls(filtered);
  }, [selectedMonth, payrolls, searchQuery]);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("admin_token");
      const response = await fetch("/api/admin/dashboard-stats", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setPayrolls(data.payrolls || []);
        setStats(data.stats || {});
      } else if (response.status === 401) {
        localStorage.removeItem("admin_token");
        router.push("/admin/login");
      }
    } catch {
      setMessage("Lỗi khi tải dữ liệu dashboard");
    } finally {
      setLoading(false);
    }
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      {message && (
        <Alert className="mb-4 border-blue-200 bg-blue-50">
          <AlertDescription className="text-blue-800">
            {message}
          </AlertDescription>
        </Alert>
      )}

      <StatsGrid className="mb-6">
        <StatsCard
          title="Tổng Bản Ghi"
          value={stats.totalRecords.toLocaleString()}
          subtitle={`Tháng: ${stats.currentMonth}`}
          badge={`Batch: ${stats.lastImportBatch || "N/A"}`}
          icon={FileSpreadsheet}
          variant="blue"
        />
        <StatsCard
          title="Số Nhân Viên"
          value={stats.totalEmployees.toLocaleString()}
          subtitle="Nhân viên có lương"
          icon={Users}
          variant="green"
        />
        <StatsCard
          title="Tổng Lương"
          value={formatCurrency(stats.totalSalary)}
          subtitle="Thực nhận"
          icon={DollarSign}
          variant="purple"
        />
        <StatsCard
          title="Tỷ Lệ Ký"
          value={`${stats.signatureRate.toFixed(1)}%`}
          subtitle="Đã ký nhận"
          progress={stats.signatureRate}
          icon={TrendingUp}
          variant="orange"
        />
      </StatsGrid>

      <Tabs defaultValue="overview" className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto gap-1">
              <TabsTrigger
                value="overview"
                className="flex items-center gap-2 py-2.5"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Tổng Quan</span>
                <span className="sm:hidden">Tổng Quan</span>
              </TabsTrigger>
              <TabsTrigger
                value="employees"
                className="flex items-center gap-2 py-2.5"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Nhân Viên</span>
                <span className="sm:hidden">NV</span>
              </TabsTrigger>
              <TabsTrigger
                value="payroll"
                className="flex items-center gap-2 py-2.5"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span className="hidden sm:inline">Bảng Lương</span>
                <span className="sm:hidden">Lương</span>
              </TabsTrigger>
              <TabsTrigger
                value="reports"
                className="flex items-center gap-2 py-2.5"
              >
                <TrendingUp className="h-4 w-4" />
                <span>Báo Cáo</span>
              </TabsTrigger>
            </TabsList>
          </CardContent>
        </Card>

        <TabsContent value="overview" className="space-y-4">
          <DataTableToolbar
            title="Dữ Liệu Lương Theo Tháng"
            description={
              selectedMonth ? `Tháng ${selectedMonth}` : "Chọn tháng để xem"
            }
            searchPlaceholder="Tìm mã NV..."
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            onRefresh={fetchDashboardData}
            isLoading={loading}
            actions={
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/admin/payroll-management")}
              >
                <Edit className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Chi Tiết</span>
              </Button>
            }
          />

          <Card>
            <CardHeader className="pb-3">
              <MonthSelector
                value={selectedMonth}
                onValueChange={setSelectedMonth}
                placeholder="Chọn tháng"
                label="Lọc Theo Tháng"
                allowEmpty
              />
            </CardHeader>
            <CardContent>
              {!selectedMonth ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Filter className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">
                    Chọn Tháng Để Xem
                  </h3>
                  <p className="text-sm">
                    Vui lòng chọn tháng lương từ dropdown
                  </p>
                </div>
              ) : (
                <>
                  <div className="hidden md:block">
                    <ScrollArea className="h-[500px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Mã NV</TableHead>
                            <TableHead>Tháng</TableHead>
                            <TableHead>Lương Thực Nhận</TableHead>
                            <TableHead>Batch ID</TableHead>
                            <TableHead>Trạng Thái</TableHead>
                            <TableHead>Ngày Tạo</TableHead>
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
                              <TableCell className="text-muted-foreground">
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
                              <TableCell className="text-muted-foreground">
                                {formatDate(record.created_at)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>

                  <div className="md:hidden space-y-3">
                    {filteredPayrolls.map((record) => (
                      <PayrollListItem
                        key={record.id}
                        employeeId={record.employee_id}
                        salaryMonth={record.salary_month}
                        salary={record.tien_luong_thuc_nhan_cuoi_ky}
                        status={
                          record.import_status === "signed"
                            ? "signed"
                            : "unsigned"
                        }
                        batchId={record.import_batch_id}
                        createdAt={record.created_at}
                      />
                    ))}
                  </div>

                  {filteredPayrolls.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Không có dữ liệu cho tháng {selectedMonth}</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employees">
          <EmployeeImportSection />
        </TabsContent>

        <TabsContent value="payroll">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Quản Lý Bảng Lương
              </CardTitle>
              <CardDescription>
                Truy cập các công cụ import/export lương
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full sm:w-auto"
                onClick={() => router.push("/admin/payroll-import-export")}
              >
                <ArrowUpDown className="h-4 w-4 mr-2" />
                Import/Export Lương
              </Button>
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => router.push("/admin/payroll-management")}
              >
                <Edit className="h-4 w-4 mr-2" />
                Quản Lý Chi Tiết
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Báo Cáo Tổng Quan</CardTitle>
                <CardDescription>Thống kê tổng quan hệ thống</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tổng bản ghi:</span>
                  <span className="font-semibold">{stats.totalRecords}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nhân viên:</span>
                  <span className="font-semibold">{stats.totalEmployees}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tổng lương:</span>
                  <span className="font-semibold">
                    {formatCurrency(stats.totalSalary)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tỷ lệ ký:</span>
                  <span className="font-semibold">
                    {stats.signatureRate.toFixed(1)}%
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Thao Tác Nhanh</CardTitle>
                <CardDescription>Các tính năng thường dùng</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push("/admin/bulk-signature")}
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Ký Hàng Loạt
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push("/admin/data-validation")}
                >
                  <Database className="h-4 w-4 mr-2" />
                  Kiểm Tra Dữ Liệu
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push("/admin/column-mapping-config")}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Column Mapping
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
