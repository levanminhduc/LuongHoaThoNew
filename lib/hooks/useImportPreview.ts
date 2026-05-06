"use client";

import { useState } from "react";
import type {
  PreviewRecord,
  UseImportPreviewReturn,
} from "@/lib/types/payroll-preview";
import { apiClient } from "@/lib/api/client";
import { ENDPOINTS, QUERY_PARAMS } from "@/lib/api/endpoints";

export function useImportPreview(): UseImportPreviewReturn {
  const [previewData, setPreviewData] = useState<PreviewRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadPreview = async (batchId: string) => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      params.set(QUERY_PARAMS.BATCH_ID, batchId);
      const result = await apiClient.get<{
        data?: PreviewRecord[];
        error?: string;
      }>(`${ENDPOINTS.payroll.preview}?${params}`);

      if (!result.error) {
        setPreviewData(result.data || []);
      } else {
        setError(result.error || "Lỗi khi tải dữ liệu preview");
      }
    } catch {
      setError("Lỗi kết nối");
    } finally {
      setLoading(false);
    }
  };

  return {
    previewData,
    loading,
    error,
    loadPreview,
  };
}
