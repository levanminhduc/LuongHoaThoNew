"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { getSessionToken } from "@/lib/auth/secure-session";

interface EmployeeProgress {
  completion_percentage: number;
  signed_count: number;
  total_count: number;
  last_updated: string | null;
  is_complete: boolean;
}

interface ManagementProgress {
  completed_types: string[];
  remaining_types: string[];
  completion_percentage: number;
}

interface RecentActivity {
  type: "employee_signature" | "management_signature";
  employee_id?: string;
  signature_type?: string;
  signed_by_name?: string;
  timestamp: string;
  description: string;
}

interface SignatureProgressData {
  month: string;
  employee_progress: EmployeeProgress;
  management_progress: ManagementProgress;
  recent_activity: RecentActivity[];
  real_time_data: {
    timestamp: string;
    next_refresh: string;
    refresh_interval_seconds: number;
  };
  statistics: {
    total_signatures_needed: number;
    total_signatures_completed: number;
    overall_completion_percentage: number;
  };
}

interface UseSignatureProgressOptions {
  month: string;
  enabled?: boolean;
  refreshInterval?: number;
  onProgressUpdate?: (data: SignatureProgressData) => void;
  onError?: (error: string) => void;
}

export function useSignatureProgress({
  month,
  enabled = true,
  refreshInterval = 30000,
  onProgressUpdate,
  onError,
}: UseSignatureProgressOptions) {
  const [data, setData] = useState<SignatureProgressData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousDataRef = useRef<SignatureProgressData | null>(null);

  const fetchProgress = useCallback(async () => {
    if (!enabled || !month) return;

    try {
      setLoading(true);
      setError(null);

      const token = await getSessionToken();
      if (!token) {
        throw new Error("Không tìm thấy token xác thực");
      }

      const response = await fetch(`/api/signature-progress/${month}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Phiên đăng nhập đã hết hạn");
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Lỗi không xác định");
      }

      const newData = result as SignatureProgressData;

      if (previousDataRef.current) {
        checkForUpdates(previousDataRef.current, newData);
      }

      setData(newData);
      setLastFetch(new Date());
      previousDataRef.current = newData;

      if (onProgressUpdate) {
        onProgressUpdate(newData);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Lỗi khi tải tiến độ";
      setError(errorMessage);

      if (onError) {
        onError(errorMessage);
      }

      toast.error("Lỗi cập nhật tiến độ", {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, [month, enabled, onProgressUpdate, onError]);

  const checkForUpdates = (
    oldData: SignatureProgressData,
    newData: SignatureProgressData,
  ) => {
    if (
      oldData.employee_progress.signed_count <
      newData.employee_progress.signed_count
    ) {
      const newSignatures =
        newData.employee_progress.signed_count -
        oldData.employee_progress.signed_count;
      toast.success("Cập nhật tiến độ", {
        description: `${newSignatures} nhân viên mới đã ký lương`,
      });
    }

    if (
      oldData.employee_progress.is_complete !==
        newData.employee_progress.is_complete &&
      newData.employee_progress.is_complete
    ) {
      toast.success("🎉 Hoàn thành!", {
        description:
          "100% nhân viên đã ký lương. Có thể tiến hành ký xác nhận management.",
      });
    }

    if (
      oldData.management_progress.completed_types.length <
      newData.management_progress.completed_types.length
    ) {
      const newTypes = newData.management_progress.completed_types.filter(
        (type) => !oldData.management_progress.completed_types.includes(type),
      );

      newTypes.forEach((type) => {
        const typeLabels = {
          giam_doc: "Giám Đốc",
          ke_toan: "Kế Toán",
          nguoi_lap_bieu: "Người Lập Biểu",
        };

        toast.success("Ký xác nhận mới", {
          description: `${typeLabels[type as keyof typeof typeLabels]} đã ký xác nhận`,
        });
      });
    }

    if (
      newData.management_progress.completion_percentage === 100 &&
      oldData.management_progress.completion_percentage < 100
    ) {
      toast.success("🎊 Hoàn thành tất cả!", {
        description: "Tất cả management đã ký xác nhận. Quy trình hoàn tất!",
      });
    }
  };

  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    fetchProgress();

    intervalRef.current = setInterval(() => {
      fetchProgress();
    }, refreshInterval);
  }, [fetchProgress, refreshInterval]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const refresh = useCallback(() => {
    fetchProgress();
  }, [fetchProgress]);

  useEffect(() => {
    if (enabled && month) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [enabled, month, startPolling, stopPolling]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else if (enabled && month) {
        startPolling();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, month, startPolling, stopPolling]);

  const getTimeUntilNextRefresh = () => {
    if (!lastFetch) return 0;
    const elapsed = Date.now() - lastFetch.getTime();
    return Math.max(0, refreshInterval - elapsed);
  };

  const getFormattedLastUpdate = () => {
    if (!lastFetch) return "Chưa cập nhật";
    return lastFetch.toLocaleTimeString("vi-VN");
  };

  return {
    data,
    loading,
    error,
    lastFetch,
    refresh,
    startPolling,
    stopPolling,
    getTimeUntilNextRefresh,
    getFormattedLastUpdate,
    isPolling: intervalRef.current !== null,
  };
}
