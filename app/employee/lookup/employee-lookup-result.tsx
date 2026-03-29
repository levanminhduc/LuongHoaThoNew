"use client";

import type { PayrollResult } from "@/lib/types/payroll";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  User,
  DollarSign,
  PenTool,
  CheckCircle,
  Clock,
  Loader2,
  Timer,
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
  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold">{result.full_name}</h2>
          </div>
          <Badge variant="secondary">
            {result.salary_month_display ||
              formatSalaryMonth(result.salary_month)}
          </Badge>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4" />
            <span>Chức vụ: {result.position || "Không xác định"}</span>
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

          <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-blue-600">Hệ Số Làm Việc</p>
                  <p className="text-lg md:text-2xl font-bold text-blue-700">
                    {formatNumber(result.he_so_lam_viec || 0)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-green-600">Hệ Số Phụ Cấp KQ</p>
                  <p className="text-lg md:text-2xl font-bold text-green-700">
                    {formatNumber(result.he_so_phu_cap_ket_qua || 0)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-purple-600">Tiền Khen Thưởng Chuyên Cần</p>
                  <p className="text-lg md:text-2xl font-bold text-purple-700">
                    {formatCurrency(result.tien_khen_thuong_chuyen_can || 0)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-pink-50 border-pink-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-pink-600">PC Lương</p>
                  <p className="text-lg md:text-2xl font-bold text-pink-700">
                    {formatCurrency((result.tien_tang_ca_vuot || 0) + (result.luong_cnkcp_vuot || 0))}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-orange-600">Lương Học Việc PC</p>
                  <p className="text-lg md:text-2xl font-bold text-orange-700">
                    {formatCurrency(result.luong_hoc_viec_pc_luong || 0)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-red-50 border-red-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-red-600">BHXH BHTN BHYT</p>
                  <p className="text-lg md:text-2xl font-bold text-red-700">
                    {formatCurrency(result.bhxh_bhtn_bhyt_total || 0)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-2 bg-emerald-50 border-emerald-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-emerald-600">Lương Thực Nhận Cuối Kỳ</p>
                  <p className="text-lg md:text-2xl font-bold text-emerald-700">
                    {formatCurrency(result.tien_luong_thuc_nhan_cuoi_ky || 0)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <PenTool className="w-5 h-5" />
            Ký Nhận Lương
          </h3>

          {signSuccess && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                Đã ký nhận lương thành công! Cảm ơn bạn đã xác nhận.
              </AlertDescription>
            </Alert>
          )}

          {result.is_signed ? (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">Đã ký nhận lương</p>
                    <p className="text-sm text-green-600">
                      Người ký: {result.signed_by_name}
                    </p>
                    {result.signed_at && (
                      <p className="text-sm text-green-600">
                        Thời gian: {result.signed_at_display}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Clock className="w-6 h-6 text-amber-600" />
                    <div>
                      <p className="font-medium text-amber-800">Chưa ký nhận lương</p>
                      <p className="text-sm text-amber-600">
                        Vui lòng ký nhận để xác nhận bạn đã nhận thông tin lương tháng{" "}
                        {result.salary_month}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={onSign}
                    disabled={signingLoading}
                    className="w-full bg-green-600 hover:bg-green-700"
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

        <Separator />

        <div className="text-sm text-gray-500">
          <p>Nguồn dữ liệu: {result.source_file}</p>
          <p className="mt-1">
            <strong>Lưu ý:</strong> Thông tin này chỉ mang tính chất tham khảo.
            Vui lòng liên hệ phòng Kế Toán Lương nếu có thắc mắc.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
