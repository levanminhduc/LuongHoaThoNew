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

// Interface này giữ nguyên hoặc anh có thể sửa đổi tùy ý cho T13 mà không sợ ảnh hưởng cái kia
interface PayrollResult {
  employee_id: string;
  full_name: string;
  cccd: string;
  position: string;
  salary_month: string;
  salary_month_display?: string; 
  total_income: number;
  deductions: number;
  net_salary: number;
  source_file: string;

  // Các trường dữ liệu (Anh có thể thêm bớt ở đây cho T13)
  he_so_lam_viec?: number;
  he_so_phu_cap_ket_qua?: number;
  he_so_luong_co_ban?: number;
  luong_toi_thieu_cty?: number;

  ngay_cong_trong_gio?: number;
  gio_cong_tang_ca?: number;
  gio_an_ca?: number;
  tong_gio_lam_viec?: number;
  tong_he_so_quy_doi?: number;
  ngay_cong_chu_nhat?: number;

  tong_luong_san_pham_cong_doan?: number;
  don_gia_tien_luong_tren_gio?: number;
  tien_luong_san_pham_trong_gio?: number;
  tien_luong_tang_ca?: number;
  tien_luong_30p_an_ca?: number;
  tien_tang_ca_vuot?: number;
  tien_luong_chu_nhat?: number;

  tien_khen_thuong_chuyen_can?: number;
  luong_hoc_viec_pc_luong?: number;
  tong_cong_tien_luong_san_pham?: number;
  ho_tro_thoi_tiet_nong?: number;
  bo_sung_luong?: number;
  pc_luong_cho_viec?: number;
  luong_cnkcp_vuot?: number;

  bhxh_21_5_percent?: number;
  pc_cdcs_pccc_atvsv?: number;
  luong_phu_nu_hanh_kinh?: number;
  tien_con_bu_thai_7_thang?: number;
  ho_tro_gui_con_nha_tre?: number;

  ngay_cong_phep_le?: number;
  tien_phep_le?: number;

  tong_cong_tien_luong?: number;
  tien_boc_vac?: number;
  ho_tro_xang_xe?: number;

  thue_tncn_nam_2024?: number;
  tam_ung?: number;
  thue_tncn?: number;
  bhxh_bhtn_bhyt_total?: number;
  truy_thu_the_bhyt?: number;

  tien_luong_thuc_nhan_cuoi_ky?: number;

  // Các trường mới cho T13
  chi_dot_1_13?: number;
  chi_dot_2_13?: number;
  tong_luong_13?: number;

  // Chi tiết 12 tháng
  t13_thang_01?: number;
  t13_thang_02?: number;
  t13_thang_03?: number;
  t13_thang_04?: number;
  t13_thang_05?: number;
  t13_thang_06?: number;
  t13_thang_07?: number;
  t13_thang_08?: number;
  t13_thang_09?: number;
  t13_thang_10?: number;
  t13_thang_11?: number;
  t13_thang_12?: number;

  is_signed?: boolean;
  signed_at?: string;
  signed_by_name?: string;
}

interface PayrollDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  payrollData: PayrollResult;
}

export function PayrollDetailModalT13({
  isOpen,
  onClose,
  payrollData,
}: PayrollDetailModalProps) {
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
    highlight = false,
  }: {
    label: string;
    value: number | undefined;
    highlight?: boolean;
  }) => (
    <div className={`flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0 ${highlight ? 'bg-amber-50 px-2 rounded-md -mx-2' : ''}`}>
      <span className={`text-sm ${highlight ? 'text-amber-800 font-bold' : 'text-gray-600 font-medium'}`}>{label}:</span>
      <span className={`text-sm ${highlight ? 'text-amber-700 font-bold' : 'font-semibold text-gray-900'}`}>
        {formatCurrencyLocal(value)}
      </span>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden payroll-detail-modal modal-event-isolation"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 pb-2 shrink-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <Gift className="w-5 h-5" />
              Chi Tiết Lương Tháng 13 - {payrollData.full_name}
            </DialogTitle>
            <DialogDescription>
              Bảng kê chi tiết thu nhập các tháng tính lương T13
            </DialogDescription>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-muted-foreground">Kỳ lương:</span>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
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
            
            {/* Chi tiết 12 tháng (Đưa lên trên) */}
            <Card className="border-green-100">
              <CardHeader className="pb-3 bg-green-50/30">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-green-600" />
                  <span className="text-green-700">Chi Tiết Các Tháng</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 pt-4">
                <DetailRow label="Tháng 01" value={payrollData.t13_thang_01} />
                <DetailRow label="Tháng 02" value={payrollData.t13_thang_02} />
                <DetailRow label="Tháng 03" value={payrollData.t13_thang_03} />
                <DetailRow label="Tháng 04" value={payrollData.t13_thang_04} />
                <DetailRow label="Tháng 05" value={payrollData.t13_thang_05} />
                <DetailRow label="Tháng 06" value={payrollData.t13_thang_06} />
                <DetailRow label="Tháng 07" value={payrollData.t13_thang_07} />
                <DetailRow label="Tháng 08" value={payrollData.t13_thang_08} />
                <DetailRow label="Tháng 09" value={payrollData.t13_thang_09} />
                <DetailRow label="Tháng 10" value={payrollData.t13_thang_10} />
                <DetailRow label="Tháng 11" value={payrollData.t13_thang_11} />
                <DetailRow label="Tháng 12" value={payrollData.t13_thang_12} />
              </CardContent>
            </Card>

            <Separator />

            {/* Phần Tổng Quan (Summary) - Đưa xuống dưới và đổi màu Xanh */}
            <div className="space-y-4">
               {/* Chi Đợt 1 & Chi Đợt 2 */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader className="pb-1 pt-3 px-2">
                    <CardTitle className="text-xs font-medium text-blue-600 uppercase text-center">
                      Chi Đợt 1
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 pb-3 text-center px-2">
                    <p className="text-lg font-bold text-blue-700">
                      {formatCurrencyLocal(payrollData.chi_dot_1_13)}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader className="pb-1 pt-3 px-2">
                    <CardTitle className="text-xs font-medium text-blue-600 uppercase text-center">
                      Chi Đợt 2
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 pb-3 text-center px-2">
                    <p className="text-lg font-bold text-blue-700">
                      {formatCurrencyLocal(payrollData.chi_dot_2_13)}
                    </p>
                  </CardContent>
                </Card>
              </div>

               {/* Tổng Lương Tháng 13 (Full width - Quan trọng nhất) */}
               <Card className="bg-green-50 border-green-200 shadow-sm">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                  <p className="text-sm font-bold text-green-600 uppercase mb-1">
                    Tổng Lương Tháng 13
                  </p>
                  <p className="text-3xl font-extrabold text-green-700">
                    {formatCurrencyLocal(payrollData.tong_luong_13)}
                  </p>
                </CardContent>
              </Card>
            </div>
            
             <div className="text-sm text-gray-500 text-center pt-2">
              <p>Nguồn dữ liệu: {payrollData.source_file}</p>
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
