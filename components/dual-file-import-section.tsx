"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { Loader2, Upload, FileSpreadsheet, CheckCircle, AlertTriangle, XCircle, Database } from "lucide-react"

interface ImportConfig {
  id: number
  config_name: string
  file_type: "file1" | "file2"
  description: string
  is_active: boolean
}

interface ColumnMapping {
  id: number
  config_id: number
  excel_column_name: string
  database_field: string
  data_type: "text" | "number" | "date"
  is_required: boolean
  display_order: number
}

interface DualFileImportResult {
  success: boolean
  session_id: string
  total_employees: number
  file1_processed: number
  file2_processed: number
  matched_records: number
  unmatched_records: number
  errors: Array<{
    employee_id: string
    salary_month: string
    file_type: "file1" | "file2"
    error: string
  }>
  warnings: Array<{
    employee_id: string
    salary_month: string
    message: string
  }>
  summary: {
    file1_only: number
    file2_only: number
    both_files: number
    validation_errors: number
  }
}

export function DualFileImportSection() {
  const [file1, setFile1] = useState<File | null>(null)
  const [file2, setFile2] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [loadingConfigs, setLoadingConfigs] = useState(true)

  const [importConfigs, setImportConfigs] = useState<ImportConfig[]>([])
  const [file1Config, setFile1Config] = useState<number | null>(null)
  const [file2Config, setFile2Config] = useState<number | null>(null)
  const [file1Mappings, setFile1Mappings] = useState<ColumnMapping[]>([])
  const [file2Mappings, setFile2Mappings] = useState<ColumnMapping[]>([])

  const [importResult, setImportResult] = useState<DualFileImportResult | null>(null)
  const [message, setMessage] = useState("")

  useEffect(() => {
    fetchImportConfigs()
  }, [])

  const fetchImportConfigs = async () => {
    try {
      const token = localStorage.getItem("admin_token")
      const response = await fetch("/api/admin/import-configs", {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setImportConfigs(data.configs)

        // Auto-select default configs
        const file1Default = data.configs.find((c: ImportConfig) => c.file_type === "file1" && c.is_active)
        const file2Default = data.configs.find((c: ImportConfig) => c.file_type === "file2" && c.is_active)

        if (file1Default) {
          setFile1Config(file1Default.id)
          fetchColumnMappings(file1Default.id, "file1")
        }
        if (file2Default) {
          setFile2Config(file2Default.id)
          fetchColumnMappings(file2Default.id, "file2")
        }
      }
    } catch (error) {
      setMessage("Lỗi khi tải cấu hình import")
    } finally {
      setLoadingConfigs(false)
    }
  }

  const fetchColumnMappings = async (configId: number, fileType: "file1" | "file2") => {
    try {
      const token = localStorage.getItem("admin_token")
      const response = await fetch(`/api/admin/import-configs/${configId}/mappings`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        if (fileType === "file1") {
          setFile1Mappings(data.mappings)
        } else {
          setFile2Mappings(data.mappings)
        }
      }
    } catch (error) {
      console.error(`Error fetching ${fileType} mappings:`, error)
    }
  }

  const handleFile1Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile1(selectedFile)
      setImportResult(null)
      setMessage("")
    }
  }

  const handleFile2Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile2(selectedFile)
      setImportResult(null)
      setMessage("")
    }
  }

  const handleConfigChange = (configId: string, fileType: "file1" | "file2") => {
    const id = Number.parseInt(configId)
    if (fileType === "file1") {
      setFile1Config(id)
      fetchColumnMappings(id, "file1")
    } else {
      setFile2Config(id)
      fetchColumnMappings(id, "file2")
    }
  }

  const handleDualImport = async () => {
    if (!file1 && !file2) {
      setMessage("Vui lòng chọn ít nhất một file để import")
      return
    }

    if (!file1Config && file1) {
      setMessage("Vui lòng chọn cấu hình cho File 1")
      return
    }

    if (!file2Config && file2) {
      setMessage("Vui lòng chọn cấu hình cho File 2")
      return
    }

    setImporting(true)
    setMessage("Đang xử lý import dữ liệu từ hai file...")
    setImportResult(null)

    try {
      const token = localStorage.getItem("admin_token")
      const formData = new FormData()

      if (file1) {
        formData.append("file1", file1)
        formData.append("file1_config_id", file1Config!.toString())
      }

      if (file2) {
        formData.append("file2", file2)
        formData.append("file2_config_id", file2Config!.toString())
      }

      const response = await fetch("/api/admin/dual-file-import", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setImportResult(data.result)
        setMessage(data.message)

        // Reset files if successful
        if (data.result.success) {
          setFile1(null)
          setFile2(null)
          const file1Input = document.getElementById("file1-input") as HTMLInputElement
          const file2Input = document.getElementById("file2-input") as HTMLInputElement
          if (file1Input) file1Input.value = ""
          if (file2Input) file2Input.value = ""
        }
      } else {
        setMessage(`Lỗi: ${data.error}`)
      }
    } catch (error) {
      setMessage("Có lỗi xảy ra khi import dữ liệu")
    } finally {
      setImporting(false)
    }
  }

  const getMatchingRate = () => {
    if (!importResult || importResult.total_employees === 0) return 0
    return (importResult.matched_records / importResult.total_employees) * 100
  }

  if (loadingConfigs) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Đang tải cấu hình import...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Import Lương Từ Hai File Excel
          </CardTitle>
          <CardDescription>
            Upload và xử lý dữ liệu lương từ hai file Excel riêng biệt với cấu hình ánh xạ cột tự động
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <Tabs defaultValue="files" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="files">File Upload</TabsTrigger>
              <TabsTrigger value="config">Cấu Hình</TabsTrigger>
              <TabsTrigger value="preview">Xem Trước</TabsTrigger>
            </TabsList>

            <TabsContent value="files" className="space-y-4">
              {/* File 1 Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                      File 1 - Dữ Liệu Cơ Bản
                    </CardTitle>
                    <CardDescription>File chứa thông tin lương cơ bản, giờ làm việc, hệ số</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="file1-config">Cấu Hình File 1</Label>
                      <Select
                        value={file1Config?.toString() || ""}
                        onValueChange={(value) => handleConfigChange(value, "file1")}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn cấu hình File 1" />
                        </SelectTrigger>
                        <SelectContent>
                          {importConfigs
                            .filter((c) => c.file_type === "file1")
                            .map((config) => (
                              <SelectItem key={config.id} value={config.id.toString()}>
                                {config.config_name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="file1-input">Chọn File Excel 1</Label>
                      <Input
                        id="file1-input"
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFile1Change}
                        className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {file1 && (
                        <div className="flex items-center gap-2 text-sm text-blue-600">
                          <FileSpreadsheet className="h-4 w-4" />
                          <span>{file1.name}</span>
                          <Badge variant="outline">{(file1.size / 1024).toFixed(1)} KB</Badge>
                        </div>
                      )}
                    </div>

                    {file1Mappings.length > 0 && (
                      <div className="text-sm text-gray-600">
                        <p className="font-medium">Cột sẽ được import:</p>
                        <div className="mt-1 space-y-1">
                          {file1Mappings.slice(0, 5).map((mapping) => (
                            <div key={mapping.id} className="flex items-center gap-2">
                              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                              <span>{mapping.excel_column_name}</span>
                              {mapping.is_required && (
                                <Badge variant="destructive" className="text-xs">
                                  Bắt buộc
                                </Badge>
                              )}
                            </div>
                          ))}
                          {file1Mappings.length > 5 && (
                            <div className="text-xs text-gray-500">... và {file1Mappings.length - 5} cột khác</div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* File 2 Section */}
                <Card className="border-green-200">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileSpreadsheet className="h-5 w-5 text-green-600" />
                      File 2 - Khấu Trừ & Lương Cuối
                    </CardTitle>
                    <CardDescription>File chứa thông tin khấu trừ, thuế, lương thực nhận</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="file2-config">Cấu Hình File 2</Label>
                      <Select
                        value={file2Config?.toString() || ""}
                        onValueChange={(value) => handleConfigChange(value, "file2")}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn cấu hình File 2" />
                        </SelectTrigger>
                        <SelectContent>
                          {importConfigs
                            .filter((c) => c.file_type === "file2")
                            .map((config) => (
                              <SelectItem key={config.id} value={config.id.toString()}>
                                {config.config_name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="file2-input">Chọn File Excel 2</Label>
                      <Input
                        id="file2-input"
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFile2Change}
                        className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                      />
                      {file2 && (
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <FileSpreadsheet className="h-4 w-4" />
                          <span>{file2.name}</span>
                          <Badge variant="outline">{(file2.size / 1024).toFixed(1)} KB</Badge>
                        </div>
                      )}
                    </div>

                    {file2Mappings.length > 0 && (
                      <div className="text-sm text-gray-600">
                        <p className="font-medium">Cột sẽ được import:</p>
                        <div className="mt-1 space-y-1">
                          {file2Mappings.slice(0, 5).map((mapping) => (
                            <div key={mapping.id} className="flex items-center gap-2">
                              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                              <span>{mapping.excel_column_name}</span>
                              {mapping.is_required && (
                                <Badge variant="destructive" className="text-xs">
                                  Bắt buộc
                                </Badge>
                              )}
                            </div>
                          ))}
                          {file2Mappings.length > 5 && (
                            <div className="text-xs text-gray-500">... và {file2Mappings.length - 5} cột khác</div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Import Button */}
              <div className="flex justify-center">
                <Button
                  onClick={handleDualImport}
                  disabled={importing || (!file1 && !file2)}
                  size="lg"
                  className="flex items-center gap-2"
                >
                  {importing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Đang Import...
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5" />
                      Import Dữ Liệu Từ Hai File
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="config" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* File 1 Config */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg text-blue-600">Cấu Hình File 1</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-2">
                        {file1Mappings.map((mapping) => (
                          <div key={mapping.id} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{mapping.excel_column_name}</p>
                              <p className="text-xs text-gray-600">{mapping.database_field}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {mapping.data_type}
                              </Badge>
                              {mapping.is_required && (
                                <Badge variant="destructive" className="text-xs">
                                  Bắt buộc
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* File 2 Config */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg text-green-600">Cấu Hình File 2</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-2">
                        {file2Mappings.map((mapping) => (
                          <div key={mapping.id} className="flex items-center justify-between p-2 bg-green-50 rounded">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{mapping.excel_column_name}</p>
                              <p className="text-xs text-gray-600">{mapping.database_field}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {mapping.data_type}
                              </Badge>
                              {mapping.is_required && (
                                <Badge variant="destructive" className="text-xs">
                                  Bắt buộc
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4">
              <div className="text-center py-8">
                <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Xem trước dữ liệu sẽ hiển thị sau khi chọn file và thực hiện import</p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Status Message */}
          {message && (
            <Alert className={message.includes("Lỗi") ? "border-red-200 bg-red-50" : "border-blue-200 bg-blue-50"}>
              <AlertDescription className={message.includes("Lỗi") ? "text-red-800" : "text-blue-800"}>
                {message}
              </AlertDescription>
            </Alert>
          )}

          {/* Import Results */}
          {importResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {importResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  )}
                  Kết Quả Import Dual File
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <p className="text-sm text-blue-600">File 1 Processed</p>
                        <p className="text-2xl font-bold text-blue-700">{importResult.file1_processed}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <p className="text-sm text-green-600">File 2 Processed</p>
                        <p className="text-2xl font-bold text-green-700">{importResult.file2_processed}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-purple-50 border-purple-200">
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <p className="text-sm text-purple-600">Matched Records</p>
                        <p className="text-2xl font-bold text-purple-700">{importResult.matched_records}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-orange-50 border-orange-200">
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <p className="text-sm text-orange-600">Total Employees</p>
                        <p className="text-2xl font-bold text-orange-700">{importResult.total_employees}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Matching Rate */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Tỷ lệ khớp dữ liệu</span>
                    <span>{getMatchingRate().toFixed(1)}%</span>
                  </div>
                  <Progress value={getMatchingRate()} className="h-2" />
                </div>

                {/* Data Distribution */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-700">{importResult.summary.file1_only}</p>
                    <p className="text-sm text-blue-600">Chỉ có File 1</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-700">{importResult.summary.both_files}</p>
                    <p className="text-sm text-green-600">Cả hai File</p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <p className="text-2xl font-bold text-orange-700">{importResult.summary.file2_only}</p>
                    <p className="text-sm text-orange-600">Chỉ có File 2</p>
                  </div>
                </div>

                {/* Errors and Warnings */}
                {(importResult.errors.length > 0 || importResult.warnings.length > 0) && (
                  <div className="space-y-4">
                    {importResult.errors.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                          <XCircle className="h-4 w-4" />
                          Lỗi ({importResult.errors.length})
                        </h4>
                        <ScrollArea className="h-[200px] border rounded-md p-3">
                          <div className="space-y-2">
                            {importResult.errors.map((error, index) => (
                              <div key={index} className="text-sm p-2 bg-red-50 rounded border-l-2 border-red-300">
                                <div className="font-medium">
                                  {error.employee_id} - {error.salary_month} ({error.file_type})
                                </div>
                                <div className="text-red-700">{error.error}</div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}

                    {importResult.warnings.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-yellow-700 mb-2 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          Cảnh Báo ({importResult.warnings.length})
                        </h4>
                        <ScrollArea className="h-[150px] border rounded-md p-3">
                          <div className="space-y-2">
                            {importResult.warnings.map((warning, index) => (
                              <div
                                key={index}
                                className="text-sm p-2 bg-yellow-50 rounded border-l-2 border-yellow-300"
                              >
                                <div className="font-medium">
                                  {warning.employee_id} - {warning.salary_month}
                                </div>
                                <div className="text-yellow-700">{warning.message}</div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Hướng Dẫn Sử Dụng:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>
                • <strong>File 1:</strong> Chứa dữ liệu lương cơ bản (hệ số, giờ làm việc, lương sản phẩm)
              </li>
              <li>
                • <strong>File 2:</strong> Chứa dữ liệu khấu trừ và lương cuối (BHXH, thuế, lương thực nhận)
              </li>
              <li>
                • Hệ thống sẽ ghép dữ liệu dựa trên <strong>Mã Nhân Viên + Tháng Lương</strong>
              </li>
              <li>• Có thể import chỉ một file hoặc cả hai file cùng lúc</li>
              <li>• Cấu hình ánh xạ cột được lưu trong database và có thể tùy chỉnh</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
