"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Calculator, 
  DollarSign, 
  TrendingUp, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  FileText,
  PenTool,
  BarChart3,
  LogOut
} from "lucide-react"

interface MonthStatus {
  month: string
  employee_completion: {
    total_employees: number
    signed_employees: number
    completion_percentage: number
    is_100_percent_complete: boolean
  }
  management_signatures: {
    giam_doc: any
    ke_toan: any
    nguoi_lap_bieu: any
  }
  summary: {
    completed_signatures: number
    remaining_signatures: string[]
    is_fully_signed: boolean
  }
}

export default function AccountantDashboard() {
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7))
  const [monthStatus, setMonthStatus] = useState<MonthStatus | null>(null)
  const [signatureHistory, setSignatureHistory] = useState<any[]>([])
  const [message, setMessage] = useState("")
  const router = useRouter()

  useEffect(() => {
    fetchDashboardData()
  }, [selectedMonth])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("admin_token")
      
      const [statusResponse, historyResponse] = await Promise.all([
        fetch(`/api/signature-status/${selectedMonth}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`/api/signature-history?signature_type=ke_toan&limit=10`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])

      if (statusResponse.ok) {
        const statusData = await statusResponse.json()
        setMonthStatus(statusData)
      }

      if (historyResponse.ok) {
        const historyData = await historyResponse.json()
        setSignatureHistory(historyData.signatures || [])
      }

      if (statusResponse.status === 401 || historyResponse.status === 401) {
        localStorage.removeItem("admin_token")
        router.push("/admin/login")
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      setMessage("Lỗi khi tải dữ liệu dashboard")
    } finally {
      setLoading(false)
    }
  }

  const handleSignature = async () => {
    try {
      const token = localStorage.getItem("admin_token")
      const response = await fetch("/api/management-signature", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          salary_month: selectedMonth,
          signature_type: "ke_toan",
          notes: "Xác nhận tính chính xác lương tháng",
          device_info: navigator.userAgent
        })
      })

      const data = await response.json()
      if (data.success) {
        setMessage("Ký xác nhận kế toán thành công!")
        fetchDashboardData()
      } else {
        setMessage(data.error || "Có lỗi xảy ra khi ký")
      }
    } catch (error) {
      setMessage("Lỗi kết nối khi ký xác nhận")
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("admin_token")
    router.push("/admin/login")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải dashboard kế toán...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard Kế Toán</h1>
              <p className="text-sm text-gray-600">MAY HÒA THỌ ĐIỆN BÀN - Xác nhận tài chính lương</p>
            </div>
            <div className="flex items-center space-x-4">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => {
                    const date = new Date()
                    date.setMonth(date.getMonth() - i)
                    const value = date.toISOString().slice(0, 7)
                    return (
                      <SelectItem key={value} value={value}>
                        {date.toLocaleDateString('vi-VN', { year: 'numeric', month: 'long' })}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Đăng Xuất
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {message && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {monthStatus && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng Nhân Viên</CardTitle>
                <Calculator className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{monthStatus.employee_completion.total_employees}</div>
                <p className="text-xs text-green-100">Cần xác nhận tài chính</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Đã Ký Lương</CardTitle>
                <CheckCircle className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{monthStatus.employee_completion.signed_employees}</div>
                <p className="text-xs text-blue-100">
                  {monthStatus.employee_completion.completion_percentage.toFixed(1)}% hoàn thành
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Xác Nhận KT</CardTitle>
                <PenTool className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {monthStatus.management_signatures.ke_toan ? "✅" : "⏳"}
                </div>
                <p className="text-xs text-green-100">
                  {monthStatus.management_signatures.ke_toan ? "Đã ký" : "Chờ ký"}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Trạng Thái</CardTitle>
                <BarChart3 className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {monthStatus.employee_completion.is_100_percent_complete ? "SẴN SÀNG" : "CHỜ"}
                </div>
                <p className="text-xs text-orange-100">
                  {monthStatus.summary.is_fully_signed ? "Hoàn thành" : "Đang xử lý"}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="financial" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="financial" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Xác Nhận Tài Chính
            </TabsTrigger>
            <TabsTrigger value="verification" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Kiểm Tra Tính Toán
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Lịch Sử KT
            </TabsTrigger>
          </TabsList>

          <TabsContent value="financial" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Xác Nhận Tài Chính Lương Tháng {selectedMonth}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {monthStatus?.employee_completion.is_100_percent_complete ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-green-700">100% nhân viên đã ký lương - Kế Toán có thể ký</span>
                    </div>
                    
                    {monthStatus.management_signatures.ke_toan ? (
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-green-800 font-medium">✅ Đã xác nhận tài chính</p>
                        <p className="text-sm text-green-600">
                          Ký bởi: {monthStatus.management_signatures.ke_toan.signed_by_name}
                        </p>
                        <p className="text-sm text-green-600">
                          Thời gian: {new Date(monthStatus.management_signatures.ke_toan.signed_at).toLocaleString('vi-VN')}
                        </p>
                        {monthStatus.management_signatures.ke_toan.notes && (
                          <p className="text-sm text-green-600 mt-2">
                            Ghi chú: {monthStatus.management_signatures.ke_toan.notes}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <h4 className="font-medium text-blue-800 mb-2">Checklist Xác Nhận Tài Chính:</h4>
                          <ul className="text-sm text-blue-700 space-y-1">
                            <li>✅ Kiểm tra tổng số tiền lương</li>
                            <li>✅ Xác minh các khoản khấu trừ</li>
                            <li>✅ Đối chiếu với ngân sách tháng</li>
                            <li>✅ Kiểm tra tính chính xác tính toán</li>
                          </ul>
                        </div>
                        <Button onClick={handleSignature} className="w-full bg-green-600 hover:bg-green-700 text-white">
                          <PenTool className="h-4 w-4 mr-2" />
                          Ký Xác Nhận Kế Toán
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-5 w-5 text-yellow-500" />
                      <span className="text-yellow-800 font-medium">Chờ nhân viên ký đủ</span>
                    </div>
                    <p className="text-sm text-yellow-700">
                      Hiện tại: {monthStatus?.employee_completion.signed_employees}/{monthStatus?.employee_completion.total_employees} nhân viên đã ký 
                      ({monthStatus?.employee_completion.completion_percentage.toFixed(1)}%)
                    </p>
                    <p className="text-sm text-yellow-700 mt-2">
                      Cần đợi 100% nhân viên ký lương trước khi có thể xác nhận tài chính.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="verification" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Kiểm Tra Tính Toán Lương</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium mb-2">Thống Kê Nhân Viên</h4>
                      <p className="text-sm text-gray-600">
                        Tổng số: {monthStatus?.employee_completion.total_employees} nhân viên
                      </p>
                      <p className="text-sm text-gray-600">
                        Đã ký: {monthStatus?.employee_completion.signed_employees} nhân viên
                      </p>
                      <p className="text-sm text-gray-600">
                        Tỷ lệ: {monthStatus?.employee_completion.completion_percentage.toFixed(1)}%
                      </p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <h4 className="font-medium mb-2 text-green-800">Trạng Thái Xác Nhận</h4>
                      <p className="text-sm text-green-700">
                        Giám đốc: {monthStatus?.management_signatures.giam_doc ? "✅ Đã ký" : "⏳ Chờ ký"}
                      </p>
                      <p className="text-sm text-green-700">
                        Kế toán: {monthStatus?.management_signatures.ke_toan ? "✅ Đã ký" : "⏳ Chờ ký"}
                      </p>
                      <p className="text-sm text-green-700">
                        Người lập biểu: {monthStatus?.management_signatures.nguoi_lap_bieu ? "✅ Đã ký" : "⏳ Chờ ký"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Lịch Sử Xác Nhận Kế Toán</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {signatureHistory.length > 0 ? (
                    signatureHistory.map((signature) => (
                      <div key={signature.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{signature.signed_by_name}</p>
                          <p className="text-sm text-gray-600">
                            Tháng {signature.salary_month}
                          </p>
                          {signature.notes && (
                            <p className="text-sm text-gray-500 mt-1">{signature.notes}</p>
                          )}
                        </div>
                        <Badge variant="secondary">
                          {new Date(signature.signed_at).toLocaleDateString('vi-VN')}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Chưa có lịch sử xác nhận kế toán</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
