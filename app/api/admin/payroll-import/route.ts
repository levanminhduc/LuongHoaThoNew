import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/utils/supabase/server"
import * as XLSX from "xlsx"
import jwt from "jsonwebtoken"
import { ApiErrorHandler, type ApiError, type ApiResponse } from "@/lib/api-error-handler"
import { DEFAULT_FIELD_HEADERS } from "@/lib/utils/header-mapping"
import { getVietnamTimestamp } from "@/lib/utils/vietnam-timezone"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this-in-production"

// Verify admin token
function verifyAdminToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null
  }

  const token = authHeader.substring(7)
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    return decoded.role === "admin" ? decoded : null
  } catch {
    return null
  }
}

// Function to load aliases from database and create comprehensive header mapping
async function createHeaderToFieldMapping(supabase: any): Promise<Record<string, string>> {
  const HEADER_TO_FIELD: Record<string, string> = {}

  // 1. Add DEFAULT_FIELD_HEADERS
  Object.entries(DEFAULT_FIELD_HEADERS).forEach(([field, header]) => {
    HEADER_TO_FIELD[header] = field
  })

  // 2. Add legacy headers
  const LEGACY_HEADER_MAPPINGS: Record<string, string> = {
    "BHXH BHTN BHYT Total": "bhxh_bhtn_bhyt_total",
    "Tiền Khen Thưởng Chuyên Cần": "thuong_chuyen_can",
  }
  Object.assign(HEADER_TO_FIELD, LEGACY_HEADER_MAPPINGS)

  // 3. Load and add aliases from database
  try {
    const { data: aliases, error } = await supabase
      .from("column_aliases")
      .select("database_field, alias_name")
      .eq("is_active", true)

    if (!error && aliases) {
      aliases.forEach((alias: any) => {
        HEADER_TO_FIELD[alias.alias_name] = alias.database_field
      })
      console.log(`✅ Loaded ${aliases.length} column aliases`)
    }
  } catch (error) {
    console.warn("⚠️ Could not load aliases, using defaults only:", error)
  }

  // 4. Load and add mapping configurations
  try {
    const { data: configs, error } = await supabase
      .from("mapping_configurations")
      .select(`
        configuration_field_mappings (
          database_field,
          excel_column_name
        )
      `)
      .eq("is_active", true)

    if (!error && configs) {
      configs.forEach((config: any) => {
        config.configuration_field_mappings?.forEach((mapping: any) => {
          HEADER_TO_FIELD[mapping.excel_column_name] = mapping.database_field
        })
      })
      console.log(`✅ Loaded mapping configurations`)
    }
  } catch (error) {
    console.warn("⚠️ Could not load mapping configurations:", error)
  }

  return HEADER_TO_FIELD
}

interface ImportError {
  row: number
  employee_id?: string
  salary_month?: string
  field?: string
  error: string
  errorType: "validation" | "duplicate" | "employee_not_found" | "database" | "format"
}

interface ImportResult {
  success: boolean
  totalRecords: number
  successCount: number
  errorCount: number
  overwriteCount: number
  errors: ImportError[]
  processingTime: string
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const batchId = `IMPORT_${Date.now()}`

