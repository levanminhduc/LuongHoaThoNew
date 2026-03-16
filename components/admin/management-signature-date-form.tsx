"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Loader2, AlertCircle, Pencil, PenTool } from "lucide-react";
import {
  showSuccessToast,
  showErrorToast,
  showNetworkErrorToast,
} from "@/lib/toast-utils";

interface ManagementSigInfo {
  id: string;
  signed_by_id: string;
  signed_by_name: string;
  signed_at: string;
}

interface ManagementSignatureDateFormProps {
  effectiveMonth: string;
  isT13: boolean;
  mgmtSigs: Record<string, ManagementSigInfo | null>;
  loadingMgmt: boolean;
  authHeader: Record<string, string>;
  onSuccess?: () => void;
  onRefresh: () => void;
}

function formatVietnamTimestamp(isoString: string): string {
  const cleaned = isoString.replace("T", " ").replace(/\.\d+.*$/, "");
  const [datePart, timePart] = cleaned.split(" ");
  if (!datePart) return isoString;
  const [y, m, d] = datePart.split("-");
  const time = timePart ? timePart.substring(0, 5) : "";
  return `${d}/${m}/${y}${time ? ` ${time}` : ""}`;
}

const SIGNATURE_TYPE_LABELS: Record<string, string> = {
  giam_doc: "Giám Đốc",
  ke_toan: "Kế Toán",
  nguoi_lap_bieu: "Người Lập Biểu",
};

export function ManagementSignatureDateForm({
  effectiveMonth,
  isT13,
  mgmtSigs,
  loadingMgmt,
  authHeader,
  onSuccess,
  onRefresh,
}: ManagementSignatureDateFormProps) {
  const [mgmtLoading, setMgmtLoading] = useState<Record<string, boolean>>({});
  const [mgmtDates, setMgmtDates] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (
    sigType: string,
    action: "update" | "create",
  ) => {
    const dateVal = mgmtDates[sigType];
    if (!dateVal) {
      setError(
        `Vui lòng chọn ngày ký cho ${SIGNATURE_TYPE_LABELS[sigType]}`,
      );
      return;
    }
    setMgmtLoading((prev) => ({ ...prev, [sigType]: true }));
    setError(null);
    try {
      const res = await fetch(
        "/api/admin/update-management-signature-date",
        {
          method: "POST",
          headers: authHeader,
          body: JSON.stringify({
            salary_month: effectiveMonth,
            signature_type: sigType,
            new_signed_at: dateVal,
            action,
            is_t13: isT13,
          }),
        },
      );
      const data = await res.json();
      if (res.ok) {
        showSuccessToast(data.message);
        onRefresh();
        onSuccess?.();
      } else {
        setError(data.error || "Có lỗi xảy ra");
        showErrorToast(data.error || "Có lỗi xảy ra");
      }
    } catch {
      setError("Lỗi kết nối server");
      showNetworkErrorToast();
    } finally {
      setMgmtLoading((prev) => ({ ...prev, [sigType]: false }));
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <h3 className="font-semibold text-sm">🏛️ Ngày Ký Quản Lý</h3>

      {loadingMgmt ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {(["giam_doc", "ke_toan", "nguoi_lap_bieu"] as const).map(
            (sigType) => {
              const sig = mgmtSigs[sigType];
              const isSigned = !!sig;
              return (
                <div
                  key={sigType}
                  className="flex items-center gap-3 border rounded p-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {SIGNATURE_TYPE_LABELS[sigType]}
                      </span>
                      {isSigned ? (
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                          Đã ký
                        </span>
                      ) : (
                        <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
                          Chưa ký
                        </span>
                      )}
                    </div>
                    {isSigned && sig && (
                      <p className="text-xs text-gray-500 truncate">
                        {sig.signed_by_name} -{" "}
                        {formatVietnamTimestamp(sig.signed_at)}
                      </p>
                    )}
                  </div>

                  <Input
                    type="datetime-local"
                    value={mgmtDates[sigType] || ""}
                    onChange={(e) =>
                      setMgmtDates((prev) => ({
                        ...prev,
                        [sigType]: e.target.value,
                      }))
                    }
                    className="w-52"
                  />

                  {isSigned ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAction(sigType, "update")}
                      disabled={mgmtLoading[sigType]}
                    >
                      {mgmtLoading[sigType] ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Pencil className="h-3 w-3 mr-1" />
                      )}
                      Sửa ngày
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleAction(sigType, "create")}
                      disabled={mgmtLoading[sigType]}
                    >
                      {mgmtLoading[sigType] ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <PenTool className="h-3 w-3 mr-1" />
                      )}
                      Ký luôn
                    </Button>
                  )}
                </div>
              );
            },
          )}
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
