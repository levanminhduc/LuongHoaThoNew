import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { ENDPOINTS, QUERY_PARAMS } from "@/lib/api/endpoints";
import { withToast } from "@/lib/api/mutation-helpers";

export type PayrollType = "monthly" | "t13";

export interface PayrollSearchFilters {
  q?: string;
  salary_month?: string;
  payroll_type?: PayrollType;
  limit?: number;
}

export interface PayrollSearchResult {
  payroll_id: number;
  employee_id: string;
  full_name: string;
  department: string;
  position: string;
  salary_month: string;
  net_salary: number;
  source_file: string;
  created_at: string;
}

export interface PayrollSearchResponse {
  success: boolean;
  results: PayrollSearchResult[];
  total: number;
  message?: string;
}

export interface PayrollMonthsResponse {
  success: boolean;
  months: string[];
}

export interface PayrollDetailResponse<TPayroll = Record<string, unknown>> {
  success: boolean;
  payroll: TPayroll;
}

export interface PayrollAuditResponse {
  success: boolean;
  auditTrail: unknown[];
  totalChanges?: number;
  message?: string;
}

export interface PayrollUpdateInput {
  payrollId: string | number;
  updates: Record<string, unknown>;
  changeReason: string;
}

function appendParams(path: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function payrollSearchParams(filters: PayrollSearchFilters) {
  const params = new URLSearchParams();

  if (filters.q) {
    params.set(QUERY_PARAMS.QUERY, filters.q);
  }
  if (filters.salary_month) {
    params.set(QUERY_PARAMS.SALARY_MONTH, filters.salary_month);
  }
  if (filters.payroll_type) {
    params.set(QUERY_PARAMS.PAYROLL_TYPE, filters.payroll_type);
  }
  if (filters.limit) {
    params.set(QUERY_PARAMS.LIMIT, String(filters.limit));
  }

  return params;
}

export function payrollSearchKey(filters: PayrollSearchFilters) {
  return ["payroll-search", filters] as const;
}

export function usePayrollSearchQuery(
  filters: PayrollSearchFilters,
  enabled = true,
) {
  return useQuery({
    queryKey: payrollSearchKey(filters),
    queryFn: ({ signal }) =>
      apiClient.get<PayrollSearchResponse>(
        appendParams(ENDPOINTS.payroll.search, payrollSearchParams(filters)),
        { signal },
      ),
    enabled: enabled && Boolean(filters.q && filters.q.trim().length >= 2),
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });
}

export function useAvailablePayrollMonthsQuery() {
  return useQuery({
    queryKey: ["payroll-months"],
    queryFn: ({ signal }) =>
      apiClient.post<PayrollMonthsResponse>(
        ENDPOINTS.payroll.search,
        undefined,
        { signal },
      ),
    staleTime: 5 * 60_000,
  });
}

export function usePayrollDetailQuery<TPayroll = Record<string, unknown>>(
  payrollId: string | number | null | undefined,
) {
  return useQuery({
    queryKey: ["payroll-detail", payrollId],
    queryFn: ({ signal }) =>
      apiClient.get<PayrollDetailResponse<TPayroll>>(
        ENDPOINTS.payroll.detail(payrollId!),
        { signal },
      ),
    enabled: payrollId !== null && payrollId !== undefined && payrollId !== "",
    staleTime: 0,
  });
}

export function useUpdatePayrollMutation<TPayroll = Record<string, unknown>>() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: PayrollUpdateInput) =>
      apiClient.put<{
        success: boolean;
        message: string;
        payroll: TPayroll;
        changesCount: number;
      }>(ENDPOINTS.payroll.update(input.payrollId), {
        updates: input.updates,
        changeReason: input.changeReason,
      }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["payroll-search"] });
      queryClient.invalidateQueries({
        queryKey: ["payroll-detail", vars.payrollId],
      });
      queryClient.invalidateQueries({
        queryKey: ["payroll-audit", vars.payrollId],
      });
    },
  });
}

export function usePayrollAuditQuery(
  payrollId: string | number | null | undefined,
) {
  return useQuery({
    queryKey: ["payroll-audit", payrollId],
    queryFn: ({ signal }) =>
      apiClient.get<PayrollAuditResponse>(
        ENDPOINTS.payroll.audit(payrollId!),
        { signal },
      ),
    enabled: payrollId !== null && payrollId !== undefined && payrollId !== "",
    staleTime: 30_000,
  });
}

export function useSignSalaryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      employee_id?: string;
      salary_month: string;
      cccd?: string;
      is_t13?: boolean;
    }) => apiClient.post(ENDPOINTS.payroll.sign, input),
    ...withToast({
      success: "Đã ký lương",
      onSuccess: (_data, vars) => {
        queryClient.invalidateQueries({ queryKey: ["payroll-search"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
        queryClient.invalidateQueries({
          queryKey: ["signature-stats", vars.salary_month],
        });
        queryClient.invalidateQueries({
          queryKey: ["signature-progress", vars.salary_month],
        });
      },
    }),
  });
}

export function useBulkSignMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      salary_month: string;
      admin_note?: string;
      batch_size?: number;
      is_t13?: boolean;
    }) => apiClient.post(ENDPOINTS.payroll.bulkSign, input),
    ...withToast({
      success: "Đã ký hàng loạt",
      onSuccess: (_data, vars) => {
        queryClient.invalidateQueries({ queryKey: ["payroll-search"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
        queryClient.invalidateQueries({
          queryKey: ["signature-progress", vars.salary_month],
        });
      },
    }),
  });
}