  try {
    // Verify admin authentication
    const admin = verifyAdminToken(request)
    if (!admin) {
      const error = ApiErrorHandler.createError(
        ApiErrorHandler.ErrorCodes.UNAUTHORIZED,
        ApiErrorHandler.getUserFriendlyMessage(ApiErrorHandler.ErrorCodes.UNAUTHORIZED)
      )
      return NextResponse.json(ApiErrorHandler.createErrorResponse(error), { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      const error = ApiErrorHandler.createError(
        ApiErrorHandler.ErrorCodes.VALIDATION_ERROR,
        "Không có file nào được upload"
      )
      return NextResponse.json(ApiErrorHandler.createErrorResponse(error), { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
    ]

    if (!allowedTypes.includes(file.type)) {
      const error = ApiErrorHandler.createError(
        ApiErrorHandler.ErrorCodes.INVALID_FILE_FORMAT,
        "File không đúng định dạng. Chỉ chấp nhận file .xlsx hoặc .xls"
      )
      return NextResponse.json(ApiErrorHandler.createErrorResponse(error), { status: 400 })
    }

    // Parse Excel file
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: "buffer" })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

    if (jsonData.length < 2) {
      const error = ApiErrorHandler.createError(
        ApiErrorHandler.ErrorCodes.EMPTY_FILE,
        "File không có dữ liệu hoặc thiếu header"
      )
      return NextResponse.json(ApiErrorHandler.createErrorResponse(error), { status: 400 })
    }

    const headers = jsonData[0] as string[]
    const rows = jsonData.slice(1)

    // ✅ Initialize Supabase client first
    const supabase = createServiceClient()

    // ✅ Create comprehensive header mapping with aliases and configurations
    const HEADER_TO_FIELD = await createHeaderToFieldMapping(supabase)

    // Map headers to database fields
    const fieldMapping: Record<number, string> = {}
    const unmappedHeaders: string[] = []

    headers.forEach((header, index) => {
      const trimmedHeader = header.trim()
      const field = HEADER_TO_FIELD[trimmedHeader]
      if (field) {
        fieldMapping[index] = field
      } else {
        unmappedHeaders.push(trimmedHeader)
      }
    })

    // Debug logging for headers
    console.log("📋 Excel Headers Found:", headers)
    console.log("✅ Mapped Fields:", Object.values(fieldMapping))
    console.log("❌ Unmapped Headers:", unmappedHeaders)
    console.log("🔍 Available Mappings:", Object.keys(HEADER_TO_FIELD).slice(0, 10), "... (total:", Object.keys(HEADER_TO_FIELD).length, ")")

    // Validate required fields
    const requiredFields = ["employee_id", "salary_month"]
    const missingFields = requiredFields.filter(field =>
      !Object.values(fieldMapping).includes(field)
    )

    if (missingFields.length > 0) {
      const error = ApiErrorHandler.createError(
        ApiErrorHandler.ErrorCodes.VALIDATION_ERROR,
        `Thiếu các cột bắt buộc: ${missingFields.join(", ")}.
        Headers tìm thấy: [${headers.join(", ")}].
        Headers không map được: [${unmappedHeaders.join(", ")}].
        Vui lòng kiểm tra tên cột trong file Excel có khớp với template không.`
      )
      return NextResponse.json(ApiErrorHandler.createErrorResponse(error), { status: 400 })
    }
    const errors: ImportError[] = []
    let successCount = 0
    let overwriteCount = 0

    // Get all existing employees for validation
    const { data: employees, error: employeesError } = await supabase
      .from("employees")
      .select("employee_id")

    if (employeesError) {
      console.error("❌ Database error loading employees:", employeesError)
      const error = ApiErrorHandler.createDatabaseError(
        "lấy danh sách nhân viên",
        employeesError.message
      )
      return NextResponse.json(ApiErrorHandler.createErrorResponse(error), { status: 500 })
    }

    const validEmployeeIds = new Set(employees?.map(emp => emp.employee_id) || [])
    console.log("👥 Valid Employee IDs loaded:", Array.from(validEmployeeIds))

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNumber = i + 2 // +2 because arrays are 0-indexed and we skip header

      try {
        // Map row data to database fields
        const recordData: Record<string, any> = {
          source_file: file.name,
          import_batch_id: batchId,
          import_status: "imported",
          created_at: getVietnamTimestamp(),
          updated_at: getVietnamTimestamp()
        }

        // Extract data from row with improved value processing
        Object.entries(fieldMapping).forEach(([colIndex, field]) => {
          const value = row[parseInt(colIndex)]

          // Handle required fields (employee_id, salary_month)
          if (field === "employee_id" || field === "salary_month") {
            if (value !== undefined && value !== null && String(value).trim() !== "") {
              recordData[field] = String(value).trim()
            }
          } else {
            // Handle optional numeric fields - be more permissive
            if (value !== undefined && value !== null) {
              const stringValue = String(value).trim()
              if (stringValue !== "") {
                const numValue = Number(stringValue)
                recordData[field] = isNaN(numValue) ? 0 : numValue
              } else {
                // Set default value for empty cells
                recordData[field] = 0
              }
            } else {
              // Set default value for null/undefined
              recordData[field] = 0
            }
          }
        })

        // Debug: Log mapped fields count
        const mappedFieldsCount = Object.keys(fieldMapping).length
        const recordFieldsCount = Object.keys(recordData).length - 5 // Exclude metadata fields
        console.log(`🔍 Row ${rowNumber}: Mapped ${mappedFieldsCount} fields, Record has ${recordFieldsCount} data fields`)

        // Debug logging for each row (first few rows only)
        if (rowNumber <= 3) {
          console.log(`🔍 Row ${rowNumber} detailed data:`, {
            employee_id: recordData.employee_id,
            salary_month: recordData.salary_month,
            sample_fields: Object.fromEntries(
              Object.entries(recordData)
                .filter(([key]) => !["source_file", "import_batch_id", "import_status", "created_at", "updated_at"].includes(key))
                .slice(0, 5)
            ),
            total_fields: Object.keys(recordData).length,
            rawRow: row.slice(0, 5)
          })
        }

        // Validate required fields
        if (!recordData.employee_id || !recordData.salary_month) {
          const error = {
            row: rowNumber,
            employee_id: recordData.employee_id,
            salary_month: recordData.salary_month,
            error: `Thiếu dữ liệu bắt buộc - Employee ID: "${recordData.employee_id || 'EMPTY'}", Salary Month: "${recordData.salary_month || 'EMPTY'}". Kiểm tra dữ liệu trong file Excel.`,
            errorType: "validation" as const
          }
          console.log(`❌ Row ${rowNumber} validation error:`, error)
          errors.push(error)
          continue
        }

        // Validate employee exists
        if (!validEmployeeIds.has(recordData.employee_id)) {
          const error = {
            row: rowNumber,
            employee_id: recordData.employee_id,
            salary_month: recordData.salary_month,
            error: `Mã nhân viên "${recordData.employee_id}" không tồn tại trong hệ thống.
            Valid Employee IDs: [${Array.from(validEmployeeIds).slice(0, 10).join(", ")}${validEmployeeIds.size > 10 ? "..." : ""}].
            Vui lòng kiểm tra lại mã nhân viên hoặc thêm nhân viên vào hệ thống trước.`,
            errorType: "employee_not_found" as const
          }
          console.log(`❌ Row ${rowNumber} employee not found:`, error)
          errors.push(error)
          continue
        }

        // Validate salary month format
        const monthPattern = /^\d{4}-\d{2}$/
        if (!monthPattern.test(recordData.salary_month)) {
          errors.push({
            row: rowNumber,
            employee_id: recordData.employee_id,
            salary_month: recordData.salary_month,
            error: `Tháng lương "${recordData.salary_month}" không đúng định dạng. Phải có định dạng YYYY-MM (ví dụ: 2024-01, 2024-12)`,
            errorType: "validation"
          })
          continue
        }

        // Check if record exists (for overwrite logic)
        const { data: existingRecord } = await supabase
          .from("payrolls")
          .select("id")
          .eq("employee_id", recordData.employee_id)
          .eq("salary_month", recordData.salary_month)
          .single()

        if (existingRecord) {
          // Overwrite existing record
          const { error: updateError } = await supabase
            .from("payrolls")
            .update(recordData)
            .eq("employee_id", recordData.employee_id)
            .eq("salary_month", recordData.salary_month)

          if (updateError) {
            errors.push({
              row: rowNumber,
              employee_id: recordData.employee_id,
              salary_month: recordData.salary_month,
              error: `Lỗi cập nhật: ${updateError.message}`,
              errorType: "database"
            })
          } else {
            overwriteCount++
            successCount++
          }
        } else {
          // Insert new record
          const { error: insertError } = await supabase
            .from("payrolls")
            .insert(recordData)

          if (insertError) {
            errors.push({
              row: rowNumber,
              employee_id: recordData.employee_id,
              salary_month: recordData.salary_month,
              error: `Lỗi thêm mới: ${insertError.message}`,
              errorType: "database"
            })
          } else {
            successCount++
          }
        }

      } catch (error) {
        errors.push({
          row: rowNumber,
          employee_id: "UNKNOWN",
          salary_month: "UNKNOWN",
          error: error instanceof Error ? error.message : "Lỗi không xác định",
          errorType: "format"
        })
      }
    }

    const processingTime = `${((Date.now() - startTime) / 1000).toFixed(2)}s`

    const result: ImportResult = {
      success: errors.length === 0,
      totalRecords: rows.length,
      successCount,
      errorCount: errors.length,
      overwriteCount,
      errors: errors.slice(0, 50), // Limit errors for response size
      processingTime
    }

    const message = `Import hoàn tất: ${successCount} thành công, ${errors.length} lỗi${overwriteCount > 0 ? `, ${overwriteCount} ghi đè` : ""}`

    if (errors.length > 0) {
      const standardizedErrors: ApiError[] = errors.slice(0, 20).map(error =>
        ApiErrorHandler.createError(
          error.errorType === "validation" ? ApiErrorHandler.ErrorCodes.VALIDATION_ERROR :
          error.errorType === "employee_not_found" ? ApiErrorHandler.ErrorCodes.EMPLOYEE_NOT_FOUND :
          error.errorType === "duplicate" ? ApiErrorHandler.ErrorCodes.DUPLICATE_RECORD :
          ApiErrorHandler.ErrorCodes.DATABASE_ERROR,
          error.error,
          `Row ${error.row}`,
          error.field,
          error.row,
          error.employee_id,
          error.salary_month
        )
      )

      // Return custom response with importBatchId for partial success
      return NextResponse.json({
        success: successCount > 0, // True if any records succeeded
        data: result,
        errors: standardizedErrors,
        message,
        metadata: {
          totalRecords: rows.length,
          successCount,
          errorCount: errors.length,
          processingTime,
          autoFixCount: 0
        },
        importBatchId: batchId // Add at top level for easy access
      })
    }

    return NextResponse.json({
      success: true,
      data: result,
      message,
      metadata: {
        totalRecords: rows.length,
        successCount,
        errorCount: errors.length,
        processingTime,
        autoFixCount: 0
      },
      importBatchId: batchId // Add at top level for easy access
    })

  } catch (error) {
    console.error("Payroll import error:", error)
    const apiError = ApiErrorHandler.fromError(error, ApiErrorHandler.ErrorCodes.INTERNAL_ERROR)
    return NextResponse.json(
      ApiErrorHandler.createErrorResponse(apiError),
      { status: 500 }
    )
  }
}
