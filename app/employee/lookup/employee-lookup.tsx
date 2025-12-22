"use client";

import type React from "react";

import { useState, useRef, useLayoutEffect, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2,
  Search,
  User,
  DollarSign,
  Calendar,
  Eye,
  EyeOff,
  PenTool,
  CheckCircle,
  Clock,
  Timer,
  FileText,
  Lock,
  Trash2,
  X,
} from "lucide-react";

const STORAGE_KEY = "salary_lookup_credentials";

function encodeCredentials(employeeId: string, password: string): string {
  const data = JSON.stringify({ e: employeeId, p: password, t: Date.now() });
  return btoa(encodeURIComponent(data));
}

function decodeCredentials(): {
  employeeId: string;
  password: string;
} | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const decoded = decodeURIComponent(atob(stored));
    const data = JSON.parse(decoded);
    if (data.e && data.p) {
      return { employeeId: data.e, password: data.p };
    }
    return null;
  } catch {
    return null;
  }
}

function saveCredentials(employeeId: string, password: string): void {
  const encoded = encodeCredentials(employeeId, password);
  localStorage.setItem(STORAGE_KEY, encoded);
}

function clearCredentials(): void {
  localStorage.removeItem(STORAGE_KEY);
}
import Link from "next/link";
import { PayrollDetailModal } from "./payroll-detail-modal";
import { PayrollDetailModalT13 } from "./payroll-detail-modal-t13";
import { ResetPasswordModal } from "./reset-password-modal";
import { SalaryHistoryModal } from "./salary-history-modal";
import { ForgotPasswordModal } from "./forgot-password-modal";
import {
  formatSalaryMonth,
  formatCurrency,
  formatNumber,
} from "@/lib/utils/date-formatter";
import { getVietnamTimestamp } from "@/lib/utils/vietnam-timezone";

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

  // T13 fields
  chi_dot_1_13?: number;
  chi_dot_2_13?: number;
  tong_luong_13?: number;
  so_thang_chia_13?: number;
  tong_sp_12_thang?: number;

  // Chi tiết 12 tháng cho Tháng 13
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

  // Thông tin ký nhận
  is_signed?: boolean;
  signed_at?: string;
  signed_at_display?: string; // Formatted display timestamp
  signed_by_name?: string;
}

