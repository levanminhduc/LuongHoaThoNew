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
import { Gift, Calendar, X } from "lucide-react";
import { formatSalaryMonth, formatCurrency } from "@/lib/utils/date-formatter";
import type { PayrollResult } from "@/lib/types/payroll";

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

  const DetailRow = ({
    label,
    value,
    highlight = false,
    className = "",
  }: {
    label: string;
    value: number | undefined;
    highlight?: boolean;
    className?: string;
  }) => (
    <div
      className={`flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0 ${highlight ? "bg-amber-50 px-2 rounded-md -mx-2" : ""} ${className ? `px-2 rounded-md -mx-2 ${className}` : ""}`}
    >
      <span
        className={`text-sm ${highlight ? "text-amber-800 font-bold" : "text-gray-600 font-medium"}`}
      >
        {label}:
      </span>
      <span
        className={`text-sm ${highlight ? "text-amber-700 font-bold" : "font-semibold text-gray-900"}`}
      >
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
              <Badge
                variant="outline"
                className="bg-green-50 text-green-700 border-green-200"
              >
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
              {/* Tháng 12/2024 lên đầu - Có màu nền */}
              <DetailRow
                label="Tháng 12/2024"
                value={payrollData.t13_thang_12}
                className="bg-slate-100"
              />

              {/* Các tháng 2025 - Xen kẽ màu */}
              <DetailRow
                label="Tháng 01/2025"
                value={payrollData.t13_thang_01}
              />
              <DetailRow
                label="Tháng 02/2025"
                value={payrollData.t13_thang_02}
                className="bg-slate-100"
              />
              <DetailRow
                label="Tháng 03/2025"
                value={payrollData.t13_thang_03}
              />
              <DetailRow
                label="Tháng 04/2025"
                value={payrollData.t13_thang_04}
                className="bg-slate-100"
              />
              <DetailRow
                label="Tháng 05/2025"
                value={payrollData.t13_thang_05}
              />
              <DetailRow
                label="Tháng 06/2025"
                value={payrollData.t13_thang_06}
                className="bg-slate-100"
              />
              <DetailRow
                label="Tháng 07/2025"
                value={payrollData.t13_thang_07}
              />
              <DetailRow
                label="Tháng 08/2025"
                value={payrollData.t13_thang_08}
                className="bg-slate-100"
              />
              <DetailRow
                label="Tháng 09/2025"
                value={payrollData.t13_thang_09}
              />
              <DetailRow
                label="Tháng 10/2025"
                value={payrollData.t13_thang_10}
                className="bg-slate-100"
              />
              <DetailRow
                label="Tháng 11/2025"
                value={payrollData.t13_thang_11}
              />
            </CardContent>
          </Card>

          <Separator />

          {/* Phần Tổng Quan (Summary) - Đưa xuống dưới và đổi màu Xanh */}
          <div className="space-y-4">
            {/* Số Tháng Chia & Tổng SP 12 Tháng */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader className="pb-1 pt-3 px-2">
                  <CardTitle className="text-xs font-medium text-blue-600 uppercase text-center">
                    Số Tháng Chia
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 pb-3 text-center px-2">
                  <p className="text-lg font-bold text-blue-700">
                    {Math.round(payrollData.so_thang_chia_13 || 0)}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 border-blue-200">
                <CardHeader className="pb-1 pt-3 px-2">
                  <CardTitle className="text-xs font-medium text-blue-600 uppercase text-center">
                    Tổng SP 12 Tháng
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 pb-3 text-center px-2">
                  <p className="text-lg font-bold text-blue-700">
                    {formatCurrencyLocal(payrollData.tong_sp_12_thang)}
                  </p>
                </CardContent>
              </Card>
            </div>

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
