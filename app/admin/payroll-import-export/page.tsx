"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Download, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  ArrowLeft,
  RefreshCw
} from "lucide-react"

interface ImportResult {
  success: boolean
  totalRecords: number
  successCount: number
  errorCount: number
  overwriteCount?: number
  errors?: any[]
  processingTime: string
}

export default function PayrollImportExportPage() {
  const [loading, setLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [results, setResults] = useState<ImportResult | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [exportType, setExportType] = useState<"template" | "data">("template")
  const [salaryMonth, setSalaryMonth] = useState("")
  const router = useRouter()

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem("admin_token")
    if (!token) {
      router.push("/admin/login")
      return
    }
  }, [router])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setError("")
      setResults(null)
    }
  }

  const handleExport = async () => {
    setExportLoading(true)
    setError("")
    setMessage("")

    try {
      const token = localStorage.getItem("admin_token")
      if (!token) {
        throw new Error("Không tìm thấy token xác thực")
      }

      const params = new URLSearchParams({
        includeData: exportType === "data" ? "true" : "false"
      })

      if (exportType === "data" && salaryMonth) {
        params.append("salaryMonth", salaryMonth)
      }

      const response = await fetch(`/api/admin/payroll-export-template?${params}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Lỗi khi tải template")
      }

      // Download file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      
      const timestamp = new Date().toISOString().slice(0, 10)
      const filename = exportType === "template" 
        ? `template-luong-${timestamp}.xlsx`
        : `luong-export-${salaryMonth || 'all'}-${timestamp}.xlsx`
      
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setMessage(`Đã tải ${exportType === "template" ? "template" : "dữ liệu"} thành công!`)

    } catch (error) {
      console.error("Export error:", error)
      setError(error instanceof Error ? error.message : "Lỗi khi export")
    } finally {
      setExportLoading(false)
    }
  }

  const handleImport = async () => {
    if (!selectedFile) {
      setError("Vui lòng chọn file để import")
      return
    }

    setLoading(true)
    setError("")
    setMessage("")
    setProgress(0)
    setResults(null)

    try {
      const token = localStorage.getItem("admin_token")
      if (!token) {
        throw new Error("Không tìm thấy token xác thực")
      }

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const formData = new FormData()
      formData.append("file", selectedFile)

      const response = await fetch("/api/admin/payroll-import", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      clearInterval(progressInterval)
      setProgress(100)

      const result = await response.json()

      if (response.ok) {
        if (result.success) {
          setResults(result.data || result)
          setMessage(result.message || "Import thành công!")
        } else {
          // Partial success with errors
          setResults(result.data || result)
          setMessage(result.message || "Import hoàn tất với một số lỗi")
        }
      } else {
        throw new Error(result.error?.message || result.message || "Import thất bại")
      }

    } catch (error) {
      console.error("Import error:", error)
      setError(error instanceof Error ? error.message : "Lỗi khi import")
      setProgress(0)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setSelectedFile(null)
    setResults(null)
    setError("")
    setMessage("")
    setProgress(0)
    // Reset file input
    const fileInput = document.getElementById("file-input") as HTMLInputElement
    if (fileInput) {
      fileInput.value = ""
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              onClick={() => router.push("/admin/dashboard")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lại Dashboard
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Import/Export Lương Nhân Viên</h1>
          <p className="text-gray-600 mt-2">
            Quản lý dữ liệu lương: Tải template, export dữ liệu và import file Excel
          </p>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="export" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export & Template
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Import Dữ Liệu
            </TabsTrigger>
          </TabsList>

          {/* Export Tab */}
          <TabsContent value="export">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5 text-blue-600" />
                  Tải Template & Export Dữ Liệu
                </CardTitle>
                <CardDescription>
                  Tải template Excel để import hoặc export dữ liệu lương hiện có
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Export Type Selection */}
                  <div className="space-y-4">
                    <Label htmlFor="export-type">Loại Export</Label>
                    <Select value={exportType} onValueChange={(value: "template" | "data") => setExportType(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn loại export" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="template">
                          <div className="flex flex-col">
                            <span className="font-medium">Template Trống</span>
                            <span className="text-xs text-gray-500">File mẫu với 2 dòng dữ liệu ví dụ</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="data">
                          <div className="flex flex-col">
                            <span className="font-medium">Export Dữ Liệu</span>
                            <span className="text-xs text-gray-500">Xuất dữ liệu lương hiện có</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Salary Month Selection (for data export) */}
                  {exportType === "data" && (
                    <div className="space-y-4">
                      <Label htmlFor="salary-month">Tháng Lương (Tùy chọn)</Label>
                      <Input
                        id="salary-month"
                        type="month"
                        value={salaryMonth}
                        onChange={(e) => setSalaryMonth(e.target.value)}
                        placeholder="Chọn tháng lương"
                      />
                      <p className="text-xs text-gray-500">
                        Để trống để export tất cả dữ liệu
                      </p>
                    </div>
                  )}
                </div>

                {/* Export Button */}
                <div className="flex justify-center">
                  <Button
                    onClick={handleExport}
                    disabled={exportLoading}
                    className="flex items-center gap-2 px-8"
                  >
                    {exportLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    {exportLoading ? "Đang tạo file..." : `Tải ${exportType === "template" ? "Template" : "Dữ Liệu"}`}
                  </Button>
                </div>

                {/* Export Info */}
                <Alert>
                  <FileSpreadsheet className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Lưu ý:</strong>
                    <ul className="mt-2 space-y-1 text-sm">
                      <li>• Template chỉ chứa các cột có dữ liệu trong hệ thống</li>
                      <li>• File Excel sử dụng headers tiếng Việt dễ hiểu</li>
                      <li>• Template có 2 dòng dữ liệu mẫu để tham khảo format</li>
                      <li>• Export dữ liệu sẽ bao gồm tất cả records hoặc theo tháng được chọn</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Import Tab */}
          <TabsContent value="import">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-green-600" />
                  Import Dữ Liệu Lương
                </CardTitle>
                <CardDescription>
                  Upload file Excel để import dữ liệu lương vào hệ thống
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* File Selection */}
                <div className="space-y-4">
                  <Label htmlFor="file-input">Chọn File Excel</Label>
                  <Input
                    id="file-input"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    disabled={loading}
                  />
                  {selectedFile && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FileSpreadsheet className="h-4 w-4" />
                      <span>{selectedFile.name}</span>
                      <Badge variant="outline">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</Badge>
                    </div>
                  )}
                </div>

                {/* Progress */}
                {loading && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Đang xử lý...</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="w-full" />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4 justify-center">
                  <Button
                    onClick={handleImport}
                    disabled={!selectedFile || loading}
                    className="flex items-center gap-2 px-8"
                  >
                    {loading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {loading ? "Đang Import..." : "Bắt Đầu Import"}
                  </Button>

                  {(selectedFile || results) && (
                    <Button
                      variant="outline"
                      onClick={resetForm}
                      disabled={loading}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Reset
                    </Button>
                  )}
                </div>

                {/* Import Info */}
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Quy tắc Import:</strong>
                    <ul className="mt-2 space-y-1 text-sm">
                      <li>• <strong>Overwrite Logic:</strong> Nếu record đã tồn tại (cùng mã NV + tháng lương) sẽ được ghi đè hoàn toàn</li>
                      <li>• <strong>Validation:</strong> Mã nhân viên phải tồn tại trong hệ thống</li>
                      <li>• <strong>Format:</strong> Tháng lương phải có định dạng YYYY-MM (ví dụ: 2024-01)</li>
                      <li>• <strong>File Size:</strong> Hỗ trợ tối đa 5000 rows</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Messages */}
        {message && (
          <Alert className="mt-6">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mt-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Results Display */}
        {results && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {results.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                )}
                Kết Quả Import
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{results.totalRecords}</div>
                  <div className="text-sm text-gray-600">Tổng Records</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{results.successCount}</div>
                  <div className="text-sm text-gray-600">Thành Công</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{results.errorCount}</div>
                  <div className="text-sm text-gray-600">Lỗi</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{results.overwriteCount || 0}</div>
                  <div className="text-sm text-gray-600">Ghi Đè</div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>Thời gian xử lý: {results.processingTime}</span>
                </div>
              </div>

              {/* Error Details */}
              {results.errors && results.errors.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium text-red-700 mb-3">Chi Tiết Lỗi:</h4>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {results.errors.slice(0, 10).map((error: any, index: number) => (
                      <div key={index} className="p-3 bg-red-50 border-l-4 border-red-300 rounded text-sm">
                        <div className="font-medium text-red-800">
                          Row {error.row}: {error.employee_id || "UNKNOWN"} - {error.salary_month || "UNKNOWN"}
                        </div>
                        <div className="text-red-700 mt-1">{error.error}</div>
                      </div>
                    ))}
                    {results.errors.length > 10 && (
                      <div className="text-center text-sm text-gray-500 py-2">
                        Và {results.errors.length - 10} lỗi khác...
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
