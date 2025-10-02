"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Calendar } from "lucide-react";
import type { MonthOption } from "../types";

interface MonthSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  allowEmpty?: boolean;
  disabled?: boolean;
}

export function MonthSelector({
  value,
  onValueChange,
  placeholder = "Chọn tháng lương",
  label = "Tháng Lương",
  allowEmpty = true,
  disabled = false,
}: MonthSelectorProps) {
  const [months, setMonths] = useState<MonthOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAvailableMonths();
  }, []);

  const loadAvailableMonths = async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("admin_token");
      if (!token) {
        setError("Không có quyền truy cập");
        return;
      }

      const response = await fetch("/api/admin/payroll/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        const monthOptions = data.months.map((month: string) => ({
          value: month,
          label: formatMonthLabel(month),
        }));
        setMonths(monthOptions);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Lỗi khi tải danh sách tháng");
      }
    } catch (error) {
      setError("Có lỗi xảy ra khi tải danh sách tháng");
    } finally {
      setLoading(false);
    }
  };

  const formatMonthLabel = (month: string): string => {
    try {
      const [year, monthNum] = month.split("-");
      const monthNumber = parseInt(monthNum, 10);

      if (isNaN(monthNumber) || monthNumber < 1 || monthNumber > 12) {
        return month; // Return original if invalid
      }

      return `Tháng ${monthNumber} - ${year}`;
    } catch (error) {
      return month; // Return original if parsing fails
    }
  };

  const handleValueChange = (newValue: string) => {
    // Convert special values back to empty string
    if (newValue === "__EMPTY__" || newValue === "__NO_DATA__") {
      onValueChange("");
    } else {
      onValueChange(newValue);
    }
  };

  if (error) {
    return (
      <div className="space-y-2">
        {label && <Label>{label}</Label>}
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {label && (
        <Label className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          {label}
        </Label>
      )}

      <Select
        value={value || "__EMPTY__"}
        onValueChange={handleValueChange}
        disabled={disabled || loading}
      >
        <SelectTrigger className={loading ? "opacity-50" : ""}>
          <SelectValue
            placeholder={
              loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang tải...
                </div>
              ) : (
                placeholder
              )
            }
          />
        </SelectTrigger>
        <SelectContent>
          {allowEmpty && (
            <SelectItem value="__EMPTY__">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                Tất cả tháng
              </div>
            </SelectItem>
          )}

          {months.map((month) => (
            <SelectItem key={month.value} value={month.value}>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                {month.label}
              </div>
            </SelectItem>
          ))}

          {!loading && months.length === 0 && (
            <SelectItem value="__NO_DATA__" disabled>
              <div className="flex items-center gap-2 text-gray-500">
                <Calendar className="w-4 h-4" />
                Không có dữ liệu tháng
              </div>
            </SelectItem>
          )}
        </SelectContent>
      </Select>

      {loading && (
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          Đang tải danh sách tháng lương...
        </p>
      )}

      {!loading && months.length > 0 && (
        <p className="text-xs text-gray-500">
          Có {months.length} tháng lương trong hệ thống
        </p>
      )}
    </div>
  );
}
