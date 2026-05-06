import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, downloadBlob } from "@/lib/api/client";
import { ENDPOINTS, QUERY_PARAMS } from "@/lib/api/endpoints";
import { withToast } from "@/lib/api/mutation-helpers";
import { getVietnamTimestamp } from "@/lib/utils/vietnam-timezone";
import type { ColumnAlias } from "@/lib/column-alias-config";

export interface PayrollExportTemplateInput {
  includeData: boolean;
  salaryMonth?: string;
  configId?: string | number;
  customFilename?: string;
}

export interface ColumnAliasesInput {
  limit?: number;
  is_active?: boolean;
}

export interface ExportImportErrorsInput {
  errors: unknown[];
  originalData?: Record<string, unknown>[];
  fileName?: string;
  format: "excel" | "csv";
  includeOriginalData?: boolean;
  originalHeaders?: string[];
}

function appendParams(path: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function payrollExportTemplatePath(input: PayrollExportTemplateInput) {
  const params = new URLSearchParams();
  params.set(QUERY_PARAMS.INCLUDE_DATA, input.includeData ? "true" : "false");

  if (input.includeData && input.salaryMonth) {
    params.set(QUERY_PARAMS.SALARY_MONTH_CAMEL, input.salaryMonth);
  }
  if (input.configId !== undefined && input.configId !== null) {
    params.set(QUERY_PARAMS.CONFIG_ID, String(input.configId));
  }

  return appendParams(ENDPOINTS.payroll.exportTemplate, params);
}

export function useImportPayrollMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: FormData) =>
      apiClient.post(ENDPOINTS.payroll.import, formData),
    ...withToast({
      success: "Đã import",
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["payroll-search"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      },
    }),
  });
}

export function useImportDualFilesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: FormData) =>
      apiClient.post(ENDPOINTS.payroll.importDual, formData),
    ...withToast({
      success: "Đã import 2 file",
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["payroll-search"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      },
    }),
  });
}

export function usePayrollExportTemplateMutation() {
  return useMutation({
    mutationFn: async (input: PayrollExportTemplateInput) => {
      const { blob, filename } = await apiClient.blob(
        payrollExportTemplatePath(input),
      );
      const date = getVietnamTimestamp().slice(0, 10);
      const finalName =
        input.customFilename ??
        filename ??
        (input.includeData
          ? `luong-export-${input.salaryMonth || "all"}-${date}.xlsx`
          : `template-luong-${date}.xlsx`);
      downloadBlob(blob, finalName);
      return { filename: finalName };
    },
    ...withToast({ success: "Đã tải file" }),
  });
}

export function useAliasTemplateMutation() {
  return useMutation({
    mutationFn: async () => {
      const { blob, filename } = await apiClient.blob(
        ENDPOINTS.templates.alias,
      );
      const date = getVietnamTimestamp().slice(0, 10);
      const finalName = filename ?? `template-luong-aliases-${date}.xlsx`;
      downloadBlob(blob, finalName);
      return { filename: finalName };
    },
    ...withToast({ success: "Đã tạo template từ aliases" }),
  });
}

export function useColumnAliasesMutation() {
  return useMutation({
    mutationFn: (input: ColumnAliasesInput = {}) => {
      const params = new URLSearchParams();

      if (input.limit) {
        params.set(QUERY_PARAMS.LIMIT, String(input.limit));
      }
      if (input.is_active !== undefined) {
        params.set(QUERY_PARAMS.IS_ACTIVE, input.is_active ? "true" : "false");
      }

      return apiClient.get<{
        success: boolean;
        data?: ColumnAlias[];
        message?: string;
      }>(
        appendParams(ENDPOINTS.columnAliases.list, params),
      );
    },
  });
}

export function useExportImportErrorsMutation() {
  return useMutation({
    mutationFn: async (input: ExportImportErrorsInput) => {
      const { blob, filename } = await apiClient.blob(
        ENDPOINTS.payroll.exportImportErrors,
        input,
      );
      const date = getVietnamTimestamp().slice(0, 10);
      const finalName = filename ?? `${input.fileName ?? "import_errors"}_${date}.xlsx`;
      downloadBlob(blob, finalName);
      return { filename: finalName };
    },
    ...withToast({ success: "Đã tải báo cáo lỗi" }),
  });
}
