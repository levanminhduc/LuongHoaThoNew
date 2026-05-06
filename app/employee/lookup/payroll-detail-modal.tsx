"use client";

import type React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  Calculator,
  Clock,
  DollarSign,
  Gift,
  Shield,
  Calendar,
  TrendingUp,
  Minus,
  Banknote,
  Loader2,
  X,
} from "lucide-react";
import {
  formatSalaryMonth,
  formatCurrency,
  formatNumber,
} from "@/lib/utils/date-formatter";
import type { PayrollResult } from "@/lib/types/payroll";

interface PayrollDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  payrollData: PayrollResult;
  isLoading?: boolean;
  error?: string;
}

export function PayrollDetailModal({
  isOpen,
  onClose,
  payrollData,
  isLoading = false,
  error,
}: PayrollDetailModalProps) {
  // Using utility functions from date-formatter
  const formatCurrencyLocal = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return "0 ₫";
    return formatCurrency(amount);
  };

  const formatNumberLocal = (value: number | undefined) => {
    if (value === undefined || value === null) return "0";
    return formatNumber(value);
  };

  const DetailRow = ({
    label,
    value,
    isNumber = false,
    isCurrency = false,
  }: {
    label: string;
    value: number | string | undefined;
    isNumber?: boolean;
    isCurrency?: boolean;
  }) => (
    <div className="flex justify-between items-center py-2 border-b border-border last:border-b-0">
      <span className="text-sm text-muted-foreground font-medium">
        {label}:
      </span>
      <span className="text-sm font-semibold text-foreground">
        {isCurrency
          ? formatCurrencyLocal(value as number)
          : isNumber
            ? formatNumberLocal(value as number)
            : value || "Không có"}
      </span>
    </div>
  );

  const loadingCards = Array.from({ length: 4 }, (_, cardIndex) => (
    <Card key={`payroll-detail-loading-${cardIndex}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-5 w-44" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 5 }, (_, rowIndex) => (
          <div
            key={`payroll-detail-loading-${cardIndex}-${rowIndex}`}
            className="flex items-center justify-between gap-4 border-b border-border pb-2 last:border-b-0"
          >
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </CardContent>
    </Card>
  ));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden payroll-detail-modal modal-event-isolation [&>button.absolute]:text-destructive [&>button.absolute:hover]:text-destructive [&>button.absolute:focus]:ring-destructive"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-5 py-4 sm:px-6">
          <DialogHeader className="space-y-3 text-left">
            <DialogTitle className="flex items-start gap-2 pr-8 text-lg leading-snug sm:text-xl">
              <Calculator className="mt-0.5 h-5 w-5 shrink-0" />
              <span className="min-w-0">
                Chi Tiết Lương - {payrollData.full_name}
              </span>
            </DialogTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="h-7 gap-1.5 rounded-full px-3 text-xs font-semibold sm:text-sm"
              >
                <Calendar className="h-3.5 w-3.5" />
                {payrollData.salary_month_display ||
                  formatSalaryMonth(payrollData.salary_month)}
              </Badge>
              <Badge className="h-7 rounded-full px-3 text-xs font-semibold sm:text-sm">
                Mã NV {payrollData.employee_id}
              </Badge>
            </div>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto w-full border-t p-6 pb-24">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isLoading ? (
            <div className="space-y-6">
              <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Đang tải dữ liệu chi tiết...</span>
              </div>
              {loadingCards}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Hệ số và thông số cơ bản */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calculator className="w-4 h-4" />
                    <span>Hệ Số và Thông Số Cơ Bản</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <DetailRow
                    label="Hệ Số Làm Việc"
                    value={payrollData.he_so_lam_viec}
                    isNumber
                  />
                  <DetailRow
                    label="Hệ Số Phụ Cấp Kết Quả"
                    value={payrollData.he_so_phu_cap_ket_qua}
                    isNumber
                  />
                  <DetailRow
                    label="Hệ Số Lương Cơ Bản"
                    value={payrollData.he_so_luong_co_ban}
                    isNumber
                  />
                  <DetailRow
                    label="Lương Tối Thiểu Công Ty"
                    value={payrollData.luong_toi_thieu_cty}
                    isCurrency
                  />
                </CardContent>
              </Card>

              {/* Thời gian làm việc */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>Thời Gian Làm Việc</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <DetailRow
                    label="Ngày Công Trong Giờ"
                    value={payrollData.ngay_cong_trong_gio}
                    isNumber
                  />
                  <DetailRow
                    label="Giờ Công Tăng Ca"
                    value={payrollData.gio_cong_tang_ca}
                    isNumber
                  />
                  <DetailRow
                    label="Giờ Ăn Ca"
                    value={payrollData.gio_an_ca}
                    isNumber
                  />
                  <DetailRow
                    label="Tổng Giờ Làm Việc"
                    value={payrollData.tong_gio_lam_viec}
                    isNumber
                  />
                  <DetailRow
                    label="Tổng Hệ Số Quy Đổi"
                    value={payrollData.tong_he_so_quy_doi}
                    isNumber
                  />
                  <DetailRow
                    label="Ngày Công Chủ Nhật"
                    value={payrollData.ngay_cong_chu_nhat}
                    isNumber
                  />
                </CardContent>
              </Card>

              {/* Lương sản phẩm và đơn giá */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    <span>Lương Sản Phẩm và Đơn Giá</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <DetailRow
                    label="Tổng Lương Sản Phẩm Công Đoạn"
                    value={payrollData.tong_luong_san_pham_cong_doan}
                    isCurrency
                  />
                  <DetailRow
                    label="Đơn Giá Tiền Lương Trên Giờ"
                    value={payrollData.don_gia_tien_luong_tren_gio}
                    isCurrency
                  />
                  <DetailRow
                    label="Tiền Lương Sản Phẩm Trong Giờ"
                    value={payrollData.tien_luong_san_pham_trong_gio}
                    isCurrency
                  />
                  <DetailRow
                    label="Tiền Lương Tăng Ca"
                    value={payrollData.tien_luong_tang_ca}
                    isCurrency
                  />
                  <DetailRow
                    label="Tiền Lương 30p Ăn Ca"
                    value={payrollData.tien_luong_30p_an_ca}
                    isCurrency
                  />
                  {/*
              <DetailRow
                label="Tiền Tăng Ca Vượt"
                value={payrollData.tien_tang_ca_vuot}
                isCurrency
              />
              <DetailRow
                label="Lương CNKCP Vượt"
                value={payrollData.luong_cnkcp_vuot}
                isCurrency
              />
              */}
                </CardContent>
              </Card>

              {/* Thưởng và phụ cấp */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Gift className="w-4 h-4" />
                    <span>Thưởng và Phụ Cấp</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <DetailRow
                    label="Tiền Khen Thưởng Chuyên Cần"
                    value={payrollData.tien_khen_thuong_chuyen_can}
                    isCurrency
                  />
                  <DetailRow
                    label="PC Lương"
                    value={
                      (payrollData.tien_tang_ca_vuot || 0) +
                      (payrollData.luong_cnkcp_vuot || 0)
                    }
                    isCurrency
                  />
                  <DetailRow
                    label="Lương Học Việc PC Lương"
                    value={payrollData.luong_hoc_viec_pc_luong}
                    isCurrency
                  />
                  <DetailRow
                    label="PC Lương Chờ Việc ( hỗ trợ bão, lụt )"
                    value={payrollData.pc_luong_cho_viec}
                    isCurrency
                  />
                  <DetailRow
                    label="Tổng Cộng Tiền Lương Sản Phẩm"
                    value={payrollData.tong_cong_tien_luong_san_pham}
                    isCurrency
                  />
                  <DetailRow
                    label="Hỗ Trợ Thời Tiết Nóng"
                    value={payrollData.ho_tro_thoi_tiet_nong}
                    isCurrency
                  />
                  <DetailRow
                    label="Bổ Sung Lương"
                    value={payrollData.bo_sung_luong}
                    isCurrency
                  />
                </CardContent>
              </Card>

              {/* Bảo hiểm và phúc lợi */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    <span>Bảo Hiểm và Phúc Lợi</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <DetailRow
                    label="BHXH 21.5%"
                    value={payrollData.bhxh_21_5_percent}
                    isCurrency
                  />
                  <DetailRow
                    label="PC CDCS PCCC ATVSV"
                    value={payrollData.pc_cdcs_pccc_atvsv}
                    isCurrency
                  />
                  <DetailRow
                    label="Lương Phụ Nữ Hành Kinh"
                    value={payrollData.luong_phu_nu_hanh_kinh}
                    isCurrency
                  />
                  <DetailRow
                    label="Tiền Con Bú Thai 7 Tháng"
                    value={payrollData.tien_con_bu_thai_7_thang}
                    isCurrency
                  />
                  <DetailRow
                    label="Hỗ Trợ Gửi Con Nhà Trẻ"
                    value={payrollData.ho_tro_gui_con_nha_tre}
                    isCurrency
                  />
                </CardContent>
              </Card>

              {/* Phép và lễ */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Phép và Lễ</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <DetailRow
                    label="Ngày Công Phép Lễ"
                    value={payrollData.ngay_cong_phep_le}
                    isNumber
                  />
                  <DetailRow
                    label="Tiền Phép Lễ"
                    value={payrollData.tien_phep_le}
                    isCurrency
                  />
                </CardContent>
              </Card>

              {/* Tổng lương và phụ cấp khác */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    <span>Tổng Lương và Phụ Cấp Khác</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <DetailRow
                    label="Tổng Cộng Tiền Lương"
                    value={payrollData.tong_cong_tien_luong}
                    isCurrency
                  />
                  <DetailRow
                    label="Tiền Bốc Vác"
                    value={payrollData.tien_boc_vac}
                    isCurrency
                  />
                  <DetailRow
                    label="Hỗ Trợ Xăng Xe"
                    value={payrollData.ho_tro_xang_xe}
                    isCurrency
                  />
                </CardContent>
              </Card>

              {/* Thuế và khấu trừ */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Minus className="w-4 h-4" />
                    <span>Thuế và Khấu Trừ</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <DetailRow
                    label="Thuế TNCN Năm 2025"
                    value={payrollData.thue_tncn_nam_2024}
                    isCurrency
                  />
                  <DetailRow
                    label="Tạm Ứng"
                    value={payrollData.tam_ung}
                    isCurrency
                  />
                  <DetailRow
                    label="Thuế TNCN"
                    value={payrollData.thue_tncn}
                    isCurrency
                  />
                  <DetailRow
                    label="BHXH BHTN BHYT Total"
                    value={payrollData.bhxh_bhtn_bhyt_total}
                    isCurrency
                  />
                  <DetailRow
                    label="Truy Thu Thẻ BHYT"
                    value={payrollData.truy_thu_the_bhyt}
                    isCurrency
                  />
                </CardContent>
              </Card>

              {/* Lương thực nhận */}
              <Card className="bg-muted/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Banknote className="w-4 h-4" />
                    <span>Lương Thực Nhận</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center p-4 bg-background rounded-lg border">
                    <p className="text-sm text-muted-foreground font-medium mb-2">
                      Tiền Lương Thực Nhận Cuối Kỳ
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {formatCurrencyLocal(
                        payrollData.tien_luong_thuc_nhan_cuoi_ky,
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Separator />

              {/* Thông tin nguồn */}
              <div className="text-sm text-muted-foreground text-center">
                <p>Nguồn dữ liệu: {payrollData.source_file}</p>
                <p className="mt-1">
                  <strong>Lưu ý:</strong> Thông tin này chỉ mang tính chất tham
                  khảo. Vui lòng liên hệ phòng nhân sự nếu có thắc mắc.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-background/90 via-background/45 to-transparent px-5 pb-2.5 pt-5 backdrop-blur-[1px] sm:px-6">
          <DialogFooter className="pointer-events-auto sm:justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="mx-auto h-10 w-full max-w-xs border-destructive/30 bg-background/95 px-4 text-sm font-semibold text-destructive shadow-[0_10px_24px_-18px_rgba(15,23,42,0.65)] backdrop-blur hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="mr-2 h-4 w-4" />
              Đóng Lại
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