export function EmployeeLookup() {
  const [employeeId, setEmployeeId] = useState("");
  const [cccd, setCccd] = useState("");
  const [showCccd, setShowCccd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [t13Loading, setT13Loading] = useState(false);
  const [result, setResult] = useState<PayrollResult | null>(null);
  const [error, setError] = useState("");
  const [signingLoading, setSigningLoading] = useState(false);
  const [signSuccess, setSignSuccess] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [, setMustChangePassword] = useState(false);
  const [rememberPassword, setRememberPassword] = useState(false);
  const [hasSavedCredentials, setHasSavedCredentials] = useState(false);
  const salaryInfoRef = useRef<HTMLDivElement>(null);

  // T13 State
  const [t13Result, setT13Result] = useState<PayrollResult | null>(null);
  const [showT13Modal, setShowT13Modal] = useState(false);
  const [showT13DetailModal, setShowT13DetailModal] = useState(false);
  const [t13SigningLoading, setT13SigningLoading] = useState(false);
  const [t13SignSuccess, setT13SignSuccess] = useState(false);
  const [showT13HistoryModal, setShowT13HistoryModal] = useState(false);

  const employeeIdInputRef = useRef<HTMLInputElement>(null);
  const cursorPositionRef = useRef<number | null>(null);

  useEffect(() => {
    const saved = decodeCredentials();
    if (saved) {
      setEmployeeId(saved.employeeId);
      setCccd(saved.password);
      setRememberPassword(true);
      setHasSavedCredentials(true);
    }
  }, []);

  const handleClearSavedCredentials = () => {
    clearCredentials();
    setEmployeeId("");
    setCccd("");
    setRememberPassword(false);
    setHasSavedCredentials(false);
    setResult(null);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/employee/lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employee_id: employeeId.trim(),
          cccd: cccd.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data.payroll);

        if (rememberPassword) {
          saveCredentials(employeeId.trim(), cccd.trim());
          setHasSavedCredentials(true);
        } else {
          clearCredentials();
          setHasSavedCredentials(false);
        }

        setTimeout(() => {
          if (salaryInfoRef.current) {
            salaryInfoRef.current.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }
        }, 100);
      } else {
        setError(data.error || "Không tìm thấy thông tin lương");
      }
    } catch {
      setError("Có lỗi xảy ra khi tra cứu thông tin");
    } finally {
      setLoading(false);
    }
  };

  const handleSignSalary = async () => {
    if (!result || !employeeId || !cccd) return;

    setSigningLoading(true);
    setError("");

    try {
      // Tạo timestamp theo timezone Việt Nam để tránh timezone issues trên Vercel
      const vietnamTime = getVietnamTimestamp();

      const response = await fetch("/api/employee/sign-salary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employee_id: employeeId.trim(),
          cccd: cccd.trim(),
          salary_month: result.salary_month,
          client_timestamp: vietnamTime, // Gửi thời gian Việt Nam
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSignSuccess(true);
        // Cập nhật result với thông tin ký
        setResult({
          ...result,
          is_signed: true,
          signed_at: data.data.signed_at,
          signed_at_display: data.data.signed_at_display, // Use formatted display from API
          signed_by_name: data.data.employee_name || data.data.signed_by, // ✅ Fix: Support both field names
        });
        setTimeout(() => setSignSuccess(false), 5000); // Ẩn thông báo sau 5s
      } else {
        // ✅ FIX: Hiển thị chính xác error message từ API
        console.error("Sign salary API error:", response.status, data);

        // Handle specific error cases
        if (data.error && data.error.includes("đã ký nhận lương")) {
          setError(
            "Bạn đã ký nhận lương tháng này rồi. Vui lòng refresh trang để cập nhật trạng thái.",
          );
        } else if (data.error && data.error.includes("CCCD không đúng")) {
          setError("Mật khẩu / CCCD không đúng. Vui lòng kiểm tra lại.");
        } else if (
          data.error &&
          data.error.includes("không tìm thấy nhân viên")
        ) {
          setError("Không tìm thấy nhân viên với mã nhân viên đã nhập.");
        } else {
          setError(
            data.error ||
              `Không thể ký nhận lương (Mã lỗi: ${response.status})`,
          );
        }
      }
    } catch (error) {
      console.error("Network error:", error);
      setError(
        "Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet và thử lại.",
      );
    } finally {
      setSigningLoading(false);
    }
  };

  const handleT13Submit = async () => {
    if (!employeeId || !cccd) {
      setError("Vui lòng nhập đầy đủ Mã Nhân Viên và Mật khẩu / CCCD");
      return;
    }

    setT13Loading(true);
    setError("");
    setT13Result(null);

    try {
      const response = await fetch("/api/employee/lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employee_id: employeeId.trim(),
          cccd: cccd.trim(),
          is_t13: true,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setT13Result(data.payroll);
        setShowT13Modal(true);

        if (rememberPassword) {
          saveCredentials(employeeId.trim(), cccd.trim());
          setHasSavedCredentials(true);
        } else {
          clearCredentials();
          setHasSavedCredentials(false);
        }
      } else {
        setError(data.error || "Không tìm thấy thông tin lương T13");
      }
    } catch {
      setError("Có lỗi xảy ra khi tra cứu thông tin");
    } finally {
      setT13Loading(false);
    }
  };

  const handleSignT13 = async () => {
    if (!t13Result || !employeeId || !cccd) return;

    setT13SigningLoading(true);
    // Note: We don't clear global error here to avoid messing up main UI,
    // but we could use a local error state for the modal if needed.
    // For now we'll rely on alerts inside the modal or global error if critical.

    try {
      const vietnamTime = getVietnamTimestamp();

      const response = await fetch("/api/employee/sign-salary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employee_id: employeeId.trim(),
          cccd: cccd.trim(),
          salary_month: t13Result.salary_month,
          client_timestamp: vietnamTime,
          is_t13: true,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setT13SignSuccess(true);
        setT13Result({
          ...t13Result,
          is_signed: true,
          signed_at: data.data.signed_at,
          signed_at_display: data.data.signed_at_display,
          signed_by_name: data.data.employee_name || data.data.signed_by,
        });
        setTimeout(() => setT13SignSuccess(false), 5000);
      } else {
        console.error("Sign T13 error:", response.status, data);
        alert(data.error || "Không thể ký nhận lương. Vui lòng thử lại.");
      }
    } catch (error) {
      console.error("Network error:", error);
      alert("Lỗi kết nối mạng. Vui lòng thử lại.");
    } finally {
      setT13SigningLoading(false);
    }
  };

  useLayoutEffect(() => {
    if (cursorPositionRef.current === null || !employeeIdInputRef.current) {
      return;
    }

    const input = employeeIdInputRef.current;
    const position = cursorPositionRef.current;

    input.setSelectionRange(position, position);

    cursorPositionRef.current = null;
  }, [employeeId]);

  // Using utility functions from date-formatter

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Thông Tin Tra Cứu
          </CardTitle>
          <CardDescription>
            {`Lưu ý*: Ở ô Nhập `}
            <strong>{`"Mã Nhân Viên"`}</strong> <br />
            {`- Đối với
            nhân viên `}
            <strong>CHÍNH THỨC</strong>
            {` bạn cần nhập `}
            <strong>DB0 + mã nhân viên</strong>
            {` của mình. `}
            <br />
            {`- Ví dụ: Nếu mã nhân viên của bạn là 1234, bạn cần nhập DB01234 vào
            ô "Mã Nhân Viên". `}
            <br />
            {`- Đối với nhân viên `}
            <strong>THỬ VIỆC</strong>
            {` bạn cần nhập `}
            <strong>DBT0 + mã nhân viên</strong>
            {` của mình. `}
            <br />
            {`- Ví dụ: Nếu mã
            nhân viên của bạn là 1234, bạn cần nhập DBT01234 vào ô "Mã Nhân
            Viên".`}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employee_id">Mã Nhân Viên</Label>
                <Input
                  id="employee_id"
                  type="text"
                  value={employeeId}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const input = e.target;
                    const newValue = input.value.toUpperCase();
                    cursorPositionRef.current = input.selectionStart;
                    setEmployeeId(newValue);
                  }}
                  placeholder="Nhập mã nhân viên"
                  required
                  ref={employeeIdInputRef}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cccd">Mật khẩu / CCCD</Label>
                <div className="relative">
                  <Input
                    id="cccd"
                    type={showCccd ? "text" : "password"}
                    value={cccd}
                    onChange={(e) => setCccd(e.target.value)}
                    placeholder="Nhập mật khẩu hoặc số CCCD"
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCccd(!showCccd)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                    aria-label={showCccd ? "Ẩn mật khẩu" : "Hiển thị mật khẩu"}
                  >
                    {showCccd ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Nếu chưa đổi mật khẩu, nhập số CCCD (12 chữ số)
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberPassword}
                  onCheckedChange={(checked) =>
                    setRememberPassword(checked === true)
                  }
                />
                <label
                  htmlFor="remember"
                  className="text-sm font-medium leading-none cursor-pointer select-none"
                >
                  Ghi nhớ thông tin đăng nhập
                </label>
              </div>
              {/* Tạm ẩn nút xóa - có thể bật lại sau */}
              {false && hasSavedCredentials && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSavedCredentials}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Xóa thông tin đã lưu
                </Button>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  type="submit"
                  disabled={loading || t13Loading}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang tra cứu...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      TRA CỨU LƯƠNG
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  disabled={loading || t13Loading}
                  className="flex-1 bg-amber-600 hover:bg-amber-700"
                  onClick={handleT13Submit}
                >
                  {t13Loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      TRA CỨU LƯƠNG THÁNG 13
                    </>
                  )}
                </Button>
              </div>

              <Button variant="outline" asChild className="w-full">
                <Link href="/">Quay Lại</Link>
              </Button>
            </div>

            <div className="flex justify-center mt-3">
              <button
                type="button"
                onClick={() => setShowForgotPasswordModal(true)}
                className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors"
              >
                Quên mật khẩu?
              </button>
            </div>
          </CardContent>
        </form>
      </Card>

      {/* Results */}
      {result && (
        <Card ref={salaryInfoRef}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <User className="w-5 h-5" />
              Thông Tin Lương
            </CardTitle>
            <CardDescription>
              Kết quả tra cứu cho mã nhân viên: {result.employee_id}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Personal Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Họ và Tên:</span>
                  <span>{result.full_name}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Timer className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Ngày công trong giờ:</span>
                  <span>{result.ngay_cong_trong_gio || 0} ngày</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Chức vụ:</span>
                  <Badge variant="outline">
                    {result.position || "Không xác định"}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Tháng lương:</span>
                  <Badge>{result.salary_month}</Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Password Security Reminder - Not forced */}
            {/* Removed forced password change warning - users can change voluntarily */}

            {/* Salary Details */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Chi Tiết Lương
                </h3>
                <div className="grid grid-cols-1 sm:grid-flow-col sm:auto-cols-max gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPasswordModal(true)}
                    className="w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-2 text-purple-600 hover:text-purple-700 border-purple-200 hover:border-purple-300"
                  >
                    <Lock className="w-4 h-4 flex-shrink-0" />
                    <span>Đổi Mật Khẩu</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowHistoryModal(true)}
                    className="w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-2 text-amber-600 hover:text-amber-700 border-amber-200 hover:border-amber-300"
                  >
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    <span>Lịch Sử Lương</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDetailModal(true)}
                    className="w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300"
                  >
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <span>Xem Chi Tiết Đầy Đủ</span>
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-blue-600">
                        Hệ Số Làm Việc
                      </p>
                      <p className="text-lg md:text-2xl font-bold text-blue-700">
                        {formatNumber(result.he_so_lam_viec || 0)}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-green-50 border-green-200">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-green-600">
                        Hệ Số Phụ Cấp KQ
                      </p>
                      <p className="text-lg md:text-2xl font-bold text-green-700">
                        {formatNumber(result.he_so_phu_cap_ket_qua || 0)}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-purple-600">
                        Tiền Khen Thưởng Chuyên Cần
                      </p>
                      <p className="text-lg md:text-2xl font-bold text-purple-700">
                        {formatCurrency(
                          result.tien_khen_thuong_chuyen_can || 0,
                        )}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-orange-50 border-orange-200">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-orange-600">
                        Lương Học Việc PC
                      </p>
                      <p className="text-lg md:text-2xl font-bold text-orange-700">
                        {formatCurrency(result.luong_hoc_viec_pc_luong || 0)}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-red-50 border-red-200">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-red-600">
                        BHXH BHTN BHYT
                      </p>
                      <p className="text-lg md:text-2xl font-bold text-red-700">
                        {formatCurrency(result.bhxh_bhtn_bhyt_total || 0)}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-emerald-50 border-emerald-200">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-emerald-600">
                        Lương Thực Nhận Cuối Kỳ
                      </p>
                      <p className="text-lg md:text-2xl font-bold text-emerald-700">
                        {formatCurrency(
                          result.tien_luong_thuc_nhan_cuoi_ky || 0,
                        )}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-cyan-50 border-cyan-200">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-cyan-600">
                        Tiền Tăng Ca Vượt
                      </p>
                      <p className="text-lg md:text-2xl font-bold text-cyan-700">
                        {formatCurrency(result.tien_tang_ca_vuot || 0)}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-amber-50 border-amber-200">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-amber-600">
                        Lương CNKCP Vượt
                      </p>
                      <p className="text-lg md:text-2xl font-bold text-amber-700">
                        {formatCurrency(result.luong_cnkcp_vuot || 0)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Separator />

            {/* Signature Section */}
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
                        <p className="font-medium text-green-800">
                          Đã ký nhận lương
                        </p>
                        <p className="text-sm text-green-600">
                          Người ký: {result.signed_by_name}
                        </p>
                        {result.signed_at && (
                          <p className="text-sm text-green-600">
                            Thời gian: {result.signed_at_display}
                            {/* Fallback tạm thời tắt để tránh double conversion: */}
                            {/* {result.signed_at_display || formatSignatureTime(result.signed_at)} */}
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
                          <p className="font-medium text-amber-800">
                            Chưa ký nhận lương
                          </p>
                          <p className="text-sm text-amber-600">
                            Vui lòng ký nhận để xác nhận bạn đã nhận thông tin
                            lương tháng {result.salary_month}
                          </p>
                        </div>
                      </div>

                      <Button
                        onClick={handleSignSalary}
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
                <strong>Lưu ý:</strong> Thông tin này chỉ mang tính chất tham
                khảo. Vui lòng liên hệ phòng Kế Toán Lương nếu có thắc mắc.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* T13 Result Modal */}
      <Dialog open={showT13Modal} onOpenChange={setShowT13Modal}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          <div className="p-6 pb-2 shrink-0">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-700">
                <User className="w-5 h-5" />
                Thông Tin Lương Tháng 13
              </DialogTitle>
              <DialogDescription>
                Kết quả tra cứu cho mã nhân viên: {t13Result?.employee_id}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto p-6 pt-2">
            {t13Result && (
              <div className="space-y-6">
                {/* Personal Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">Họ và Tên:</span>
                      <span>{t13Result.full_name}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Chức vụ:</span>
                      <Badge variant="outline">
                        {t13Result.position || "Không xác định"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Salary Details */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Chi Tiết Lương
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-flow-col sm:auto-cols-max gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowT13HistoryModal(true)}
                        className="w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-2 text-amber-600 hover:text-amber-700 border-amber-200 hover:border-amber-300"
                      >
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                        <span>Lịch Sử T13</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowT13DetailModal(true)}
                        className="w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300"
                      >
                        <FileText className="w-4 h-4 flex-shrink-0" />
                        <span>Xem Chi Tiết Đầy Đủ</span>
                      </Button>
                    </div>
                  </div>

                  {/* Số Tháng Chia & Tổng SP 12 Tháng */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Số Tháng Chia */}
                    <Card className="bg-blue-50 border-blue-200">
                      <CardHeader className="pb-1 pt-3 px-2">
                        <div className="text-center">
                          <p className="text-xs font-medium text-blue-600 uppercase">
                            Số Tháng Chia
                          </p>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 pb-3 text-center px-2">
                        <div className="text-center">
                          <p className="text-lg font-bold text-blue-700">
                            {Math.round(t13Result.so_thang_chia_13 || 0)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Tổng SP 12 Tháng */}
                    <Card className="bg-blue-50 border-blue-200">
                      <CardHeader className="pb-1 pt-3 px-2">
                        <div className="text-center">
                          <p className="text-xs font-medium text-blue-600 uppercase">
                            Tổng SP 12 Tháng
                          </p>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 pb-3 text-center px-2">
                        <div className="text-center">
                          <p className="text-lg font-bold text-blue-700">
                            {formatCurrency(t13Result.tong_sp_12_thang || 0)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Chi Đợt 1 & Chi Đợt 2 */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Chi Đợt 1 */}
                    <Card className="bg-blue-50 border-blue-200">
                      <CardHeader className="pb-1 pt-3 px-2">
                        <div className="text-center">
                          <p className="text-xs font-medium text-blue-600 uppercase">
                            Chi Đợt 1
                          </p>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 pb-3 text-center px-2">
                        <div className="text-center">
                          <p className="text-lg font-bold text-blue-700">
                            {formatCurrency(t13Result.chi_dot_1_13 || 0)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Chi Đợt 2 */}
                    <Card className="bg-blue-50 border-blue-200">
                      <CardHeader className="pb-1 pt-3 px-2">
                        <div className="text-center">
                          <p className="text-xs font-medium text-blue-600 uppercase">
                            Chi Đợt 2
                          </p>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 pb-3 text-center px-2">
                        <div className="text-center">
                          <p className="text-lg font-bold text-blue-700">
                            {formatCurrency(t13Result.chi_dot_2_13 || 0)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Tổng Lương Tháng 13 (Full width) */}
                  <Card className="bg-green-50 border-green-200 shadow-sm">
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                      <p className="text-sm font-bold text-green-600 uppercase mb-1">
                        Tổng Lương Tháng 13
                      </p>
                      <p className="text-3xl font-extrabold text-green-700">
                        {formatCurrency(t13Result.tong_luong_13 || 0)}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Separator />

                {/* Signature Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <PenTool className="w-5 h-5" />
                    Ký Nhận Lương
                  </h3>

                  {t13SignSuccess && (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-700">
                        Đã ký nhận lương T13 thành công!
                      </AlertDescription>
                    </Alert>
                  )}

                  {t13Result.is_signed ? (
                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="w-6 h-6 text-green-600" />
                          <div>
                            <p className="font-medium text-green-800">
                              Đã ký nhận lương
                            </p>
                            <p className="text-sm text-green-600">
                              Người ký: {t13Result.signed_by_name}
                            </p>
                            {t13Result.signed_at && (
                              <p className="text-sm text-green-600">
                                Thời gian: {t13Result.signed_at_display}
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
                              <p className="font-medium text-amber-800">
                                Chưa ký nhận lương
                              </p>
                              <p className="text-sm text-amber-600">
                                Vui lòng ký nhận để xác nhận bạn đã nhận thông
                                tin lương tháng {t13Result.salary_month}
                              </p>
                            </div>
                          </div>

                          <Button
                            onClick={handleSignT13}
                            disabled={t13SigningLoading}
                            className="w-full bg-green-600 hover:bg-green-700"
                          >
                            {t13SigningLoading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Đang ký nhận...
                              </>
                            ) : (
                              <>
                                <PenTool className="mr-2 h-4 w-4" />
                                Ký Nhận Lương{" "}
                                {t13Result.salary_month_display ||
                                  formatSalaryMonth(t13Result.salary_month)}
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <Separator />

                {/* <div className="text-sm text-gray-500 text-center">
                  <p>Nguồn dữ liệu: {t13Result.source_file}</p>
                  <p className="mt-1">
                    <strong>Lưu ý:</strong> Thông tin này chỉ mang tính chất tham
                    khảo.
                  </p>
                </div> */}
              </div>
            )}
          </div>

          <div className="p-6 pt-2 shrink-0">
            <DialogFooter className="sm:justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowT13Modal(false)}
                className="w-full bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:text-red-800 h-12 text-base font-medium"
              >
                <X className="w-5 h-5 mr-2" />
                Đóng Lại
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payroll Detail Modal (Regular) */}
      {result && (
        <PayrollDetailModal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          payrollData={result}
        />
      )}

      {/* Payroll Detail Modal T13 (Separate) */}
      {t13Result && (
        <PayrollDetailModalT13
          isOpen={showT13DetailModal}
          onClose={() => setShowT13DetailModal(false)}
          payrollData={t13Result}
        />
      )}

      {/* Reset Password Modal - Using CCCD */}
      {employeeId && (result || t13Result) && (
        <ResetPasswordModal
          isOpen={showPasswordModal}
          onClose={() => setShowPasswordModal(false)}
          employeeId={employeeId}
          cccd={cccd}
          employeeName={
            showT13Modal && t13Result
              ? t13Result.full_name
              : result?.full_name || ""
          }
          onPasswordReset={() => {
            setMustChangePassword(false);
            setError("");
          }}
        />
      )}

      {/* Salary History Modal - Lương Thường */}
      {employeeId && result && (
        <SalaryHistoryModal
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          employeeId={employeeId}
          cccd={cccd}
          currentMonth={result.salary_month}
          employeeName={result.full_name}
          isT13={false}
        />
      )}

      {/* Salary History Modal - T13 */}
      {employeeId && t13Result && (
        <SalaryHistoryModal
          isOpen={showT13HistoryModal}
          onClose={() => setShowT13HistoryModal(false)}
          employeeId={employeeId}
          cccd={cccd}
          currentMonth={t13Result.salary_month}
          employeeName={t13Result.full_name}
          isT13={true}
        />
      )}

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPasswordModal}
        onClose={() => setShowForgotPasswordModal(false)}
        onSuccess={() => {
          setError("");
        }}
      />
    </div>
  );
}
