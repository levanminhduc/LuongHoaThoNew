"use client";

import type { PayrollResult } from "@/lib/types/payroll";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DollarSign,
  PenTool,
  CheckCircle,
  Clock,
  Loader2,
  Building2,
  CalendarDays,
  Calendar,
  Lock,
  MoreHorizontal,
} from "lucide-react";
import {
  formatSalaryMonth,
  formatCurrency,
  formatNumber,
} from "@/lib/utils/date-formatter";
import { T13_ENABLED } from "@/lib/feature-flags";

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
      return (
        result.salary_month_display || formatSalaryMonth(result.salary_month)
      );
    }

    const [, year, month] = match;
    return `Tháng ${month.padStart(2, "0")} - ${year}`;
  })();

  return (
    <Card>
      <CardContent className="space-y-5 p-[14px] pt-[14px] xs:p-[18px] xs:pt-[18px] sm:space-y-6 sm:p-[22px] sm:pt-[22px]">
        <div className="relative isolate overflow-hidden rounded-lg border border-primary/40 bg-[linear-gradient(135deg,hsl(var(--primary))_0%,#1656d6_48%,#0a2c7d_100%)] p-3 text-primary-foreground shadow-[0_18px_42px_-24px_rgba(37,99,235,0.9)] before:absolute before:inset-y-[-40%] before:left-[-55%] before:z-0 before:w-[46%] before:skew-x-[-18deg] before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.16),rgba(255,255,255,0.56),rgba(255,255,255,0.16),transparent)] before:content-[''] before:animate-employee-card-shine motion-reduce:before:animate-none xs:p-4 sm:p-5">
          <div className="relative z-10 grid gap-3 sm:gap-4">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-white/70 xs:text-[0.7rem]">
              Thông tin nhân viên
            </p>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:gap-3">
              <h2 className="min-w-0 text-lg font-bold leading-tight text-white xs:text-xl sm:text-2xl">
                <span className="block truncate">{result.full_name}</span>
              </h2>
              <Badge
                variant="secondary"
                className="w-fit max-w-[8.75rem] gap-1 rounded-full border border-white/25 bg-white/20 px-2 py-1 text-[0.65rem] font-semibold text-white shadow-sm backdrop-blur hover:bg-white/20 xs:max-w-[11rem] xs:gap-1.5 xs:px-3 xs:text-xs sm:max-w-none"
              >
                <CalendarDays className="h-3 w-3 shrink-0 xs:h-3.5 xs:w-3.5" />
                <span className="min-w-0 truncate">{salaryMonthLabel}</span>
              </Badge>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-stretch gap-2 max-[420px]:grid-cols-1">
              <div className="flex min-w-0 items-center gap-1.5 rounded-md border border-white/15 bg-white/15 px-2 py-2 text-[0.68rem] leading-snug text-white/85 shadow-sm backdrop-blur xs:gap-2 xs:px-3 xs:text-xs sm:text-base">
                <Building2 className="h-3.5 w-3.5 shrink-0 text-cyan-100 sm:h-4 sm:w-4" />
                <span className="min-w-0 break-words">
                  Bộ Phận:{" "}
                  <span className="font-semibold text-white">
                    {result.department || "Không xác định"}
                  </span>
                </span>
              </div>
              <div className="flex min-w-fit items-center justify-end gap-1.5 rounded-md border border-white/15 bg-white/15 px-2 py-2 text-[0.68rem] text-white/85 shadow-sm backdrop-blur max-[420px]:justify-start xs:gap-2 xs:px-3 xs:text-xs sm:text-base">
                <Clock className="h-3.5 w-3.5 shrink-0 text-amber-100 sm:h-4 sm:w-4" />
                <span className="whitespace-nowrap">
                  Ngày công:{" "}
                  <span className="font-semibold text-white">
                    {result.ngay_cong_trong_gio != null
                      ? formatNumber(result.ngay_cong_trong_gio)
                      : "—"}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="flex min-w-0 items-center gap-2 text-lg font-semibold">
              <DollarSign className="h-5 w-5 shrink-0" />
              <span className="truncate">Tóm Tắt Lương</span>
            </h3>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={onShowDetail}
                className="relative isolate min-h-9 overflow-hidden border border-sky-200/70 bg-[linear-gradient(135deg,#0ea5e9_0%,#2563eb_42%,#0a2c7d_100%)] px-3 font-bold text-white shadow-[0_14px_30px_-14px_rgba(37,99,235,0.95),inset_0_1px_0_rgba(255,255,255,0.34)] transition-[transform,filter] [transition-duration:200ms] before:absolute before:inset-y-[-55%] before:left-[-76%] before:z-0 before:w-1/2 before:skew-x-[-18deg] before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.18),rgba(255,255,255,0.72),rgba(255,255,255,0.18),transparent)] before:content-[''] before:animate-employee-detail-shine after:absolute after:inset-0 after:z-0 after:rounded-md after:border after:border-white/45 after:content-[''] after:animate-employee-detail-flash animate-employee-detail-pulse hover:scale-[1.03] hover:bg-[linear-gradient(135deg,#0ea5e9_0%,#2563eb_42%,#0a2c7d_100%)] hover:text-white hover:brightness-110 active:scale-[0.96] motion-reduce:animate-none motion-reduce:before:animate-none motion-reduce:after:animate-none"
              >
                <span className="relative z-10">Xem Chi Tiết</span>
              </Button>

              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    aria-label="Mở thêm thao tác"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onSelect={onShowHistory}>
                    <Calendar className="h-4 w-4" />
                    <span>Lịch Sử</span>
                  </DropdownMenuItem>
                  {T13_ENABLED && (
                    <DropdownMenuItem
                      onSelect={onShowT13}
                      disabled={t13Loading}
                    >
                      {t13Loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CalendarDays className="h-4 w-4" />
                      )}
                      <span>Lương T13</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onSelect={onShowPassword}>
                    <Lock className="h-4 w-4" />
                    <span>Đổi MK</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

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
            <CardContent className="px-4 py-4 xs:px-5 xs:py-4 sm:px-6 sm:py-4">
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
            <Card className="border-primary/50 bg-background text-primary shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6" />
                  <div>
                    <p className="font-medium">Đã ký nhận lương</p>
                    <p className="text-sm text-primary/80">
                      Người ký: {result.signed_by_name}
                    </p>
                    {result.signed_at && (
                      <p className="text-sm text-primary/80">
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
                      <p className="font-medium">Chưa ký nhận lương</p>
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
