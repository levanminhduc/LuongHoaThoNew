"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { Users, DollarSign, FileCheck, LogOut, Eye, TrendingUp, Calendar, Download, Loader2 } from "lucide-react"

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
  tien_luong_thuc_nhan_cuoi_ky: number
  is_signed: boolean
  signed_at: string | null
  employees: {
    full_name: string
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
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7))
  const [loading, setLoading] = useState(true)
  const [monthlyTrend, setMonthlyTrend] = useState<any[]>([])
  const [exportingExcel, setExportingExcel] = useState(false)

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
    // Navigate to employee detail view
    window.open(`/supervisor/employee/${employeeId}`, '_blank')
  }

  const handleExportExcel = async () => {
    try {
      setExportingExcel(true)
      const token = localStorage.getItem("admin_token")
      const response = await fetch(`/api/admin/payroll-export?month=${selectedMonth}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `Luong_${user.department}_${selectedMonth}_${new Date().toISOString().slice(0, 10)}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        console.error("Error exporting Excel")
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

  const getChucVuBadge = (chucVu: string) => {
    const colors = {
      'nhan_vien': 'secondary',
      'to_truong': 'default',
      'truong_phong': 'destructive'
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
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard Tổ Trưởng</h1>
              <p className="text-sm text-gray-600">
                Xin chào, {user.username} | Department: {user.department}
              </p>
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
                    const label = date.toLocaleDateString('vi-VN', { year: 'numeric', month: 'long' })
                    return (
                      <SelectItem key={`supervisor-month-${i}-${value}`} value={value}>
                        {label}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={onLogout}>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng Nhân Viên</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{departmentStats.totalEmployees}</div>
                <p className="text-xs text-muted-foreground">
                  Department {departmentStats.department}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng Lương</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(departmentStats.totalSalary / 1000000).toFixed(1)}M
                </div>
                <p className="text-xs text-muted-foreground">
                  VND tháng {selectedMonth}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Đã Ký</CardTitle>
                <FileCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{departmentStats.signedPercentage}%</div>
                <p className="text-xs text-muted-foreground">
                  {departmentStats.signedCount}/{departmentStats.totalEmployees} nhân viên
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Lương TB</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(departmentStats.averageSalary / 1000).toFixed(0)}K
                </div>
                <p className="text-xs text-muted-foreground">
                  VND/người/tháng
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Tổng Quan</TabsTrigger>
            <TabsTrigger value="employees">Danh Sách Nhân Viên</TabsTrigger>
            <TabsTrigger value="trends">Xu Hướng</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Tình Trạng Ký Lương</CardTitle>
                  <CardDescription>Phân bố theo trạng thái ký</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
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
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
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

          <TabsContent value="employees" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Danh Sách Nhân Viên - {user.department}</CardTitle>
                  <CardDescription>Tháng {selectedMonth}</CardDescription>
                </div>
                <Button
                  onClick={handleExportExcel}
                  disabled={exportingExcel}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                >
                  {exportingExcel ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang xuất...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Xuất Excel
                    </>
                  )}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-center p-3 w-16">STT</th>
                        <th className="text-left p-3">Mã NV</th>
                        <th className="text-left p-3">Họ Tên</th>
                        <th className="text-left p-3">Chức Vụ</th>
                        <th className="text-right p-3">Lương Thực Nhận</th>
                        <th className="text-center p-3">Trạng Thái</th>
                        <th className="text-center p-3">Ngày Ký</th>
                        <th className="text-center p-3">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payrollData.map((payroll, index) => (
                        <tr key={payroll.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 text-center font-medium text-gray-500">
                            {index + 1}
                          </td>
                          <td className="p-3 font-medium">{payroll.employee_id}</td>
                          <td className="p-3">{payroll.employees?.full_name}</td>
                          <td className="p-3">
                            <Badge variant={getChucVuBadge(payroll.employees?.chuc_vu || 'nhan_vien')}>
                              {payroll.employees?.chuc_vu === 'nhan_vien' ? 'Nhân viên' :
                               payroll.employees?.chuc_vu === 'to_truong' ? 'Tổ trưởng' :
                               payroll.employees?.chuc_vu === 'truong_phong' ? 'Trưởng phòng' : 
                               payroll.employees?.chuc_vu}
                            </Badge>
                          </td>
                          <td className="p-3 text-right font-semibold">
                            {(payroll.tien_luong_thuc_nhan_cuoi_ky || 0).toLocaleString()} VND
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant={getStatusColor(payroll.is_signed)}>
                              {payroll.is_signed ? "Đã ký" : "Chưa ký"}
                            </Badge>
                          </td>
                          <td className="p-3 text-center text-xs text-muted-foreground">
                            {payroll.signed_at 
                              ? new Date(payroll.signed_at).toLocaleDateString('vi-VN')
                              : "-"
                            }
                          </td>
                          <td className="p-3 text-center">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleViewEmployee(payroll.employee_id)}
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
    </div>
  )
}
