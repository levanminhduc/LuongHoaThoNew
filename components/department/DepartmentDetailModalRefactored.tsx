"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Calendar, X, RefreshCw } from "lucide-react";

// Import refactored components
import DepartmentSummaryCards from "./DepartmentSummaryCards";
import EmployeeTable from "./EmployeeTable";
import SalaryAnalysisTab from "./SalaryAnalysisTab";
import DepartmentChartsTab from "./DepartmentChartsTab";
import ExportTab from "./ExportTab";

// Import cache utility
import DepartmentCache from "@/utils/departmentCache";

// Import transformer
import {
  transformPayrollRecordToResult,
  type PayrollResult,
} from "@/lib/utils/payroll-transformer";

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

  // Hệ số và thông số cơ bản
  he_so_lam_viec?: number;
  he_so_phu_cap_ket_qua?: number;
  he_so_luong_co_ban?: number;
  luong_toi_thieu_cty?: number;

  // Thời gian làm việc
  ngay_cong_trong_gio?: number;
  gio_cong_tang_ca?: number;
  gio_an_ca?: number;
  tong_gio_lam_viec?: number;
  tong_he_so_quy_doi?: number;
  ngay_cong_chu_nhat?: number;

  // Lương sản phẩm và đơn giá
  tong_luong_san_pham_cong_doan?: number;
  don_gia_tien_luong_tren_gio?: number;
  tien_luong_san_pham_trong_gio?: number;
  tien_luong_tang_ca?: number;
  tien_luong_30p_an_ca?: number;
  tien_khen_thuong_chuyen_can?: number;
  luong_hoc_viec_pc_luong?: number;
  tong_cong_tien_luong_san_pham?: number;

  // Phụ cấp và hỗ trợ
  ho_tro_thoi_tiet_nong?: number;
  bo_sung_luong?: number;
  tien_luong_chu_nhat?: number;
  luong_cnkcp_vuot?: number;
  tien_tang_ca_vuot?: number;
  bhxh_21_5_percent?: number;
  pc_cdcs_pccc_atvsv?: number;
  luong_phu_nu_hanh_kinh?: number;

  // Tổng lương và phụ cấp khác
  tong_cong_tien_luong?: number;
  tien_boc_vac?: number;
  ho_tro_xang_xe?: number;

  // Thuế và khấu trừ
  thue_tncn_nam_2024?: number;
  tam_ung?: number;
  thue_tncn?: number;
  bhxh_bhtn_bhyt_total?: number;
  truy_thu_the_bhyt?: number;

  // Lương thực nhận cuối kỳ
  tien_luong_thuc_nhan_cuoi_ky: number;

  // T13
  tong_luong_13?: number;

  // Thông tin ký
  is_signed: boolean;
  signed_at: string | null;
  signed_by_name?: string;
  signature_ip?: string;
  signature_device?: string;

  // Metadata
  source_file?: string;
  import_batch_id?: string;
  import_status?: string;
  created_at?: string;
  updated_at?: string;

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
  onViewEmployee?: (payrollData: PayrollResult) => void;
  initialPayrollType?: "monthly" | "t13";
}

