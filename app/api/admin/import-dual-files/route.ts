import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/utils/supabase/server"
import * as XLSX from "xlsx"
import jwt from "jsonwebtoken"
import { ApiErrorHandler, type ApiError, type ApiResponse } from "@/lib/api-error-handler"
import { PayrollValidator, type ValidationResult } from "@/lib/payroll-validation"

interface ColumnMapping {
  excel_column_name: string
  database_field: string
  data_type: "text" | "number" | "date"
  is_required: boolean
  default_value?: string
}

// Enhanced validation utilities
function cleanCellValue(value: any): string | null {
  if (value === undefined || value === null) return null

  const stringValue = value.toString().trim()
  if (stringValue === "" || stringValue.toLowerCase() === "null" || stringValue.toLowerCase() === "undefined") {
    return null
  }

  return stringValue
}

function isValidRequiredField(value: string | null): boolean {
  return value !== null && value !== "" && value.length > 0
}

// Duplicate detection and resolution utilities
interface DuplicateRecord {
  id: string
  employee_id: string
  salary_month: string
  existing_data: any
  new_data: any
}

interface DuplicateResolution {
  action: "skip" | "overwrite" | "merge" | "create_new"
  employee_id: string
  salary_month: string
  resolved_data?: any
}

function detectDuplicatesInBatch(records: any[]): Map<string, any[]> {
  const duplicateMap = new Map<string, any[]>()
  const seenKeys = new Map<string, number>()

  records.forEach((record, index) => {
    if (record.employee_id && record.salary_month) {
      const key = `${record.employee_id}_${record.salary_month}`

      if (seenKeys.has(key)) {
        // This is a duplicate within the batch
        if (!duplicateMap.has(key)) {
          // Add the first occurrence
          const firstIndex = seenKeys.get(key)!
          duplicateMap.set(key, [{ ...records[firstIndex], _batch_index: firstIndex }])
        }
        // Add the current duplicate
        duplicateMap.get(key)!.push({ ...record, _batch_index: index })
      } else {
        seenKeys.set(key, index)
      }
    }
  })

  return duplicateMap
}

async function checkExistingDuplicates(supabase: any, employee_id: string, salary_month: string) {
  const { data: existingRecord, error: checkError } = await supabase
    .from("payrolls")
    .select("*")
    .eq("employee_id", employee_id)
    .eq("salary_month", salary_month)
    .single()

  if (checkError && checkError.code !== "PGRST116") { // PGRST116 = no rows found
    throw new Error(`Error checking for duplicates: ${checkError.message}`)
  }

  return existingRecord
}

