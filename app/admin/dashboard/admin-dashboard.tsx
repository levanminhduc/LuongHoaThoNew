"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Loader2,
  LogOut,
  RefreshCw,
  Database,
  FileSpreadsheet,
  Users,
  DollarSign,
  TrendingUp,
  Settings,
} from "lucide-react"
import { EmployeeImportSection } from "@/components/employee-import-section"
// Replace this import
// import { AdvancedSalaryImport } from "@/components/advanced-salary-import"
// With this import
import { DualFileImportSection } from "@/components/dual-file-import-section"
import type { ImportResult } from "@/lib/advanced-excel-parser"

interface PayrollRecord {
  id: number
  employee_id: string
  salary_month: string
  tien_luong_thuc_nhan_cuoi_ky: number
  source_file: string
  created_at: string
  import_batch_id: string
  import_status: string
}

interface DashboardStats {
  totalRecords: number
  totalEmployees: number
  totalSalary: number
  currentMonth: string
  lastImportBatch: string
  signatureRate: number
}

export function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalRecords: 0,
    totalEmployees: 0,
    totalSalary: 0,
    currentMonth: "",
    lastImportBatch: "",
    signatureRate: 0,
  })
  const [downloadingSyncTemplate, setDownloadingSyncTemplate] = useState(false)
  const [message, setMessage] = useState("")
  const router = useRouter()

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem("admin_token")
    if (!token) {
      router.push("/admin/login")
      return
    }

    fetchDashboardData()
  }, [router])

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("admin_token")
      const response = await fetch("/api/admin/dashboard-stats", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setPayrolls(data.payrolls || [])
        setStats(data.stats || {})
      } else if (response.status === 401) {
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

  const handleDownloadSyncTemplate = async () => {
    setDownloadingSyncTemplate(true)
    try {
      const token = localStorage.getItem("admin_token")
      const response = await fetch("/api/admin/sync-template", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `template-luong-dong-bo-${new Date().toISOString().substr(0, 10)}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        setMessage("Đã tải template đồng bộ thành công!")
      } else {
        setMessage("Lỗi khi tải template đồng bộ")
      }
    } catch (error) {
      setMessage("Có lỗi xảy ra khi tải template đồng bộ")
    } finally {
      setDownloadingSyncTemplate(false)
    }
  }

  const handleImportComplete = (result: ImportResult) => {
    // Refresh dashboard data after successful import
    fetchDashboardData()
    setMessage(`Import hoàn tất! Xử lý ${result.successCount}/${result.totalRows} bản ghi thành công`)
  }

  const handleLogout = () => {
    localStorage.removeItem("admin_token")
    router.push("/")
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard Quản Trị</h1>
              <p className="text-sm text-gray-600">MAY HÒA THỌ ĐIỆN BÀN - Hệ thống quản lý lương nâng cao</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleDownloadSyncTemplate}
                disabled={downloadingSyncTemplate}
                className="flex items-center gap-2 bg-transparent"
              >
                {downloadingSyncTemplate ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang tạo...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4" />
                    Template Đồng Bộ
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Đăng Xuất
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Message */}
        {message && (
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <AlertDescription className="text-blue-800">{message}</AlertDescription>
          </Alert>
        )}

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng Bản Ghi</CardTitle>
              <FileSpreadsheet className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRecords}</div>
              <p className="text-xs text-blue-100">Batch: {stats.lastImportBatch}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Số Nhân Viên</CardTitle>
              <Users className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEmployees}</div>
              <p className="text-xs text-green-100">Tháng: {stats.currentMonth}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng Lương</CardTitle>
              <DollarSign className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalSalary)}</div>
              <p className="text-xs text-purple-100">Thực nhận</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tỷ Lệ Ký</CardTitle>
              <TrendingUp className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.signatureRate.toFixed(1)}%</div>
              <p className="text-xs text-orange-100">Đã ký nhận</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="advanced-import" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="advanced-import" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Import Nâng Cao
            </TabsTrigger>
            <TabsTrigger value="employee-import" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Import Nhân Viên
            </TabsTrigger>
            <TabsTrigger value="data-overview" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Tổng Quan Dữ Liệu
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Báo Cáo
            </TabsTrigger>
          </TabsList>

          {/* Advanced Import Tab */}
          <TabsContent value="advanced-import" className="space-y-6">
            <DualFileImportSection />
          </TabsContent>

          {/* Employee Import Tab */}
          <TabsContent value="employee-import" className="space-y-6">
            <EmployeeImportSection />
          </TabsContent>

          {/* Data Overview Tab */}
          <TabsContent value="data-overview" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Dữ Liệu Lương Gần Đây</CardTitle>
                  <CardDescription>Danh sách bản ghi lương được import gần đây</CardDescription>
                </div>
                <Button variant="outline" onClick={fetchDashboardData}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Làm Mới
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mã NV</TableHead>
                        <TableHead>Tháng Lương</TableHead>
                        <TableHead>Lương Thực Nhận</TableHead>
                        <TableHead>Batch ID</TableHead>
                        <TableHead>Trạng Thái</TableHead>
                        <TableHead>Ngày Tạo</TableHead>
                        <TableHead>File Nguồn</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payrolls.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">{record.employee_id}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{record.salary_month}</Badge>
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(record.tien_luong_thuc_nhan_cuoi_ky)}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {record.import_batch_id?.slice(-8) || "N/A"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={record.import_status === "signed" ? "default" : "secondary"}>
                              {record.import_status === "signed" ? "Đã ký" : "Chưa ký"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">{formatDate(record.created_at)}</TableCell>
                          <TableCell className="text-sm text-gray-500 truncate max-w-[200px]">
                            {record.source_file}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {payrolls.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      Chưa có dữ liệu lương nào. Hãy sử dụng tính năng import để bắt đầu.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Báo Cáo Tổng Quan</CardTitle>
                  <CardDescription>Thống kê tổng quan hệ thống</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Tổng số bản ghi lương:</span>
                      <span className="font-semibold">{stats.totalRecords}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Tổng số nhân viên:</span>
                      <span className="font-semibold">{stats.totalEmployees}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Tổng lương thực nhận:</span>
                      <span className="font-semibold">{formatCurrency(stats.totalSalary)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Tỷ lệ ký nhận:</span>
                      <span className="font-semibold">{stats.signatureRate.toFixed(1)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Hướng Dẫn Sử Dụng</CardTitle>
                  <CardDescription>Các tính năng chính của hệ thống</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Settings className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">Import Nâng Cao: Cấu hình ánh xạ cột linh hoạt</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Import Nhân Viên: Quản lý danh sách nhân viên</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Database className="h-4 w-4 text-purple-600" />
                      <span className="text-sm">Template Đồng Bộ: Tạo template từ dữ liệu hiện tại</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="h-4 w-4 text-orange-600" />
                      <span className="text-sm">Báo Cáo: Thống kê và phân tích dữ liệu</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
