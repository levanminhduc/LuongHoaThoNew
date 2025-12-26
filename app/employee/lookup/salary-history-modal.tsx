"use client";

import type React from "react";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Calendar,
  AlertCircle,
  Calculator,
  Clock,
  DollarSign,
  Gift,
  Shield,
  TrendingUp,
  Minus,
  Banknote,
  CheckCircle,
  PenTool,
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
  salary_month_display?: string;
  total_income: number;
  deductions: number;
  net_salary: number;
  source_file: string;

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
  pc_luong_cho_viec?: number;

  tien_khen_thuong_chuyen_can?: number;
  luong_hoc_viec_pc_luong?: number;
  tong_cong_tien_luong_san_pham?: number;
  ho_tro_thoi_tiet_nong?: number;
  bo_sung_luong?: number;
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

  chi_dot_1_13?: number;
  chi_dot_2_13?: number;
  tong_luong_13?: number;
  so_thang_chia_13?: number;
  tong_sp_12_thang?: number;
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
  signed_at_display?: string;
  signed_by_name?: string;
}

interface SalaryHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  cccd: string;
  currentMonth: string;
  employeeName: string;
  isT13?: boolean;
}

export function SalaryHistoryModal({
  isOpen,
  onClose,
  employeeId,
  cccd,
  currentMonth,
  employeeName,
  isT13 = false,
}: SalaryHistoryModalProps) {
  const [months, setMonths] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [payrollData, setPayrollData] = useState<PayrollResult | null>(null);
  const [loadingMonths, setLoadingMonths] = useState(false);
  const [loadingPayroll, setLoadingPayroll] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchMonths();
    } else {
      setSelectedMonth("");
      setPayrollData(null);
      setError("");
    }
  }, [isOpen]);

  const fetchMonths = async () => {
    setLoadingMonths(true);
    setError("");

    try {
      const response = await fetch("/api/employee/salary-history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "list_months",
          employee_id: employeeId,
          cccd: cccd,
          is_t13: isT13,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const filteredMonths = data.months.filter(
          (m: string) => m !== currentMonth,
        );
        setMonths(filteredMonths);

        if (filteredMonths.length === 0) {
          setError(
            isT13
              ? "Chưa có lịch sử lương tháng 13 trước đó"
              : "Chưa có lịch sử lương trước đó",
          );
        }
      } else {
        setError(data.error || "Không thể tải danh sách tháng lương");
      }
    } catch {
      setError("Lỗi kết nối mạng. Vui lòng thử lại.");
    } finally {
      setLoadingMonths(false);
    }
  };

  const fetchPayrollData = async (month: string) => {
    setLoadingPayroll(true);
    setError("");
    setPayrollData(null);

    try {
      const response = await fetch("/api/employee/salary-history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "get_payroll",
          employee_id: employeeId,
          cccd: cccd,
          salary_month: month,
          is_t13: isT13,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setPayrollData(data.payroll);
      } else {
        setError(data.error || "Không thể tải thông tin lương");
      }
    } catch {
      setError("Lỗi kết nối mạng. Vui lòng thử lại.");
    } finally {
      setLoadingPayroll(false);
    }
  };

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    fetchPayrollData(month);
  };

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
        className="max-w-4xl max-h-[90vh] overflow-hidden salary-history-modal modal-event-isolation"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {isT13 ? "Lịch Sử Lương Tháng 13" : "Lịch Sử Lương"} -{" "}
            {employeeName}
          </DialogTitle>
          <DialogDescription>
            {isT13
              ? "Xem thông tin lương tháng 13 các năm trước"
              : "Xem thông tin lương các tháng trước"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Chọn tháng lương</label>
            <Select
              value={selectedMonth}
              onValueChange={handleMonthChange}
              disabled={loadingMonths || months.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loadingMonths ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Đang tải danh sách tháng...
                      </div>
                    ) : (
                      "Chọn tháng lương"
                    )
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month} value={month}>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-500" />
                      {isT13
                        ? `Lương Tháng 13 - ${month.split("-")[0]}`
                        : formatSalaryMonth(month)}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loadingPayroll && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <span className="ml-2 text-gray-600">
                Đang tải thông tin lương...
              </span>
            </div>
          )}

          {payrollData && !loadingPayroll && (
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-6">
                {isT13 ? (
                  <>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Calculator className="w-4 h-4 text-amber-600" />
                          <span className="text-amber-700">
                            Thông Tin Lương Tháng 13
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1">
                        <DetailRow
                          label="Số Tháng Chia"
                          value={payrollData.so_thang_chia_13}
                          isNumber
                        />
                        <DetailRow
                          label="Tổng SP 12 Tháng"
                          value={payrollData.tong_sp_12_thang}
                          isCurrency
                        />
                        <DetailRow
                          label="Chi Đợt 1"
                          value={payrollData.chi_dot_1_13}
                          isCurrency
                        />
                        <DetailRow
                          label="Chi Đợt 2"
                          value={payrollData.chi_dot_2_13}
                          isCurrency
                        />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-blue-600" />
                          <span className="text-blue-700">
                            Chi Tiết 12 Tháng
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1">
                        <DetailRow
                          label="Tháng 01"
                          value={payrollData.t13_thang_01}
                          isCurrency
                        />
                        <DetailRow
                          label="Tháng 02"
                          value={payrollData.t13_thang_02}
                          isCurrency
                        />
                        <DetailRow
                          label="Tháng 03"
                          value={payrollData.t13_thang_03}
                          isCurrency
                        />
                        <DetailRow
                          label="Tháng 04"
                          value={payrollData.t13_thang_04}
                          isCurrency
                        />
                        <DetailRow
                          label="Tháng 05"
                          value={payrollData.t13_thang_05}
                          isCurrency
                        />
                        <DetailRow
                          label="Tháng 06"
                          value={payrollData.t13_thang_06}
                          isCurrency
                        />
                        <DetailRow
                          label="Tháng 07"
                          value={payrollData.t13_thang_07}
                          isCurrency
                        />
                        <DetailRow
                          label="Tháng 08"
                          value={payrollData.t13_thang_08}
                          isCurrency
                        />
                        <DetailRow
                          label="Tháng 09"
                          value={payrollData.t13_thang_09}
                          isCurrency
                        />
                        <DetailRow
                          label="Tháng 10"
                          value={payrollData.t13_thang_10}
                          isCurrency
                        />
                        <DetailRow
                          label="Tháng 11"
                          value={payrollData.t13_thang_11}
                          isCurrency
                        />
                        <DetailRow
                          label="Tháng 12"
                          value={payrollData.t13_thang_12}
                          isCurrency
                        />
                      </CardContent>
                    </Card>

                    <Card className="bg-green-50 border-green-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Banknote className="w-4 h-4 text-green-600" />
                          <span className="text-green-700">
                            Tổng Lương Tháng 13
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center p-4 bg-white rounded-lg border border-green-200">
                          <p className="text-sm text-green-600 font-medium mb-2">
                            Tổng Lương Tháng 13
                          </p>
                          <p className="text-2xl font-bold text-green-700">
                            {formatCurrencyLocal(payrollData.tong_luong_13)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <>
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

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Clock className="w-4 h-4 text-green-600" />
                          <span className="text-green-700">
                            Thời Gian Làm Việc
                          </span>
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

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Gift className="w-4 h-4 text-orange-600" />
                          <span className="text-orange-700">
                            Thưởng và Phụ Cấp
                          </span>
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

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Shield className="w-4 h-4 text-indigo-600" />
                          <span className="text-indigo-700">
                            Bảo Hiểm và Phúc Lợi
                          </span>
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

                    <Card className="bg-green-50 border-green-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Banknote className="w-4 h-4 text-green-600" />
                          <span className="text-green-700">
                            Lương Thực Nhận
                          </span>
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

                    {payrollData.is_signed && (
                      <Card className="bg-blue-50 border-blue-200">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <PenTool className="w-4 h-4 text-blue-600" />
                            <span className="text-blue-700">
                              Thông Tin Ký Nhận
                            </span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-3">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                            <div>
                              <p className="font-medium text-green-800">
                                Đã ký nhận lương
                              </p>
                              <p className="text-sm text-green-600">
                                Người ký: {payrollData.signed_by_name}
                              </p>
                              {payrollData.signed_at_display && (
                                <p className="text-sm text-green-600">
                                  Thời gian: {payrollData.signed_at_display}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}

                <Separator />

                <div className="text-sm text-gray-500 text-center">
                  <p>Nguồn dữ liệu: {payrollData.source_file}</p>
                  <p className="mt-1">
                    <strong>Lưu ý:</strong> Thông tin này chỉ mang tính chất
                    tham khảo. Vui lòng liên hệ phòng nhân sự nếu có thắc mắc.
                  </p>
                </div>
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
