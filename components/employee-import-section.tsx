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
import { Loader2, Upload, Download, Users, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle } from "lucide-react"

interface ImportResult {
  success: boolean
  message: string
  totalProcessed: number
  successCount: number
  errorCount: number
  errors: Array<{
    employee_id: string
    error: string
  }>
  successfulEmployees: Array<{
    employee_id: string
    full_name: string
    department: string
  }>
}

export function EmployeeImportSection() {
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [downloadingTemplate, setDownloadingTemplate] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importMessage, setImportMessage] = useState("")

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setImportResult(null)
      setImportMessage("")
    }
  }

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true)
    try {
      const token = localStorage.getItem("admin_token")
      if (!token) {
        setImportMessage("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.")
        return
      }

      const response = await fetch("/api/admin/download-employee-template", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "template-danh-sach-nhan-vien.xlsx"
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else if (response.status === 401) {
        setImportMessage("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.")
      } else {
        setImportMessage("Lỗi khi tải file template")
      }
    } catch (error) {
      setImportMessage("Có lỗi xảy ra khi tải file template")
    } finally {
      setDownloadingTemplate(false)
    }
  }

  const handleImport = async () => {
    if (!file) {
      setImportMessage("Vui lòng chọn file Excel để import")
      return
    }

    setImporting(true)
    setImportMessage("")
    setImportResult(null)

    try {
      const token = localStorage.getItem("admin_token")
      if (!token) {
        setImportMessage("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.")
        return
      }

      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/admin/import-employees", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setImportResult(data)
        setImportMessage(data.message)

        // Reset file input nếu import thành công hoàn toàn
        if (data.errorCount === 0) {
          setFile(null)
          const fileInput = document.getElementById("employee-file") as HTMLInputElement
          if (fileInput) fileInput.value = ""
        }
      } else if (response.status === 401) {
        setImportMessage("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.")
      } else {
        setImportMessage(`Lỗi: ${data.error}`)
        if (data.details) {
          console.error("Import details:", data.details)
        }
      }
    } catch (error) {
      setImportMessage("Có lỗi xảy ra khi import file")
      console.error("Import error:", error)
    } finally {
      setImporting(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Import Danh Sách Nhân Viên
        </CardTitle>
        <CardDescription>Upload file Excel để import danh sách nhân viên vào hệ thống</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* File Selection */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="employee-file">Chọn File Excel (.xlsx, .xls)</Label>
            <Input
              id="employee-file"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {file && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Đã chọn: {file.name}</span>
                <Badge variant="outline">{(file.size / 1024).toFixed(1)} KB</Badge>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleDownloadTemplate}
              variant="outline"
              disabled={downloadingTemplate}
              className="flex items-center gap-2 bg-transparent"
            >
              {downloadingTemplate ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang tạo...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Tải File Mẫu
                </>
              )}
            </Button>

            <Button onClick={handleImport} disabled={importing || !file} className="flex items-center gap-2">
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang Import...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Import Nhân Viên
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Import Message */}
        {importMessage && (
          <Alert
            className={
              importResult?.success
                ? importResult.errorCount === 0
                  ? "border-green-200 bg-green-50"
                  : "border-yellow-200 bg-yellow-50"
                : "border-red-200 bg-red-50"
            }
          >
            <AlertDescription
              className={
                importResult?.success
                  ? importResult.errorCount === 0
                    ? "text-green-800"
                    : "text-yellow-800"
                  : "text-red-800"
              }
            >
              {importMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Import Results */}
        {importResult && (
          <div className="space-y-4">
            <Separator />

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-600">Tổng Xử Lý</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-700">{importResult.totalProcessed}</p>
                </CardContent>
              </Card>

              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-600">Thành Công</span>
                  </div>
                  <p className="text-2xl font-bold text-green-700">{importResult.successCount}</p>
                </CardContent>
              </Card>

              <Card className="bg-red-50 border-red-200">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-medium text-red-600">Lỗi</span>
                  </div>
                  <p className="text-2xl font-bold text-red-700">{importResult.errorCount}</p>
                </CardContent>
              </Card>
            </div>

            {/* Successful Employees */}
            {importResult.successfulEmployees.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Nhân Viên Đã Import Thành Công ({importResult.successfulEmployees.length})
                </h4>
                <div className="max-h-32 overflow-y-auto bg-green-50 rounded-md p-3">
                  <div className="space-y-1">
                    {importResult.successfulEmployees.map((emp, index) => (
                      <div key={index} className="text-sm text-green-800">
                        <span className="font-medium">{emp.employee_id}</span> - {emp.full_name} ({emp.department})
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Errors */}
            {importResult.errors.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Chi Tiết Lỗi ({importResult.errors.length})
                </h4>
                <div className="max-h-40 overflow-y-auto bg-red-50 rounded-md p-3">
                  <div className="space-y-2">
                    {importResult.errors.map((error, index) => (
                      <div key={index} className="text-sm text-red-800 border-l-2 border-red-300 pl-2">
                        <span className="font-medium">{error.employee_id || "N/A"}</span>: {error.error}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Hướng Dẫn Sử Dụng:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Tải file mẫu để xem định dạng dữ liệu chuẩn</li>
            <li>• Các cột bắt buộc: Mã Nhân Viên, Họ Tên, Số CCCD, Phòng Ban</li>
            <li>• Chức vụ hợp lệ: nhan_vien, to_truong, truong_phong</li>
            <li>• Mã nhân viên không được trùng lặp trong hệ thống</li>
            <li>• File hỗ trợ định dạng .xlsx và .xls</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
