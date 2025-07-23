"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, XCircle, AlertTriangle, FileSpreadsheet, Database } from "lucide-react"
import type { ImportResult } from "@/lib/advanced-excel-parser"

interface AdvancedImportResultsProps {
  result: ImportResult
}

export function AdvancedImportResults({ result }: AdvancedImportResultsProps) {
  const successRate = result.totalRows > 0 ? (result.successCount / result.totalRows) * 100 : 0
  const errorRate = result.totalRows > 0 ? (result.errorCount / result.totalRows) * 100 : 0
  const warningRate = result.totalRows > 0 ? (result.warningCount / result.totalRows) * 100 : 0

  const getStatusColor = (success: boolean, hasWarnings: boolean) => {
    if (success && !hasWarnings) return "text-green-600"
    if (success && hasWarnings) return "text-yellow-600"
    return "text-red-600"
  }

  const getStatusIcon = (success: boolean, hasWarnings: boolean) => {
    if (success && !hasWarnings) return <CheckCircle className="h-5 w-5 text-green-600" />
    if (success && hasWarnings) return <AlertTriangle className="h-5 w-5 text-yellow-600" />
    return <XCircle className="h-5 w-5 text-red-600" />
  }

  const getStatusText = (success: boolean, hasWarnings: boolean) => {
    if (success && !hasWarnings) return "Hoàn thành thành công"
    if (success && hasWarnings) return "Hoàn thành với cảnh báo"
    return "Hoàn thành với lỗi"
  }

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(result.success, result.warningCount > 0)}
            <span className={getStatusColor(result.success, result.warningCount > 0)}>
              {getStatusText(result.success, result.warningCount > 0)}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <div className="text-center">
                  <FileSpreadsheet className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-blue-600">File Xử Lý</p>
                  <p className="text-2xl font-bold text-blue-700">{result.summary.filesProcessed}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-4">
                <div className="text-center">
                  <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
                  <p className="text-sm text-green-600">Thành Công</p>
                  <p className="text-2xl font-bold text-green-700">{result.successCount}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="pt-4">
                <div className="text-center">
                  <AlertTriangle className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
                  <p className="text-sm text-yellow-600">Cảnh Báo</p>
                  <p className="text-2xl font-bold text-yellow-700">{result.warningCount}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-red-50 border-red-200">
              <CardContent className="pt-4">
                <div className="text-center">
                  <XCircle className="h-6 w-6 text-red-600 mx-auto mb-2" />
                  <p className="text-sm text-red-600">Lỗi</p>
                  <p className="text-2xl font-bold text-red-700">{result.errorCount}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Tổng Quan Xử Lý</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Thành công ({result.successCount})</span>
              <span>{successRate.toFixed(1)}%</span>
            </div>
            <Progress value={successRate} className="h-2" />
          </div>

          {result.warningCount > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Cảnh báo ({result.warningCount})</span>
                <span>{warningRate.toFixed(1)}%</span>
              </div>
              <Progress value={warningRate} className="h-2" />
            </div>
          )}

          {result.errorCount > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Lỗi ({result.errorCount})</span>
                <span>{errorRate.toFixed(1)}%</span>
              </div>
              <Progress value={errorRate} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Quality Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Báo Cáo Chất Lượng Dữ Liệu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Trùng Lặp</p>
              <p className="text-2xl font-bold text-orange-700">{result.summary.duplicatesFound}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Nhân Viên Thiếu</p>
              <p className="text-2xl font-bold text-red-700">{result.summary.missingEmployees}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Dữ Liệu Không Nhất Quán</p>
              <p className="text-2xl font-bold text-yellow-700">{result.summary.dataInconsistencies}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Column Mappings */}
      <Card>
        <CardHeader>
          <CardTitle>Ánh Xạ Cột Được Sử Dụng</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(result.columnMappings).map(([excelColumn, dbField]) => (
              <div key={excelColumn} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="font-medium">{excelColumn}</span>
                <span className="text-sm text-gray-600">→ {dbField}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Errors */}
      {result.errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Chi Tiết Lỗi & Cảnh Báo</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {result.errors.map((error, index) => (
                  <Alert key={index} variant={error.type === "error" ? "destructive" : "default"}>
                    <AlertDescription>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={error.type === "error" ? "destructive" : "secondary"}>
                              {error.type === "error" ? "Lỗi" : "Cảnh báo"}
                            </Badge>
                            <span className="text-sm">Dòng {error.row}</span>
                            <span className="text-sm text-gray-600">NV: {error.employee_id}</span>
                          </div>
                          <p className="text-sm">
                            <span className="font-medium">{error.field}:</span> {error.error}
                          </p>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
