"use client";

import { useState } from "react";
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
  authHeader: Record<string, string>;
  onSuccess?: () => void;
}

export function EmployeeSignatureDateForm({
  effectiveMonth,
  isT13,
  signedEmployees,
  loadingEmployees,
  authHeader,
  onSuccess,
}: EmployeeSignatureDateFormProps) {
  const [scope, setScope] = useState<"all" | "selected">("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!fromDate) {
      setError("Vui lòng chọn ngày bắt đầu");
      return;
    }
    if (scope === "selected" && selectedIds.length === 0) {
      setError("Vui lòng chọn ít nhất 1 nhân viên");
      return;
    }

    const endDate = toDate || fromDate;
    const from = new Date(fromDate);
    const to = new Date(endDate);
    if (to < from) {
      setError("Ngày kết thúc phải >= ngày bắt đầu");
      return;
    }
    const diffDays = Math.round(
      (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24),
    );

    let baseDate: string;
    let rangeDays: number;
    if (diffDays === 0) {
      baseDate = fromDate;
      rangeDays = 0;
    } else {
      baseDate = fromDate;
      rangeDays = diffDays;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/update-signature-date", {
        method: "POST",
        headers: authHeader,
        body: JSON.stringify({
          salary_month: effectiveMonth,
          base_date: baseDate,
          random_range_days: rangeDays,
          scope,
          employee_ids: scope === "selected" ? selectedIds : undefined,
          is_t13: isT13,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data.message);
        showSuccessToast(data.message);
        onSuccess?.();
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

      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}
      {result && (
        <Alert className="bg-green-50 border-green-200 py-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-sm text-green-800">
            {result}
          </AlertDescription>
        </Alert>
      )}

      <Button onClick={handleSubmit} disabled={loading} size="sm">
        {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        Cập Nhật Ngày Ký NV
      </Button>
    </div>
  );
}
