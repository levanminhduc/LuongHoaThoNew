"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Search, User, Calendar, DollarSign } from "lucide-react"
import { formatCurrency } from "@/lib/utils/date-formatter"
import type { PayrollSearchResult, MonthOption } from "../types"

interface EmployeeSearchProps {
  onEmployeeSelect: (result: PayrollSearchResult) => void
  selectedEmployee?: PayrollSearchResult | null
}

export function EmployeeSearch({ onEmployeeSelect, selectedEmployee }: EmployeeSearchProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedMonth, setSelectedMonth] = useState<string>("")
  const [searchResults, setSearchResults] = useState<PayrollSearchResult[]>([])
  const [availableMonths, setAvailableMonths] = useState<MonthOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Load available months on component mount
  useEffect(() => {
    loadAvailableMonths()
  }, [])

  const loadAvailableMonths = async () => {
    try {
      const token = localStorage.getItem("admin_token")
      if (!token) return

      const response = await fetch("/api/admin/payroll/search", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })

      if (response.ok) {
        const data = await response.json()
        const monthOptions = data.months.map((month: string) => ({
          value: month,
          label: formatMonthLabel(month)
        }))
        setAvailableMonths(monthOptions)
      }
    } catch (error) {
      console.error("Error loading months:", error)
    }
  }

  const formatMonthLabel = (month: string) => {
    const [year, monthNum] = month.split("-")
    return `Tháng ${parseInt(monthNum)} - ${year}`
  }

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setError("Vui lòng nhập ít nhất 2 ký tự để tìm kiếm")
      return
    }

    setLoading(true)
    setError("")
    setSearchResults([])

    try {
      const token = localStorage.getItem("admin_token")
      console.log("🔑 Token check:", {
        hasToken: !!token,
        tokenLength: token?.length || 0,
        tokenStart: token?.substring(0, 10) + "..." || "No token"
      })

      if (!token) {
        setError("Không có quyền truy cập - Token không tồn tại")
        return
      }

      const params = new URLSearchParams({
        q: searchQuery.trim()
      })

      if (selectedMonth && selectedMonth !== "__EMPTY__") {
        params.append("salary_month", selectedMonth)
      }

      console.log("🔍 Making API call:", {
        url: `/api/admin/payroll/search?${params}`,
        token: token ? "Present" : "Missing",
        params: params.toString()
      })

      const response = await fetch(`/api/admin/payroll/search?${params}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })

      console.log("📡 API Response:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        url: response.url,
        type: response.type,
        headers: Object.fromEntries(response.headers.entries())
      })

      // Check if response is actually HTML (404 page)
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        console.error("❌ Non-JSON Response:", {
          contentType,
          status: response.status,
          statusText: response.statusText
        })

        const textResponse = await response.text()
        console.log("📄 Response Body:", textResponse.substring(0, 500))

        throw new Error(`API returned non-JSON response: ${response.status} ${response.statusText}`)
      }

      let data;
      try {
        data = await response.json()
        console.log("📦 Response Data:", data)
      } catch (jsonError) {
        console.error("❌ JSON Parse Error:", jsonError)
        const responseText = await response.clone().text()
        console.log("📄 Raw Response Text:", responseText)
        throw new Error(`Failed to parse JSON response: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`)
      }

      if (response.ok) {
        setSearchResults(data.results || [])
        if (!data.results || data.results.length === 0) {
          setError("Không tìm thấy nhân viên nào phù hợp với từ khóa tìm kiếm")
        }
      } else {
        // Enhanced error handling with specific messages
        let errorMessage = data.error || "Lỗi khi tìm kiếm nhân viên"

        if (response.status === 401) {
          errorMessage = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
          // Optionally redirect to login
          // router.push("/admin/login")
        } else if (response.status === 403) {
          errorMessage = "Bạn không có quyền truy cập chức năng này."
        } else if (response.status >= 500) {
          errorMessage = "Lỗi hệ thống. Vui lòng thử lại sau hoặc liên hệ admin."
        }

        setError(errorMessage)

        // Enhanced error logging with proper object handling
        const errorDetails = {
          status: response.status,
          statusText: response.statusText,
          responseData: data,
          requestQuery: searchQuery,
          requestMonth: selectedMonth,
          requestUrl: `/api/admin/payroll/search?${params}`,
          timestamp: new Date().toISOString(),
          errorMessage: errorMessage
        }

        console.error("❌ Search API Error Details:")
        console.table(errorDetails)
        console.log("Full error object:", JSON.stringify(errorDetails, null, 2))
      }
    } catch (error) {
      console.error("Network error during search:", error)

      let errorMessage = "Có lỗi xảy ra khi tìm kiếm"

      if (error instanceof TypeError && error.message.includes("fetch")) {
        errorMessage = "Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet và thử lại."
      } else if (error instanceof Error) {
        errorMessage = `Lỗi: ${error.message}`
      }

      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  const handleSelectEmployee = (result: PayrollSearchResult) => {
    onEmployeeSelect(result)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5" />
          Tìm Kiếm Nhân Viên
        </CardTitle>
        <CardDescription>
          Tìm kiếm nhân viên theo mã nhân viên hoặc tên để chỉnh sửa thông tin lương
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Form */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="search">Mã NV hoặc Tên</Label>
            <Input
              id="search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Nhập mã nhân viên hoặc tên..."
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="month">Tháng Lương (Tùy chọn)</Label>
            <Select value={selectedMonth || "__EMPTY__"} onValueChange={(value) => {
              setSelectedMonth(value === "__EMPTY__" ? "" : value)
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Tất cả tháng" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__EMPTY__">Tất cả tháng</SelectItem>
                {availableMonths.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>&nbsp;</Label>
            <Button 
              onClick={handleSearch} 
              disabled={loading || !searchQuery.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang tìm...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Tìm Kiếm
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Selected Employee Display */}
        {selectedEmployee && (
          <Alert className="border-green-200 bg-green-50">
            <User className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              <strong>Đã chọn:</strong> {selectedEmployee.full_name} ({selectedEmployee.employee_id}) - {formatMonthLabel(selectedEmployee.salary_month)}
            </AlertDescription>
          </Alert>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-gray-700">
              Kết quả tìm kiếm ({searchResults.length} bản ghi):
            </h4>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {searchResults.map((result) => (
                <Card 
                  key={`${result.employee_id}-${result.salary_month}`}
                  className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                    selectedEmployee?.payroll_id === result.payroll_id 
                      ? "ring-2 ring-blue-500 bg-blue-50" 
                      : ""
                  }`}
                  onClick={() => handleSelectEmployee(result)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">{result.full_name}</span>
                          <Badge variant="outline">{result.employee_id}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>{result.department} - {result.position}</span>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatMonthLabel(result.salary_month)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-green-600 font-medium">
                          <DollarSign className="w-4 h-4" />
                          {formatCurrency(result.net_salary)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {result.source_file}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
