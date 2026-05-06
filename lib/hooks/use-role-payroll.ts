import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient, downloadBlob } from "@/lib/api/client";
import { ENDPOINTS, QUERY_PARAMS } from "@/lib/api/endpoints";
import { withToast } from "@/lib/api/mutation-helpers";
import { getVietnamTimestamp } from "@/lib/utils/vietnam-timezone";
import { formatVietnamMonthLabel } from "@/utils/dateUtils";

export interface RolePayrollRecord {
  id: number;
  employee_id: string;
  salary_month: string;
  tien_luong_thuc_nhan_cuoi_ky: number;
  tong_cong_tien_luong?: number;
  thue_tncn?: number;
  bhxh_bhtn_bhyt_total?: number;
  is_signed: boolean;
  signed_at: string | null;
  signed_by_name?: string;
  tien_khen_thuong_chuyen_can?: number;
  he_so_lam_viec?: number;
  he_so_phu_cap_ket_qua?: number;
  he_so_luong_co_ban?: number;
  luong_toi_thieu_cty?: number;
  ngay_cong_trong_gio?: number;
  gio_cong_tang_ca?: number;
  gio_an_ca?: number;
  tong_gio_lam_viec?: number;
  tong_he_so_quy_doi?: number;
  ngay_cong_chu_nhat?: number;
  tong_luong_san_pham_cong_doan?: number;
  don_gia_tien_luong_tren_gio?: number;
  tien_luong_san_pham_trong_gio?: number;
  tien_luong_tang_ca?: number;
  tien_luong_30p_an_ca?: number;
  luong_hoc_viec_pc_luong?: number;
  tong_cong_tien_luong_san_pham?: number;
  ho_tro_thoi_tiet_nong?: number;
  bo_sung_luong?: number;
  tien_tang_ca_vuot?: number;
  luong_cnkcp_vuot?: number;
  bhxh_21_5_percent?: number;
  pc_cdcs_pccc_atvsv?: number;
  luong_phu_nu_hanh_kinh?: number;
  tien_con_bu_thai_7_thang?: number;
  ho_tro_gui_con_nha_tre?: number;
  ngay_cong_phep_le?: number;
  tien_phep_le?: number;
  tien_boc_vac?: number;
  ho_tro_xang_xe?: number;
  thue_tncn_nam_2024?: number;
  tam_ung?: number;
  truy_thu_the_bhyt?: number;
  so_thang_chia_13?: number;
  tong_sp_12_thang?: number;
  chi_dot_1_13?: number;
  chi_dot_2_13?: number;
  tong_luong_13?: number;
  employees?: {
    employee_id?: string;
    full_name: string;
    department?: string;
    chuc_vu: string;
  };
}

export interface ManagerDepartmentStats {
  name: string;
  employeeCount: number;
  payrollCount: number;
  signedCount: number;
  signedPercentage: string;
  totalSalary: number;
  averageSalary: number;
}

export interface SupervisorDepartmentStats {
  department: string;
  totalEmployees: number;
  signedCount: number;
  signedPercentage: string;
  totalSalary: number;
  averageSalary: number;
}

export interface PayrollListResponse {
  success: boolean;
  data: RolePayrollRecord[];
}

export interface ManagerDepartmentsResponse {
  success: boolean;
  departments: ManagerDepartmentStats[];
}

export interface SupervisorStatsResponse {
  success: boolean;
  statistics: SupervisorDepartmentStats;
}

export interface TrendItem {
  month: string;
  monthLabel: string;
  totalEmployees: number;
  signedCount: number;
  totalSalary: number;
  signedPercentage: number;
}

export interface EmployeePayrollRecord extends RolePayrollRecord {
  employees: {
    employee_id?: string;
    full_name: string;
    department: string;
    chuc_vu: string;
  };
}

export interface EmployeePayrollResponse {
  success: boolean;
  data: EmployeePayrollRecord[];
}

export interface YearlySummary {
  year: number;
  employee_id: string;
  totalMonths: number;
  signedMonths: number;
  signedPercentage: string;
  totalGrossSalary: number;
  totalNetSalary: number;
  totalTax: number;
  totalInsurance: number;
  averageNetSalary: number;
}

export interface EmployeeYearlySummaryResponse {
  success: boolean;
  summary: YearlySummary;
  monthlyBreakdown: Array<{
    month: string;
    grossSalary: number;
    netSalary: number;
    tax: number;
    insurance: number;
    isSigned: boolean;
    signedAt: string | null;
  }>;
}