export default function DepartmentDetailModalRefactored({
  isOpen,
  onClose,
  departmentName,
  month,
  onViewEmployee,
  initialPayrollType = "monthly",
}: DepartmentDetailModalProps) {
  const [departmentData, setDepartmentData] = useState<DepartmentDetail | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState("employees");
  const [payrollType, setPayrollType] = useState<"monthly" | "t13">(
    initialPayrollType,
  );
  // Year state for T13 - extract from month prop or use current year
  const [t13Year, setT13Year] = useState<string>(() => {
    // Extract year from month prop (format: YYYY-MM) or use current year
    return month ? month.substring(0, 4) : new Date().getFullYear().toString();
  });

  useEffect(() => {
    if (isOpen) {
      setActiveTab("employees");
      // Reset payroll type to initial when modal opens if provided, otherwise keep current
      if (initialPayrollType) {
        setPayrollType(initialPayrollType);
      }
    }
  }, [isOpen, initialPayrollType]);

  // Effect to reload data when payrollType or t13Year changes while modal is open
  useEffect(() => {
    if (isOpen && departmentName) {
      loadDepartmentDetail();
    }
  }, [isOpen, departmentName, month, payrollType, t13Year]);

  // Update t13Year when month prop changes
  useEffect(() => {
    if (month) {
      setT13Year(month.substring(0, 4));
    }
  }, [month]);

  const loadDepartmentDetail = async (forceRefresh: boolean = false) => {
    setLoading(true);
    setError("");

    try {
      // Create a cache key that includes payrollType and year for T13
      const cacheKeyMonth = payrollType === "t13" ? `${t13Year}-13` : month;
      const cacheKey = `${departmentName}_${cacheKeyMonth}_${payrollType}`;

      if (!forceRefresh) {
        // We need to update cache utility to support custom keys or just append to month
        // For now using the existing method but appending type to month for cache key purpose
        // Note: Ideally DepartmentCache should be updated to handle payrollType explicitly
        const cachedData = DepartmentCache.getCacheData(
          departmentName,
          cacheKeyMonth,
        );
        if (cachedData) {
          setDepartmentData(cachedData);
          setLoading(false);
          return;
        }
      } else {
        DepartmentCache.clearCache(departmentName, cacheKeyMonth);
      }

      const token = localStorage.getItem("admin_token");
      // Build URL with year parameter for T13
      const apiUrl =
        payrollType === "t13"
          ? `/api/admin/departments/${encodeURIComponent(departmentName)}?month=${month}&payroll_type=${payrollType}&year=${t13Year}`
          : `/api/admin/departments/${encodeURIComponent(departmentName)}?month=${month}&payroll_type=${payrollType}`;

      const response = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const departmentData = data.department;

        // Use correct cache key based on payroll type
        DepartmentCache.setCacheData(
          departmentName,
          cacheKeyMonth,
          departmentData,
        );

        setDepartmentData(departmentData);
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

  const handleExport = async (
    exportType: "full" | "summary" | "employees" = "full",
  ) => {
    setExporting(true);
    try {
      const token = localStorage.getItem("admin_token");

      const url = `/api/admin/payroll-export?month=${month}&department=${encodeURIComponent(departmentName)}&payroll_type=${payrollType}`;
      let filename = `department-${departmentName}-${month}`;

      if (payrollType === "t13") {
        filename += "-t13";
      }

      if (exportType === "summary") {
        filename += "-summary";
      } else if (exportType === "employees") {
        filename += "-employees";
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
        setError(errorData.error || "Lỗi khi xuất dữ liệu");
      }
    } catch (error) {
      console.error("Error exporting data:", error);
      setError("Có lỗi xảy ra khi xuất dữ liệu");
    } finally {
      setExporting(false);
    }
  };

  const handleQuickAction = (action: "unsigned" | "salary-desc" | "signed") => {
    // Switch to employees tab and trigger filter/sort
    setActiveTab("employees");
    // Note: The actual filter/sort logic will be handled by EmployeeTable component
    // through its internal state management
    console.log("Quick action:", action);
  };

  const handleViewEmployee = (employeeId: string) => {
    // Find the payroll record for this employee
    const payrollRecord = departmentData?.payrolls.find(
      (p) => p.employee_id === employeeId,
    );
    if (payrollRecord && onViewEmployee) {
      // Transform to PayrollResult format and call parent callback
      const payrollResult = transformPayrollRecordToResult(
        payrollRecord as unknown as Parameters<
          typeof transformPayrollRecordToResult
        >[0],
      );
      // Set source file to indicate Department Detail
      payrollResult.source_file = "Department Detail";
      // Add payroll type for proper modal handling downstream
      payrollResult.payroll_type = payrollType;

      onViewEmployee(payrollResult);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl lg:max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden department-detail-modal">
        <DialogHeader className="pb-2 sm:pb-4">
          <DialogTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span className="truncate text-sm sm:text-base">
                Chi Tiết Bộ Phận - {departmentName}
              </span>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center">
              <div className="bg-muted p-1 rounded-lg flex gap-1 mr-2">
                <Button
                  variant={payrollType === "monthly" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setPayrollType("monthly")}
                  className={`h-7 px-3 text-xs ${payrollType === "monthly" ? "bg-white text-primary shadow-sm" : "text-muted-foreground"}`}
                >
                  Lương Tháng
                </Button>
                <Button
                  variant={payrollType === "t13" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setPayrollType("t13")}
                  className={`h-7 px-3 text-xs ${payrollType === "t13" ? "bg-white text-primary shadow-sm" : "text-muted-foreground"}`}
                >
                  Lương T13
                </Button>
              </div>
              {/* Year selector for T13 */}
              {payrollType === "t13" && (
                <select
                  value={t13Year}
                  onChange={(e) => setT13Year(e.target.value)}
                  className="h-7 px-2 text-xs border rounded-md bg-background"
                  title="Chọn năm cho lương T13"
                >
                  {/* Generate last 5 years */}
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() - i;
                    return (
                      <option key={year} value={year.toString()}>
                        Năm {year}
                      </option>
                    );
                  })}
                </select>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadDepartmentDetail(true)}
                disabled={loading}
                className="h-8 w-8 p-0 touch-manipulation"
                title="Làm mới dữ liệu (bỏ qua cache)"
              >
                <RefreshCw
                  className={`w-3 h-3 ${loading ? "animate-spin" : ""}`}
                />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogTitle>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>
                {payrollType === "t13"
                  ? `Lương T13 - Năm ${t13Year}`
                  : `Tháng: ${month}`}
              </span>
            </div>
            {error && (
              <Badge variant="destructive" className="text-xs">
                Có lỗi
              </Badge>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="h-[70vh] sm:h-[75vh] touch-pan-y">
          {loading ? (
            <div className="space-y-4 pr-2 sm:pr-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
              <Skeleton className="h-96" />
            </div>
          ) : error ? (
            <div className="text-center py-8 pr-2 sm:pr-4">
              <p className="text-red-600">{error}</p>
              <Button onClick={() => loadDepartmentDetail()} className="mt-4">
                Thử Lại
              </Button>
            </div>
          ) : departmentData ? (
            <div className="space-y-4 sm:space-y-6 pr-2 sm:pr-4">
              {/* Summary Cards */}
              <DepartmentSummaryCards
                stats={(() => {
                  if (payrollType === "t13") {
                    const totalSalaryT13 = departmentData.payrolls.reduce(
                      (sum, p) => sum + (p.tong_luong_13 || 0),
                      0,
                    );
                    return {
                      ...departmentData.stats,
                      totalSalary: totalSalaryT13,
                      averageSalary:
                        departmentData.stats.payrollCount > 0
                          ? totalSalaryT13 / departmentData.stats.payrollCount
                          : 0,
                    };
                  }
                  return departmentData.stats;
                })()}
                month={month}
                payrollType={payrollType}
              />

              {/* Tabs Content */}
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="space-y-3 sm:space-y-4"
              >
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto gap-1">
                  <TabsTrigger
                    value="employees"
                    className="text-xs sm:text-sm px-2 py-2"
                  >
                    <span className="hidden sm:inline">👥 Nhân Viên</span>
                    <span className="sm:hidden">👥 NV</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="analysis"
                    className="text-xs sm:text-sm px-2 py-2"
                  >
                    <span className="hidden sm:inline">💰 Phân Tích</span>
                    <span className="sm:hidden">💰 PT</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="charts"
                    className="text-xs sm:text-sm px-2 py-2"
                  >
                    <span className="hidden sm:inline">📊 Biểu Đồ</span>
                    <span className="sm:hidden">📊 BĐ</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="export"
                    className="text-xs sm:text-sm px-2 py-2"
                  >
                    <span className="hidden sm:inline">📋 Xuất Dữ Liệu</span>
                    <span className="sm:hidden">📋 XD</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent
                  value="employees"
                  className="space-y-3 sm:space-y-4"
                >
                  <EmployeeTable
                    payrolls={departmentData.payrolls}
                    onViewEmployee={handleViewEmployee}
                    payrollType={payrollType}
                  />
                </TabsContent>

                <TabsContent
                  value="analysis"
                  className="space-y-3 sm:space-y-4"
                >
                  <SalaryAnalysisTab
                    stats={departmentData.stats}
                    salaryDistribution={departmentData.salaryDistribution}
                    monthlyTrends={departmentData.monthlyTrends}
                  />
                </TabsContent>

                <TabsContent value="charts" className="space-y-3 sm:space-y-4">
                  <DepartmentChartsTab
                    stats={departmentData.stats}
                    salaryDistribution={departmentData.salaryDistribution}
                    monthlyTrends={departmentData.monthlyTrends}
                  />
                </TabsContent>

                <TabsContent value="export" className="space-y-3 sm:space-y-4">
                  <ExportTab
                    departmentName={departmentName}
                    month={month}
                    stats={departmentData.stats}
                    onExport={handleExport}
                    onQuickAction={handleQuickAction}
                    onClose={onClose}
                    exporting={exporting}
                  />
                </TabsContent>
              </Tabs>
            </div>
          ) : null}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