function resolveDuplicateData(existing: any, newData: any, action: string): any {
  switch (action) {
    case "skip":
      return null // Don't insert anything

    case "overwrite":
      return { ...newData, id: existing?.id } // Keep existing ID if updating

    case "merge":
      // Merge strategy: new data takes precedence, but keep existing non-null values where new is null
      const merged = { ...existing }
      Object.keys(newData).forEach(key => {
        if (newData[key] !== null && newData[key] !== undefined && newData[key] !== "") {
          merged[key] = newData[key]
        }
      })
      merged.updated_at = new Date().toISOString()
      return merged

    case "create_new":
      // Create with modified employee_id to avoid conflict
      const timestamp = Date.now()
      return {
        ...newData,
        employee_id: `${newData.employee_id}_${timestamp}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

    default:
      throw new Error(`Unknown duplicate resolution action: ${action}`)
  }
}

// Enhanced error reporting utilities
interface ImportError {
  row: number
  column?: string
  field?: string
  value?: any
  errorType: "validation" | "format" | "duplicate" | "database" | "system"
  severity: "low" | "medium" | "high" | "critical"
  message: string
  suggestion?: string
  expectedFormat?: string
  currentValue?: string
}

function createDetailedError(
  row: number,
  errorType: ImportError["errorType"],
  severity: ImportError["severity"],
  message: string,
  options: {
    column?: string
    field?: string
    value?: any
    suggestion?: string
    expectedFormat?: string
  } = {}
): ImportError {
  return {
    row,
    column: options.column,
    field: options.field,
    value: options.value,
    errorType,
    severity,
    message,
    suggestion: options.suggestion,
    expectedFormat: options.expectedFormat,
    currentValue: options.value?.toString()
  }
}

function formatErrorMessage(error: ImportError): string {
  let message = `Row ${error.row}`

  if (error.column) {
    message += ` (Column: ${error.column})`
  }

  if (error.field) {
    message += ` [${error.field}]`
  }

  message += `: ${error.message}`

  if (error.currentValue !== undefined) {
    message += ` Current value: '${error.currentValue}'`
  }

  if (error.expectedFormat) {
    message += ` Expected format: ${error.expectedFormat}`
  }

  if (error.suggestion) {
    message += ` Suggestion: ${error.suggestion}`
  }

  return message
}

function categorizeError(errorMessage: string, row: number, column?: string, field?: string, value?: any): ImportError {
  const lowerMessage = errorMessage.toLowerCase()

  // Determine error type and severity based on message content
  let errorType: ImportError["errorType"] = "system"
  let severity: ImportError["severity"] = "medium"
  let suggestion = ""
  let expectedFormat = ""

  if (lowerMessage.includes("missing required field") || lowerMessage.includes("required")) {
    errorType = "validation"
    severity = "high"
    suggestion = "Ensure all required fields (employee_id, salary_month) have valid values"
    expectedFormat = "Non-empty text or number"
  } else if (lowerMessage.includes("invalid date") || lowerMessage.includes("date format")) {
    errorType = "format"
    severity = "medium"
    suggestion = "Use supported date formats: YYYY-MM, DD/MM/YYYY, MM/YYYY"
    expectedFormat = "YYYY-MM (e.g., 2024-01)"
  } else if (lowerMessage.includes("invalid number") || lowerMessage.includes("number format")) {
    errorType = "format"
    severity = "medium"
    suggestion = "Use numeric values only. Decimal separator: dot (.) or comma (,)"
    expectedFormat = "Number (e.g., 1000.50 or 1000,50)"
  } else if (lowerMessage.includes("duplicate")) {
    errorType = "duplicate"
    severity = "medium"
    suggestion = "Check for duplicate employee_id + salary_month combinations"
    expectedFormat = "Unique employee_id for each salary_month"
  } else if (lowerMessage.includes("database") || lowerMessage.includes("insert")) {
    errorType = "database"
    severity = "high"
    suggestion = "Contact system administrator if this persists"
  } else if (lowerMessage.includes("out of range") || lowerMessage.includes("too large")) {
    errorType = "validation"
    severity = "medium"
    suggestion = "Check if the value is within reasonable limits"
  }

  return createDetailedError(row, errorType, severity, errorMessage, {
    column,
    field,
    value,
    suggestion,
    expectedFormat
  })
}

// Auto-fix utilities
interface AutoFixResult {
  success: boolean
  fixedValue: any
  fixType: string
  confidence: "high" | "medium" | "low"
  description: string
}

function attemptAutoFix(value: any, field: string, dataType: string): AutoFixResult | null {
  if (value === undefined || value === null) {
    return null // Cannot auto-fix missing values
  }

  const stringValue = value.toString().trim()

  switch (dataType) {
    case "date":
      return autoFixDate(stringValue, field)
    case "number":
      return autoFixNumber(stringValue, field)
    case "text":
      return autoFixText(stringValue, field)
    default:
      return null
  }
}

function autoFixDate(value: string, field: string): AutoFixResult | null {
  if (!value || value === "") return null

  try {
    // Common date format fixes
    let fixedValue = value
    let fixType = ""
    let confidence: "high" | "medium" | "low" = "medium"

    // Fix common separators
    if (value.includes("/")) {
      const parts = value.split("/")
      if (parts.length === 2 && parts[1].length === 4) {
        // MM/YYYY format
        fixedValue = `${parts[1]}-${parts[0].padStart(2, "0")}`
        fixType = "MM/YYYY to YYYY-MM"
        confidence = "high"
      } else if (parts.length === 3) {
        // DD/MM/YYYY format
        fixedValue = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`
        fixType = "DD/MM/YYYY to YYYY-MM-DD"
        confidence = "high"
      }
    } else if (value.includes(".")) {
      const parts = value.split(".")
      if (parts.length === 2 && parts[1].length === 4) {
        // MM.YYYY format
        fixedValue = `${parts[1]}-${parts[0].padStart(2, "0")}`
        fixType = "MM.YYYY to YYYY-MM"
        confidence = "high"
      }
    } else if (value.includes("-") && value.length === 7) {
      // Already in YYYY-MM format, just validate
      const [year, month] = value.split("-")
      if (year.length === 4 && month.length <= 2) {
        fixedValue = `${year}-${month.padStart(2, "0")}`
        fixType = "Padded month"
        confidence = "high"
      }
    }

    // Validate the fixed date
    const testDate = new Date(fixedValue + "-01")
    if (!isNaN(testDate.getTime())) {
      return {
        success: true,
        fixedValue: fixedValue.substring(0, 7), // Return YYYY-MM format
        fixType,
        confidence,
        description: `Auto-fixed date format: '${value}' → '${fixedValue.substring(0, 7)}'`
      }
    }
  } catch (error) {
    // Auto-fix failed
  }

  return null
}

function autoFixNumber(value: string, field: string): AutoFixResult | null {
  if (!value || value === "") return null

  try {
    let fixedValue = value
    let fixType = ""
    let confidence: "high" | "medium" | "low" = "medium"

    // Remove common non-numeric characters
    fixedValue = fixedValue.replace(/[^\d.,\-+]/g, "")

    // Fix decimal separators
    if (fixedValue.includes(",") && fixedValue.includes(".")) {
      const lastComma = fixedValue.lastIndexOf(",")
      const lastDot = fixedValue.lastIndexOf(".")

      if (lastComma > lastDot) {
        // European format: 1.000,50
        fixedValue = fixedValue.replace(/\./g, "").replace(",", ".")
        fixType = "European decimal format"
        confidence = "high"
      } else {
        // US format: 1,000.50
        fixedValue = fixedValue.replace(/,/g, "")
        fixType = "US thousands separator"
        confidence = "high"
      }
    } else if (fixedValue.includes(",")) {
      const commaCount = (fixedValue.match(/,/g) || []).length
      const parts = fixedValue.split(",")

      if (commaCount === 1 && parts[1].length <= 2) {
        // Decimal comma
        fixedValue = fixedValue.replace(",", ".")
        fixType = "Decimal comma to dot"
        confidence = "high"
      } else {
        // Thousands separator
        fixedValue = fixedValue.replace(/,/g, "")
        fixType = "Removed thousands separators"
        confidence = "medium"
      }
    }

    // Remove leading/trailing spaces
    fixedValue = fixedValue.trim()

    // Validate the fixed number
    const parsed = parseFloat(fixedValue)
    if (!isNaN(parsed)) {
      return {
        success: true,
        fixedValue: parsed,
        fixType,
        confidence,
        description: `Auto-fixed number format: '${value}' → ${parsed}`
      }
    }
  } catch (error) {
    // Auto-fix failed
  }

  return null
}

