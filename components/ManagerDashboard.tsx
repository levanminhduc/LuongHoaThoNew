"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Building2, Users, DollarSign, FileCheck, LogOut, Eye, Download } from "lucide-react"

interface User {
  employee_id: string
  username: string
  role: string
  department: string
  allowed_departments?: string[]
  permissions: string[]
}

interface DepartmentStats {
  name: string
  employeeCount: number
  payrollCount: number
  signedCount: number
  signedPercentage: string
  totalSalary: number
  averageSalary: number
}

interface ManagerDashboardProps {
  user: User
  onLogout: () => void
}

export default function ManagerDashboard({ user, onLogout }: ManagerDashboardProps) {
  const [departments, setDepartments] = useState<DepartmentStats[]>([])
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all")
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7))
  const [loading, setLoading] = useState(true)
  const [payrollData, setPayrollData] = useState<any[]>([])

  useEffect(() => {
    loadDepartmentStats()
  }, [selectedMonth])

  useEffect(() => {
    if (selectedDepartment !== "all") {
      loadPayrollData()
    }
  }, [selectedDepartment, selectedMonth])

  const loadDepartmentStats = async () => {
    try {
      const token = localStorage.getItem("admin_token")
      const response = await fetch(`/api/admin/departments?include_stats=true&month=${selectedMonth}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setDepartments(data.departments || [])
      }
    } catch (error) {
      console.error("Error loading department stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadPayrollData = async () => {
    try {
      const token = localStorage.getItem("admin_token")
      const url = selectedDepartment === "all" 
        ? `/api/payroll/my-departments?month=${selectedMonth}&limit=50`
        : `/api/payroll/my-departments?month=${selectedMonth}&department=${selectedDepartment}&limit=50`
      
      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setPayrollData(data.data || [])
      }
    } catch (error) {
      console.error("Error loading payroll data:", error)
    }
  }

  const handleViewPayroll = (department: string) => {
    setSelectedDepartment(department)
  }

  const handleExportData = async () => {
    try {
      const token = localStorage.getItem("admin_token")
      const response = await fetch(`/api/admin/payroll-export?month=${selectedMonth}&department=${selectedDepartment}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `payroll-${selectedDepartment}-${selectedMonth}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error("Error exporting data:", error)
    }
  }

  const totalStats = departments.reduce((acc, dept) => ({
    totalEmployees: acc.totalEmployees + dept.employeeCount,
    totalPayroll: acc.totalPayroll + dept.payrollCount,
    totalSigned: acc.totalSigned + dept.signedCount,
    totalSalary: acc.totalSalary + dept.totalSalary
  }), { totalEmployees: 0, totalPayroll: 0, totalSigned: 0, totalSalary: 0 })

  const chartData = departments.map(dept => ({
    name: dept.name,
    employees: dept.employeeCount,
    signed: dept.signedCount,
    unsigned: dept.payrollCount - dept.signedCount,
    totalSalary: dept.totalSalary / 1000000 // Convert to millions
  }))

  const pieData = departments.map(dept => ({
    name: dept.name,
    value: dept.totalSalary,
    percentage: totalStats.totalSalary > 0 ? ((dept.totalSalary / totalStats.totalSalary) * 100).toFixed(1) : "0"
  }))

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

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
              <h1 className="text-2xl font-bold text-gray-900">Dashboard Trưởng Phòng</h1>
              <p className="text-sm text-gray-600">
                Xin chào, {user.username} | Quản lý {user.allowed_departments?.length || 0} departments
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
                      <SelectItem key={`month-${i}-${value}`} value={value}>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng Departments</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{departments.length}</div>
              <p className="text-xs text-muted-foreground">
                Được phân quyền quản lý
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng Nhân Viên</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStats.totalEmployees}</div>
              <p className="text-xs text-muted-foreground">
                Trong tất cả departments
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
                {(totalStats.totalSalary / 1000000).toFixed(1)}M
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
              <div className="text-2xl font-bold">
                {totalStats.totalPayroll > 0 ? ((totalStats.totalSigned / totalStats.totalPayroll) * 100).toFixed(1) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                {totalStats.totalSigned}/{totalStats.totalPayroll} bảng lương
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Tổng Quan</TabsTrigger>
            <TabsTrigger value="departments">Chi Tiết Departments</TabsTrigger>
            <TabsTrigger value="payroll">Dữ Liệu Lương</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Thống Kê Theo Department</CardTitle>
                  <CardDescription>Số lượng nhân viên và tỷ lệ ký</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="employees" fill="#8884d8" name="Nhân viên" />
                      <Bar dataKey="signed" fill="#82ca9d" name="Đã ký" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Phân Bố Lương Theo Department</CardTitle>
                  <CardDescription>Tỷ lệ tổng lương theo từng department</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) => `${name}: ${percentage}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `${(value / 1000000).toFixed(1)}M VND`} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="departments" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {departments.map((dept) => (
                <Card key={dept.name}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {dept.name}
                      <Badge variant={parseInt(dept.signedPercentage) >= 80 ? "default" : "secondary"}>
                        {dept.signedPercentage}% ký
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Nhân viên</p>
                        <p className="font-semibold">{dept.employeeCount}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Bảng lương</p>
                        <p className="font-semibold">{dept.payrollCount}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Tổng lương</p>
                        <p className="font-semibold">{(dept.totalSalary / 1000000).toFixed(1)}M</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">TB/người</p>
                        <p className="font-semibold">{(dept.averageSalary / 1000).toFixed(0)}K</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => handleViewPayroll(dept.name)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Xem Chi Tiết
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="payroll" className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Chọn department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả departments</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.name} value={dept.name}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleExportData} disabled={selectedDepartment === "all"}>
                <Download className="h-4 w-4 mr-2" />
                Xuất Excel
              </Button>
            </div>

            {selectedDepartment !== "all" && (
              <Card>
                <CardHeader>
                  <CardTitle>Dữ Liệu Lương - {selectedDepartment}</CardTitle>
                  <CardDescription>Tháng {selectedMonth}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Mã NV</th>
                          <th className="text-left p-2">Họ Tên</th>
                          <th className="text-right p-2">Lương Thực Nhận</th>
                          <th className="text-center p-2">Trạng Thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payrollData.map((payroll) => (
                          <tr key={payroll.id} className="border-b">
                            <td className="p-2">{payroll.employee_id}</td>
                            <td className="p-2">{payroll.employees?.full_name}</td>
                            <td className="p-2 text-right">
                              {(payroll.tien_luong_thuc_nhan_cuoi_ky || 0).toLocaleString()} VND
                            </td>
                            <td className="p-2 text-center">
                              <Badge variant={payroll.is_signed ? "default" : "secondary"}>
                                {payroll.is_signed ? "Đã ký" : "Chưa ký"}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
