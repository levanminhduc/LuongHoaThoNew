"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import EmployeeListModal from "@/components/EmployeeListModal"
import OverviewModal from "@/components/OverviewModal"
import { getPreviousMonth } from "@/utils/dateUtils"
import { type JWTPayload } from "@/lib/auth"
import {
  FileSpreadsheet,
  Users,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  Building2,
  PenTool,
  BarChart3,
  LogOut,
  Eye
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

export default function DirectorDashboard() {
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState<string>(getPreviousMonth())
  const [monthStatus, setMonthStatus] = useState<MonthStatus | null>(null)
  const [signatureHistory, setSignatureHistory] = useState<any[]>([])
  const [message, setMessage] = useState("")
  const [showEmployeeModal, setShowEmployeeModal] = useState(false)
  const [showOverviewModal, setShowOverviewModal] = useState(false)
  const [user, setUser] = useState<JWTPayload | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Load user info from localStorage
    const userStr = localStorage.getItem("user_info")
    if (userStr) {
      try {
        const userData = JSON.parse(userStr)
        setUser(userData)
      } catch (error) {
        console.error("Error parsing user info:", error)
      }
    }

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
        fetch(`/api/signature-history?limit=10`, {
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
          signature_type: "giam_doc",
          notes: "Xác nhận lương tháng từ Giám Đốc",
          device_info: navigator.userAgent
        })
      })

      const data = await response.json()
      if (data.success) {
        setMessage("Ký xác nhận thành công!")
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải dashboard...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Dashboard Giám Đốc</h1>
              <p className="text-sm text-gray-600">MAY HÒA THỌ ĐIỆN BÀN - Hệ thống ký xác nhận lương</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => setShowOverviewModal(true)}
                className="hidden sm:flex"
              >
                <Eye className="h-4 w-4 mr-2" />
                Xem Tổng Quan
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOverviewModal(true)}
                className="sm:hidden"
              >
                <Eye className="h-4 w-4" />
              </Button>
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
            <Card
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white cursor-pointer hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
              onClick={() => setShowEmployeeModal(true)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng Nhân Viên</CardTitle>
                <Users className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{monthStatus.employee_completion.total_employees}</div>
                <p className="text-xs text-blue-100">Tháng: {selectedMonth} • Click để xem chi tiết</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Đã Ký Lương</CardTitle>
                <CheckCircle className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{monthStatus.employee_completion.signed_employees}</div>
                <p className="text-xs text-green-100">
                  {monthStatus.employee_completion.completion_percentage.toFixed(1)}% hoàn thành
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ký Xác Nhận</CardTitle>
                <PenTool className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{monthStatus.summary.completed_signatures}/3</div>
                <p className="text-xs text-green-100">Management signatures</p>
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

        <Tabs defaultValue="signature" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="signature" className="flex items-center gap-2">
              <PenTool className="h-4 w-4" />
              Ký Xác Nhận
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Tiến Độ
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Lịch Sử
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signature" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PenTool className="h-5 w-5" />
                  Ký Xác Nhận Lương Tháng {selectedMonth}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {monthStatus?.employee_completion.is_100_percent_complete ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-green-700">100% nhân viên đã ký lương</span>
                    </div>
                    
                    {monthStatus.management_signatures.giam_doc ? (
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-green-800 font-medium">✅ Đã ký xác nhận</p>
                        <p className="text-sm text-green-600">
                          Ký bởi: {monthStatus.management_signatures.giam_doc.signed_by_name}
                        </p>
                        <p className="text-sm text-green-600">
                          Thời gian: {new Date(monthStatus.management_signatures.giam_doc.signed_at).toLocaleString('vi-VN')}
                        </p>
                      </div>
                    ) : (
                      <Button onClick={handleSignature} className="w-full bg-green-600 hover:bg-green-700 text-white">
                        <PenTool className="h-4 w-4 mr-2" />
                        Ký Xác Nhận Giám Đốc
                      </Button>
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
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="progress" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tiến Độ Ký Xác Nhận</CardTitle>
              </CardHeader>
              <CardContent>
                {monthStatus && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Updated to green color scheme to match signature cards */}
                      <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="text-2xl font-bold text-green-600">
                          {monthStatus.management_signatures.giam_doc ? "✅" : "⏳"}
                        </div>
                        <p className="text-sm text-green-800">Giám Đốc</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="text-2xl font-bold text-green-600">
                          {monthStatus.management_signatures.ke_toan ? "✅" : "⏳"}
                        </div>
                        <p className="text-sm text-green-800">Kế Toán</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="text-2xl font-bold text-green-600">
                          {monthStatus.management_signatures.nguoi_lap_bieu ? "✅" : "⏳"}
                        </div>
                        <p className="text-sm text-green-800">Người Lập Biểu</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Lịch Sử Ký Xác Nhận</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {signatureHistory.map((signature) => (
                    <div key={signature.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{signature.signed_by_name}</p>
                        <p className="text-sm text-gray-600">
                          {signature.signature_type} - {signature.salary_month}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {new Date(signature.signed_at).toLocaleDateString('vi-VN')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Employee List Modal */}
      <EmployeeListModal
        isOpen={showEmployeeModal}
        onClose={() => setShowEmployeeModal(false)}
        selectedMonth={selectedMonth}
        userRole="giam_doc"
        totalEmployees={monthStatus?.employee_completion.total_employees}
      />

      {/* Overview Modal */}
      {user && (
        <OverviewModal
          isOpen={showOverviewModal}
          onClose={() => setShowOverviewModal(false)}
          user={user}
          initialMonth={selectedMonth}
        />
      )}
    </div>
  )
}
