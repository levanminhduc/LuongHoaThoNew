"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Settings, Shield, Loader2, CheckCircle, AlertTriangle } from "lucide-react"
import { EmployeeSearch } from "./components/EmployeeSearch"
import { PayrollEditForm } from "./components/PayrollEditForm"
import { AuditTrail } from "./components/AuditTrail"
import type { PayrollSearchResult, PayrollData, PayrollUpdateRequest } from "./types"

export default function PayrollManagementPage() {
  const router = useRouter()
  const [selectedEmployee, setSelectedEmployee] = useState<PayrollSearchResult | null>(null)
  const [payrollData, setPayrollData] = useState<PayrollData | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  // Check admin authentication on mount
  useEffect(() => {
    const token = localStorage.getItem("admin_token")
    if (!token) {
      router.push("/admin")
      return
    }
  }, [router])

  const handleEmployeeSelect = async (employee: PayrollSearchResult) => {
    setSelectedEmployee(employee)
    setError("")
    setSuccessMessage("")
    await loadPayrollData(employee.payroll_id)
  }

  const loadPayrollData = async (payrollId: number) => {
    setLoading(true)
    setError("")

    try {
      const token = localStorage.getItem("admin_token")
      if (!token) {
        setError("Không có quyền truy cập")
        return
      }

      const response = await fetch(`/api/admin/payroll/${payrollId}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (response.ok) {
        setPayrollData(data.payroll)
      } else {
        setError(data.error || "Lỗi khi tải dữ liệu lương")
        setPayrollData(null)
      }
    } catch (error) {
      setError("Có lỗi xảy ra khi tải dữ liệu lương")
      setPayrollData(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSavePayroll = async (updateRequest: PayrollUpdateRequest) => {
    if (!payrollData) return

    setSaving(true)
    setError("")
    setSuccessMessage("")

    try {
      const token = localStorage.getItem("admin_token")
      if (!token) {
        setError("Không có quyền truy cập")
        return
      }

      const response = await fetch(`/api/admin/payroll/${payrollData.id}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updateRequest)
      })

      const data = await response.json()

      if (response.ok) {
        setPayrollData(data.payroll)
        setSuccessMessage(`Cập nhật thành công ${data.changesCount} thay đổi`)
        
        // Auto-hide success message after 5 seconds
        setTimeout(() => setSuccessMessage(""), 5000)
        
        // Reload payroll data to get fresh data
        await loadPayrollData(payrollData.id)
      } else {
        setError(data.error || "Lỗi khi cập nhật dữ liệu lương")
      }
    } catch (error) {
      setError("Có lỗi xảy ra khi cập nhật dữ liệu lương")
    } finally {
      setSaving(false)
    }
  }

  const handleBackToDashboard = () => {
    router.push("/admin/dashboard")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={handleBackToDashboard}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Quay Lại Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Settings className="w-6 h-6" />
                  Quản Lý Lương Chi Tiết
                </h1>
                <p className="text-sm text-gray-600">
                  MAY HÒA THỌ ĐIỆN BÀN - Chỉnh sửa thông tin lương nhân viên
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-600" />
              <span className="text-sm text-green-600 font-medium">Admin Access</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success/Error Messages */}
        {successMessage && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              {successMessage}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Employee Search Section */}
        <div className="mb-8">
          <EmployeeSearch
            onEmployeeSelect={handleEmployeeSelect}
            selectedEmployee={selectedEmployee}
          />
        </div>

        {/* Loading State */}
        {loading && (
          <Card className="mb-8">
            <CardContent className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Đang tải dữ liệu lương...</p>
            </CardContent>
          </Card>
        )}

        {/* Main Content Grid */}
        {!loading && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Payroll Edit Form - Takes 2 columns */}
            <div className="xl:col-span-2">
              <PayrollEditForm
                payrollData={payrollData}
                onSave={handleSavePayroll}
                loading={saving}
              />
            </div>

            {/* Audit Trail - Takes 1 column */}
            <div className="xl:col-span-1">
              <AuditTrail payrollId={payrollData?.id || null} />
            </div>
          </div>
        )}

        {/* Instructions Card */}
        {!selectedEmployee && (
          <Card className="mt-8 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-800">Hướng Dẫn Sử Dụng</CardTitle>
            </CardHeader>
            <CardContent className="text-blue-700">
              <div className="space-y-2">
                <p><strong>Bước 1:</strong> Tìm kiếm nhân viên theo mã nhân viên hoặc tên</p>
                <p><strong>Bước 2:</strong> Chọn bản ghi lương cần chỉnh sửa</p>
                <p><strong>Bước 3:</strong> Thực hiện các thay đổi cần thiết trong form</p>
                <p><strong>Bước 4:</strong> Nhập lý do thay đổi và lưu</p>
                <p><strong>Lưu ý:</strong> Tất cả thay đổi sẽ được ghi lại trong lịch sử audit</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
