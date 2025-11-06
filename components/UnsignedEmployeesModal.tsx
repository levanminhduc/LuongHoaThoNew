"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  UserX,
  Search,
  ChevronLeft,
  ChevronRight,
  Building2,
  User,
  CheckCircle,
  XCircle,
  Loader2,
  Download,
} from "lucide-react";

interface Employee {
  employee_id: string;
  full_name: string;
  department: string;
  chuc_vu: string;
  is_active: boolean;
  payroll_data?: {
    salary_month: string;
    tien_luong_thuc_nhan_cuoi_ky: number;
    import_status: string;
    created_at: string;
  } | null;
  has_payroll?: boolean;
  salary_amount?: number;
  is_signed?: boolean;
}

interface UnsignedEmployeesModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMonth: string;
  userRole: "giam_doc" | "ke_toan" | "nguoi_lap_bieu";
  totalUnsigned?: number;
}

interface CachedData {
  employees?: Employee[];
  pagination?: { totalPages?: number };
  departments?: string[];
  departmentCounts?: Record<string, number>;
}

const unsignedCache = new Map<
  string,
  { data: CachedData; timestamp: number }
>();
const CACHE_DURATION = 60 * 60 * 1000;

export default function UnsignedEmployeesModal({
  isOpen,
  onClose,
  selectedMonth,
  userRole,
  totalUnsigned,
}: UnsignedEmployeesModalProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [departments, setDepartments] = useState<string[]>([]);
  const [departmentCounts, setDepartmentCounts] = useState<
    Record<string, number>
  >({});

  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const getCacheKey = useCallback(
    (page: number, search: string, dept: string) => {
      return `unsigned-employees-${userRole}-${selectedMonth}-${page}-${search}-${dept}`;
    },
    [userRole, selectedMonth],
  );

  const getCachedData = useCallback((cacheKey: string) => {
    const cached = unsignedCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }, []);

  const setCachedData = useCallback((cacheKey: string, data: CachedData) => {
    unsignedCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });
  }, []);

  const loadEmployees = useCallback(
    async (page = 1, search = "", dept = "all") => {
      const cacheKey = getCacheKey(page, search, dept);

      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        setEmployees(cachedData.employees || []);
        setTotalPages(cachedData.pagination?.totalPages || 1);
        setDepartments(cachedData.departments || []);
        setDepartmentCounts(cachedData.departmentCounts || {});
        return;
      }

      setLoading(true);
      setError("");

      try {
        const token = localStorage.getItem("admin_token");
        if (!token) {
          setError("Không có quyền truy cập");
          return;
        }

        const params = new URLSearchParams({
          page: page.toString(),
          limit: "50",
          include_payroll: "true",
          month: selectedMonth,
          unsigned_only: "true",
        });

        if (search && search.length >= 2) {
          params.append("search", search);
        }

        if (dept && dept !== "all") {
          params.append("department", dept);
        }

        const response = await fetch(`/api/employees/all-employees?${params}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Cache-Control": "max-age=3600",
          },
        });

        const data = await response.json();

        if (response.ok) {
          setEmployees(data.employees || []);
          setTotalPages(data.pagination?.totalPages || 1);
          setDepartments(data.departments || []);
          setDepartmentCounts(data.departmentCounts || {});

          setCachedData(cacheKey, data);
        } else {
          setError(data.error || "Lỗi khi tải danh sách nhân viên chưa ký");
        }
      } catch (error) {
        console.error("Error loading unsigned employees:", error);
        setError("Có lỗi xảy ra khi tải danh sách nhân viên chưa ký");
      } finally {
        setLoading(false);
      }
    },
    [selectedMonth, getCacheKey, getCachedData, setCachedData],
  );

  useEffect(() => {
    if (isOpen) {
      loadEmployees(currentPage, debouncedSearch, selectedDepartment);
    }
  }, [isOpen, currentPage, debouncedSearch, selectedDepartment, loadEmployees]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setSelectedDepartment("all");
      setCurrentPage(1);
      setEmployees([]);
      setError("");
    }
  }, [isOpen]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleDepartmentChange = (dept: string) => {
    setSelectedDepartment(dept);
    setCurrentPage(1);
  };

  const formatSalary = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const getChucVuColor = (chucVu: string) => {
    const colors = {
      giam_doc: "bg-red-100 text-red-800",
      ke_toan: "bg-blue-100 text-blue-800",
      nguoi_lap_bieu: "bg-purple-100 text-purple-800",
      truong_phong: "bg-green-100 text-green-800",
      to_truong: "bg-yellow-100 text-yellow-800",
      nhan_vien: "bg-gray-100 text-gray-800",
    };
    return colors[chucVu as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getChucVuLabel = (chucVu: string) => {
    const labels = {
      giam_doc: "Giám Đốc",
      ke_toan: "Kế Toán",
      nguoi_lap_bieu: "Người Lập Biểu",
      truong_phong: "Trưởng Phòng",
      to_truong: "Tổ Trưởng",
      nhan_vien: "Nhân Viên",
    };
    return labels[chucVu as keyof typeof labels] || chucVu;
  };

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      setError("");

      const token = localStorage.getItem("admin_token");
      if (!token) {
        setError("Không có quyền truy cập");
        return;
      }

      const params = new URLSearchParams({
        month: selectedMonth,
      });

      if (debouncedSearch && debouncedSearch.length >= 2) {
        params.append("search", debouncedSearch);
      }

      if (selectedDepartment && selectedDepartment !== "all") {
        params.append("department", selectedDepartment);
      }

      const response = await fetch(
        `/api/admin/unsigned-employees-export?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `NV_Chua_Ky_${selectedMonth}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(a);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Lỗi khi xuất Excel");
      }
    } catch (error) {
      console.error("Error exporting Excel:", error);
      setError("Lỗi khi xuất Excel");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <UserX className="w-5 h-5" />
            Nhân Viên Chưa Ký Nhận Lương
          </DialogTitle>
          <DialogDescription>
            Tháng {selectedMonth} •{" "}
            {totalUnsigned !== undefined
              ? `${totalUnsigned} nhân viên chưa ký`
              : "Đang tải..."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tìm kiếm</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Mã NV hoặc tên nhân viên..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Phòng ban</label>
              <Select
                value={selectedDepartment}
                onValueChange={handleDepartmentChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả phòng ban</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept} ({departmentCounts[dept] || 0})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Thống kê</label>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Building2 className="w-4 h-4" />
                  {departments.length} phòng ban
                </div>
                <Button
                  onClick={handleExportExcel}
                  disabled={exporting || employees.length === 0}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                >
                  {exporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang xuất...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Xuất Excel
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              <span>Đang tải danh sách nhân viên chưa ký...</span>
            </div>
          )}

          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-red-700">
                  <XCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {!loading && !error && employees.length > 0 && (
            <div className="space-y-4">
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left p-3 font-medium">Mã NV</th>
                      <th className="text-left p-3 font-medium">Họ Tên</th>
                      <th className="text-left p-3 font-medium">Phòng Ban</th>
                      <th className="text-left p-3 font-medium">Chức Vụ</th>
                      <th className="text-right p-3 font-medium">
                        Lương Thực Nhận
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((employee) => (
                      <tr
                        key={employee.employee_id}
                        className="border-b hover:bg-gray-50"
                      >
                        <td className="p-3">
                          <Badge variant="outline">
                            {employee.employee_id}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">
                              {employee.full_name}
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            <span>{employee.department}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge className={getChucVuColor(employee.chuc_vu)}>
                            {getChucVuLabel(employee.chuc_vu)}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <span className="font-semibold">
                            {formatSalary(employee.salary_amount || 0)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Trang {currentPage} / {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Trước
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Sau
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!loading && !error && employees.length === 0 && (
            <div className="text-center py-8 text-green-600">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-medium mb-2">
                Tất cả nhân viên đã ký nhận lương
              </h3>
              <p className="text-gray-600">
                Không còn nhân viên nào chưa ký trong tháng này.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
