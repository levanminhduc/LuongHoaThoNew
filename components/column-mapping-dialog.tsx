"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { X, Check, AlertTriangle, RefreshCw } from "lucide-react"
import { type ColumnMapping, PAYROLL_FIELD_CONFIG, autoMapColumns } from "@/lib/advanced-excel-parser"

interface ColumnMappingDialogProps {
  detectedColumns: string[]
  initialMapping: ColumnMapping
  onSave: (mapping: ColumnMapping) => void
  onCancel: () => void
}

export function ColumnMappingDialog({ detectedColumns, initialMapping, onSave, onCancel }: ColumnMappingDialogProps) {
  const [mapping, setMapping] = useState<ColumnMapping>(initialMapping)
  const [errors, setErrors] = useState<string[]>([])

  useEffect(() => {
    validateMapping()
  }, [mapping])

  const validateMapping = () => {
    const newErrors: string[] = []

    // Check for required field mappings
    const requiredFields = PAYROLL_FIELD_CONFIG.filter((field) => field.required)
    const mappedFields = Object.values(mapping)

    requiredFields.forEach((field) => {
      if (!mappedFields.includes(field.field)) {
        newErrors.push(`Trường bắt buộc "${field.label}" chưa được ánh xạ`)
      }
    })

    // Check for duplicate mappings
    const fieldCounts = mappedFields.reduce(
      (acc, field) => {
        acc[field] = (acc[field] || 0) + 1
        return acc
      },
      {} as { [key: string]: number },
    )

    Object.entries(fieldCounts).forEach(([field, count]) => {
      if (count > 1) {
        const fieldConfig = PAYROLL_FIELD_CONFIG.find((f) => f.field === field)
        newErrors.push(`Trường "${fieldConfig?.label || field}" được ánh xạ ${count} lần`)
      }
    })

    setErrors(newErrors)
  }

  const handleMappingChange = (excelColumn: string, dbField: string) => {
    setMapping((prev) => ({
      ...prev,
      [excelColumn]: dbField,
    }))
  }

  const handleRemoveMapping = (excelColumn: string) => {
    setMapping((prev) => {
      const newMapping = { ...prev }
      delete newMapping[excelColumn]
      return newMapping
    })
  }

  const handleAutoMap = () => {
    const autoMapping = autoMapColumns(detectedColumns)
    setMapping(autoMapping)
  }

  const handleSave = () => {
    if (errors.length === 0) {
      onSave(mapping)
    }
  }

  const getMappedFieldsCount = () => {
    const mappedFields = Object.values(mapping)
    const requiredMapped = PAYROLL_FIELD_CONFIG.filter(
      (field) => field.required && mappedFields.includes(field.field),
    ).length
    const totalRequired = PAYROLL_FIELD_CONFIG.filter((field) => field.required).length

    return { requiredMapped, totalRequired, totalMapped: mappedFields.length }
  }

  const stats = getMappedFieldsCount()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Cấu Hình Ánh Xạ Cột</CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden">
          <div className="space-y-4">
            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                  <div className="text-center">
                    <p className="text-sm text-blue-600">Cột Excel</p>
                    <p className="text-2xl font-bold text-blue-700">{detectedColumns.length}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-4">
                  <div className="text-center">
                    <p className="text-sm text-green-600">Đã Ánh Xạ</p>
                    <p className="text-2xl font-bold text-green-700">{stats.totalMapped}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-orange-50 border-orange-200">
                <CardContent className="pt-4">
                  <div className="text-center">
                    <p className="text-sm text-orange-600">Bắt Buộc</p>
                    <p className="text-2xl font-bold text-orange-700">
                      {stats.requiredMapped}/{stats.totalRequired}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Auto-mapping button */}
            <div className="flex justify-center">
              <Button variant="outline" onClick={handleAutoMap} className="flex items-center gap-2 bg-transparent">
                <RefreshCw className="h-4 w-4" />
                Tự Động Ánh Xạ
              </Button>
            </div>

            {/* Errors */}
            {errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    {errors.map((error, index) => (
                      <div key={index}>• {error}</div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Mapping configuration */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Excel Columns */}
              <div>
                <h3 className="font-semibold mb-3">Cột Excel ({detectedColumns.length})</h3>
                <ScrollArea className="h-[400px] border rounded-md p-4">
                  <div className="space-y-3">
                    {detectedColumns.map((column, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex-1">
                          <p className="font-medium">{column}</p>
                          {mapping[column] && (
                            <p className="text-sm text-gray-600">
                              →{" "}
                              {PAYROLL_FIELD_CONFIG.find((f) => f.field === mapping[column])?.label || mapping[column]}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            value={mapping[column] || "none"}
                            onValueChange={(value) => handleMappingChange(column, value)}
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue placeholder="Chọn trường" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Không ánh xạ</SelectItem>
                              {PAYROLL_FIELD_CONFIG.map((field) => (
                                <SelectItem key={field.field} value={field.field}>
                                  {field.label}
                                  {field.required && <span className="text-red-500"> *</span>}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {mapping[column] && (
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveMapping(column)}>
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Database Fields */}
              <div>
                <h3 className="font-semibold mb-3">Trường Database</h3>
                <ScrollArea className="h-[400px] border rounded-md p-4">
                  <div className="space-y-2">
                    {PAYROLL_FIELD_CONFIG.map((field) => {
                      const isMapped = Object.values(mapping).includes(field.field)
                      const mappedColumn = Object.keys(mapping).find((key) => mapping[key] === field.field)

                      return (
                        <div key={field.field} className={`p-2 rounded ${isMapped ? "bg-green-50" : "bg-gray-50"}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium">
                                {field.label}
                                {field.required && <span className="text-red-500"> *</span>}
                              </p>
                              <p className="text-sm text-gray-600">
                                {field.field} ({field.type})
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={isMapped ? "default" : "secondary"}>
                                {isMapped ? (
                                  <>
                                    <Check className="h-3 w-3 mr-1" /> Đã ánh xạ
                                  </>
                                ) : (
                                  "Chưa ánh xạ"
                                )}
                              </Badge>
                            </div>
                          </div>
                          {isMapped && mappedColumn && <p className="text-sm text-green-600 mt-1">← {mappedColumn}</p>}
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              </div>
            </div>

            <Separator />

            {/* Action buttons */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onCancel}>
                Hủy
              </Button>
              <Button onClick={handleSave} disabled={errors.length > 0} className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                Lưu Cấu Hình
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