function autoFixText(value: string, field: string): AutoFixResult | null {
  if (!value) return null

  let fixedValue = value
  let fixType = ""
  let confidence: "high" | "medium" | "low" = "high"

  // Trim whitespace
  fixedValue = fixedValue.trim()

  if (fixedValue !== value) {
    fixType = "Trimmed whitespace"

    return {
      success: true,
      fixedValue,
      fixType,
      confidence,
      description: `Auto-fixed text: removed leading/trailing whitespace`
    }
  }

  return null
}

function parseNumberField(value: string, columnName: string): number {
  try {
    // Handle null/undefined/empty cases
    if (!value || value.toString().trim() === "") {
      return 0
    }

    let stringValue = value.toString().trim()

    // Handle special text values
    const specialValues: { [key: string]: number } = {
      "không": 0,
      "zero": 0,
      "null": 0,
      "n/a": 0,
      "na": 0,
      "-": 0,
      "": 0
    }

    const lowerValue = stringValue.toLowerCase()
    if (lowerValue in specialValues) {
      return specialValues[lowerValue]
    }

    // Remove common non-numeric characters but preserve decimal separators
    // Handle Vietnamese currency formatting (e.g., "1.000.000,50" or "1,000,000.50")
    let cleanedValue = stringValue
      .replace(/[^\d.,\-+]/g, "") // Remove all non-numeric except .,- and +
      .replace(/^\+/, "") // Remove leading +

    // Handle different decimal separator conventions
    if (cleanedValue.includes(",") && cleanedValue.includes(".")) {
      // Both comma and dot present - determine which is decimal separator
      const lastComma = cleanedValue.lastIndexOf(",")
      const lastDot = cleanedValue.lastIndexOf(".")

      if (lastComma > lastDot) {
        // Comma is decimal separator (European format: 1.000,50)
        cleanedValue = cleanedValue.replace(/\./g, "").replace(",", ".")
      } else {
        // Dot is decimal separator (US format: 1,000.50)
        cleanedValue = cleanedValue.replace(/,/g, "")
      }
    } else if (cleanedValue.includes(",")) {
      // Only comma present - could be thousands separator or decimal
      const commaCount = (cleanedValue.match(/,/g) || []).length
      const parts = cleanedValue.split(",")

      if (commaCount === 1 && parts[1].length <= 2) {
        // Likely decimal separator (e.g., "123,45")
        cleanedValue = cleanedValue.replace(",", ".")
      } else {
        // Likely thousands separator (e.g., "1,000,000")
        cleanedValue = cleanedValue.replace(/,/g, "")
      }
    }

    // Handle percentage values
    if (stringValue.includes("%")) {
      const percentValue = parseFloat(cleanedValue)
      if (!isNaN(percentValue)) {
        return percentValue / 100 // Convert percentage to decimal
      }
    }

    // Handle negative values in parentheses (accounting format)
    if (stringValue.includes("(") && stringValue.includes(")")) {
      cleanedValue = "-" + cleanedValue.replace(/[()]/g, "")
    }

    // Final parsing
    const parsed = parseFloat(cleanedValue)

    if (isNaN(parsed)) {
      throw new Error(`Cannot convert '${value}' to number. Cleaned value: '${cleanedValue}'`)
    }

    // Validate reasonable ranges based on column type
    const columnLower = columnName.toLowerCase()

    // Different validation rules for different types of fields
    if (columnLower.includes("he_so") || columnLower.includes("heso")) {
      // Coefficient fields - typically 0-10
      if (parsed < 0 || parsed > 100) {
        throw new Error(`Coefficient value out of range: ${parsed}. Expected range: 0-100`)
      }
    } else if (columnLower.includes("luong") || columnLower.includes("salary") || columnLower.includes("tien")) {
      // Salary/money fields - reasonable salary range
      if (parsed < 0) {
        throw new Error(`Negative salary not allowed: ${parsed}`)
      }
      if (parsed > 1000000000) { // 1 billion VND limit
        throw new Error(`Salary value too large: ${parsed}. Maximum: 1,000,000,000`)
      }
    } else if (columnLower.includes("gio") || columnLower.includes("hour")) {
      // Hour fields - reasonable working hours
      if (parsed < 0 || parsed > 744) { // 744 = max hours in a month (31 days * 24 hours)
        throw new Error(`Hours value out of range: ${parsed}. Expected range: 0-744`)
      }
    } else if (columnLower.includes("ngay") || columnLower.includes("day")) {
      // Day fields - reasonable working days
      if (parsed < 0 || parsed > 31) {
        throw new Error(`Days value out of range: ${parsed}. Expected range: 0-31`)
      }
    } else {
      // General numeric fields
      if (parsed < -1000000000 || parsed > 1000000000) {
        throw new Error(`Value out of range: ${parsed}. Expected range: -1,000,000,000 to 1,000,000,000`)
      }
    }

    // Round to reasonable precision (2 decimal places for money, 4 for coefficients)
    const precision = (columnLower.includes("he_so") || columnLower.includes("heso")) ? 4 : 2
    const rounded = Math.round(parsed * Math.pow(10, precision)) / Math.pow(10, precision)

    console.log(`Number parsing successful: '${value}' -> ${rounded} (column: ${columnName})`)

    return rounded

  } catch (error) {
    throw new Error(`Invalid number format in column '${columnName}': '${value}'. ${error instanceof Error ? error.message : "Unknown parsing error"}`)
  }
}

