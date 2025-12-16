"use client";

import type React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Calculator,
  Clock,
  DollarSign,
  Gift,
  Shield,
  Calendar,
  TrendingUp,
  Minus,
  Banknote,
  X,
} from "lucide-react";
import {
  formatSalaryMonth,
  formatCurrency,
  formatNumber,
} from "@/lib/utils/date-formatter";

interface PayrollResult {
  employee_id: string;
  full_name: string;
  cccd: string;
  position: string;
  salary_month: string;
  salary_month_display?: string; // Optional formatted display
  total_income: number;
  deductions: number;
  net_salary: number;
  source_file: string;

  // Hệ số và thông số cơ bản
  he_so_lam_viec?: number;
  he_so_phu_cap_ket_qua?: number;
  he_so_luong_co_ban?: number;
  luong_toi_thieu_cty?: number;

  // Thời gian làm việc
  ngay_cong_trong_gio?: number;
  gio_cong_tang_ca?: number;
  gio_an_ca?: number;
  tong_gio_lam_viec?: number;
  tong_he_so_quy_doi?: number;
  ngay_cong_chu_nhat?: number;

  // Lương sản phẩm và đơn giá
  tong_luong_san_pham_cong_doan?: number;
  don_gia_tien_luong_tren_gio?: number;
  tien_luong_san_pham_trong_gio?: number;
  tien_luong_tang_ca?: number;
  tien_luong_30p_an_ca?: number;
  tien_tang_ca_vuot?: number;
  tien_luong_chu_nhat?: number;

  // Thưởng và phụ cấp
  tien_khen_thuong_chuyen_can?: number;
  luong_hoc_viec_pc_luong?: number;
  tong_cong_tien_luong_san_pham?: number;
  ho_tro_thoi_tiet_nong?: number;
  bo_sung_luong?: number;
  pc_luong_cho_viec?: number;
  luong_cnkcp_vuot?: number;

  // Bảo hiểm và phúc lợi
  bhxh_21_5_percent?: number;
  pc_cdcs_pccc_atvsv?: number;
  luong_phu_nu_hanh_kinh?: number;
  tien_con_bu_thai_7_thang?: number;
  ho_tro_gui_con_nha_tre?: number;

  // Phép và lễ
  ngay_cong_phep_le?: number;
  tien_phep_le?: number;

  // Tổng lương và phụ cấp khác
  tong_cong_tien_luong?: number;
  tien_boc_vac?: number;
  ho_tro_xang_xe?: number;

  // Thuế và khấu trừ
  thue_tncn_nam_2024?: number;
  tam_ung?: number;
  thue_tncn?: number;
  bhxh_bhtn_bhyt_total?: number;
  truy_thu_the_bhyt?: number;

  // Lương thực nhận
  tien_luong_thuc_nhan_cuoi_ky?: number;

  // Thông tin ký nhận
  is_signed?: boolean;
  signed_at?: string;
  signed_by_name?: string;
}

interface PayrollDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  payrollData: PayrollResult;
}

export function PayrollDetailModal({
  isOpen,
  onClose,
  payrollData,
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
    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
      <span className="text-sm text-gray-600 font-medium">{label}:</span>
      <span className="text-sm font-semibold text-gray-900">
        {isCurrency
          ? formatCurrencyLocal(value as number)
          : isNumber
            ? formatNumberLocal(value as number)
            : value || "Không có"}
      </span>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden payroll-detail-modal modal-event-isolation"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 pb-2 shrink-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Chi Tiết Lương Đầy Đủ - {payrollData.full_name}
            </DialogTitle>
            <DialogDescription>
              Thông tin chi tiết lương của nhân viên
            </DialogDescription>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-muted-foreground">Tháng lương:</span>
              <Badge variant="outline">
                {payrollData.salary_month_display ||
                  formatSalaryMonth(payrollData.salary_month)}
              </Badge>
              <span className="text-sm text-muted-foreground">|</span>
              <span className="text-sm text-muted-foreground">Mã NV:</span>
              <Badge>{payrollData.employee_id}</Badge>
            </div>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto w-full border-t border-b p-6 space-y-6">
            {/* Hệ số và thông số cơ bản */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-blue-600" />
                  <span className="text-blue-700">
                    Hệ Số và Thông Số Cơ Bản
                  </span>
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
                  <Clock className="w-4 h-4 text-green-600" />
                  <span className="text-green-700">Thời Gian Làm Việc</span>
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
                  <DollarSign className="w-4 h-4 text-purple-600" />
                  <span className="text-purple-700">
                    Lương Sản Phẩm và Đơn Giá
                  </span>
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
              </CardContent>
            </Card>

            {/* Thưởng và phụ cấp */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Gift className="w-4 h-4 text-orange-600" />
                  <span className="text-orange-700">Thưởng và Phụ Cấp</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <DetailRow
                  label="Tiền Khen Thưởng Chuyên Cần"
                  value={payrollData.tien_khen_thuong_chuyen_can}
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
                  <Shield className="w-4 h-4 text-indigo-600" />
                  <span className="text-indigo-700">Bảo Hiểm và Phúc Lợi</span>
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
                  <Calendar className="w-4 h-4 text-teal-600" />
                  <span className="text-teal-700">Phép và Lễ</span>
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
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">
                    Tổng Lương và Phụ Cấp Khác
                  </span>
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
                  <Minus className="w-4 h-4 text-red-600" />
                  <span className="text-red-700">Thuế và Khấu Trừ</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <DetailRow
                  label="Thuế TNCN Năm 2024"
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
            <Card className="bg-green-50 border-green-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-green-600" />
                  <span className="text-green-700">Lương Thực Nhận</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center p-4 bg-white rounded-lg border border-green-200">
                  <p className="text-sm text-green-600 font-medium mb-2">
                    Tiền Lương Thực Nhận Cuối Kỳ
                  </p>
                  <p className="text-2xl font-bold text-green-700">
                    {formatCurrencyLocal(
                      payrollData.tien_luong_thuc_nhan_cuoi_ky,
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Thông tin nguồn */}
            <div className="text-sm text-gray-500 text-center">
              <p>Nguồn dữ liệu: {payrollData.source_file}</p>
              <p className="mt-1">
                <strong>Lưu ý:</strong> Thông tin này chỉ mang tính chất tham
                khảo. Vui lòng liên hệ phòng nhân sự nếu có thắc mắc.
              </p>
            </div>
        </div>

        <div className="p-6 pt-4 pb-6 shrink-0 bg-background">
          <DialogFooter className="sm:justify-center">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="w-full bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:text-red-800 h-12 text-base font-medium"
            >
              <X className="w-5 h-5 mr-2" />
              Đóng Lại
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
