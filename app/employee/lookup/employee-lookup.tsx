"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Loader2, Search, User, CreditCard, DollarSign, Calendar, Eye, EyeOff, PenTool, CheckCircle, Clock, Timer, FileText } from "lucide-react"
import Link from "next/link"
import { PayrollDetailModal } from "./payroll-detail-modal"
import { formatSalaryMonth, formatSignatureTime, formatCurrency, formatNumber } from "@/lib/utils/date-formatter"
import { getVietnamTimestamp } from "@/lib/utils/vietnam-timezone"


interface PayrollResult {
  employee_id: string
  full_name: string
  cccd: string
  position: string
  salary_month: string
  salary_month_display?: string // Optional formatted display
  total_income: number
  deductions: number
  net_salary: number
  source_file: string

  // Hệ số và thông số cơ bản
  he_so_lam_viec?: number
  he_so_phu_cap_ket_qua?: number
  he_so_luong_co_ban?: number
  luong_toi_thieu_cty?: number

  // Thời gian làm việc
  ngay_cong_trong_gio?: number
  gio_cong_tang_ca?: number
  gio_an_ca?: number
  tong_gio_lam_viec?: number
  tong_he_so_quy_doi?: number

  // Lương sản phẩm và đơn giá
  tong_luong_san_pham_cong_doan?: number
  don_gia_tien_luong_tren_gio?: number
  tien_luong_san_pham_trong_gio?: number
  tien_luong_tang_ca?: number
  tien_luong_30p_an_ca?: number

  // Thưởng và phụ cấp
  tien_khen_thuong_chuyen_can?: number
  luong_hoc_viec_pc_luong?: number
  tong_cong_tien_luong_san_pham?: number
  ho_tro_thoi_tiet_nong?: number
  bo_sung_luong?: number

  // Bảo hiểm và phúc lợi
  bhxh_21_5_percent?: number
  pc_cdcs_pccc_atvsv?: number
  luong_phu_nu_hanh_kinh?: number
  tien_con_bu_thai_7_thang?: number
  ho_tro_gui_con_nha_tre?: number

  // Phép và lễ
  ngay_cong_phep_le?: number
  tien_phep_le?: number

  // Tổng lương và phụ cấp khác
  tong_cong_tien_luong?: number
  tien_boc_vac?: number
  ho_tro_xang_xe?: number

  // Thuế và khấu trừ
  thue_tncn_nam_2024?: number
  tam_ung?: number
  thue_tncn?: number
  bhxh_bhtn_bhyt_total?: number
  truy_thu_the_bhyt?: number

  // Lương thực nhận
  tien_luong_thuc_nhan_cuoi_ky?: number

  // Thông tin ký nhận
  is_signed?: boolean
  signed_at?: string
  signed_at_display?: string // Formatted display timestamp
  signed_by_name?: string
}