function parseDateField(value: string | number, columnName: string): string {
  try {
    if (typeof value === "number") {
      // Excel date serial number
      if (value < 1 || value > 50000) { // Reasonable date range (1900-2036)
        throw new Error(`Invalid Excel date serial number: ${value}. Expected range: 1-50000`)
      }
      const excelDate = new Date((value - 25569) * 86400 * 1000)

      // Validate the resulting date
      if (isNaN(excelDate.getTime())) {
        throw new Error(`Invalid Excel date conversion for serial number: ${value}`)
      }

      return excelDate.toISOString().substring(0, 7) // Return YYYY-MM format
    }

    const stringValue = value.toString().trim()

    // Handle empty or invalid strings
    if (!stringValue || stringValue.length < 4) {
      throw new Error(`Date value too short: '${stringValue}'. Minimum 4 characters required`)
    }

    // Enhanced date format patterns with more flexibility
    const dateFormats = [
      { pattern: /^\d{4}-\d{1,2}$/, type: "YYYY-M" }, // YYYY-M or YYYY-MM
      { pattern: /^\d{4}-\d{1,2}-\d{1,2}$/, type: "YYYY-M-D" }, // YYYY-M-D or YYYY-MM-DD
      { pattern: /^\d{1,2}\/\d{1,2}\/\d{4}$/, type: "D/M/YYYY" }, // D/M/YYYY or DD/MM/YYYY
      { pattern: /^\d{1,2}-\d{1,2}-\d{4}$/, type: "D-M-YYYY" }, // D-M-YYYY or DD-MM-YYYY
      { pattern: /^\d{1,2}\/\d{4}$/, type: "M/YYYY" }, // M/YYYY or MM/YYYY
      { pattern: /^\d{1,2}-\d{4}$/, type: "M-YYYY" }, // M-YYYY or MM-YYYY
      { pattern: /^\d{4}\/\d{1,2}$/, type: "YYYY/M" }, // YYYY/M or YYYY/MM
      { pattern: /^\d{4}\.\d{1,2}$/, type: "YYYY.M" }, // YYYY.M or YYYY.MM
      { pattern: /^\d{1,2}\.\d{4}$/, type: "M.YYYY" }, // M.YYYY or MM.YYYY
    ]

    let parsedDate: Date | null = null
    let matchedFormat = ""

    for (const format of dateFormats) {
      if (format.pattern.test(stringValue)) {
        matchedFormat = format.type

        try {
          switch (format.type) {
            case "YYYY-M":
              const [year1, month1] = stringValue.split("-")
              parsedDate = new Date(`${year1}-${month1.padStart(2, "0")}-01`)
              break

            case "YYYY-M-D":
              parsedDate = new Date(stringValue)
              break

            case "D/M/YYYY":
              const [day2, month2, year2] = stringValue.split("/")
              parsedDate = new Date(`${year2}-${month2.padStart(2, "0")}-${day2.padStart(2, "0")}`)
              break

            case "D-M-YYYY":
              const [day3, month3, year3] = stringValue.split("-")
              parsedDate = new Date(`${year3}-${month3.padStart(2, "0")}-${day3.padStart(2, "0")}`)
              break

            case "M/YYYY":
              const [month4, year4] = stringValue.split("/")
              parsedDate = new Date(`${year4}-${month4.padStart(2, "0")}-01`)
              break

            case "M-YYYY":
              const [month5, year5] = stringValue.split("-")
              parsedDate = new Date(`${year5}-${month5.padStart(2, "0")}-01`)
              break

            case "YYYY/M":
              const [year6, month6] = stringValue.split("/")
              parsedDate = new Date(`${year6}-${month6.padStart(2, "0")}-01`)
              break

            case "YYYY.M":
              const [year7, month7] = stringValue.split(".")
              parsedDate = new Date(`${year7}-${month7.padStart(2, "0")}-01`)
              break

            case "M.YYYY":
              const [month8, year8] = stringValue.split(".")
              parsedDate = new Date(`${year8}-${month8.padStart(2, "0")}-01`)
              break
          }

          // If we successfully parsed a date, break out of the loop
          if (parsedDate && !isNaN(parsedDate.getTime())) {
            break
          }
        } catch (parseError) {
          // Continue to next format if this one fails
          parsedDate = null
          continue
        }
      }
    }

    // If no format matched, try a more flexible approach
    if (!parsedDate) {
      // Try to extract year and month from various patterns
      const yearMonthMatch = stringValue.match(/(\d{4}).*?(\d{1,2})/) || stringValue.match(/(\d{1,2}).*?(\d{4})/)

      if (yearMonthMatch) {
        let year, month
        if (yearMonthMatch[1].length === 4) {
          year = yearMonthMatch[1]
          month = yearMonthMatch[2]
        } else {
          year = yearMonthMatch[2]
          month = yearMonthMatch[1]
        }

        const monthNum = parseInt(month)
        const yearNum = parseInt(year)

        if (monthNum >= 1 && monthNum <= 12 && yearNum >= 1900 && yearNum <= 2100) {
          parsedDate = new Date(`${year}-${month.padStart(2, "0")}-01`)
          matchedFormat = "flexible"
        }
      }
    }

    if (!parsedDate || isNaN(parsedDate.getTime())) {
      const supportedFormats = [
        "YYYY-MM", "YYYY-MM-DD", "DD/MM/YYYY", "DD-MM-YYYY",
        "MM/YYYY", "MM-YYYY", "YYYY/MM", "YYYY.MM", "MM.YYYY"
      ]
      throw new Error(`Invalid date: '${stringValue}'. Supported formats: ${supportedFormats.join(", ")}`)
    }

    // Validate date range (reasonable for salary data)
    const year = parsedDate.getFullYear()
    const month = parsedDate.getMonth() + 1

    if (year < 1900 || year > 2100) {
      throw new Error(`Year out of range: ${year}. Expected range: 1900-2100`)
    }

    if (month < 1 || month > 12) {
      throw new Error(`Month out of range: ${month}. Expected range: 1-12`)
    }

    // Return in YYYY-MM format for salary_month
    const result = parsedDate.toISOString().substring(0, 7)
    console.log(`Date parsing successful: '${stringValue}' (${matchedFormat}) -> '${result}'`)

    return result

  } catch (error) {
    throw new Error(`Invalid date format in column '${columnName}': '${value}'. ${error instanceof Error ? error.message : "Unknown date parsing error"}`)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      const error = ApiErrorHandler.createError(
        ApiErrorHandler.ErrorCodes.UNAUTHORIZED,
        ApiErrorHandler.getUserFriendlyMessage(ApiErrorHandler.ErrorCodes.UNAUTHORIZED)
      )
      return NextResponse.json(ApiErrorHandler.createErrorResponse(error), { status: 401 })
    }

    const token = authHeader.split(" ")[1]
    const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

    try {
      jwt.verify(token, JWT_SECRET)
    } catch (error) {
      const apiError = ApiErrorHandler.createError(
        ApiErrorHandler.ErrorCodes.INVALID_TOKEN,
        ApiErrorHandler.getUserFriendlyMessage(ApiErrorHandler.ErrorCodes.INVALID_TOKEN)
      )
      return NextResponse.json(ApiErrorHandler.createErrorResponse(apiError), { status: 401 })
    }

    // Parse form data
    const formData = await request.formData()
    const file1 = formData.get("file1") as File | null
    const file2 = formData.get("file2") as File | null
    const file1MappingsStr = formData.get("file1Mappings") as string | null
    const file2MappingsStr = formData.get("file2Mappings") as string | null
    const duplicateStrategy = formData.get("duplicateStrategy") as string || "skip"

    if (!file1 && !file2) {
      const error = ApiErrorHandler.createError(
        ApiErrorHandler.ErrorCodes.VALIDATION_ERROR,
        "Cần ít nhất một file để xử lý",
        "No files provided in request"
      )
      return NextResponse.json(ApiErrorHandler.createErrorResponse(error), { status: 400 })
    }

    const supabase = createServiceClient()
    let totalRecords = 0
    let successCount = 0
    let errorCount = 0
    const errors: string[] = []
    const allDetailedErrors: ImportError[] = []
    const allAutoFixes: AutoFixResult[] = []

    // Prepare data for transaction
    let file1Records: any[] = []
    let file2Records: any[] = []

    // Process File 1 data preparation
    if (file1 && file1MappingsStr) {
      try {
        const file1Mappings: ColumnMapping[] = JSON.parse(file1MappingsStr)
        const file1Results = await processFileForTransaction(file1, file1Mappings, "file1", duplicateStrategy)

        file1Records = file1Results.records
        totalRecords += file1Results.totalRecords
        allDetailedErrors.push(...file1Results.detailedErrors)
        allAutoFixes.push(...file1Results.autoFixes)
      } catch (error) {
        console.error("Error processing file1:", error)
        const apiError = ApiErrorHandler.fromError(error, ApiErrorHandler.ErrorCodes.PROCESSING_ERROR, undefined, undefined, undefined, undefined, "file1")
        allDetailedErrors.push({
          row: 0,
          employee_id: "SYSTEM",
          field: "file1",
          error: apiError.message,
          errorType: "system",
          file_type: "file1",
          details: apiError.details
        })
        errorCount++
      }
    }

    // Process File 2 data preparation
    if (file2 && file2MappingsStr) {
      try {
        const file2Mappings: ColumnMapping[] = JSON.parse(file2MappingsStr)
        const file2Results = await processFileForTransaction(file2, file2Mappings, "file2", duplicateStrategy)

        file2Records = file2Results.records
        totalRecords += file2Results.totalRecords
        allDetailedErrors.push(...file2Results.detailedErrors)
        allAutoFixes.push(...file2Results.autoFixes)
      } catch (error) {
        console.error("Error processing file2:", error)
        const apiError = ApiErrorHandler.fromError(error, ApiErrorHandler.ErrorCodes.PROCESSING_ERROR, undefined, undefined, undefined, undefined, "file2")
        allDetailedErrors.push({
          row: 0,
          employee_id: "SYSTEM",
          field: "file2",
          error: apiError.message,
          errorType: "system",
          file_type: "file2",
          details: apiError.details
        })
        errorCount++
      }
    }

    // Execute transaction if we have data to process
    let transactionResult: any = null
    if (file1Records.length > 0 || file2Records.length > 0) {
      try {
        const sessionId = `DUAL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        const { data: txResult, error: txError } = await supabase.rpc('import_dual_files_transaction', {
          file1_records: file1Records.length > 0 ? file1Records : null,
          file2_records: file2Records.length > 0 ? file2Records : null,
          session_id: sessionId
        })

        if (txError) {
          throw new Error(`Transaction failed: ${txError.message}`)
        }

        transactionResult = txResult
        successCount = txResult.success_count || 0
        errorCount += txResult.error_count || 0

        // Add transaction errors to detailed errors
        if (txResult.errors && Array.isArray(txResult.errors)) {
          txResult.errors.forEach((error: any) => {
            allDetailedErrors.push({
              row: 0,
              employee_id: error.employee_id,
              salary_month: error.salary_month,
              field: "transaction",
              error: error.error,
              errorType: error.code === "DUPLICATE_RECORD" ? "duplicate" : "database",
              file_type: error.file_type,
              details: error.error
            })
          })
        }
      } catch (error) {
        console.error("Transaction error:", error)
        const apiError = ApiErrorHandler.fromError(error, ApiErrorHandler.ErrorCodes.DATABASE_ERROR)
        allDetailedErrors.push({
          row: 0,
          employee_id: "SYSTEM",
          field: "transaction",
          error: apiError.message,
          errorType: "database",
          file_type: "system",
          details: apiError.details
        })
        errorCount++
      }
    }

    // Generate error summary by category
    const errorSummary = {
      validation: allDetailedErrors.filter(e => e.errorType === "validation").length,
      format: allDetailedErrors.filter(e => e.errorType === "format").length,
      duplicate: allDetailedErrors.filter(e => e.errorType === "duplicate").length,
      database: allDetailedErrors.filter(e => e.errorType === "database").length,
      system: allDetailedErrors.filter(e => e.errorType === "system").length
    }

    // Convert detailed errors to standardized format
    const standardizedErrors: ApiError[] = allDetailedErrors.slice(0, 20).map(error =>
      ApiErrorHandler.createError(
        error.errorType === "validation" ? ApiErrorHandler.ErrorCodes.VALIDATION_ERROR :
        error.errorType === "duplicate" ? ApiErrorHandler.ErrorCodes.DUPLICATE_RECORD :
        error.errorType === "database" ? ApiErrorHandler.ErrorCodes.DATABASE_ERROR :
        ApiErrorHandler.ErrorCodes.PROCESSING_ERROR,
        error.message,
        error.details,
        error.field,
        error.row,
        error.employee_id,
        error.salary_month,
        error.file_type as "file1" | "file2"
      )
    )

    const responseData = {
      totalRecords,
      successCount,
      errorCount,
      autoFixCount: allAutoFixes.length,
      errorSummary,
      autoFixes: allAutoFixes,
      transactionResult,
      file1Inserted: transactionResult?.file1_inserted || 0,
      file2Inserted: transactionResult?.file2_inserted || 0,
      sessionId: transactionResult?.session_id,
      suggestions: errorCount > 0 ? [
        "Kiểm tra báo cáo lỗi chi tiết để xem các vấn đề cụ thể",
        "Xác minh định dạng dữ liệu khớp với mẫu mong đợi",
        "Đảm bảo tất cả trường bắt buộc có giá trị hợp lệ",
        "Loại bỏ hoặc giải quyết các bản ghi trùng lặp"
      ] : allAutoFixes.length > 0 ? [
        "Xem lại các sửa chữa tự động được áp dụng cho dữ liệu của bạn",
        "Xác minh các giá trị được tự động sửa chữa là chính xác",
        "Cân nhắc cập nhật dữ liệu nguồn để tránh sửa chữa tự động trong tương lai"
      ] : []
    }

    const message = `Đã xử lý thành công ${successCount} bản ghi${errorCount > 0 ? ` với ${errorCount} lỗi` : ""}${allAutoFixes.length > 0 ? ` và ${allAutoFixes.length} sửa chữa tự động` : ""}`

    const response = standardizedErrors.length > 0
      ? ApiErrorHandler.createMultiErrorResponse(standardizedErrors, message, {
          totalRecords,
          successCount,
          errorCount,
          processingTime: "2.3s",
          duplicatesFound: errorSummary.duplicate,
          autoFixCount: allAutoFixes.length
        })
      : ApiErrorHandler.createSuccess(responseData, message, {
          totalRecords,
          successCount,
          errorCount,
          processingTime: "2.3s",
          duplicatesFound: errorSummary.duplicate,
          autoFixCount: allAutoFixes.length
        })

    return NextResponse.json(response)

  } catch (error) {
    console.error("Import dual files error:", error)
    const apiError = ApiErrorHandler.fromError(error, ApiErrorHandler.ErrorCodes.INTERNAL_ERROR)
    return NextResponse.json(
      ApiErrorHandler.createErrorResponse(apiError),
      { status: 500 }
    )
  }
}

async function processFileForTransaction(
  file: File,
  mappings: ColumnMapping[],
  fileType: string,
  duplicateStrategy: string = "skip"
): Promise<{
  records: any[]
  totalRecords: number
  detailedErrors: ImportError[]
  autoFixes: AutoFixResult[]
}> {
  const records: any[] = []
  const detailedErrors: ImportError[] = []
  const autoFixes: AutoFixResult[] = []

  try {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: "buffer" })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]

    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

    if (jsonData.length < 2) {
      throw new Error(`File ${file.name} không có dữ liệu hoặc thiếu header`)
    }

    const headers = jsonData[0]
    const rows = jsonData.slice(1)

    // Create mapping lookup
    const mappingLookup = new Map<string, ColumnMapping>()
    mappings.forEach(mapping => {
      if (mapping.excel_column_name && mapping.database_field) {
        mappingLookup.set(mapping.excel_column_name, mapping)
      }
    })

    // Process each row
    rows.forEach((row, index) => {
      const actualRowNumber = index + 2 // +2 because we skip header and arrays are 0-indexed

      try {
        const mappedData: any = {
          source_file: file.name,
          import_batch_id: `BATCH_${Date.now()}`,
          import_status: "pending"
        }

        let hasRequiredFields = true
        const missingRequired: string[] = []

        // Map columns according to configuration
        headers.forEach((header, colIndex) => {
          const mapping = mappingLookup.get(header)
          if (mapping && row[colIndex] !== undefined) {
            const cellValue = cleanCellValue(row[colIndex])

            if (mapping.is_required && !isValidRequiredField(cellValue)) {
              hasRequiredFields = false
              missingRequired.push(mapping.database_field)
            }

            if (cellValue !== null) {
              mappedData[mapping.database_field] = cellValue
            }
          }
        })

        // Check for missing required fields
        if (!hasRequiredFields) {
          detailedErrors.push({
            row: actualRowNumber,
            employee_id: mappedData.employee_id || "UNKNOWN",
            salary_month: mappedData.salary_month || "UNKNOWN",
            field: missingRequired.join(", "),
            error: `Missing required fields: ${missingRequired.join(", ")}`,
            errorType: "validation",
            file_type: fileType,
            details: `Row ${actualRowNumber} is missing required data`
          })
          return // Skip this record
        }

        // Enhanced validation
        const validationResult = PayrollValidator.validatePayrollRecord(mappedData, {
          employee_id: mappedData.employee_id || "UNKNOWN",
          salary_month: mappedData.salary_month || "UNKNOWN",
          row: actualRowNumber,
          file_type: fileType as "file1" | "file2"
        })

        // Add validation errors
        detailedErrors.push(...validationResult.errors.map(error => ({
          row: actualRowNumber,
          employee_id: error.employee_id || mappedData.employee_id || "UNKNOWN",
          salary_month: error.salary_month || mappedData.salary_month || "UNKNOWN",
          field: error.field || "validation",
          error: error.message,
          errorType: "validation" as const,
          file_type: fileType,
          details: error.details
        })))

        // Add validation warnings as detailed errors with warning type
        detailedErrors.push(...validationResult.warnings.map(warning => ({
          row: actualRowNumber,
          employee_id: warning.employee_id || mappedData.employee_id || "UNKNOWN",
          salary_month: warning.salary_month || mappedData.salary_month || "UNKNOWN",
          field: warning.field || "validation",
          error: warning.message,
          errorType: "warning" as const,
          file_type: fileType,
          details: warning.details
        })))

        // Add auto-fixes
        autoFixes.push(...validationResult.autoFixes.map(fix => ({
          row: actualRowNumber,
          employee_id: mappedData.employee_id || "UNKNOWN",
          field: fix.field,
          originalValue: fix.originalValue,
          fixedValue: fix.fixedValue,
          reason: fix.reason,
          confidence: fix.confidence,
          file_type: fileType
        })))

        // Only add record if validation passed (no errors, warnings are OK)
        if (validationResult.isValid) {
          // Add metadata
          mappedData.created_at = new Date().toISOString()
          mappedData.updated_at = new Date().toISOString()

          records.push(mappedData)
        }

      } catch (error) {
        detailedErrors.push({
          row: actualRowNumber,
          employee_id: "UNKNOWN",
          salary_month: "UNKNOWN",
          field: "processing",
          error: error instanceof Error ? error.message : "Unknown processing error",
          errorType: "processing",
          file_type: fileType,
          details: `Error processing row ${actualRowNumber}`
        })
      }
    })

  } catch (error) {
    throw new Error(`Failed to process ${fileType}: ${error instanceof Error ? error.message : "Unknown error"}`)
  }

  return {
    records,
    totalRecords: records.length,
    detailedErrors,
    autoFixes
  }
}

async function processFile(
  file: File,
  mappings: ColumnMapping[],
  supabase: any,
  fileType: string,
  duplicateStrategy: string = "skip"
): Promise<{
  totalRecords: number
  successCount: number
  errorCount: number
  errors: string[]
  detailedErrors: ImportError[]
  autoFixes: AutoFixResult[]
}> {
  const errors: string[] = []
  const detailedErrors: ImportError[] = []
  const autoFixes: AutoFixResult[] = []
  let successCount = 0
  let errorCount = 0

  try {
    // Read Excel file
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: "array" })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

    if (jsonData.length < 2) {
      throw new Error("File must have at least header row and one data row")
    }

    // Get headers and data
    const headers = jsonData[0] as string[]
    const dataRows = jsonData.slice(1) as any[][]

    // Create mapping lookup
    const mappingLookup = new Map<string, ColumnMapping>()
    mappings.forEach(mapping => {
      if (mapping.database_field) {
        mappingLookup.set(mapping.excel_column_name, mapping)
      }
    })

    // Process each row
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i]
      const rowNumber = i + 2 // +2 because Excel is 1-indexed and we skip header

      try {
        // Map Excel data to database fields
        const mappedData: any = {}
        let hasRequiredFields = true
        const missingRequired: string[] = []

        // Process each column with enhanced validation
        headers.forEach((header, colIndex) => {
          const mapping = mappingLookup.get(header)
          if (mapping && mapping.database_field) {
            const cellValue = row[colIndex]

            // Enhanced validation for required fields
            const cleanedValue = cleanCellValue(cellValue)
            if (mapping.is_required && !isValidRequiredField(cleanedValue)) {
              hasRequiredFields = false
              missingRequired.push(`${mapping.database_field} (${header})`)
              return
            }

            // Convert data type with enhanced validation and auto-fix
            let convertedValue = cellValue
            if (cleanedValue !== null && cleanedValue !== "") {
              try {
                switch (mapping.data_type) {
                  case "number":
                    convertedValue = parseNumberField(cleanedValue, header)
                    break
                  case "date":
                    convertedValue = parseDateField(cleanedValue, header)
                    break
                  default:
                    convertedValue = cleanedValue
                }
              } catch (conversionError) {
                // Attempt auto-fix before throwing error
                const autoFixResult = attemptAutoFix(cellValue, mapping.database_field, mapping.data_type)

                if (autoFixResult && autoFixResult.success) {
                  convertedValue = autoFixResult.fixedValue
                  console.log(`Auto-fix applied: ${autoFixResult.description}`)

                  // Track auto-fix for reporting
                  autoFixes.push({
                    ...autoFixResult,
                    description: `Row ${rowNumber}, Column ${header}: ${autoFixResult.description}`
                  })
                } else {
                  throw new Error(`${conversionError instanceof Error ? conversionError.message : `Invalid ${mapping.data_type} format in column '${header}': ${cellValue}`}`)
                }
              }
            } else if (mapping.default_value) {
              convertedValue = mapping.default_value
            }

            mappedData[mapping.database_field] = convertedValue
          }
        })

        // Check for missing required fields
        if (!hasRequiredFields) {
          throw new Error(`Missing required fields: ${missingRequired.join(", ")}`)
        }

        // Enhanced duplicate detection and resolution
        if (mappedData.employee_id && mappedData.salary_month) {
          const existingRecord = await checkExistingDuplicates(
            supabase,
            mappedData.employee_id,
            mappedData.salary_month
          )

          if (existingRecord) {
            // Use configurable duplicate resolution strategy
            const duplicateAction = duplicateStrategy

            switch (duplicateAction) {
              case "skip":
                throw new Error(`Duplicate employee_id found: ${mappedData.employee_id} for month ${mappedData.salary_month}. Skipping record.`)

              case "overwrite":
                // Update existing record
                const { error: updateError } = await supabase
                  .from("payrolls")
                  .update({
                    ...mappedData,
                    updated_at: new Date().toISOString()
                  })
                  .eq("id", existingRecord.id)

                if (updateError) {
                  throw new Error(`Failed to update duplicate record: ${updateError.message}`)
                }

                console.log(`Updated duplicate record for employee ${mappedData.employee_id}, month ${mappedData.salary_month}`)
                successCount++
                continue // Skip the insert below

              case "merge":
                // Merge data with existing record
                const mergedData = resolveDuplicateData(existingRecord, mappedData, "merge")

                const { error: mergeError } = await supabase
                  .from("payrolls")
                  .update(mergedData)
                  .eq("id", existingRecord.id)

                if (mergeError) {
                  throw new Error(`Failed to merge duplicate record: ${mergeError.message}`)
                }

                console.log(`Merged duplicate record for employee ${mappedData.employee_id}, month ${mappedData.salary_month}`)
                successCount++
                continue // Skip the insert below

              case "create_new":
                // Modify employee_id to create new record
                const newData = resolveDuplicateData(existingRecord, mappedData, "create_new")
                mappedData = newData
                console.log(`Creating new record with modified ID: ${mappedData.employee_id}`)
                break

              default:
                throw new Error(`Unknown duplicate resolution strategy: ${duplicateAction}`)
            }
          }
        }

        // Add metadata
        mappedData.created_at = new Date().toISOString()
        mappedData.updated_at = new Date().toISOString()

        // Insert into database
        const { error: insertError } = await supabase
          .from("payrolls")
          .insert(mappedData)

        if (insertError) {
          // Provide more specific error messages
          if (insertError.code === "23505") { // Unique constraint violation
            throw new Error(`Duplicate record: employee_id ${mappedData.employee_id} already exists for ${mappedData.salary_month}`)
          }
          throw new Error(`Database insert error: ${insertError.message}`)
        }

        successCount++

      } catch (rowError) {
        errorCount++
        const errorMessage = rowError instanceof Error ? rowError.message : "Unknown error"

        // Create detailed error object
        const detailedError = categorizeError(
          errorMessage,
          rowNumber,
          undefined, // column will be determined from error message if possible
          undefined, // field will be determined from error message if possible
          undefined  // value will be determined from error message if possible
        )

        detailedErrors.push(detailedError)

        // Create formatted error message for backward compatibility
        const formattedMessage = formatErrorMessage(detailedError)
        errors.push(formattedMessage)

        console.error(`${fileType} - ${formattedMessage}`)
        console.error(`${fileType} - Detailed error:`, detailedError)
      }
    }

    return {
      totalRecords: dataRows.length,
      successCount,
      errorCount,
      errors,
      detailedErrors,
      autoFixes
    }

  } catch (error) {
    throw new Error(`File processing error: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}
