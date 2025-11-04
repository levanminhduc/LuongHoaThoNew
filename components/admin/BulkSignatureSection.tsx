"use client";

import { useState } from "react";
import { BulkSignatureDialog } from "./BulkSignatureDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BulkSignatureSectionProps {
  onSuccess?: () => void;
}

export function BulkSignatureSection({ onSuccess }: BulkSignatureSectionProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    // Default to current month
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  });

  // Generate month options (last 12 months + next 3 months)
  const generateMonthOptions = () => {
    const options: { value: string; label: string }[] = [];
    const now = new Date();

    // Last 12 months
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const value = `${year}-${month}`;
      const label = `Tháng ${month}/${year}`;
      options.push({ value, label });
    }

    // Next 3 months
    for (let i = 1; i <= 3; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const value = `${year}-${month}`;
      const label = `Tháng ${month}/${year}`;
      options.push({ value, label });
    }

    return options;
  };

  const monthOptions = generateMonthOptions();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ký Hàng Loạt Chữ Ký Nhân Viên</CardTitle>
        <CardDescription>
          Ký hàng loạt cho những nhân viên chưa ký trong tháng được chọn
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-4">
          <div className="flex-1 space-y-2">
            <Label htmlFor="month-select">Chọn tháng</Label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger id="month-select">
                <SelectValue placeholder="Chọn tháng" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <BulkSignatureDialog
            month={selectedMonth}
            onSuccess={() => {
              onSuccess?.();
            }}
          />
        </div>

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Lưu ý:</strong> Tính năng này chỉ ký cho những nhân viên{" "}
            <strong>CHƯA KÝ</strong> trong tháng được chọn. Những nhân viên đã
            ký sẽ được bỏ qua.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

