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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
  X,
  Eye,
  Download,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { type JWTPayload } from "@/lib/auth";
import { getPreviousMonth } from "@/utils/dateUtils";
import { DepartmentDetailModalRefactored } from "./department";
import { PayrollDetailModal } from "@/app/employee/lookup/payroll-detail-modal";
import { PayrollDetailModalT13 } from "@/app/employee/lookup/payroll-detail-modal-t13";
import {
  transformPayrollRecordToResult,
  type PayrollResult,
} from "@/lib/utils/payroll-transformer";

// Helper function to format month label
const formatMonthLabel = (value: string) => {
  const [year, month] = value.split("-");

  if (month === "13") {
    return `Lương Tháng 13 - ${year}`;
  }

  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "long",
  });
};

// Helper function to generate month options including T13
const generateMonthOptions = (years = 2) => {
  const options: { value: string; label: string }[] = [];
  const currentYear = new Date().getFullYear();

  for (let i = 0; i < years; i++) {
    const year = currentYear - i;
    const month13Value = `${year}-13`;
    options.push({
      value: month13Value,
      label: formatMonthLabel(month13Value),
    });

    for (let month = 12; month >= 1; month--) {
      const monthValue = `${year}-${String(month).padStart(2, "0")}`;
      options.push({ value: monthValue, label: formatMonthLabel(monthValue) });
    }
  }

  return options;
};

// Helper function to get payroll query params
const getPayrollQueryParams = (selectedMonth: string) => {
  if (selectedMonth.endsWith("-13")) {
    const year = selectedMonth.split("-")[0];
    return `payroll_type=t13&year=${year}`;
  }

  return `month=${selectedMonth}`;
};

interface DepartmentStats {
  name: string;
  employeeCount: number;
  payrollCount: number;
  signedCount: number;
  signedPercentage: string;
  totalSalary: number;
}

interface OverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: JWTPayload;
  initialMonth?: string;
}

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
  "#FFC658",
  "#FF7C7C",
];

