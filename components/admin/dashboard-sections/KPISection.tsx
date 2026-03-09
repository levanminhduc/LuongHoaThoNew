"use client";

import { memo } from "react";
import { FileSpreadsheet, Users, DollarSign, TrendingUp } from "lucide-react";
import { StatsCard, StatsGrid } from "../stats-card";

interface KPISectionProps {
  totalRecords: number;
  totalEmployees: number;
  totalSalary: number;
  signatureRate: number;
  currentMonth: string;
  lastImportBatch: string;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
};

export const KPISection = memo(function KPISection({
  totalRecords,
  totalEmployees,
  totalSalary,
  signatureRate,
  currentMonth,
  lastImportBatch,
}: KPISectionProps) {
  return (
    <StatsGrid className="mb-8">
      <StatsCard
        title="Tổng Bản Ghi"
        value={totalRecords.toLocaleString()}
        subtitle={`Tháng: ${currentMonth}`}
        badge={`Batch: ${lastImportBatch || "N/A"}`}
        icon={FileSpreadsheet}
        variant="blue"
      />
      <StatsCard
        title="Số Nhân Viên"
        value={totalEmployees.toLocaleString()}
        subtitle="Nhân viên có lương"
        icon={Users}
        variant="green"
      />
      <StatsCard
        title="Tổng Lương"
        value={formatCurrency(totalSalary)}
        subtitle="Thực nhận"
        icon={DollarSign}
        variant="purple"
      />
      <StatsCard
        title="Tỷ Lệ Ký"
        value={`${signatureRate.toFixed(1)}%`}
        subtitle="Đã ký nhận"
        progress={signatureRate}
        icon={TrendingUp}
        variant="orange"
      />
    </StatsGrid>
  );
});
