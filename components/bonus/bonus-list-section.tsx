"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Gift, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils/date-formatter";
import {
  useBonusPeriodsQuery,
  useBonusListQuery,
} from "@/lib/hooks/use-bonus-list";
import type { BonusListRow } from "@/lib/bonus/bonus-types";
import type { BonusType } from "@/lib/validations/bonus";

interface BonusListSectionProps {
  department?: string;
}

interface SelectedPeriod {
  bonusType: BonusType;
  bonusPeriod: string;
}

const PERIOD_KEY_SEPARATOR = "__";

function encodePeriodKey(bonusType: string, bonusPeriod: string): string {
  return `${bonusType}${PERIOD_KEY_SEPARATOR}${bonusPeriod}`;
}

function collectDetailLabels(rows: BonusListRow[]): string[] {
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    for (const item of row.detail_data) {
      if (seen.has(item.label)) continue;
      seen.add(item.label);
      labels.push(item.label);
    }
  }
  return labels;
}

function formatDetailValue(value: number | string): string {
  return typeof value === "number" ? formatCurrency(value) : value;
}

function findDetailValue(row: BonusListRow, label: string): string {
  const item = row.detail_data.find((detail) => detail.label === label);
  return item ? formatDetailValue(item.value) : "-";
}

export function BonusListSection({ department }: BonusListSectionProps) {
  const [selected, setSelected] = useState<SelectedPeriod | null>(null);

  const periodsQuery = useBonusPeriodsQuery(department);
  const listQuery = useBonusListQuery({
    bonusType: selected?.bonusType ?? null,
    bonusPeriod: selected?.bonusPeriod ?? null,
    department,
  });

  const periods = periodsQuery.data?.periods ?? [];
  const rows = listQuery.data?.rows ?? [];
  const detailLabels = useMemo(() => collectDetailLabels(rows), [rows]);
  const periodOptions = useMemo(
    () =>
      periods.map((period) => ({
        value: encodePeriodKey(period.bonus_type, period.bonus_period),
        label: `${period.bonus_type_label} • ${period.bonus_period}${period.bonus_title ? ` — ${period.bonus_title}` : ""}`,
      })),
    [periods],
  );

  const handleSelectPeriod = (key: string) => {
    const period = periods.find(
      (item) => encodePeriodKey(item.bonus_type, item.bonus_period) === key,
    );
    if (period) {
      setSelected({
        bonusType: period.bonus_type,
        bonusPeriod: period.bonus_period,
      });
    }
  };

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-pink-600" />
          <CardTitle className="text-base sm:text-lg">Tiền Thưởng</CardTitle>
        </div>
        <CardDescription>
          Chọn đợt thưởng để xem danh sách nhân viên và trạng thái ký nhận
        </CardDescription>
        <Combobox
          options={periodOptions}
          value={
            selected
              ? encodePeriodKey(selected.bonusType, selected.bonusPeriod)
              : ""
          }
          onValueChange={handleSelectPeriod}
          disabled={periodsQuery.isLoading || periods.length === 0}
          placeholder="Chọn đợt thưởng"
          searchPlaceholder="Tìm đợt thưởng..."
          emptyText="Không tìm thấy đợt thưởng."
          className="w-full sm:w-96"
        />
      </CardHeader>

      <CardContent>
        {!selected ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Chọn một đợt thưởng để xem dữ liệu
          </p>
        ) : listQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={`bonus-row-skeleton-${index}`} className="h-10" />
            ))}
          </div>
        ) : listQuery.isError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Không thể tải dữ liệu tiền thưởng. Vui lòng thử lại.
            </AlertDescription>
          </Alert>
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Chưa có đợt thưởng
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[100px]">Mã NV</TableHead>
                  <TableHead className="min-w-[150px]">Họ Tên</TableHead>
                  <TableHead className="min-w-[120px]">Phòng Ban</TableHead>
                  {detailLabels.map((label) => (
                    <TableHead
                      key={`detail-head-${label}`}
                      className="min-w-[120px] text-right"
                    >
                      {label}
                    </TableHead>
                  ))}
                  <TableHead className="min-w-[140px] text-right">
                    Số Tiền Thưởng
                  </TableHead>
                  <TableHead className="min-w-[100px] text-center">
                    Trạng Thái
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.employee_id}>
                    <TableCell className="font-mono text-xs sm:text-sm">
                      {row.employee_id}
                    </TableCell>
                    <TableCell>{row.full_name}</TableCell>
                    <TableCell>{row.department ?? "-"}</TableCell>
                    {detailLabels.map((label) => (
                      <TableCell
                        key={`detail-cell-${row.employee_id}-${label}`}
                        className="text-right"
                      >
                        {findDetailValue(row, label)}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(row.amount)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={row.is_signed ? "default" : "secondary"}>
                        {row.is_signed ? "Đã ký" : "Chưa ký"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
