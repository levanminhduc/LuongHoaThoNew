"use client";

import type { PayrollResult } from "@/lib/types/payroll";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  PenTool,
  CheckCircle,
  Clock,
  Loader2,
  Building2,
} from "lucide-react";
import {
  formatSalaryMonth,
  formatCurrency,
  formatNumber,
} from "@/lib/utils/date-formatter";
import { EmployeeLookupActions } from "./employee-lookup-actions";

interface EmployeeLookupResultProps {
  result: PayrollResult;
  signingLoading: boolean;
  signSuccess: boolean;
  onSign: () => void;
  onShowDetail: () => void;
  onShowHistory: () => void;
  onShowT13: () => void;
  onShowPassword: () => void;
  t13Loading: boolean;
}

export function EmployeeLookupResult({
  result,
  signingLoading,
  signSuccess,
  onSign,
  onShowDetail,
  onShowHistory,
  onShowT13,
  onShowPassword,
  t13Loading,
}: EmployeeLookupResultProps) {
  const salaryMonthLabel = (() => {
    const match = /^(\d{4})-(\d{1,2})$/.exec(result.salary_month);
    if (!match) {
      return result.salary_month_display || formatSalaryMonth(result.salary_month);
    }

    const [, year, month] = match;
    return `Bảng Lương Tháng ${month.padStart(2, "0")} - ${year}`;
  })();

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <div className="rounded-lg border border-primary bg-primary/20 p-4 sm:p-5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-4">
            <h2 className="min-w-0 truncate text-xl font-bold leading-tight text-foreground sm:text-2xl">
              <span className="block truncate">
                  {result.full_name}
              </span>
            </h2>
            <Badge variant="secondary" className="w-fit max-w-[11.75rem] truncate sm:max-w-none">
              {salaryMonthLabel}
            </Badge>

            <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground sm:text-base">
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="min-w-0 truncate">
                Bộ Phận:{" "}
                <span className="font-semibold text-foreground">
                  {result.department || "Không xác định"}
                </span>
              </span>
            </div>
            <div className="flex min-w-0 items-center justify-end gap-2 text-sm text-muted-foreground sm:text-base">
              <Clock className="h-4 w-4 shrink-0" />
              <span className="min-w-0 truncate">
                Ngày công:{" "}
                <span className="font-semibold text-foreground">
                  {result.ngay_cong_trong_gio != null
                    ? formatNumber(result.ngay_cong_trong_gio)
                    : "—"}
                </span>
              </span>
            </div>
          </div>
        </div>

        <Separator />

        <EmployeeLookupActions
          onShowDetail={onShowDetail}
          onShowHistory={onShowHistory}
          onShowT13={onShowT13}
          onShowPassword={onShowPassword}
          t13Loading={t13Loading}
        />

        <Separator />

        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Tóm Tắt Lương
          </h3>

          <div className="divide-y divide-border">
            <div className="flex justify-between items-center py-3">
              <span className="text-muted-foreground">Hệ Số Làm Việc:</span>
              <span className="font-semibold text-foreground">
                {formatNumber(result.he_so_lam_viec || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-muted-foreground">Hệ Số Phụ Cấp KQ:</span>
              <span className="font-semibold text-foreground">
                {formatNumber(result.he_so_phu_cap_ket_qua || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-muted-foreground">
                Tiền Khen Thưởng Chuyên Cần:
              </span>
              <span className="font-semibold text-foreground">
                {formatCurrency(result.tien_khen_thuong_chuyen_can || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-muted-foreground">PC Lương:</span>
              <span className="font-semibold text-foreground">
                {formatCurrency(
                  (result.tien_tang_ca_vuot || 0) +
                    (result.luong_cnkcp_vuot || 0),
                )}
              </span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-muted-foreground">Lương Học Việc PC:</span>
              <span className="font-semibold text-foreground">
                {formatCurrency(result.luong_hoc_viec_pc_luong || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-muted-foreground">BHXH BHTN BHYT:</span>
              <span className="font-semibold text-foreground">
                {formatCurrency(result.bhxh_bhtn_bhyt_total || 0)}
              </span>
            </div>
          </div>

          <Card className="mt-4 border-primary bg-primary text-primary-foreground">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm font-medium text-primary-foreground/80">
                  Lương Thực Nhận Cuối Kỳ
                </p>
                <p className="text-lg md:text-2xl font-bold">
                  {formatCurrency(result.tien_luong_thuc_nhan_cuoi_ky || 0)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <PenTool className="w-5 h-5" />
            Ký Nhận Lương
          </h3>

          {signSuccess && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Đã ký nhận lương thành công! Cảm ơn bạn đã xác nhận.
              </AlertDescription>
            </Alert>
          )}

          {result.is_signed ? (
            <Card className="border-primary bg-primary text-primary-foreground">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6" />
                  <div>
                    <p className="font-medium">
                      Đã ký nhận lương
                    </p>
                    <p className="text-sm text-primary-foreground/80">
                      Người ký: {result.signed_by_name}
                    </p>
                    {result.signed_at && (
                      <p className="text-sm text-primary-foreground/80">
                        Thời gian: {result.signed_at_display}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-primary bg-primary text-primary-foreground">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Clock className="w-6 h-6" />
                    <div>
                      <p className="font-medium">
                        Chưa ký nhận lương
                      </p>
                      <p className="text-sm text-primary-foreground/80">
                        Vui lòng ký nhận để xác nhận bạn đã nhận thông tin lương
                        tháng {result.salary_month}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={onSign}
                    disabled={signingLoading}
                    variant="secondary"
                    className="w-full"
                  >
                    {signingLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang ký nhận...
                      </>
                    ) : (
                      <>
                        <PenTool className="mr-2 h-4 w-4" />
                        Ký Nhận Lương{" "}
                        {result.salary_month_display ||
                          formatSalaryMonth(result.salary_month)}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
