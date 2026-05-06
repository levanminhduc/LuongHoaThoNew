import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient, downloadBlob } from "@/lib/api/client";
import { ENDPOINTS, QUERY_PARAMS } from "@/lib/api/endpoints";
import { withToast } from "@/lib/api/mutation-helpers";
import type { PayrollType } from "./use-payroll";

export interface DepartmentListResponse {
  success: boolean;
  departments: Array<{ name?: string; department?: string }>;
}

export function useDepartmentsQuery() {
  return useQuery({
    queryKey: ["departments"],
    queryFn: ({ signal }) =>
      apiClient.get<DepartmentListResponse>(ENDPOINTS.departments.list, {
        signal,
      }),
    staleTime: 10 * 60_000,
  });
}

export function useBulkExportMutation() {
  return useMutation({
    mutationFn: async (input: {
      departments: string[];
      salary_month: string;
      payroll_type: PayrollType;
    }) => {
      const { blob, filename } = await apiClient.blob(
        ENDPOINTS.payroll.bulkExport,
        input,
      );
      const fallback =
        input.payroll_type === "t13"
          ? `Luong13_${input.salary_month.split("-")[0]}_ToanBo.xlsx`
          : `Luong_${input.salary_month}_ToanBo.xlsx`;
      const finalName = filename ?? fallback;
      downloadBlob(blob, finalName);
      return { filename: finalName };
    },
    ...withToast({ success: "Đã xuất bảng lương" }),
  });
}

export function useUnsignedEmployeesExportMutation() {
  return useMutation({
    mutationFn: async (input: {
      salary_month: string;
      payroll_type: PayrollType;
    }) => {
      const { blob, filename } = await apiClient.blob(
        ENDPOINTS.payroll.unsignedExport,
        input,
      );
      const finalName = filename ?? `nhan-vien-chua-ky-${input.salary_month}.xlsx`;
      downloadBlob(blob, finalName);
      return { filename: finalName };
    },
    ...withToast({ success: "Đã xuất danh sách" }),
  });
}

export function useAttendanceExportMutation() {
  return useMutation({
    mutationFn: async (input: {
      period_year: number;
      period_month: number;
      department?: string;
      employee_ids?: string[];
      export_type?: "all" | "selected";
      include_daily?: boolean;
    }) => {
      const { blob, filename } = await apiClient.blob(
        ENDPOINTS.attendance.export,
        input,
      );
      const month = String(input.period_month).padStart(2, "0");
      const finalName = filename ?? `cham-cong-${input.period_year}-${month}.xlsx`;
      downloadBlob(blob, finalName);
      return { filename: finalName };
    },
    ...withToast({ success: "Đã xuất chấm công" }),
  });
}

export function useDownloadTemplateMutation(
  template: "employee" | "attendance" | "payroll",
) {
  const path =
    template === "employee"
      ? ENDPOINTS.templates.employee
      : template === "attendance"
        ? ENDPOINTS.templates.attendance
        : ENDPOINTS.templates.payroll;

  return useMutation({
    mutationFn: async () => {
      const { blob, filename } = await apiClient.blob(path);
      const finalName = filename ?? `template-${template}.xlsx`;
      downloadBlob(blob, finalName);
      return { filename: finalName };
    },
    ...withToast({ success: "Đã tải template" }),
  });
}

export function payrollTemplatePath(input: {
  includeData?: boolean;
  salaryMonth?: string;
  configId?: string | number;
}) {
  const params = new URLSearchParams();

  if (input.includeData !== undefined) {
    params.set(QUERY_PARAMS.INCLUDE_DATA, input.includeData ? "true" : "false");
  }
  if (input.salaryMonth) {
    params.set(QUERY_PARAMS.SALARY_MONTH_CAMEL, input.salaryMonth);
  }
  if (input.configId !== undefined && input.configId !== null) {
    params.set(QUERY_PARAMS.CONFIG_ID, String(input.configId));
  }

  const query = params.toString();
  return query ? `${ENDPOINTS.payroll.exportTemplate}?${query}` : ENDPOINTS.payroll.exportTemplate;
}
