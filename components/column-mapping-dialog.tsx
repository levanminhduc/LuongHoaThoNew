"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { X, Check, AlertTriangle, RefreshCw, Save, Zap, Target } from "lucide-react"
import {
  type ColumnMapping,
  PAYROLL_FIELD_CONFIG,
  autoMapColumns,
  autoMapColumnsWithAliases
} from "@/lib/advanced-excel-parser"
import {
  type EnhancedColumnMapping,
  type ColumnAlias,
  type ImportMappingResult,
  CONFIDENCE_LEVELS,
  categorizeMappingConfidence
} from "@/lib/column-alias-config"

interface ColumnMappingDialogProps {
  detectedColumns: string[]
  initialMapping: ColumnMapping
  onSave: (mapping: ColumnMapping) => void
  onCancel: () => void
  fileName?: string
  enableAliasMapping?: boolean
}

export function ColumnMappingDialog({
  detectedColumns,
  initialMapping,
  onSave,
  onCancel,
  fileName,
  enableAliasMapping = true
}: ColumnMappingDialogProps) {
  const [mapping, setMapping] = useState<ColumnMapping>(initialMapping)
  const [enhancedMapping, setEnhancedMapping] = useState<EnhancedColumnMapping>({})
  const [aliases, setAliases] = useState<ColumnAlias[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [mappingResult, setMappingResult] = useState<ImportMappingResult | null>(null)
  const [showAdvancedView, setShowAdvancedView] = useState(false)

  useEffect(() => {
    if (enableAliasMapping) {
      loadAliases()
    }
    validateMapping()
  }, [mapping, enableAliasMapping])

  const loadAliases = async () => {
    try {
      const token = localStorage.getItem("admin_token")
      if (!token) return

      const response = await fetch("/api/admin/column-aliases?limit=200&is_active=true", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const result = await response.json()
      if (result.success) {
        setAliases(result.data || [])
      }
    } catch (error) {
      console.error("Error loading aliases:", error)
    }
  }

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

  const handleAutoMap = async () => {
    setLoading(true)
    try {
      if (enableAliasMapping && aliases.length > 0) {
        // Use enhanced auto-mapping with aliases
        const result = await autoMapColumnsWithAliases(detectedColumns, aliases)
        setMappingResult(result)

        // Convert enhanced mapping to simple mapping for backward compatibility
        const simpleMapping: ColumnMapping = {}
        Object.entries(result.mapping).forEach(([column, config]) => {
          simpleMapping[column] = config.database_field
        })

        setMapping(simpleMapping)
        setEnhancedMapping(result.mapping)
        setShowAdvancedView(true)
      } else {
        // Use legacy auto-mapping
        const autoMapping = autoMapColumns(detectedColumns)
        setMapping(autoMapping)
      }
    } catch (error) {
      console.error("Error in auto-mapping:", error)
    } finally {
      setLoading(false)
    }
  }

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800 border-green-200"
    if (score >= 50) return "bg-yellow-100 text-yellow-800 border-yellow-200"
    return "bg-red-100 text-red-800 border-red-200"
  }

  const getConfidenceIcon = (score: number) => {
    if (score >= 80) return <Check className="h-3 w-3" />
    if (score >= 50) return <AlertTriangle className="h-3 w-3" />
    return <X className="h-3 w-3" />
  }

  const getMappingTypeIcon = (type: string) => {
    switch (type) {
      case "exact": return <Check className="h-3 w-3 text-green-600" />
      case "alias": return <Target className="h-3 w-3 text-blue-600" />
      case "fuzzy": return <Zap className="h-3 w-3 text-yellow-600" />
      default: return <AlertTriangle className="h-3 w-3 text-gray-600" />
    }
  }

  const handleSaveSuccessfulMapping = async () => {
    if (!mappingResult || !fileName) return

    try {
      const token = localStorage.getItem("admin_token")
      if (!token) return

      const response = await fetch("/api/admin/mapping-configurations", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mapping: mappingResult.mapping,
          file_name: fileName,
          auto_generate_name: true
        }),
      })

      const result = await response.json()
      if (result.success) {
        // Show success message or notification
        console.log("Mapping saved successfully:", result.message)
      }
    } catch (error) {
      console.error("Error saving mapping:", error)
    }
  }

  const handleSave = () => {
    if (errors.length === 0) {
      // Save successful mapping configuration if available
      if (mappingResult && fileName && enableAliasMapping) {
        handleSaveSuccessfulMapping()
      }
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
            <div className="flex justify-center gap-4">
              <Button
                variant="outline"
                onClick={handleAutoMap}
                className="flex items-center gap-2 bg-transparent"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {enableAliasMapping ? "Smart Auto-Map" : "Tự Động Ánh Xạ"}
              </Button>

              {enableAliasMapping && (
                <Button
                  onClick={() => setShowAdvancedView(!showAdvancedView)}
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Target className="h-4 w-4" />
                  {showAdvancedView ? "Simple View" : "Advanced View"}
                </Button>
              )}
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

            {/* Enhanced Mapping Results */}
            {showAdvancedView && mappingResult && (
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Mapping Results Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <p className="text-sm text-green-600">High Confidence</p>
                        <p className="text-2xl font-bold text-green-700">
                          {mappingResult.confidence_summary.high_confidence}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-yellow-50 border-yellow-200">
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <p className="text-sm text-yellow-600">Medium Confidence</p>
                        <p className="text-2xl font-bold text-yellow-700">
                          {mappingResult.confidence_summary.medium_confidence}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-red-50 border-red-200">
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <p className="text-sm text-red-600">Low Confidence</p>
                        <p className="text-2xl font-bold text-red-700">
                          {mappingResult.confidence_summary.low_confidence}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-50 border-gray-200">
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Manual Required</p>
                        <p className="text-2xl font-bold text-gray-700">
                          {mappingResult.confidence_summary.manual_required}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Conflicts */}
                {mappingResult.conflicts.length > 0 && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Conflicts detected:</strong>
                      <ul className="mt-2 space-y-1">
                        {mappingResult.conflicts.map((conflict, index) => (
                          <li key={index} className="text-sm">
                            • {conflict.message}
                          </li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
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
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{column}</p>
                            {showAdvancedView && enhancedMapping[column] && (
                              <div className="flex items-center gap-1">
                                {getMappingTypeIcon(enhancedMapping[column].mapping_type)}
                                <Badge
                                  className={`text-xs ${getConfidenceColor(enhancedMapping[column].confidence_score)}`}
                                >
                                  {enhancedMapping[column].confidence_score}%
                                </Badge>
                              </div>
                            )}
                          </div>
                          {mapping[column] && (
                            <div>
                              <p className="text-sm text-gray-600">
                                →{" "}
                                {PAYROLL_FIELD_CONFIG.find((f) => f.field === mapping[column])?.label || mapping[column]}
                              </p>
                              {showAdvancedView && enhancedMapping[column]?.matched_alias && (
                                <p className="text-xs text-blue-600">
                                  via alias: "{enhancedMapping[column].matched_alias!.alias_name}"
                                </p>
                              )}
                            </div>
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
