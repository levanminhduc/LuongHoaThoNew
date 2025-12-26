"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, AlertCircle, Users } from "lucide-react";
import {
  showErrorToast,
  showBulkSignatureSuccessToast,
  showNetworkErrorToast,
} from "@/lib/toast-utils";

interface SignatureStats {
  total_employees: number;
  already_signed: number;
  unsigned: number;
  completion_percentage: number;
}

interface BulkSignatureResult {
  success: boolean;
  message: string;
  bulk_batch_id: string;
  statistics: {
    total_employees_in_month: number;
    already_signed_before: number;
    unsigned_before: number;
    processed: number;
    successful: number;
    failed: number;
    now_signed: number;
    still_unsigned: number;
  };
  errors?: Array<{
    employee_id?: string;
    employee_ids?: string[];
    error: string;
    batch?: number;
  }>;
  duration_seconds: number;
}

interface BulkSignatureDialogProps {
  month: string;
  onSuccess?: () => void;
}

export function BulkSignatureDialog({
  month,
  onSuccess,
}: BulkSignatureDialogProps) {
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState<SignatureStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [result, setResult] = useState<BulkSignatureResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchStats();
    }
  }, [open, month]);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const response = await fetch(`/api/admin/signature-stats/${month}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setStats(data);
      } else {
        showErrorToast(data.error || "Lỗi khi lấy thống kê");
      }
    } catch {
      showNetworkErrorToast();
    } finally {
      setLoadingStats(false);
    }
  };

  const handleBulkSign = async () => {
    if (!stats || stats.unsigned === 0) {
      showErrorToast("Không có chữ ký nào cần ký!");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/admin/bulk-sign-salary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
        },
        body: JSON.stringify({
          salary_month: month,
          batch_size: 50,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        showBulkSignatureSuccessToast(data.signed_count, data.total_processed, {
          onViewDetails: onSuccess,
        });
        onSuccess?.();
        fetchStats();
      } else {
        setError(data.error || "Có lỗi xảy ra");
        showErrorToast(data.error || "Có lỗi xảy ra");
      }
    } catch {
      setError("Lỗi kết nối server");
      showNetworkErrorToast();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="default" className="gap-2">
        <Users className="h-4 w-4" />
        Ký Hàng Loạt
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ký Hàng Loạt Chữ Ký Nhân Viên</DialogTitle>
            <DialogDescription>Tháng: {month}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Statistics */}
            {loadingStats ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : stats ? (
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {stats.total_employees}
                  </div>
                  <div className="text-sm text-gray-600">Tổng số</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {stats.already_signed}
                  </div>
                  <div className="text-sm text-gray-600">Đã ký ✅</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {stats.unsigned}
                  </div>
                  <div className="text-sm text-gray-600">Chưa ký ⚠️</div>
                </div>
              </div>
            ) : null}

            {/* Status Messages */}
            {!loading && !result && stats && (
              <>
                {stats.unsigned > 0 ? (
                  <Alert>
                    <AlertDescription>
                      Bạn sắp ký hàng loạt{" "}
                      <strong>{stats.unsigned} chữ ký</strong> cho những nhân
                      viên chưa ký trong tháng {month}.
                      <br />
                      <strong className="text-red-600">Lưu ý:</strong> Thao tác
                      này không thể hoàn tác.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Tất cả nhân viên đã ký hết rồi! Không có chữ ký nào cần
                      ký.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}

            {/* Loading State */}
            {loading && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Đang xử lý ký hàng loạt...</span>
                </div>
                <Alert>
                  <AlertDescription>
                    Quá trình này có thể mất vài phút. Vui lòng không đóng cửa
                    sổ.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Result */}
            {result && (
              <div className="space-y-3">
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    {result.message}
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-gray-50 rounded">
                    <span className="text-gray-600">Tổng số xử lý:</span>
                    <span className="ml-2 font-semibold">
                      {result.statistics.processed}
                    </span>
                  </div>
                  <div className="p-3 bg-green-50 rounded">
                    <span className="text-gray-600">Thành công:</span>
                    <span className="ml-2 font-semibold text-green-600">
                      {result.statistics.successful}
                    </span>
                  </div>
                  <div className="p-3 bg-red-50 rounded">
                    <span className="text-gray-600">Thất bại:</span>
                    <span className="ml-2 font-semibold text-red-600">
                      {result.statistics.failed}
                    </span>
                  </div>
                  <div className="p-3 bg-blue-50 rounded">
                    <span className="text-gray-600">Thời gian:</span>
                    <span className="ml-2 font-semibold text-blue-600">
                      {result.duration_seconds}s
                    </span>
                  </div>
                </div>

                {result.errors && result.errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Có {result.errors.length} lỗi xảy ra.
                      {result.errors.length > 10 &&
                        " (Hiển thị 10 lỗi đầu tiên)"}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2">
              {!loading && !result && (
                <>
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Hủy
                  </Button>
                  <Button
                    onClick={handleBulkSign}
                    disabled={!stats || stats.unsigned === 0}
                  >
                    Xác Nhận Ký {stats?.unsigned || 0} Chữ Ký
                  </Button>
                </>
              )}
              {result && (
                <Button
                  onClick={() => {
                    setOpen(false);
                    setResult(null);
                  }}
                >
                  Đóng
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
