"use client";

import { memo, Suspense } from "react";
import { Loader2 } from "lucide-react";
import {
  MonthlySalaryTrendChart,
  SignatureRateChart,
  EmployeeDistributionChart,
  ImportBatchChart,
} from "../charts";

interface ChartsSectionProps {
  showCharts?: boolean;
}

const ChartSkeleton = () => (
  <div className="flex items-center justify-center h-80">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

export const ChartsSection = memo(function ChartsSection({
  showCharts = true,
}: ChartsSectionProps) {
  if (!showCharts) {
    return null;
  }

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold mb-4">Phân Tích & Báo Cáo</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense fallback={<ChartSkeleton />}>
          <MonthlySalaryTrendChart />
        </Suspense>
        <Suspense fallback={<ChartSkeleton />}>
          <SignatureRateChart />
        </Suspense>
        <Suspense fallback={<ChartSkeleton />}>
          <EmployeeDistributionChart />
        </Suspense>
        <Suspense fallback={<ChartSkeleton />}>
          <ImportBatchChart />
        </Suspense>
      </div>
    </div>
  );
});
