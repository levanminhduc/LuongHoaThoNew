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
import { Loader2, Search, User, CreditCard, DollarSign, Calendar } from "lucide-react"
import Link from "next/link"

interface PayrollResult {
  employee_id: string
  full_name: string
  cccd: string
  position: string
  salary_month: string
  total_income: number
  deductions: number
  net_salary: number
  source_file: string
}

export function EmployeeLookup() {
  const [employeeId, setEmployeeId] = useState("")
  const [cccd, setCccd] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PayrollResult | null>(null)
  const [error, setError] = useState("")

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Thông Tin Tra Cứu
          </CardTitle>
          <CardDescription>Vui lòng nhập chính xác mã nhân viên và số CCCD của bạn</CardDescription>
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
                <Input
                  id="cccd"
                  type="text"
                  value={cccd}
                  onChange={(e) => setCccd(e.target.value)}
                  placeholder="Nhập số CCCD"
                  required
                />
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

              <Link href="/">
                <Button variant="outline">Quay Lại</Button>
              </Link>
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
                  <CreditCard className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Số CCCD:</span>
                  <span>{result.cccd}</span>
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
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Chi Tiết Lương
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-blue-600">Tổng Thu Nhập</p>
                      <p className="text-2xl font-bold text-blue-700">{formatCurrency(result.total_income)}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-red-50 border-red-200">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-red-600">Khấu Trừ</p>
                      <p className="text-2xl font-bold text-red-700">{formatCurrency(result.deductions)}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-green-50 border-green-200">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-green-600">Thực Lĩnh</p>
                      <p className="text-2xl font-bold text-green-700">{formatCurrency(result.net_salary)}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Separator />

            <div className="text-sm text-gray-500">
              <p>Nguồn dữ liệu: {result.source_file}</p>
              <p className="mt-1">
                <strong>Lưu ý:</strong> Thông tin này chỉ mang tính chất tham khảo. Vui lòng liên hệ phòng nhân sự nếu
                có thắc mắc.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
