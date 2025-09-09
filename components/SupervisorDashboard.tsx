"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { Users, DollarSign, FileCheck, LogOut, Eye, TrendingUp, Calendar, Download, Loader2 } from "lucide-react"
import { getPreviousMonth } from "@/utils/dateUtils"
import { PayrollDetailModal } from "@/app/employee/lookup/payroll-detail-modal"
import { transformPayrollRecordToResult, type PayrollResult } from "@/lib/utils/payroll-transformer"

interface User {
  employee_id: string
  username: string
  role: string
  department: string
  permissions: string[]
}

interface PayrollRecord {
  id: number
  employee_id: string
  salary_month: string

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
  ngay_cong_chu_nhat?: number

  // Lương sản phẩm và đơn giá
  tong_luong_san_pham_cong_doan?: number
  don_gia_tien_luong_tren_gio?: number
  tien_luong_san_pham_trong_gio?: number
  tien_luong_tang_ca?: number
  tien_luong_30p_an_ca?: number
  tien_khen_thuong_chuyen_can?: number
  luong_hoc_viec_pc_luong?: number
  tong_cong_tien_luong_san_pham?: number
  ho_tro_thoi_tiet_nong?: number
  bo_sung_luong?: number
  tien_tang_ca_vuot?: number
  luong_cnkcp_vuot?: number

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
  tien_luong_thuc_nhan_cuoi_ky: number

  // Thông tin ký nhận
  is_signed: boolean
  signed_at: string | null
  signed_by_name?: string

  // Employee relationship
  employees: {
    employee_id?: string
    full_name: string
    department?: string
    chuc_vu: string
  }
}

interface DepartmentStats {
  department: string
  totalEmployees: number
  signedCount: number
  signedPercentage: string
  totalSalary: number
  averageSalary: number
}

interface SupervisorDashboardProps {
  user: User
  onLogout: () => void
}

