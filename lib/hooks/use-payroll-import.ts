import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, downloadBlob } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { withToast } from "@/lib/api/mutation-helpers";
import { getVietnamTimestamp } from "@/lib/utils/vietnam-timezone";

export interface ExportImportErrorsInput {
  errors: unknown[];
  originalData?: Record<string, unknown>[];
  fileName?: string;
  format: "excel" | "csv";
  includeOriginalData?: boolean;
  originalHeaders?: string[];
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

export function useExportImportErrorsMutation() {
  return useMutation({
    mutationFn: async (input: ExportImportErrorsInput) => {
      const { blob, filename } = await apiClient.blob(
        ENDPOINTS.payroll.exportImportErrors,
        input,
      );
      const date = getVietnamTimestamp().slice(0, 10);
      const finalName =
        filename ?? `${input.fileName ?? "import_errors"}_${date}.xlsx`;
      downloadBlob(blob, finalName);
      return { filename: finalName };
    },
    ...withToast({ success: "Đã tải báo cáo lỗi" }),
  });
}
