"use client";

import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Calendar } from "lucide-react";
import type { MonthOption } from "../types";
import { useAvailablePayrollMonthsQuery } from "@/lib/hooks/use-payroll";

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
  const monthsQuery = useAvailablePayrollMonthsQuery();
  const loading = monthsQuery.isLoading;
  const error =
    monthsQuery.error instanceof Error ? monthsQuery.error.message : "";

  const formatMonthLabel = (month: string): string => {
    try {
      const [year, monthNum] = month.split("-");
      const monthNumber = parseInt(monthNum, 10);

      if (isNaN(monthNumber) || monthNumber < 1 || monthNumber > 12) {
        return month;
      }

      return `Tháng ${monthNumber} - ${year}`;
    } catch {
      return month;
    }
  };

  const handleValueChange = (newValue: string) => {
    if (newValue === "__EMPTY__" || newValue === "__NO_DATA__") {
      onValueChange("");
    } else {
      onValueChange(newValue);
    }
  };

  const months: MonthOption[] =
    monthsQuery.data?.months.map((month) => ({
      value: month,
      label: formatMonthLabel(month),
    })) ?? [];

  const comboboxOptions: ComboboxOption[] = [
    ...(allowEmpty ? [{ value: "__EMPTY__", label: "Tất cả tháng" }] : []),
    ...months,
    ...(!loading && months.length === 0
      ? [
          {
            value: "__NO_DATA__",
            label: "Không có dữ liệu tháng",
            disabled: true,
          },
        ]
      : []),
  ];

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

      <Combobox
        options={comboboxOptions}
        value={value || "__EMPTY__"}
        onValueChange={handleValueChange}
        placeholder={loading ? "Đang tải..." : placeholder}
        searchPlaceholder="Tìm tháng..."
        emptyText="Không tìm thấy tháng."
        disabled={disabled || loading}
        className={loading ? "opacity-50" : ""}
      />

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
