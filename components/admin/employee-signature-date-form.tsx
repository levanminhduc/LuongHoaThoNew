"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import {
  showSuccessToast,
  showErrorToast,
  showNetworkErrorToast,
} from "@/lib/toast-utils";
import { useEmployeeSignatureDateStreamMutation } from "@/lib/hooks/use-dashboard";

interface SignedEmployee {
  employee_id: string;
  full_name: string;
  department: string;
}

interface EmployeeSignatureDateFormProps {
  effectiveMonth: string;
  isT13: boolean;
  signedEmployees: SignedEmployee[];
  loadingEmployees: boolean;
  onSuccess?: () => void;
}

interface CompletionResult {
  total: number;
  success: number;
  failed: number;
  duration_seconds: number;
  errors: Array<{ employee_id: string; error: string }>;
}

export function EmployeeSignatureDateForm({
  effectiveMonth,
  isT13,
  signedEmployees,
  loadingEmployees,
  onSuccess,
}: EmployeeSignatureDateFormProps) {
  const [scope, setScope] = useState<"all" | "selected">("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [progress, setProgress] = useState({
    current: 0,
    total: 0,
    success: 0,
    failed: 0,
  });
  const [streamStartTime, setStreamStartTime] = useState(0);
  const [completionResult, setCompletionResult] =
    useState<CompletionResult | null>(null);
  const updateMutation = useEmployeeSignatureDateStreamMutation();

  const handleSubmit = useCallback(async () => {
    if (!fromDate) {
      setError("Vui lòng chọn ngày bắt đầu");
      return;
    }
    if (scope === "selected" && selectedIds.length === 0) {
      setError("Vui lòng chọn ít nhất 1 nhân viên");
      return;
    }

    const endDate = toDate || fromDate;
    const fromParts = fromDate.split("-").map(Number);
    const toParts = endDate.split("-").map(Number);
    const fromTime = Date.UTC(
      fromParts[0] ?? 0,
      (fromParts[1] ?? 1) - 1,
      fromParts[2] ?? 1,
    );
    const toTime = Date.UTC(
      toParts[0] ?? 0,
      (toParts[1] ?? 1) - 1,
      toParts[2] ?? 1,
    );
    if (toTime < fromTime) {
      setError("Ngày kết thúc phải >= ngày bắt đầu");
      return;
    }
    const diffDays = Math.round((toTime - fromTime) / (1000 * 60 * 60 * 24));

    const baseDate = fromDate;
    const rangeDays = diffDays;

    setLoading(true);
    setError(null);
    setCompletionResult(null);
    setIsStreaming(false);
    setProgress({ current: 0, total: 0, success: 0, failed: 0 });
    setStreamStartTime(0);

    try {
      const res = await updateMutation.mutateAsync({
        salary_month: effectiveMonth,
        base_date: baseDate,
        random_range_days: rangeDays,
        scope,
        employee_ids: scope === "selected" ? selectedIds : undefined,
        is_t13: isT13,
      });

      const contentType = res.headers.get("content-type") ?? "";

      if (contentType.includes("text/event-stream")) {
        setLoading(false);

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const dataMatch = line.match(/^data: (.+)$/m);
              if (!dataMatch) continue;
              try {
                const event = JSON.parse(dataMatch[1]);

                if (event.type === "start") {
                  setIsStreaming(true);
                  setStreamStartTime(Date.now());
                  setProgress((prev) => ({
                    ...prev,
                    total: event.total ?? 0,
                  }));
                } else if (event.type === "batch_complete") {
                  setProgress((prev) => ({
                    ...prev,
                    current: event.processed ?? 0,
                    success: event.success ?? 0,
                    failed: event.failed ?? 0,
                  }));
                } else if (event.type === "complete") {
                  const result: CompletionResult = {
                    total: event.total ?? 0,
                    success: event.success ?? 0,
                    failed: event.failed ?? 0,
                    duration_seconds: event.duration_seconds ?? 0,
                    errors: event.errors ?? [],
                  };
                  setIsStreaming(false);
                  setCompletionResult(result);
                  showSuccessToast(
                    `Đã cập nhật ${result.success}/${result.total} nhân viên`,
                  );
                  onSuccess?.();
                }
              } catch {
                // ignore parse errors
              }
            }
          }
        } catch {
          setIsStreaming(false);
          setError("Kết nối bị gián đoạn");
          showNetworkErrorToast();
        }
      } else {
        const data = await res.json();
        if (res.ok) {
          showSuccessToast(data.message);
          onSuccess?.();
        } else {
          setError(data.error || "Có lỗi xảy ra");
          showErrorToast(data.error || "Có lỗi xảy ra");
        }
        setLoading(false);
      }
    } catch {
      setError("Lỗi kết nối server");
      showNetworkErrorToast();
      setLoading(false);
    }
  }, [
    fromDate,
    toDate,
    scope,
    selectedIds,
    effectiveMonth,
    isT13,
    onSuccess,
    updateMutation,
  ]);

  const toggleEmployee = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <h3 className="font-semibold text-sm">
        📝 Ngày Ký Nhân Viên
        {!loadingEmployees && (
          <span className="font-normal text-muted-foreground ml-2">
            ({signedEmployees.length} NV đã ký — {isT13 ? "T13" : "Hàng tháng"})
          </span>
        )}
      </h3>

      <div className="flex gap-4 items-center">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="emp-scope"
            checked={scope === "all"}
            onChange={() => setScope("all")}
          />
          <span className="text-sm">Tất cả NV đã ký</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="emp-scope"
            checked={scope === "selected"}
            onChange={() => setScope("selected")}
          />
          <span className="text-sm">Chọn từng NV</span>
        </label>
        {!loadingEmployees && (
          <span className="text-xs text-muted-foreground">
            ({signedEmployees.length} NV đã ký)
          </span>
        )}
      </div>

      <div className="flex gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Từ ngày</Label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              if (!toDate) setToDate(e.target.value);
            }}
            className="w-44"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Đến ngày</Label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            min={fromDate}
            className="w-44"
          />
        </div>
        {fromDate && toDate && fromDate === toDate && (
          <span className="text-xs text-muted-foreground pb-2">
            Cùng 1 ngày (chỉ random giờ)
          </span>
        )}
      </div>

      {scope === "selected" && (
        <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-1">
          {loadingEmployees ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : signedEmployees.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-2">
              Không có nhân viên đã ký
            </p>
          ) : (
            signedEmployees.map((emp) => (
              <label
                key={emp.employee_id}
                className="flex items-center gap-2 text-sm hover:bg-gray-50 p-1 rounded cursor-pointer"
              >
                <Checkbox
                  checked={selectedIds.includes(emp.employee_id)}
                  onCheckedChange={() => toggleEmployee(emp.employee_id)}
                />
                <span>
                  {emp.employee_id} - {emp.full_name}
                </span>
                <span className="text-gray-400 text-xs">{emp.department}</span>
              </label>
            ))
          )}
        </div>
      )}

      {isStreaming && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>
              {progress.current} / {progress.total} nhân viên
            </span>
            <span>
              {progress.total > 0
                ? Math.round((progress.current / progress.total) * 100)
                : 0}
              %
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{
                width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
              }}
            />
          </div>
          <div className="flex gap-4 text-xs">
            <span className="text-green-600">✓ {progress.success}</span>
            {progress.failed > 0 && (
              <span className="text-red-600">✗ {progress.failed}</span>
            )}
            {streamStartTime > 0 &&
              progress.current > 0 &&
              progress.total > progress.current && (
                <span className="text-muted-foreground">
                  ~
                  {Math.round(
                    (((Date.now() - streamStartTime) / progress.current) *
                      (progress.total - progress.current)) /
                      1000,
                  )}
                  s còn lại
                </span>
              )}
          </div>
        </div>
      )}

      {!isStreaming && completionResult && (
        <div className="space-y-2">
          <Alert className="bg-green-50 border-green-200 py-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-sm text-green-800">
              Đã cập nhật {completionResult.success}/{completionResult.total}{" "}
              nhân viên ({completionResult.duration_seconds}s)
            </AlertDescription>
          </Alert>
          {completionResult.failed > 0 && (
            <Alert className="bg-orange-50 border-orange-200 py-2">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-sm text-orange-800">
                {completionResult.failed} nhân viên thất bại
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm flex items-center justify-between">
            <span>{error}</span>
            {error === "Kết nối bị gián đoạn" && (
              <Button variant="outline" size="sm" onClick={handleSubmit}>
                Thử lại
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Button
        onClick={handleSubmit}
        disabled={loading || isStreaming}
        size="sm"
      >
        {(loading || isStreaming) && (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        )}
        Cập Nhật Ngày Ký NV
      </Button>
    </div>
  );
}
