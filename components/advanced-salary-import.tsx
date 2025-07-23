"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, Settings, FileSpreadsheet, Database } from "lucide-react"
import { ColumnMappingDialog } from "./column-mapping-dialog"
import { AdvancedImportResults } from "./advanced-import-results"
import {
  type ColumnMapping,
  type ImportResult,
  parseAdvancedExcelFiles,
  detectColumns,
  autoMapColumns,
} from "@/lib/advanced-excel-parser"

interface AdvancedSalaryImportProps {
  onImportComplete?: (result: ImportResult) => void
}

export function AdvancedSalaryImport({ onImportComplete }: AdvancedSalaryImportProps) {
  const [files, setFiles] = useState<FileList | null>(null)
  const [importing, setImporting] = useState(false)
  const [showColumnMapping, setShowColumnMapping] = useState(false)
  const [detectedColumns, setDetectedColumns] = useState<string[]>([])
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([])
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [message, setMessage] = useState("")

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (selectedFiles) {
      setFiles(selectedFiles)
      setImportResult(null)
      setMessage("")
    }
  }

  const handleAnalyzeFiles = async () => {
    if (!files || files.length === 0) {
      setMessage("Vui lòng chọn ít nhất một file Excel")
      return
    }

    try {
      setImporting(true)

      // Read first file to detect columns
      const firstFile = files[0]
      const buffer = await firstFile.arrayBuffer()
      const workbook = await import("xlsx").then((XLSX) => XLSX.read(buffer, { type: "buffer" }))
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]

      const detected = detectColumns(worksheet)
      setDetectedColumns(detected)

      // Auto-map columns for all files
      const autoMapping = autoMapColumns(detected)
      setColumnMappings(Array.from({ length: files.length }, () => autoMapping))

      setShowColumnMapping(true)
      setMessage(`Phát hiện ${detected.length} cột trong file Excel`)
    } catch (error) {
      setMessage("Lỗi khi phân tích file Excel")
      console.error("File analysis error:", error)
    } finally {
      setImporting(false)
    }
  }

  const handleMappingSave = async (mapping: ColumnMapping) => {
    setShowColumnMapping(false)

    if (!files) return

    try {
      setImporting(true)
      setMessage("Đang xử lý import dữ liệu...")

      // Prepare file data
      const fileData = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const buffer = Buffer.from(await file.arrayBuffer())
        fileData.push({ buffer, filename: file.name })
      }

      // Parse files with column mapping
      const result = parseAdvancedExcelFiles(fileData, [mapping])

      if (result.successCount > 0) {
        // Send to backend
        const response = await fetch("/api/admin/advanced-upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
          },
          body: JSON.stringify({
            payrollData: result.data,
            columnMappings: result.columnMappings,
            summary: result.summary,
          }),
        })

        const backendResult = await response.json()

        if (response.ok) {
          setMessage(`Import hoàn tất! Đã xử lý ${result.successCount} bản ghi thành công`)
          onImportComplete?.(result)
        } else {
          setMessage(`Lỗi backend: ${backendResult.error}`)
        }
      } else {
        setMessage("Không có dữ liệu hợp lệ để import")
      }

      setImportResult(result)
    } catch (error) {
      setMessage("Có lỗi xảy ra khi import dữ liệu")
      console.error("Import error:", error)
    } finally {
      setImporting(false)
    }
  }

  const handleMappingCancel = () => {
    setShowColumnMapping(false)
    setMessage("")
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Import Dữ Liệu Lương Nâng Cao
          </CardTitle>
          <CardDescription>Upload và cấu hình ánh xạ cột từ nhiều file Excel để import dữ liệu lương</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* File Selection */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="salary-files">Chọn File Excel (.xlsx, .xls)</Label>
              <Input
                id="salary-files"
                type="file"
                multiple
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {files && files.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Đã chọn {files.length} file(s):</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {Array.from(files).map((file, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-gray-600 p-2 bg-gray-50 rounded">
                        <FileSpreadsheet className="h-4 w-4" />
                        <span className="flex-1 truncate">{file.name}</span>
                        <Badge variant="outline">{(file.size / 1024).toFixed(1)} KB</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleAnalyzeFiles}
                disabled={importing || !files || files.length === 0}
                className="flex items-center gap-2"
              >
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang phân tích...
                  </>
                ) : (
                  <>
                    <Settings className="h-4 w-4" />
                    Phân Tích & Cấu Hình
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Status Message */}
          {message && (
            <Alert className={message.includes("Lỗi") ? "border-red-200 bg-red-50" : "border-blue-200 bg-blue-50"}>
              <AlertDescription className={message.includes("Lỗi") ? "text-red-800" : "text-blue-800"}>
                {message}
              </AlertDescription>
            </Alert>
          )}

          {/* Instructions */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Hướng Dẫn Sử Dụng:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Chọn một hoặc nhiều file Excel chứa dữ liệu lương</li>
              <li>• Click "Phân Tích & Cấu Hình" để xem cấu trúc file</li>
              <li>• Cấu hình ánh xạ cột Excel với trường database</li>
              <li>• Hệ thống sẽ tự động phát hiện và gợi ý ánh xạ</li>
              <li>• Xem báo cáo chi tiết sau khi import hoàn tất</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Column Mapping Dialog */}
      {showColumnMapping && (
        <ColumnMappingDialog
          detectedColumns={detectedColumns}
          initialMapping={columnMappings[0] || {}}
          onSave={handleMappingSave}
          onCancel={handleMappingCancel}
        />
      )}

      {/* Import Results */}
      {importResult && <AdvancedImportResults result={importResult} />}
    </div>
  )
}
