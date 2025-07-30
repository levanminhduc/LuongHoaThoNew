/**
 * Enhanced Import Validation System
 * Comprehensive validation for Excel import with alias support
 */

import { 
  type EnhancedColumnMapping, 
  type MappingConflict, 
  type ColumnAlias,
  CONFIDENCE_LEVELS 
} from "./column-alias-config"
import { PAYROLL_FIELD_CONFIG } from "./advanced-excel-parser"

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  suggestions: ValidationSuggestion[]
  summary: ValidationSummary
}

export interface ValidationError {
  type: "missing_required" | "duplicate_mapping" | "invalid_field" | "low_confidence"
  field?: string
  excel_column?: string
  message: string
  severity: "critical" | "high" | "medium"
  fix_suggestion?: string
}

export interface ValidationWarning {
  type: "low_confidence" | "unused_column" | "potential_mismatch"
  field?: string
  excel_column?: string
  message: string
  confidence_score?: number
}

export interface ValidationSuggestion {
  excel_column: string
  suggested_field: string
  confidence_score: number
  reason: string
  action: "map" | "review" | "ignore"
}

export interface ValidationSummary {
  total_columns: number
  mapped_columns: number
  unmapped_columns: number
  required_fields_missing: number
  high_confidence_mappings: number
  medium_confidence_mappings: number
  low_confidence_mappings: number
  critical_errors: number
  warnings: number
}

export class EnhancedImportValidator {
  private requiredFields: string[]
  private aliases: ColumnAlias[]

  constructor(aliases: ColumnAlias[] = []) {
    this.aliases = aliases
    this.requiredFields = PAYROLL_FIELD_CONFIG
      .filter(field => field.required)
      .map(field => field.field)
  }

  /**
   * Comprehensive validation of column mapping
   */
  validateMapping(
    detectedColumns: string[],
    mapping: EnhancedColumnMapping
  ): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    const suggestions: ValidationSuggestion[] = []

    // 1. Check for required fields
    this.validateRequiredFields(mapping, errors)

    // 2. Check for duplicate mappings
    this.validateDuplicateMappings(mapping, errors)

    // 3. Check confidence levels
    this.validateConfidenceLevels(mapping, errors, warnings)

    // 4. Check for unmapped columns
    const unmappedColumns = this.findUnmappedColumns(detectedColumns, mapping)
    this.generateSuggestionsForUnmapped(unmappedColumns, suggestions)

    // 5. Validate field existence
    this.validateFieldExistence(mapping, errors)

    // 6. Check for potential mismatches
    this.validatePotentialMismatches(mapping, warnings)

    const summary = this.generateSummary(detectedColumns, mapping, errors, warnings)

