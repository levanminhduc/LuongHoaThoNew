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
import { Loader2, Settings, FileSpreadsheet, Database, Save, Download } from "lucide-react"
import { ColumnMappingDialog } from "./column-mapping-dialog"
import { AdvancedImportResults } from "./advanced-import-results"
import { MappingConfigOverrideDialog } from "./mapping-config-override-dialog"
import {
  type ColumnMapping,
  type ImportResult,
  parseAdvancedExcelFiles,
  detectColumns,
  autoMapColumns,
  autoMapColumnsWithAliases,
} from "@/lib/advanced-excel-parser"
import {
  type ColumnAlias,
  type EnhancedColumnMapping,
  type ImportMappingResult,
  type MappingConfiguration
} from "@/lib/column-alias-config"
import {
  EnhancedImportValidator,
  type ValidationResult
} from "@/lib/enhanced-import-validation"
import {
  useMappingConfig,
  useAutoLoadConfigurations,
  useCurrentMappingConfig
} from "@/lib/hooks/use-mapping-config"
import { useMappingConfigSync } from "@/lib/sync/mapping-config-sync"

interface AdvancedSalaryImportProps {
  onImportComplete?: (result: ImportResult) => void
}

export function AdvancedSalaryImport({ onImportComplete }: AdvancedSalaryImportProps) {
  // Existing state
  const [files, setFiles] = useState<FileList | null>(null)
  const [importing, setImporting] = useState(false)
  const [showColumnMapping, setShowColumnMapping] = useState(false)
  const [detectedColumns, setDetectedColumns] = useState<string[]>([])
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([])
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [message, setMessage] = useState("")
  const [aliases, setAliases] = useState<ColumnAlias[]>([])
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [enhancedMappingResult, setEnhancedMappingResult] = useState<ImportMappingResult | null>(null)

  // New mapping configuration state
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null)
  const [showSaveConfigDialog, setShowSaveConfigDialog] = useState(false)
  const [showOverrideDialog, setShowOverrideDialog] = useState(false)
  const [previewMapping, setPreviewMapping] = useState<ColumnMapping | null>(null)
  const [autoAppliedConfig, setAutoAppliedConfig] = useState<MappingConfiguration | null>(null)

  // Mapping configuration hooks
  const {
    configurations,
    defaultConfig,
    isLoading: configLoading,
    error: configError,
    saveConfiguration,
    applyConfiguration,
    hasConfigurations,
    hasDefaultConfig,
    configById
  } = useMappingConfig()

  const { currentConfig, applyDefaultConfig, hasCurrentConfig } = useCurrentMappingConfig()
  const { isConnected: syncConnected } = useMappingConfigSync()

  // Auto-load configurations on mount
  useAutoLoadConfigurations()

  // Auto-apply default configuration when available
  useEffect(() => {
    if (hasDefaultConfig && defaultConfig && !hasCurrentConfig) {
      applyDefaultConfig()
      setAutoAppliedConfig(defaultConfig)
      setSelectedConfigId(defaultConfig.id!)
    }
  }, [hasDefaultConfig, defaultConfig, hasCurrentConfig, applyDefaultConfig])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (selectedFiles) {
      setFiles(selectedFiles)
      setImportResult(null)
      setMessage("")
      setPreviewMapping(null)
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

      // Try to apply saved mapping configuration first
      let appliedMapping: ColumnMapping | null = null

      if (currentConfig && currentConfig.field_mappings) {
        // Apply saved configuration
        appliedMapping = applySavedConfiguration(detected, currentConfig)
        setMessage(`Đã áp dụng configuration "${currentConfig.config_name}" với ${detected.length} cột`)
      } else {
        // Fallback to auto-mapping
        appliedMapping = autoMapColumns(detected)
        setMessage(`Phát hiện ${detected.length} cột trong file Excel (sử dụng auto-mapping)`)
      }

      // Set preview mapping
      setPreviewMapping(appliedMapping)
      setColumnMappings(Array.from({ length: files.length }, () => appliedMapping!))

      setShowColumnMapping(true)
    } catch (error) {
      setMessage("Lỗi khi phân tích file Excel")
      console.error("File analysis error:", error)
    } finally {
      setImporting(false)
    }
  }

  // Helper function to apply saved configuration
  const applySavedConfiguration = (detectedColumns: string[], config: MappingConfiguration): ColumnMapping => {
    const mapping: ColumnMapping = {}

    // Start with auto-mapping as base
    const autoMapping = autoMapColumns(detectedColumns)

    // Apply saved field mappings
    if (config.field_mappings) {
      config.field_mappings.forEach(fieldMapping => {
        // Find matching detected column
        const matchingColumn = detectedColumns.find(col =>
          col.toLowerCase() === fieldMapping.excel_column_name.toLowerCase() ||
          col.toLowerCase().includes(fieldMapping.excel_column_name.toLowerCase()) ||
          fieldMapping.excel_column_name.toLowerCase().includes(col.toLowerCase())
        )

        if (matchingColumn) {
          mapping[fieldMapping.database_field] = matchingColumn
        }
      })
    }

    // Fill in any missing mappings with auto-mapping
    Object.keys(autoMapping).forEach(dbField => {
      if (!mapping[dbField]) {
        mapping[dbField] = autoMapping[dbField]
      }
    })

    return mapping
  }

  const handleMappingSave = async (
    mapping: ColumnMapping,
    shouldSaveConfig?: boolean,
    newAliases?: Array<{database_field: string, alias_name: string, confidence_score: number}>
  ) => {
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

          // Save successful mapping configuration if requested
          if (shouldSaveConfig) {
            await handleSaveSuccessfulMapping(mapping, undefined, undefined, newAliases)
          }

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

  // Handle saving successful mapping as configuration
  const handleSaveSuccessfulMapping = async (
    mapping: ColumnMapping,
    configName?: string,
    description?: string,
    aliasesToSave?: Array<{database_field: string, alias_name: string, confidence_score: number}>
  ) => {
    try {
      const fieldMappings = Object.entries(mapping).map(([dbField, excelColumn]) => ({
        database_field: dbField,
        excel_column_name: excelColumn,
        confidence_score: 100, // High confidence for successful mapping
        mapping_type: 'manual' as const,
        validation_passed: true
      }))

      const finalConfigName = configName || `Import Success ${new Date().toLocaleDateString('vi-VN')}`
      const finalDescription = description || `Successful mapping configuration from import on ${new Date().toLocaleString('vi-VN')}`

      // Save configuration first
      const savedConfig = await saveConfiguration({
        config_name: finalConfigName,
        description: finalDescription,
        field_mappings: fieldMappings,
        is_default: false,
        is_active: true,
        created_by: 'admin'
      })

      // Save aliases if provided
      if (aliasesToSave && aliasesToSave.length > 0) {
        await saveAliasesForConfiguration(aliasesToSave, savedConfig.id!)
      }

      setMessage(prev => `${prev} - Configuration đã được lưu thành "${finalConfigName}"${aliasesToSave?.length ? ` với ${aliasesToSave.length} aliases` : ''}`)
    } catch (error) {
      console.error('Failed to save mapping configuration:', error)
      setMessage(prev => `${prev} - Lỗi khi lưu configuration: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Helper function to save aliases for a configuration
  const saveAliasesForConfiguration = async (
    aliases: Array<{database_field: string, alias_name: string, confidence_score: number}>,
    configId: number
  ) => {
    try {
      const token = localStorage.getItem("admin_token")
      if (!token) throw new Error("No admin token")

      for (const alias of aliases) {
        const response = await fetch("/api/admin/column-aliases", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            database_field: alias.database_field,
            alias_name: alias.alias_name,
            confidence_score: alias.confidence_score,
            config_id: configId // Link alias to configuration
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          console.warn(`Failed to save alias "${alias.alias_name}":`, error.message)
        }
      }
    } catch (error) {
      console.error('Failed to save aliases:', error)
    }
  }

  const handleMappingCancel = () => {
    setShowColumnMapping(false)
    setMessage("")
  }

  // Handle configuration override
  const handleConfigOverride = (config: MappingConfiguration) => {
    if (detectedColumns.length > 0) {
      const appliedMapping = applySavedConfiguration(detectedColumns, config)
      setPreviewMapping(appliedMapping)
      setColumnMappings(Array.from({ length: files?.length || 1 }, () => appliedMapping))
      setAutoAppliedConfig(config)
      setSelectedConfigId(config.id!)
      setMessage(`Đã áp dụng configuration "${config.config_name}"`)
    }
  }

  // Handle save current mapping as configuration
  const handleSaveCurrentAsConfig = (configName: string, description?: string) => {
    if (previewMapping) {
      handleSaveSuccessfulMapping(previewMapping, configName, description)
    }
  }

  // Handle download template based on current configuration
  const handleDownloadTemplate = async () => {
    if (!currentConfig?.id) return

    try {
      setMessage("Đang tạo template...")

      const token = localStorage.getItem("admin_token")
      if (!token) {
        setMessage("Không tìm thấy token xác thực")
        return
      }

      const response = await fetch(`/api/admin/generate-import-template?configId=${currentConfig.id}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Lỗi khi tạo template")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url

      const configName = response.headers.get("X-Config-Name") || currentConfig.config_name
      const timestamp = new Date().toISOString().slice(0, 10)
      a.download = `import-template-${configName.replace(/\s+/g, '-')}-${timestamp}.xlsx`

      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setMessage(`Đã tải template cho configuration "${configName}" thành công!`)

    } catch (error) {
      console.error("Download template error:", error)
      setMessage(error instanceof Error ? error.message : "Lỗi khi tải template")
    }
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

            {/* Configuration Selection */}
            {hasConfigurations && (
              <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-blue-600" />
                    <h3 className="font-medium text-blue-900">Column Mapping Configuration</h3>
                    {syncConnected && (
                      <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                        Sync Active
                      </Badge>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowOverrideDialog(true)}
                    className="text-xs"
                  >
                    <Settings className="h-3 w-3 mr-1" />
                    Manage
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="config-select">Chọn Configuration</Label>
                    <Select
                      value={selectedConfigId?.toString() || ""}
                      onValueChange={(value) => {
                        const configId = parseInt(value)
                        setSelectedConfigId(configId)
                        if (configId) {
                          applyConfiguration(configId)
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn mapping configuration..." />
                      </SelectTrigger>
                      <SelectContent>
                        {configurations.map((config) => (
                          <SelectItem key={config.id} value={config.id!.toString()}>
                            <div className="flex items-center gap-2">
                              <span>{config.config_name}</span>
                              {config.is_default && (
                                <Badge variant="secondary" className="text-xs">Default</Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {currentConfig && (
                    <div className="space-y-2">
                      <Label>Configuration hiện tại</Label>
                      <div className="p-2 bg-white rounded border">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{currentConfig.config_name}</span>
                          {currentConfig.is_default && (
                            <Badge variant="secondary" className="text-xs">Default</Badge>
                          )}
                        </div>
                        {currentConfig.description && (
                          <p className="text-sm text-gray-600 mt-1">{currentConfig.description}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {currentConfig.field_mappings?.length || 0} field mappings
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {autoAppliedConfig && (
                  <Alert>
                    <Settings className="h-4 w-4" />
                    <AlertDescription>
                      Đã tự động áp dụng configuration "{autoAppliedConfig.config_name}" làm mặc định.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

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

              {currentConfig && (
                <Button
                  variant="outline"
                  onClick={handleDownloadTemplate}
                  disabled={importing}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Tải Template
                </Button>
              )}
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
          onSave={(mapping, shouldSaveConfig, newAliases) => handleMappingSave(mapping, shouldSaveConfig, newAliases)}
          onCancel={handleMappingCancel}
          fileName={files?.[0]?.name}
          enableAliasMapping={true}
          enableSaveConfig={true}
          currentConfig={currentConfig}
          availableConfigs={configurations}
        />
      )}

      {/* Import Results */}
      {importResult && <AdvancedImportResults result={importResult} />}

      {/* Configuration Override Dialog */}
      <MappingConfigOverrideDialog
        open={showOverrideDialog}
        onOpenChange={setShowOverrideDialog}
        currentMapping={previewMapping || undefined}
        detectedColumns={detectedColumns}
        onApplyConfig={handleConfigOverride}
        onSaveAsConfig={handleSaveCurrentAsConfig}
      />
    </div>
  )
}