export default function SupervisorDashboard({ user, onLogout }: SupervisorDashboardProps) {
  const [payrollData, setPayrollData] = useState<PayrollRecord[]>([])
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<string>(getPreviousMonth())
  const [loading, setLoading] = useState(true)
  const [monthlyTrend, setMonthlyTrend] = useState<any[]>([])
  const [exportingExcel, setExportingExcel] = useState(false)
  const [showPayrollModal, setShowPayrollModal] = useState(false)
  const [selectedPayrollData, setSelectedPayrollData] = useState<PayrollResult | null>(null)

  useEffect(() => {
    loadDepartmentData()
    loadMonthlyTrend()
  }, [selectedMonth])

  const loadDepartmentData = async () => {
    try {
      const token = localStorage.getItem("admin_token")
      
      // Load payroll data for department
      const payrollResponse = await fetch(`/api/payroll/my-department?month=${selectedMonth}&limit=100`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })

      if (payrollResponse.ok) {
        const payrollData = await payrollResponse.json()
        setPayrollData(payrollData.data || [])
      }

      // Load department statistics
      const statsResponse = await fetch(`/api/payroll/my-department`, {
        method: 'POST',
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ month: selectedMonth })
      })

      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setDepartmentStats(statsData.statistics)
      }

    } catch (error) {
      console.error("Error loading department data:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadMonthlyTrend = async () => {
    try {
      const token = localStorage.getItem("admin_token")
      const months = []
      
      // Get last 6 months data
      for (let i = 5; i >= 0; i--) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        months.push(date.toISOString().slice(0, 7))
      }

      const trendData = await Promise.all(
        months.map(async (month) => {
          const response = await fetch(`/api/payroll/my-department`, {
            method: 'POST',
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ month })
          })

          if (response.ok) {
            const data = await response.json()
            return {
              month,
              monthLabel: new Date(month + '-01').toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' }),
              totalEmployees: data.statistics.totalEmployees,
              signedCount: data.statistics.signedCount,
              totalSalary: data.statistics.totalSalary / 1000000, // Convert to millions
              signedPercentage: parseFloat(data.statistics.signedPercentage)
            }
          }
          return null
        })
      )

      setMonthlyTrend(trendData.filter(Boolean))
    } catch (error) {
      console.error("Error loading monthly trend:", error)
    }
  }

  const handleViewEmployee = (employeeId: string) => {
    // Find the payroll record for this employee
    const payrollRecord = payrollData.find(p => p.employee_id === employeeId)
    if (payrollRecord) {
      // Transform to PayrollResult format and open modal
      const payrollResult = transformPayrollRecordToResult(payrollRecord)
      setSelectedPayrollData(payrollResult)
      setShowPayrollModal(true)
    }
  }

  const handleExportExcel = async (exportType: 'employees' | 'overview' | 'trends' = 'employees') => {
    try {
      setExportingExcel(true)
      const token = localStorage.getItem("admin_token")

      let url = `/api/admin/payroll-export?month=${selectedMonth}&department=${encodeURIComponent(user.department)}`
      let filename = `Luong_${user.department}_${selectedMonth}`

      if (exportType === 'overview') {
        filename += '_overview'
      } else if (exportType === 'trends') {
        filename += '_trends'
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const blob = await response.blob()
        const downloadUrl = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = downloadUrl
        a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(downloadUrl)
        document.body.removeChild(a)
      } else {
        const errorData = await response.json()
        console.error("Export error:", errorData.error || "Lỗi khi xuất dữ liệu")
      }
    } catch (error) {
      console.error("Error exporting Excel:", error)
    } finally {
      setExportingExcel(false)
    }
  }

  const getStatusColor = (isSigned: boolean) => {
    return isSigned ? "default" : "secondary"
  }

  const getChucVuBadge = (chucVu: string): "default" | "secondary" | "destructive" | "outline" => {
    const colors = {
      'nhan_vien': 'secondary' as const,
      'to_truong': 'default' as const,
      'truong_phong': 'destructive' as const
    }
    return colors[chucVu as keyof typeof colors] || 'secondary'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 space-y-4 sm:space-y-0">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                Dashboard Tổ Trưởng
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 truncate">
                Xin chào, {user.username} | Department: {user.department}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => {
                    const date = new Date()
                    date.setMonth(date.getMonth() - i)
                    const value = date.toISOString().slice(0, 7)
                    const label = date.toLocaleDateString('vi-VN', { year: 'numeric', month: 'long' })
                    return (
                      <SelectItem key={`supervisor-month-${i}-${value}`} value={value}>
                        {label}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={onLogout} className="w-full sm:w-auto">
                <LogOut className="h-4 w-4 mr-2" />
                Đăng xuất
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Stats */}
        {departmentStats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <Card className="hover:shadow-md transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium truncate">Tổng Nhân Viên</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{departmentStats.totalEmployees}</div>
                <p className="text-xs text-muted-foreground truncate">
                  Department {departmentStats.department}
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium truncate">Tổng Lương</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">
                  {(departmentStats.totalSalary / 1000000).toFixed(1)}M
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  VND tháng {selectedMonth}
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium truncate">Đã Ký</CardTitle>
                <FileCheck className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{departmentStats.signedPercentage}%</div>
                <p className="text-xs text-muted-foreground truncate">
                  {departmentStats.signedCount}/{departmentStats.totalEmployees} nhân viên
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium truncate">Lương TB</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">
                  {(departmentStats.averageSalary / 1000).toFixed(0)}K
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  VND/người/tháng
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="overview" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="overview" className="text-xs sm:text-sm px-2 py-2">
              <span className="hidden sm:inline">Tổng Quan</span>
              <span className="sm:hidden">Tổng Quan</span>
            </TabsTrigger>
            <TabsTrigger value="employees" className="text-xs sm:text-sm px-2 py-2">
              <span className="hidden sm:inline">Danh Sách Nhân Viên</span>
              <span className="sm:hidden">Nhân Viên</span>
            </TabsTrigger>
            <TabsTrigger value="trends" className="text-xs sm:text-sm px-2 py-2">
              <span className="hidden sm:inline">Xu Hướng</span>
              <span className="sm:hidden">Xu Hướng</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div>
                <h3 className="text-base sm:text-lg font-semibold">Tổng Quan Department</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Thống kê tổng quan tháng {selectedMonth}</p>
              </div>
              <Button
                onClick={() => handleExportExcel('overview')}
                disabled={exportingExcel}
                variant="outline"
                className="flex items-center gap-2 w-full sm:w-auto h-9 sm:h-8 touch-manipulation"
              >
                {exportingExcel ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="hidden sm:inline">Đang xuất...</span>
                    <span className="sm:hidden">Xuất...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Xuất Tổng Quan</span>
                    <span className="sm:hidden">Xuất</span>
                  </>
                )}
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">Tình Trạng Ký Lương</CardTitle>
                  <CardDescription className="text-sm">Phân bố theo trạng thái ký</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
                    <BarChart data={[
                      {
                        name: 'Đã ký',
                        count: departmentStats?.signedCount || 0,
                        percentage: parseFloat(departmentStats?.signedPercentage || "0")
                      },
                      {
                        name: 'Chưa ký',
                        count: (departmentStats?.totalEmployees || 0) - (departmentStats?.signedCount || 0),
                        percentage: 100 - parseFloat(departmentStats?.signedPercentage || "0")
                      }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        fontSize={12}
                        tick={{ fontSize: 10 }}
                        className="sm:text-sm"
                      />
                      <YAxis
                        fontSize={12}
                        tick={{ fontSize: 10 }}
                        className="sm:text-sm"
                      />
                      <Tooltip
                        contentStyle={{
                          fontSize: '12px',
                          padding: '8px',
                          borderRadius: '6px'
                        }}
                      />
                      <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Thông Tin Department</CardTitle>
                  <CardDescription>Chi tiết về {user.department}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Tổng nhân viên</p>
                      <p className="text-2xl font-bold">{departmentStats?.totalEmployees || 0}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Tỷ lệ ký</p>
                      <p className="text-2xl font-bold">{departmentStats?.signedPercentage || 0}%</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Tổng lương</p>
                      <p className="text-lg font-semibold">
                        {((departmentStats?.totalSalary || 0) / 1000000).toFixed(1)}M VND
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Lương trung bình</p>
                      <p className="text-lg font-semibold">
                        {((departmentStats?.averageSalary || 0) / 1000).toFixed(0)}K VND
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="employees" className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-base sm:text-lg">Danh Sách Nhân Viên - {user.department}</CardTitle>
                  <CardDescription className="text-sm">Tháng {selectedMonth}</CardDescription>
                </div>
                <Button
                  onClick={() => handleExportExcel('employees')}
                  disabled={exportingExcel}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto h-9 sm:h-8 touch-manipulation"
                >
                  {exportingExcel ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="hidden sm:inline">Đang xuất...</span>
                      <span className="sm:hidden">Xuất...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      <span className="hidden sm:inline">Xuất Excel</span>
                      <span className="sm:hidden">Xuất</span>
                    </>
                  )}
                </Button>
              </CardHeader>
              <CardContent>
                {/* Mobile Card Layout */}
                <div className="block sm:hidden space-y-3">
                  {payrollData.map((payroll, index) => (
                    <Card key={payroll.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{payroll.employees?.full_name}</p>
                            <p className="text-xs text-muted-foreground">#{index + 1} • Mã: {payroll.employee_id}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewEmployee(payroll.employee_id)}
                            className="ml-2 h-8 w-8 p-0 touch-manipulation"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Chức vụ:</span>
                            <Badge variant={getChucVuBadge(payroll.employees?.chuc_vu || 'nhan_vien')} className="ml-1 text-xs">
                              {payroll.employees?.chuc_vu === 'nhan_vien' ? 'NV' :
                               payroll.employees?.chuc_vu === 'to_truong' ? 'TT' :
                               payroll.employees?.chuc_vu === 'truong_phong' ? 'TP' :
                               payroll.employees?.chuc_vu}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Trạng thái:</span>
                            <Badge variant={getStatusColor(payroll.is_signed)} className="ml-1 text-xs">
                              {payroll.is_signed ? "Đã ký" : "Chưa ký"}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Ngày công:</span>
                            <p className="font-medium mt-1">{payroll.ngay_cong_trong_gio || 0} ngày</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Thưởng Chuyên Cần:</span>
                            <p className="font-medium mt-1">{(payroll.tien_khen_thuong_chuyen_can || 0).toLocaleString()} VND</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Hệ số LV:</span>
                            <p className="font-medium mt-1">{(payroll.he_so_lam_viec || 0).toFixed(2)}</p>
                          </div>
                        </div>

                        <div className="pt-2 border-t">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-xs text-muted-foreground">Lương thực nhận</p>
                              <p className="text-sm font-semibold">
                                {(payroll.tien_luong_thuc_nhan_cuoi_ky || 0).toLocaleString()} VND
                              </p>
                            </div>

                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Desktop Table Layout */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-center p-2 sm:p-3 w-16">STT</th>
                        <th className="text-left p-2 sm:p-3 min-w-[100px]">Mã NV</th>
                        <th className="text-left p-2 sm:p-3 min-w-[150px]">Họ Tên</th>
                        <th className="text-left p-2 sm:p-3 min-w-[120px]">Chức Vụ</th>
                        <th className="text-center p-2 sm:p-3 min-w-[90px]">Ngày Công</th>
                        <th className="text-right p-2 sm:p-3 min-w-[120px]">Thưởng Chuyên Cần</th>
                        <th className="text-center p-2 sm:p-3 min-w-[80px]">Hệ Số LV</th>
                        <th className="text-right p-2 sm:p-3 min-w-[140px]">Lương Thực Nhận</th>
                        <th className="text-center p-2 sm:p-3 min-w-[100px]">Trạng Thái</th>
                        <th className="text-center p-2 sm:p-3 min-w-[80px]">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payrollData.map((payroll, index) => (
                        <tr key={payroll.id} className="border-b hover:bg-gray-50">
                          <td className="p-2 sm:p-3 text-center font-medium text-gray-500">
                            {index + 1}
                          </td>
                          <td className="p-2 sm:p-3 font-medium font-mono text-xs sm:text-sm">{payroll.employee_id}</td>
                          <td className="p-2 sm:p-3">{payroll.employees?.full_name}</td>
                          <td className="p-2 sm:p-3">
                            <Badge variant={getChucVuBadge(payroll.employees?.chuc_vu || 'nhan_vien')}>
                              {payroll.employees?.chuc_vu === 'nhan_vien' ? 'Nhân viên' :
                               payroll.employees?.chuc_vu === 'to_truong' ? 'Tổ trưởng' :
                               payroll.employees?.chuc_vu === 'truong_phong' ? 'Trưởng phòng' :
                               payroll.employees?.chuc_vu}
                            </Badge>
                          </td>
                          <td className="p-2 sm:p-3 text-center font-medium">
                            {payroll.ngay_cong_trong_gio || 0} ngày
                          </td>
                          <td className="p-2 sm:p-3 text-right font-medium">
                            {(payroll.tien_khen_thuong_chuyen_can || 0).toLocaleString()} VND
                          </td>
                          <td className="p-2 sm:p-3 text-center font-medium">
                            {(payroll.he_so_lam_viec || 0).toFixed(2)}
                          </td>
                          <td className="p-2 sm:p-3 text-right font-semibold">
                            {(payroll.tien_luong_thuc_nhan_cuoi_ky || 0).toLocaleString()} VND
                          </td>
                          <td className="p-2 sm:p-3 text-center">
                            <Badge variant={getStatusColor(payroll.is_signed)}>
                              {payroll.is_signed ? "Đã ký" : "Chưa ký"}
                            </Badge>
                          </td>
                          <td className="p-2 sm:p-3 text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewEmployee(payroll.employee_id)}
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Xu Hướng Department</h3>
                <p className="text-sm text-muted-foreground">Phân tích xu hướng 6 tháng gần nhất</p>
              </div>
              <Button
                onClick={() => handleExportExcel('trends')}
                disabled={exportingExcel}
                variant="outline"
                className="flex items-center gap-2"
              >
                {exportingExcel ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang xuất...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Xuất Xu Hướng
                  </>
                )}
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Xu Hướng Tỷ Lệ Ký</CardTitle>
                  <CardDescription>6 tháng gần nhất</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="monthLabel" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="signedPercentage" 
                        stroke="#8884d8" 
                        strokeWidth={2}
                        name="Tỷ lệ ký (%)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Xu Hướng Tổng Lương</CardTitle>
                  <CardDescription>6 tháng gần nhất (triệu VND)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="monthLabel" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="totalSalary" 
                        stroke="#82ca9d" 
                        strokeWidth={2}
                        name="Tổng lương (M VND)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Payroll Detail Modal */}
      {selectedPayrollData && (
        <PayrollDetailModal
          isOpen={showPayrollModal}
          onClose={() => {
            setShowPayrollModal(false)
            setSelectedPayrollData(null)
          }}
          payrollData={selectedPayrollData}
        />
      )}
    </div>
  )
}