    return {
      isValid: errors.filter(e => e.severity === "critical").length === 0,
      errors,
      warnings,
      suggestions,
      summary
    }
  }

  /**
   * Validate that all required fields are mapped
   */
  private validateRequiredFields(
    mapping: EnhancedColumnMapping,
    errors: ValidationError[]
  ): void {
    const mappedFields = new Set(
      Object.values(mapping).map(config => config.database_field)
    )

    this.requiredFields.forEach(requiredField => {
      if (!mappedFields.has(requiredField)) {
        const fieldConfig = PAYROLL_FIELD_CONFIG.find(f => f.field === requiredField)
        errors.push({
          type: "missing_required",
          field: requiredField,
          message: `Trường bắt buộc "${fieldConfig?.label || requiredField}" chưa được ánh xạ`,
          severity: "critical",
          fix_suggestion: `Hãy ánh xạ một cột Excel với trường "${fieldConfig?.label}"`
        })
      }
    })
  }

  /**
   * Check for duplicate field mappings
   */
  private validateDuplicateMappings(
    mapping: EnhancedColumnMapping,
    errors: ValidationError[]
  ): void {
    const fieldUsage: { [field: string]: string[] } = {}

    Object.entries(mapping).forEach(([excelColumn, config]) => {
      const field = config.database_field
      if (!fieldUsage[field]) {
        fieldUsage[field] = []
      }
      fieldUsage[field].push(excelColumn)
    })

    Object.entries(fieldUsage).forEach(([field, columns]) => {
      if (columns.length > 1) {
        const fieldConfig = PAYROLL_FIELD_CONFIG.find(f => f.field === field)
        errors.push({
          type: "duplicate_mapping",
          field,
          message: `Trường "${fieldConfig?.label || field}" được ánh xạ bởi nhiều cột: ${columns.join(', ')}`,
          severity: "critical",
          fix_suggestion: `Chỉ giữ lại một mapping cho trường "${fieldConfig?.label || field}"`
        })
      }
    })
  }

  /**
   * Validate confidence levels and flag low confidence mappings
   */
  private validateConfidenceLevels(
    mapping: EnhancedColumnMapping,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    Object.entries(mapping).forEach(([excelColumn, config]) => {
      const { confidence_score, database_field } = config
      const fieldConfig = PAYROLL_FIELD_CONFIG.find(f => f.field === database_field)

      if (confidence_score < 30) {
        errors.push({
          type: "low_confidence",
          excel_column: excelColumn,
          field: database_field,
          message: `Mapping "${excelColumn}" → "${fieldConfig?.label}" có độ tin cậy rất thấp (${confidence_score}%)`,
          severity: "high",
          fix_suggestion: "Kiểm tra lại mapping này hoặc tìm cột phù hợp hơn"
        })
      } else if (confidence_score < CONFIDENCE_LEVELS.MEDIUM) {
        warnings.push({
          type: "low_confidence",
          excel_column: excelColumn,
          field: database_field,
          message: `Mapping "${excelColumn}" → "${fieldConfig?.label}" có độ tin cậy thấp (${confidence_score}%)`,
          confidence_score
        })
      }
    })
  }

  /**
   * Find unmapped columns
   */
  private findUnmappedColumns(
    detectedColumns: string[],
    mapping: EnhancedColumnMapping
  ): string[] {
    return detectedColumns.filter(column => !mapping[column])
  }

  /**
   * Generate suggestions for unmapped columns
   */
  private generateSuggestionsForUnmapped(
    unmappedColumns: string[],
    suggestions: ValidationSuggestion[]
  ): void {
    unmappedColumns.forEach(column => {
      const suggestion = this.findBestSuggestion(column)
      if (suggestion) {
        suggestions.push(suggestion)
      }
    })
  }

  /**
   * Find best suggestion for an unmapped column
   */
  private findBestSuggestion(column: string): ValidationSuggestion | null {
    const normalizedColumn = column.toLowerCase().trim()
    let bestMatch: { field: string; score: number; reason: string } | null = null

    // Check aliases
    this.aliases.forEach(alias => {
      const aliasName = alias.alias_name.toLowerCase()
      let score = 0
      let reason = ""

      if (aliasName.includes(normalizedColumn) || normalizedColumn.includes(aliasName)) {
        score = alias.confidence_score * 0.8
        reason = `Khớp với alias "${alias.alias_name}"`
      }

      if (score > (bestMatch?.score || 0)) {
        bestMatch = { field: alias.database_field, score, reason }
      }
    })

    // Check field labels
    PAYROLL_FIELD_CONFIG.forEach(fieldConfig => {
      const fieldLabel = fieldConfig.label.toLowerCase()
      let score = 0
      let reason = ""

      if (fieldLabel.includes(normalizedColumn) || normalizedColumn.includes(fieldLabel)) {
        score = 60
        reason = `Khớp với label "${fieldConfig.label}"`
      }

      if (score > (bestMatch?.score || 0)) {
        bestMatch = { field: fieldConfig.field, score, reason }
      }
    })

    if (bestMatch && bestMatch.score > 30) {
      return {
        excel_column: column,
        suggested_field: bestMatch.field,
        confidence_score: bestMatch.score,
        reason: bestMatch.reason,
        action: bestMatch.score > 70 ? "map" : "review"
      }
    }

    return null
  }

  /**
   * Validate that mapped fields exist in configuration
   */
  private validateFieldExistence(
    mapping: EnhancedColumnMapping,
    errors: ValidationError[]
  ): void {
    const validFields = new Set(PAYROLL_FIELD_CONFIG.map(f => f.field))

    Object.entries(mapping).forEach(([excelColumn, config]) => {
      if (!validFields.has(config.database_field)) {
        errors.push({
          type: "invalid_field",
          excel_column: excelColumn,
          field: config.database_field,
          message: `Trường "${config.database_field}" không tồn tại trong hệ thống`,
          severity: "critical",
          fix_suggestion: "Chọn một trường hợp lệ từ danh sách"
        })
      }
    })
  }

  /**
   * Check for potential mismatches based on data types
   */
  private validatePotentialMismatches(
    mapping: EnhancedColumnMapping,
    warnings: ValidationWarning[]
  ): void {
    Object.entries(mapping).forEach(([excelColumn, config]) => {
      const fieldConfig = PAYROLL_FIELD_CONFIG.find(f => f.field === config.database_field)
      if (!fieldConfig) return

      // Check for potential type mismatches based on column name patterns
      const columnLower = excelColumn.toLowerCase()
      
      if (fieldConfig.type === "number" && 
          !columnLower.includes("số") && 
          !columnLower.includes("tiền") &&
          !columnLower.includes("lương") &&
          !/\d/.test(columnLower)) {
        warnings.push({
          type: "potential_mismatch",
          excel_column: excelColumn,
          field: config.database_field,
          message: `Cột "${excelColumn}" có thể không phải là số nhưng được ánh xạ với trường số "${fieldConfig.label}"`
        })
      }
    })
  }

  /**
   * Generate validation summary
   */
  private generateSummary(
    detectedColumns: string[],
    mapping: EnhancedColumnMapping,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): ValidationSummary {
    const mappedColumns = Object.keys(mapping).length
    const mappingValues = Object.values(mapping)

    return {
      total_columns: detectedColumns.length,
      mapped_columns: mappedColumns,
      unmapped_columns: detectedColumns.length - mappedColumns,
      required_fields_missing: errors.filter(e => e.type === "missing_required").length,
      high_confidence_mappings: mappingValues.filter(m => m.confidence_score >= CONFIDENCE_LEVELS.HIGH).length,
      medium_confidence_mappings: mappingValues.filter(m => 
        m.confidence_score >= CONFIDENCE_LEVELS.MEDIUM && m.confidence_score < CONFIDENCE_LEVELS.HIGH
      ).length,
      low_confidence_mappings: mappingValues.filter(m => m.confidence_score < CONFIDENCE_LEVELS.MEDIUM).length,
      critical_errors: errors.filter(e => e.severity === "critical").length,
      warnings: warnings.length
    }
  }
}
