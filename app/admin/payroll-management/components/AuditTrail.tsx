"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, History, User, Clock, MapPin, FileEdit, AlertCircle } from "lucide-react"
import { formatSignatureTime, formatCurrency } from "@/lib/utils/date-formatter"
import type { AuditLogEntry } from "../types"

interface AuditTrailProps {
  payrollId: number | null
}

export function AuditTrail({ payrollId }: AuditTrailProps) {
  const [auditTrail, setAuditTrail] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (payrollId) {
      loadAuditTrail()
    } else {
      setAuditTrail([])
    }
  }, [payrollId])

  const loadAuditTrail = async () => {
    if (!payrollId) return

    setLoading(true)
    setError("")

    try {
      const token = localStorage.getItem("admin_token")
      if (!token) {
        setError("Không có quyền truy cập")
        return
      }

      const response = await fetch(`/api/admin/payroll/audit/${payrollId}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (response.ok) {
        setAuditTrail(data.auditTrail || [])
      } else {
        setError(data.error || "Lỗi khi tải lịch sử thay đổi")
      }
    } catch (error) {
      setError("Có lỗi xảy ra khi tải lịch sử thay đổi")
    } finally {
      setLoading(false)
    }
  }

  const getFieldDisplayName = (fieldName: string): string => {
    const fieldMap: Record<string, string> = {
      // Hệ số và thông số cơ bản
      "he_so_lam_viec": "Hệ Số Làm Việc",
      "he_so_phu_cap_ket_qua": "Hệ Số Phụ Cấp Kết Quả",
      "he_so_luong_co_ban": "Hệ Số Lương Cơ Bản",
      "luong_toi_thieu_cty": "Lương Tối Thiểu Công Ty",
      
      // Thời gian làm việc
      "ngay_cong_trong_gio": "Ngày Công Trong Giờ",
      "gio_cong_tang_ca": "Giờ Công Tăng Ca",
      "gio_an_ca": "Giờ Ăn Ca",
      "tong_gio_lam_viec": "Tổng Giờ Làm Việc",
      "tong_he_so_quy_doi": "Tổng Hệ Số Quy Đổi",
      
      // Lương sản phẩm
      "tong_luong_san_pham_cong_doan": "Tổng Lương Sản Phẩm Công Đoạn",
      "don_gia_tien_luong_tren_gio": "Đơn Giá Tiền Lương Trên Giờ",
      "tien_luong_san_pham_trong_gio": "Tiền Lương Sản Phẩm Trong Giờ",
      "tien_luong_tang_ca": "Tiền Lương Tăng Ca",
      "tien_luong_30p_an_ca": "Tiền Lương 30p Ăn Ca",
      "tien_tang_ca_vuot": "Tiền Tăng Ca Vượt",
      "tien_luong_chu_nhat": "Tiền Lương Chủ Nhật",
      
      // Khen thưởng và phụ cấp
      "tien_khen_thuong_chuyen_can": "Tiền Khen Thưởng Chuyên Cần",
      "luong_hoc_viec_pc_luong": "Lương Học Việc PC Lương",
      "tong_cong_tien_luong_san_pham": "Tổng Cộng Tiền Lương Sản Phẩm",
      "ho_tro_thoi_tiet_nong": "Hỗ Trợ Thời Tiết Nóng",
      "bo_sung_luong": "Bổ Sung Lương",
      
      // Bảo hiểm và phụ cấp khác
      "bhxh_21_5_percent": "BHXH 21.5%",
      "pc_cdcs_pccc_atvsv": "PC CDCS PCCC ATVSV",
      "luong_phu_nu_hanh_kinh": "Lương Phụ Nữ Hành Kinh",
      "tien_con_bu_thai_7_thang": "Tiền Con Bú Thai 7 Tháng",
      "ho_tro_gui_con_nha_tre": "Hỗ Trợ Gửi Con Nhà Trẻ",
      
      // Phép và lễ
      "ngay_cong_phep_le": "Ngày Công Phép Lễ",
      "tien_phep_le": "Tiền Phép Lễ",
      
      // Tổng lương và phụ cấp khác
      "tong_cong_tien_luong": "Tổng Cộng Tiền Lương",
      "tien_boc_vac": "Tiền Bốc Vác",
      "ho_tro_xang_xe": "Hỗ Trợ Xăng Xe",
      
      // Thuế và khấu trừ
      "thue_tncn_nam_2024": "Thuế TNCN Năm 2024",
      "tam_ung": "Tạm Ứng",
      "thue_tncn": "Thuế TNCN",
      "bhxh_bhtn_bhyt_total": "BHXH BHTN BHYT Total",
      "truy_thu_the_bhyt": "Truy Thu Thẻ BHYT",
      
      // Lương thực nhận
      "tien_luong_thuc_nhan_cuoi_ky": "Tiền Lương Thực Nhận Cuối Kỳ"
    }

    return fieldMap[fieldName] || fieldName
  }

  const formatValue = (value: string, fieldName: string): string => {
    if (!value || value === "0" || value === "") return "0"
    
    // Check if this is a currency field
    const currencyFields = [
      "luong_toi_thieu_cty", "tong_luong_san_pham_cong_doan", "don_gia_tien_luong_tren_gio",
      "tien_luong_san_pham_trong_gio", "tien_luong_tang_ca", "tien_luong_30p_an_ca",
      "tien_tang_ca_vuot", "tien_luong_chu_nhat", "tien_khen_thuong_chuyen_can",
      "luong_hoc_viec_pc_luong", "tong_cong_tien_luong_san_pham", "ho_tro_thoi_tiet_nong",
      "bo_sung_luong", "bhxh_21_5_percent", "pc_cdcs_pccc_atvsv", "luong_phu_nu_hanh_kinh",
      "tien_con_bu_thai_7_thang", "ho_tro_gui_con_nha_tre", "tien_phep_le",
      "tong_cong_tien_luong", "tien_boc_vac", "ho_tro_xang_xe", "thue_tncn_nam_2024",
      "tam_ung", "thue_tncn", "bhxh_bhtn_bhyt_total", "truy_thu_the_bhyt",
      "tien_luong_thuc_nhan_cuoi_ky"
    ]

    if (currencyFields.includes(fieldName)) {
      const numValue = parseFloat(value)
      return isNaN(numValue) ? value : formatCurrency(numValue)
    }

    return value
  }

  if (!payrollId) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-500">
          <History className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Chọn nhân viên để xem lịch sử thay đổi</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5" />
          Lịch Sử Thay Đổi
        </CardTitle>
        <CardDescription>
          Theo dõi tất cả các thay đổi được thực hiện trên dữ liệu lương
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Đang tải lịch sử thay đổi...</span>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!loading && !error && auditTrail.length === 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Chưa có thay đổi nào được ghi nhận cho bản ghi lương này.
            </AlertDescription>
          </Alert>
        )}

        {!loading && !error && auditTrail.length > 0 && (
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {auditTrail.map((entry, index) => (
                <div key={entry.id} className="relative">
                  {index < auditTrail.length - 1 && (
                    <div className="absolute left-4 top-12 bottom-0 w-px bg-gray-200" />
                  )}
                  
                  <Card className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <FileEdit className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-500" />
                              <span className="font-medium">{entry.changed_by}</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatSignatureTime(entry.changed_at)}
                              </div>
                              {entry.change_ip && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {entry.change_ip}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {entry.changes.length} thay đổi
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      <div className="bg-gray-50 rounded-lg p-3 mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">Lý do thay đổi:</p>
                        <p className="text-sm text-gray-600">{entry.change_reason}</p>
                      </div>
                      
                      <div className="space-y-2">
                        {entry.changes.map((change, changeIndex) => (
                          <div key={changeIndex} className="border rounded-lg p-3">
                            <div className="font-medium text-sm text-gray-700 mb-2">
                              {getFieldDisplayName(change.field_name)}
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Giá trị cũ:</span>
                                <div className="font-mono bg-red-50 text-red-700 px-2 py-1 rounded mt-1">
                                  {formatValue(change.old_value, change.field_name)}
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-500">Giá trị mới:</span>
                                <div className="font-mono bg-green-50 text-green-700 px-2 py-1 rounded mt-1">
                                  {formatValue(change.new_value, change.field_name)}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
