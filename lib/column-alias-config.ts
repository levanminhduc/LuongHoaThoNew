/**
 * Column Alias Configuration System
 * Hệ thống cấu hình aliases cho column mapping linh hoạt
 */

export interface ColumnAlias {
  id?: number
  database_field: string
  alias_name: string
  confidence_score: number // 0-100, độ tin cậy của mapping
  is_active: boolean
  created_by: string
  created_at?: string
  updated_at?: string
}

export interface DatabaseFieldConfig {
  field: string
  label: string
  description: string
  type: "text" | "number" | "date"
  required: boolean
  category: string
  aliases: ColumnAlias[]
  default_value?: any
  validation_rules?: ValidationRule[]
}

export interface ValidationRule {
  type: "required" | "numeric" | "date_format" | "min_value" | "max_value" | "pattern"
  value?: any
  message: string
}

export interface MappingConfiguration {
  id?: number
  config_name: string
  description: string
  field_mappings: FieldMapping[]
  is_default: boolean
  is_active: boolean
  created_by: string
  created_at?: string
  updated_at?: string
}

export interface FieldMapping {
  database_field: string
  excel_column_name: string
  confidence_score: number
  mapping_type: "exact" | "fuzzy" | "manual" | "alias"
  validation_passed: boolean
}

export interface EnhancedColumnMapping {
  [excelColumn: string]: {
    database_field: string
    confidence_score: number
    mapping_type: "exact" | "fuzzy" | "manual" | "alias"
    matched_alias?: ColumnAlias
    validation_status: "valid" | "warning" | "error"
    validation_messages: string[]
  }
}

export interface ImportMappingResult {
  success: boolean
  mapping: EnhancedColumnMapping
  detected_columns: string[]
  unmapped_columns: string[]
  conflicts: MappingConflict[]
  suggestions: MappingSuggestion[]
  confidence_summary: {
    high_confidence: number // >= 80
    medium_confidence: number // 50-79
    low_confidence: number // < 50
    manual_required: number
  }
}

export interface MappingConflict {
  type: "duplicate_mapping" | "ambiguous_match" | "required_field_missing"
  database_field?: string
  excel_columns: string[]
  message: string
  severity: "error" | "warning"
  suggestions: string[]
}

export interface MappingSuggestion {
  excel_column: string
  suggested_field: string
  confidence_score: number
  reason: string
  alternative_matches: Array<{
    field: string
    score: number
    reason: string
  }>
}

export interface AliasManagementRequest {
  action: "create" | "update" | "delete" | "bulk_create"
  data: ColumnAlias | ColumnAlias[]
}

export interface AliasManagementResponse {
  success: boolean
  message: string
  data?: ColumnAlias | ColumnAlias[]
  errors?: string[]
}

export interface ConfigurationExportData {
  version: string
  exported_at: string
  exported_by: string
  field_configs: DatabaseFieldConfig[]
  mapping_configurations: MappingConfiguration[]
  total_aliases: number
}

export interface ConfigurationImportResult {
  success: boolean
  imported_aliases: number
  imported_configs: number
  skipped_items: number
  errors: Array<{
    item: string
    error: string
  }>
  warnings: string[]
}

// Utility types for API responses
export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  errors?: string[]
  meta?: {
    total: number
    page: number
    limit: number
  }
}

// Search and filter interfaces
export interface AliasSearchParams {
  database_field?: string
  alias_name?: string
  is_active?: boolean
  created_by?: string
  confidence_min?: number
  confidence_max?: number
  page?: number
  limit?: number
  sort_by?: "alias_name" | "confidence_score" | "created_at"
  sort_order?: "asc" | "desc"
}

export interface ConfigurationSearchParams {
  config_name?: string
  is_active?: boolean
  is_default?: boolean
  created_by?: string
  page?: number
  limit?: number
}

// Constants for validation and configuration
export const CONFIDENCE_LEVELS = {
  HIGH: 80,
  MEDIUM: 50,
  LOW: 20
} as const

export const MAPPING_TYPES = {
  EXACT: "exact",
  FUZZY: "fuzzy", 
  MANUAL: "manual",
  ALIAS: "alias"
} as const

export const VALIDATION_SEVERITY = {
  ERROR: "error",
  WARNING: "warning",
  INFO: "info"
} as const

// Helper functions for confidence scoring
export function calculateConfidenceScore(
  excelColumn: string,
  targetField: string,
  alias?: ColumnAlias
): number {
  if (alias) {
    return alias.confidence_score
  }

  const normalizedExcel = excelColumn.toLowerCase().trim()
  const normalizedTarget = targetField.toLowerCase().trim()

  // Exact match
  if (normalizedExcel === normalizedTarget) {
    return 100
  }

  // Contains match
  if (normalizedExcel.includes(normalizedTarget) || normalizedTarget.includes(normalizedExcel)) {
    return 75
  }

  // Fuzzy matching logic can be expanded here
  return 0
}

export function categorizeMappingConfidence(score: number): "high" | "medium" | "low" {
  if (score >= CONFIDENCE_LEVELS.HIGH) return "high"
  if (score >= CONFIDENCE_LEVELS.MEDIUM) return "medium"
  return "low"
}

export function validateMappingConfiguration(mapping: EnhancedColumnMapping): MappingConflict[] {
  const conflicts: MappingConflict[] = []
  const fieldUsage: { [field: string]: string[] } = {}

  // Check for duplicate mappings
  Object.entries(mapping).forEach(([excelColumn, config]) => {
    const field = config.database_field
    if (!fieldUsage[field]) {
      fieldUsage[field] = []
    }
    fieldUsage[field].push(excelColumn)
  })

  // Find conflicts
  Object.entries(fieldUsage).forEach(([field, columns]) => {
    if (columns.length > 1) {
      conflicts.push({
        type: "duplicate_mapping",
        database_field: field,
        excel_columns: columns,
        message: `Trường "${field}" được ánh xạ bởi nhiều cột Excel`,
        severity: "error",
        suggestions: [`Chỉ giữ lại một mapping cho trường "${field}"`]
      })
    }
  })

  return conflicts
}
