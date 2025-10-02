"use client";

import { useState } from "react";
import type {
  PreviewRecord,
  UseImportPreviewReturn,
} from "@/lib/types/payroll-preview";

export function useImportPreview(): UseImportPreviewReturn {
  const [previewData, setPreviewData] = useState<PreviewRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadPreview = async (batchId: string) => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("admin_token");
      const response = await fetch(
        `/api/admin/payroll-preview?batch_id=${batchId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const result = await response.json();

      if (response.ok) {
        setPreviewData(result.data || []);
      } else {
        setError(result.error || "Lỗi khi tải dữ liệu preview");
      }
    } catch (err) {
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