function appendParams(path: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function payrollPeriodParams(selectedMonth: string) {
  const params = new URLSearchParams();

  if (selectedMonth.endsWith("-13")) {
    params.set(QUERY_PARAMS.PAYROLL_TYPE, "t13");
    params.set(QUERY_PARAMS.YEAR, selectedMonth.split("-")[0] ?? "");
  } else {
    params.set(QUERY_PARAMS.MONTH, selectedMonth);
  }

  return params;
}

export function useManagerDepartmentsQuery(selectedMonth: string) {
  return useQuery({
    queryKey: ["manager-departments", selectedMonth],
    queryFn: ({ signal }) => {
      const params = payrollPeriodParams(selectedMonth);
      params.set(QUERY_PARAMS.INCLUDE_STATS, "true");

      return apiClient.get<ManagerDepartmentsResponse>(
        appendParams(ENDPOINTS.departments.list, params),
        { signal },
      );
    },
    staleTime: 30_000,
  });
}

export function useManagerPayrollQuery(
  selectedMonth: string,
  selectedDepartment: string,
) {
  return useQuery({
    queryKey: ["manager-payroll", selectedMonth, selectedDepartment],
    queryFn: ({ signal }) => {
      const params = payrollPeriodParams(selectedMonth);
      params.set(QUERY_PARAMS.LIMIT, "50");

      if (selectedDepartment !== "all") {
        params.set(QUERY_PARAMS.DEPARTMENT, selectedDepartment);
      }

      return apiClient.get<PayrollListResponse>(
        appendParams(ENDPOINTS.payroll.myDepartments, params),
        { signal },
      );
    },
    enabled: selectedDepartment !== "all",
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });
}

export function useSupervisorPayrollQuery(selectedMonth: string) {
  return useQuery({
    queryKey: ["supervisor-payroll", selectedMonth],
    queryFn: ({ signal }) => {
      const params = payrollPeriodParams(selectedMonth);
      params.set(QUERY_PARAMS.LIMIT, "100");

      return apiClient.get<PayrollListResponse>(
        appendParams(ENDPOINTS.payroll.myDepartment, params),
        { signal },
      );
    },
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });
}

export function useSupervisorStatsQuery(selectedMonth: string) {
  return useQuery({
    queryKey: ["supervisor-stats", selectedMonth],
    queryFn: ({ signal }) =>
      apiClient.post<SupervisorStatsResponse>(
        ENDPOINTS.payroll.myDepartment,
        { month: selectedMonth },
        { signal },
      ),
    staleTime: 30_000,
  });
}

export function useSupervisorTrendQuery(months: string[]) {
  return useQuery({
    queryKey: ["supervisor-trends", months],
    queryFn: async ({ signal }) => {
      const trendData = await Promise.all(
        months.map(async (month) => {
          const data = await apiClient.post<SupervisorStatsResponse>(
            ENDPOINTS.payroll.myDepartment,
            { month },
            { signal },
          );
          const stats = data.statistics;

          return {
            month,
            monthLabel: formatVietnamMonthLabel(month),
            totalEmployees: stats.totalEmployees,
            signedCount: stats.signedCount,
            totalSalary: stats.totalSalary / 1000000,
            signedPercentage: parseFloat(stats.signedPercentage),
          };
        }),
      );

      return trendData as TrendItem[];
    },
    staleTime: 5 * 60_000,
  });
}

export function usePayrollExportMutation() {
  return useMutation({
    mutationFn: async (input: {
      selectedMonth: string;
      department?: string;
      filenamePrefix?: string;
    }) => {
      const params = payrollPeriodParams(input.selectedMonth);

      if (input.department) {
        params.set(QUERY_PARAMS.DEPARTMENT, input.department);
      }

      const { blob, filename } = await apiClient.blob(
        appendParams(ENDPOINTS.payroll.export, params),
      );
      const prefix = input.filenamePrefix ?? "payroll";
      const finalName = filename ?? `${prefix}-${input.selectedMonth}.xlsx`;
      downloadBlob(blob, finalName);
      return { filename: finalName };
    },
    ...withToast({ success: "Đã xuất Excel" }),
  });
}

export function useEmployeePayrollDataQuery(limit = 12) {
  return useQuery({
    queryKey: ["employee-payroll-data", limit],
    queryFn: ({ signal }) => {
      const params = new URLSearchParams();
      params.set(QUERY_PARAMS.LIMIT, String(limit));

      return apiClient.get<EmployeePayrollResponse>(
        appendParams(ENDPOINTS.payroll.myData, params),
        { signal },
      );
    },
    staleTime: 30_000,
  });
}

export function useEmployeeYearlySummaryQuery(year: number) {
  return useQuery({
    queryKey: ["employee-yearly-summary", year],
    queryFn: ({ signal }) =>
      apiClient.post<EmployeeYearlySummaryResponse>(
        ENDPOINTS.payroll.myData,
        { year },
        { signal },
      ),
    staleTime: 30_000,
  });
}

export function usePayslipDownloadMutation() {
  return useMutation({
    mutationFn: async (input: {
      payrollId: string | number;
      employeeId: string;
      month: string;
    }) => {
      const { blob, filename } = await apiClient.blob(
        ENDPOINTS.payroll.payslip(input.payrollId),
      );
      const finalName =
        filename ?? `payslip-${input.employeeId}-${input.month}.pdf`;
      downloadBlob(blob, finalName);
      return { filename: finalName };
    },
    ...withToast({ success: "Đã tải phiếu lương" }),
  });
}

export function payrollExportFilenamePrefix(input: {
  selectedMonth: string;
  department?: string;
  exportType?: "employees" | "overview" | "trends";
}) {
  const date = getVietnamTimestamp().slice(0, 10);
  const base = input.department
    ? `Luong_${input.department}_${input.selectedMonth}`
    : `payroll-all-departments-${input.selectedMonth}`;

  return input.exportType && input.exportType !== "employees"
    ? `${base}_${input.exportType}_${date}`
    : `${base}_${date}`;
}
