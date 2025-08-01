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
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { X, Check, AlertTriangle, RefreshCw, Save, Zap, Target, Plus, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
  type MappingConfiguration,
  CONFIDENCE_LEVELS,
  categorizeMappingConfidence
} from "@/lib/column-alias-config"

interface ColumnMappingDialogProps {
  detectedColumns: string[]
  initialMapping: ColumnMapping
  onSave: (
    mapping: ColumnMapping,
    shouldSaveConfig?: boolean,
    newAliases?: Array<{database_field: string, alias_name: string, confidence_score: number}>
  ) => void
  onCancel: () => void
  fileName?: string
  enableAliasMapping?: boolean
  enableSaveConfig?: boolean
  currentConfig?: MappingConfiguration | null
  availableConfigs?: MappingConfiguration[]
}

export function ColumnMappingDialog({
  detectedColumns,
  initialMapping,
  onSave,
  onCancel,
  fileName,
  enableAliasMapping = true,
  enableSaveConfig = false,
  currentConfig = null,
  availableConfigs = []
}: ColumnMappingDialogProps) {
  const [mapping, setMapping] = useState<ColumnMapping>(initialMapping)
  const [enhancedMapping, setEnhancedMapping] = useState<EnhancedColumnMapping>({})
  const [aliases, setAliases] = useState<ColumnAlias[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [mappingResult, setMappingResult] = useState<ImportMappingResult | null>(null)
  const [showAdvancedView, setShowAdvancedView] = useState(false)
  const [newAliases, setNewAliases] = useState<Array<{database_field: string, alias_name: string, confidence_score: number}>>([])
  const [showCreateAliasDialog, setShowCreateAliasDialog] = useState(false)
  const [createAliasColumn, setCreateAliasColumn] = useState<string>("")
  const [createAliasField, setCreateAliasField] = useState<string>("")

  // Save configuration state
  const [shouldSaveConfig, setShouldSaveConfig] = useState(false)
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(
    currentConfig?.id || null
  )

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

      // Pass new aliases along with mapping if saving config
      if (shouldSaveConfig && newAliases.length > 0) {
        // Call enhanced save function that includes aliases
        onSave(mapping, shouldSaveConfig, newAliases)
      } else {
        onSave(mapping, shouldSaveConfig)
      }
    }
  }

  // Handle creating new alias for unmapped column
  const handleCreateAlias = (excelColumn: string, databaseField: string) => {
    const newAlias = {
      database_field: databaseField,
      alias_name: excelColumn,
      confidence_score: 90
    }

    setNewAliases(prev => [...prev, newAlias])

    // Update mapping
    setMapping(prev => ({
      ...prev,
      [excelColumn]: databaseField
    }))

    setShowCreateAliasDialog(false)
  }

  // Handle removing created alias
  const handleRemoveNewAlias = (index: number) => {
    setNewAliases(prev => prev.filter((_, i) => i !== index))
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
            {/* Configuration Management */}
            {enableSaveConfig && (
              <Card className="bg-gray-50 border-gray-200">
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">Configuration Management</h4>
                      {currentConfig && (
                        <Badge variant="secondary" className="text-xs">
                          Using: {currentConfig.config_name}
                        </Badge>
                      )}
                    </div>

                    {availableConfigs.length > 0 && (
                      <div className="space-y-2">
                        <Label htmlFor="config-select" className="text-xs">Load Configuration</Label>
                        <Select
                          value={selectedConfigId?.toString() || ""}
                          onValueChange={(value) => {
                            const configId = value ? parseInt(value) : null
                            setSelectedConfigId(configId)
                            // TODO: Apply selected configuration to mapping
                          }}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Select configuration..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">No configuration</SelectItem>
                            {availableConfigs.map((config) => (
                              <SelectItem key={config.id} value={config.id!.toString()}>
                                <div className="flex items-center gap-2">
                                  <span>{config.config_name}</span>
                                  {config.is_default && (
                                    <Badge variant="outline" className="text-xs">Default</Badge>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={shouldSaveConfig}
                        onCheckedChange={setShouldSaveConfig}
                      />
                      <Label className="text-xs">Save this mapping as configuration</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

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
                              {!isMapped && enableAliasMapping && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setCreateAliasColumn(column)
                                    setCreateAliasField("")
                                    setShowCreateAliasDialog(true)
                                  }}
                                  className="ml-2 text-xs"
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Tạo Alias
                                </Button>
                              )}
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

            {/* New Aliases Section */}
            {newAliases.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4 text-green-600" />
                  <h4 className="font-medium text-green-600">Aliases Mới Sẽ Được Tạo ({newAliases.length})</h4>
                </div>
                <div className="grid gap-2">
                  {newAliases.map((alias, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
                      <div className="flex-1">
                        <span className="font-medium text-green-800">{alias.alias_name}</span>
                        <span className="text-green-600 mx-2">→</span>
                        <span className="text-green-700">{alias.database_field}</span>
                        <Badge variant="outline" className="ml-2 text-green-600 border-green-300">
                          {alias.confidence_score}%
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveNewAlias(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Separator />
              </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onCancel}>
                Hủy
              </Button>
              <Button onClick={handleSave} disabled={errors.length > 0} className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                Lưu Cấu Hình
                {newAliases.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    +{newAliases.length} aliases
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Alias Dialog */}
      <Dialog open={showCreateAliasDialog} onOpenChange={setShowCreateAliasDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo Alias Mới</DialogTitle>
            <DialogDescription>
              Tạo alias cho column "{createAliasColumn}" để tự động mapping trong tương lai
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="excel-column">Excel Column</Label>
              <Input
                id="excel-column"
                value={createAliasColumn}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div>
              <Label htmlFor="database-field">Database Field</Label>
              <Select onValueChange={(value) => setCreateAliasField(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn database field..." />
                </SelectTrigger>
                <SelectContent>
                  {PAYROLL_FIELD_CONFIG.map((field) => (
                    <SelectItem key={field.field} value={field.field}>
                      {field.label} ({field.field})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateAliasDialog(false)}>
              Hủy
            </Button>
            <Button
              onClick={() => {
                if (createAliasField && createAliasColumn) {
                  handleCreateAlias(createAliasColumn, createAliasField)
                }
              }}
              disabled={!createAliasField}
            >
              Tạo Alias
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
