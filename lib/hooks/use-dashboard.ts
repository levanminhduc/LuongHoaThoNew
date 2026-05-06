import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, downloadBlob } from "@/lib/api/client";
import { ENDPOINTS, QUERY_PARAMS } from "@/lib/api/endpoints";
import { withToast } from "@/lib/api/mutation-helpers";
import { getVietnamTimestamp } from "@/lib/utils/vietnam-timezone";
import type { MonthStatus, SignatureRecord } from "@/lib/management-signature-utils";
import type { PayrollType } from "./use-payroll";

export interface DashboardStatsFilters {
  payroll_type?: PayrollType;
}

export interface DashboardStatsResponse {
  success: boolean;
  payrolls: Array<Record<string, unknown>>;
  stats: {
    totalRecords: number;
    totalEmployees: number;
    totalSalary: number;
    currentMonth: string;
    lastImportBatch: string;
    signatureRate: number;
  };
  monthlyStats?: Record<string, { count: number; totalSalary: number }>;
  payrollType?: PayrollType;
}

export interface SignatureHistoryFilters {
  months?: string;
  signature_type?: "giam_doc" | "ke_toan" | "nguoi_lap_bieu";
  payroll_type?: PayrollType;
  limit?: number;
  offset?: number;
}

export interface ManagementSignatureInput {
  salary_month: string;
  signature_type: "giam_doc" | "ke_toan" | "nguoi_lap_bieu";
  notes: string;
  device_info: string;
  is_t13?: boolean;
}

export interface SignatureHistoryResponse {
  signatures: SignatureRecord[];
}

export interface SignatureStatsResponse {
  total_employees: number;
  already_signed: number;
  unsigned: number;
  completion_percentage: number;
}

export interface SignedEmployee {
  employee_id: string;
  full_name: string;
  department: string;
}

export interface SignatureDateMonthsResponse {
  success: boolean;
  months: string[];
}

export interface SignedEmployeesResponse {
  success: boolean;
  month: string;
  signed_employees: SignedEmployee[];
  signed_count: number;
}

export interface EmployeeSignatureDateInput {
  salary_month: string;
  base_date: string;
  random_range_days: number;
  scope: "all" | "selected";
  employee_ids?: string[];
  is_t13: boolean;
}

export interface ManagementSignatureDateInput {
  salary_month: string;
  signature_type: "giam_doc" | "ke_toan" | "nguoi_lap_bieu";
  new_signed_at: string;
  action: "update" | "create";
  is_t13: boolean;
}

function appendParams(path: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function dashboardStatsKey(filters: DashboardStatsFilters = {}) {
  return ["dashboard-stats", filters] as const;
}

export function useDashboardStatsQuery(filters: DashboardStatsFilters = {}) {
  return useQuery({
    queryKey: dashboardStatsKey(filters),
    queryFn: ({ signal }) => {
      const params = new URLSearchParams();
      if (filters.payroll_type) {
        params.set(QUERY_PARAMS.PAYROLL_TYPE, filters.payroll_type);
      }

      return apiClient.get<DashboardStatsResponse>(
        appendParams(ENDPOINTS.dashboard.stats, params),
        { signal },
      );
    },
    staleTime: 30_000,
  });
}

export function useSyncTemplateMutation() {
  return useMutation({
    mutationFn: async () => {
      const { blob, filename } = await apiClient.blob(
        ENDPOINTS.dashboard.syncTemplate,
      );
      const date = getVietnamTimestamp().slice(0, 10);
      const finalName = filename ?? `template-luong-dong-bo-${date}.xlsx`;
      downloadBlob(blob, finalName);
      return { filename: finalName };
    },
    ...withToast({ success: "Đã tải template đồng bộ" }),
  });
}

export function useSignatureProgressQuery(salaryMonth: string) {
  return useQuery({
    queryKey: ["signature-progress", salaryMonth],
    queryFn: ({ signal }) =>
      apiClient.get(ENDPOINTS.signature.progress(salaryMonth), { signal }),
    enabled: Boolean(salaryMonth),
    staleTime: 30_000,
  });
}

export function useSignatureStatusQuery<TData = MonthStatus>(
  salaryMonth: string,
  enabled = true,
) {
  return useQuery({
    queryKey: ["signature-status", salaryMonth],
    queryFn: ({ signal }) =>
      apiClient.get<TData>(ENDPOINTS.signature.status(salaryMonth), { signal }),
    enabled: enabled && Boolean(salaryMonth),
    staleTime: 30_000,
  });
}

export function useSignatureStatsQuery<TData = SignatureStatsResponse>(
  salaryMonth: string,
  enabled = true,
) {
  return useQuery({
    queryKey: ["signature-stats", salaryMonth],
    queryFn: ({ signal }) =>
      apiClient.get<TData>(ENDPOINTS.signature.stats(salaryMonth), { signal }),
    enabled: enabled && Boolean(salaryMonth),
    staleTime: 30_000,
  });
}

export function useSignatureDateMonthsQuery(enabled = true) {
  return useQuery({
    queryKey: ["signature-date-months"],
    queryFn: ({ signal }) =>
      apiClient.get<SignatureDateMonthsResponse>(ENDPOINTS.signature.updateDate, {
        signal,
      }),
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useSignedEmployeesQuery(
  salaryMonth: string,
  isT13: boolean,
  enabled = true,
) {
  return useQuery({
    queryKey: ["signed-employees", salaryMonth, isT13],
    queryFn: ({ signal }) => {
      const params = new URLSearchParams();
      params.set(QUERY_PARAMS.MONTH, salaryMonth);
      params.set(QUERY_PARAMS.IS_T13, isT13 ? "true" : "false");

      return apiClient.get<SignedEmployeesResponse>(
        appendParams(ENDPOINTS.signature.updateDate, params),
        { signal },
      );
    },
    enabled: enabled && Boolean(salaryMonth),
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });
}

export function useEmployeeSignatureDateStreamMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: EmployeeSignatureDateInput) =>
      apiClient.stream(ENDPOINTS.signature.updateDate, input),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["signed-employees", vars.salary_month],
      });
      queryClient.invalidateQueries({
        queryKey: ["signature-status", vars.salary_month],
      });
    },
  });
}

export function useManagementSignatureDateMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ManagementSignatureDateInput) =>
      apiClient.post(ENDPOINTS.signature.updateManagementDate, input),
    ...withToast({
      success: "Đã cập nhật ngày ký quản lý",
      onSuccess: (_data, vars) => {
        queryClient.invalidateQueries({
          queryKey: ["signature-status", vars.salary_month],
        });
      },
    }),
  });
}

export function useSignatureHistoryQuery<TData = SignatureHistoryResponse>(
  filters: SignatureHistoryFilters = {},
) {
  return useQuery({
    queryKey: ["signature-history", filters],
    queryFn: ({ signal }) => {
      const params = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.set(key, String(value));
        }
      });

      return apiClient.get<TData>(
        appendParams(ENDPOINTS.signature.history, params),
        { signal },
      );
    },
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });
}

export function useManagementSignatureMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ManagementSignatureInput) =>
      apiClient.post(ENDPOINTS.signature.management, input),
    ...withToast({
      success: "Đã ký quản lý",
      onSuccess: (_data, vars) => {
        queryClient.invalidateQueries({
          queryKey: ["signature-status", vars.salary_month],
        });
        queryClient.invalidateQueries({
          queryKey: ["signature-progress", vars.salary_month],
        });
        queryClient.invalidateQueries({ queryKey: ["signature-history"] });
      },
    }),
  });
}