export default function OverviewModal({
  isOpen,
  onClose,
  initialMonth,
}: OverviewModalProps) {
  const [departments, setDepartments] = useState<DepartmentStats[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    initialMonth || getPreviousMonth(),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Department Detail Modal state
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDepartmentForDetail, setSelectedDepartmentForDetail] =
    useState<string>("");

  // Export state
  const [exportingDepartment, setExportingDepartment] = useState<string | null>(
    null,
  );

  // Payroll Detail Modal state (from department detail modal)
  const [showDepartmentPayrollModal, setShowDepartmentPayrollModal] =
    useState(false);
  const [showDepartmentPayrollModalT13, setShowDepartmentPayrollModalT13] =
    useState(false);
  const [selectedDepartmentPayrollData, setSelectedDepartmentPayrollData] =
    useState<PayrollResult | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadDepartmentStats();
    }
  }, [isOpen, selectedMonth]);

  // Load department statistics với error handling
  const loadDepartmentStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("admin_token");
      const queryParams = getPayrollQueryParams(selectedMonth);
      const response = await fetch(
        `/api/admin/departments?include_stats=true&${queryParams}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setDepartments(data.departments || []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(
          errorData.error ||
            `Không thể tải dữ liệu thống kê (Mã lỗi: ${response.status})`,
        );
      }
    } catch (error) {
      console.error("Error loading department stats:", error);
      setError(
        "Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng và thử lại.",
      );
    } finally {
      setLoading(false);
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
      const queryParams = getPayrollQueryParams(selectedMonth);
      const response = await fetch(
        `/api/admin/payroll-export?${queryParams}&department=${encodeURIComponent(departmentName)}`,
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
        a.download = `department-${departmentName}-${selectedMonth}.xlsx`;
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
      }
    } catch (error) {
      console.error("Error exporting department data:", error);
    } finally {
      setExportingDepartment(null);
    }
  };

  const handleViewEmployeeFromDepartment = (payrollData: PayrollResult) => {
    // Handle payroll detail modal from department detail modal
    setSelectedDepartmentPayrollData(payrollData);

    // Check if it is T13 data
    if (payrollData.payroll_type === "t13") {
      setShowDepartmentPayrollModalT13(true);
    } else {
      setShowDepartmentPayrollModal(true);
    }
  };

  const totalStats = departments.reduce(
    (acc, dept) => ({
      totalEmployees: acc.totalEmployees + dept.employeeCount,
      totalPayroll: acc.totalPayroll + dept.payrollCount,
      totalSigned: acc.totalSigned + dept.signedCount,
      totalSalary: acc.totalSalary + dept.totalSalary,
    }),
    { totalEmployees: 0, totalPayroll: 0, totalSigned: 0, totalSalary: 0 },
  );

  const chartData = departments.map((dept) => ({
    name: dept.name,
    employees: dept.employeeCount,
    signed: dept.signedCount,
    unsigned: dept.payrollCount - dept.signedCount,
    totalSalary: dept.totalSalary / 1000000,
  }));

  const pieData = departments
    .map((dept) => ({
      name: dept.name,
      value: dept.totalSalary,
      percentage: ((dept.totalSalary / totalStats.totalSalary) * 100).toFixed(
        1,
      ),
    }))
    .filter((item) => item.value > 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex-1">
            <DialogTitle className="text-xl sm:text-2xl font-bold text-gray-900">
              Tổng Quan Hệ Thống
            </DialogTitle>
            <p className="text-sm text-gray-600 mt-1">
              Thống kê và phân tích dữ liệu {formatMonthLabel(selectedMonth)}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {generateMonthOptions(2).map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Đang tải dữ liệu...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <Card className="w-full max-w-md border-red-200 bg-red-50">
              <CardHeader>
                <div className="flex items-center gap-2 text-red-800">
                  <AlertCircle className="h-5 w-5" />
                  <CardTitle className="text-lg">Lỗi tải dữ liệu</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-red-700">{error}</p>
                <Button
                  onClick={loadDepartmentStats}
                  className="w-full"
                  variant="default"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Thử lại
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
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
                    Có dữ liệu {formatMonthLabel(selectedMonth)}
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium truncate">
                    Tỷ Lệ Ký
                  </CardTitle>
                  <FileCheck className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold">
                    {totalStats.totalPayroll > 0
                      ? Math.round(
                          (totalStats.totalSigned / totalStats.totalPayroll) *
                            100,
                        )
                      : 0}
                    %
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {totalStats.totalSigned}/{totalStats.totalPayroll} đã ký
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
                    {(totalStats.totalSalary / 1000000).toFixed(1)}M
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    VND {formatMonthLabel(selectedMonth)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
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
                      <Bar dataKey="unsigned" fill="#ffc658" name="Chưa ký" />
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

            {/* Department Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">
                  Chi Tiết Các Bộ Phận
                </CardTitle>
                <CardDescription className="text-sm">
                  Thông tin chi tiết từng bộ phận
                </CardDescription>
              </CardHeader>
              <CardContent>
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
                            <p className="text-muted-foreground">Nhân viên</p>
                            <p className="font-semibold">
                              {dept.employeeCount}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Đã ký</p>
                            <p className="font-semibold">
                              {dept.signedCount}/{dept.payrollCount}
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">
                            Tổng lương
                          </p>
                          <p className="font-semibold text-lg">
                            {(dept.totalSalary / 1000000).toFixed(1)}M VND
                          </p>
                        </div>
                        <div className="flex flex-row gap-2 pt-2">
                          <Button
                            variant="default"
                            size="sm"
                            className="flex-1 h-8 text-xs touch-manipulation"
                            onClick={() => handleViewPayroll(dept.name)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            <span className="hidden sm:inline">
                              Xem Chi Tiết
                            </span>
                            <span className="sm:hidden">Chi Tiết</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-8 text-xs touch-manipulation"
                            onClick={() => handleExportDepartment(dept.name)}
                            disabled={exportingDepartment === dept.name}
                          >
                            {exportingDepartment === dept.name ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                                <span className="hidden sm:inline">
                                  Xuất...
                                </span>
                                <span className="sm:hidden">...</span>
                              </>
                            ) : (
                              <>
                                <Download className="h-3 w-3 mr-1" />
                                <span className="hidden sm:inline">
                                  Xuất Excel
                                </span>
                                <span className="sm:hidden">Excel</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>

      {/* Department Detail Modal */}
      <DepartmentDetailModalRefactored
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        departmentName={selectedDepartmentForDetail}
        month={selectedMonth}
        onViewEmployee={handleViewEmployeeFromDepartment}
        initialPayrollType={selectedMonth.endsWith("-13") ? "t13" : "monthly"}
      />

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
    </Dialog>
  );
}