export function EmployeeLookup() {
  const [employeeId, setEmployeeId] = useState("")
  const [cccd, setCccd] = useState("")
  const [showCccd, setShowCccd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PayrollResult | null>(null)
  const [error, setError] = useState("")
  const [signingLoading, setSigningLoading] = useState(false)
  const [signSuccess, setSignSuccess] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setResult(null)

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
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data.payroll)
      } else {
        setError(data.error || "Không tìm thấy thông tin lương")
      }
    } catch (error) {
      setError("Có lỗi xảy ra khi tra cứu thông tin")
    } finally {
      setLoading(false)
    }
  }

  const handleSignSalary = async () => {
    if (!result || !employeeId || !cccd) return

    setSigningLoading(true)
    setError("")

    try {
      // Tạo timestamp theo timezone Việt Nam để tránh timezone issues trên Vercel
      const vietnamTime = getVietnamTimestamp()

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
      })

      const data = await response.json()

      if (response.ok) {
        setSignSuccess(true)
        // Cập nhật result với thông tin ký
        setResult({
          ...result,
          is_signed: true,
          signed_at: data.data.signed_at,
          signed_at_display: data.data.signed_at_display, // Use formatted display from API
          signed_by_name: data.data.employee_name || data.data.signed_by // ✅ Fix: Support both field names
        })
        setTimeout(() => setSignSuccess(false), 5000) // Ẩn thông báo sau 5s
      } else {
        // ✅ FIX: Hiển thị chính xác error message từ API
        console.error("Sign salary API error:", response.status, data)

        // Handle specific error cases
        if (data.error && data.error.includes("đã ký nhận lương")) {
          setError("Bạn đã ký nhận lương tháng này rồi. Vui lòng refresh trang để cập nhật trạng thái.")
        } else if (data.error && data.error.includes("CCCD không đúng")) {
          setError("Số CCCD không đúng. Vui lòng kiểm tra lại số CCCD.")
        } else if (data.error && data.error.includes("không tìm thấy nhân viên")) {
          setError("Không tìm thấy nhân viên với mã nhân viên đã nhập.")
        } else {
          setError(data.error || `Không thể ký nhận lương (Mã lỗi: ${response.status})`)
        }
      }
    } catch (error) {
      console.error("Network error:", error)
      setError("Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet và thử lại.")
    } finally {
      setSigningLoading(false)
    }
  }

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
          <CardDescription>Lưu ý*: Ở ô Nhập <strong>"Mã Nhân Viên"</strong> <br /> 
            - Đối với nhân viên <strong>CHÍNH THỨC</strong> bạn cần nhập <strong>DB0 + mã nhân viên</strong> của mình. <br />
            - Ví dụ: Nếu mã nhân viên của bạn là 1234, bạn cần nhập DB01234 vào ô "Mã Nhân Viên". <br />
            - Đối với nhân viên <strong>THỬ VIỆC</strong> bạn cần nhập <strong>DBT0 + mã nhân viên</strong> của mình. <br />
            - Ví dụ: Nếu mã nhân viên của bạn là 1234, bạn cần nhập DBT01234 vào ô "Mã Nhân Viên".
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
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="Nhập mã nhân viên"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cccd">Số CCCD</Label>
                <div className="relative">
                  <Input
                    id="cccd"
                    type={showCccd ? "text" : "password"}
                    value={cccd}
                    onChange={(e) => setCccd(e.target.value)}
                    placeholder="Nhập số CCCD"
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCccd(!showCccd)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                    aria-label={showCccd ? "Ẩn số CCCD" : "Hiển thị số CCCD"}
                  >
                    {showCccd ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang tra cứu...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Tra Cứu
                  </>
                )}
              </Button>

              <Button variant="outline" asChild>
                <Link href="/">Quay Lại</Link>
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <User className="w-5 h-5" />
              Thông Tin Lương
            </CardTitle>
            <CardDescription>Kết quả tra cứu cho mã nhân viên: {result.employee_id}</CardDescription>
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
                  <Badge variant="outline">{result.position || "Không xác định"}</Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Tháng lương:</span>
                  <Badge>{result.salary_month}</Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Salary Details */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Chi Tiết Lương
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDetailModal(true)}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300"
                >
                  <FileText className="w-4 h-4" />
                  Xem Chi Tiết Đầy Đủ
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-blue-600">Hệ Số Làm Việc</p>
                      <p className="text-lg md:text-2xl font-bold text-blue-700">{formatNumber(result.he_so_lam_viec || 0)}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-green-50 border-green-200">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-green-600">Hệ Số Phụ Cấp KQ</p>
                      <p className="text-lg md:text-2xl font-bold text-green-700">{formatNumber(result.he_so_phu_cap_ket_qua || 0)}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-purple-600">Tiền Khen Thưởng Chuyên Cần</p>
                      <p className="text-lg md:text-2xl font-bold text-purple-700">{formatCurrency(result.tien_khen_thuong_chuyen_can || 0)}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-orange-50 border-orange-200">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-orange-600">Lương Học Việc PC</p>
                      <p className="text-lg md:text-2xl font-bold text-orange-700">{formatCurrency(result.luong_hoc_viec_pc_luong || 0)}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-red-50 border-red-200">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-red-600">BHXH BHTN BHYT</p>
                      <p className="text-lg md:text-2xl font-bold text-red-700">{formatCurrency(result.bhxh_bhtn_bhyt_total || 0)}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-emerald-50 border-emerald-200">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-emerald-600">Lương Thực Nhận Cuối Kỳ</p>
                      <p className="text-lg md:text-2xl font-bold text-emerald-700">{formatCurrency(result.tien_luong_thuc_nhan_cuoi_ky || 0)}</p>
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
                        <p className="font-medium text-green-800">Đã ký nhận lương</p>
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
                          <p className="font-medium text-amber-800">Chưa ký nhận lương</p>
                          <p className="text-sm text-amber-600">
                            Vui lòng ký nhận để xác nhận bạn đã nhận thông tin lương tháng {result.salary_month}
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
                            Ký Nhận Lương {result.salary_month_display || formatSalaryMonth(result.salary_month)}
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
                <strong>Lưu ý:</strong> Thông tin này chỉ mang tính chất tham khảo. Vui lòng liên hệ phòng Kế Toán Lương nếu
                có thắc mắc.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payroll Detail Modal */}
      {result && (
        <PayrollDetailModal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          payrollData={result}
        />
      )}
    </div>
  )
}
