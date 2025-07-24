import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/utils/supabase/server"
import * as XLSX from "xlsx"
import jwt from "jsonwebtoken"
import { ApiErrorHandler, type ApiError, type ApiResponse } from "@/lib/api-error-handler"

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

// Reverse mapping from Vietnamese headers to database fields
const HEADER_TO_FIELD: Record<string, string> = {
  "Mã Nhân Viên": "employee_id",
  "Tháng Lương": "salary_month",
  "Hệ Số Làm Việc": "he_so_lam_viec",
  "Hệ Số Phụ Cấp Kết Quả": "he_so_phu_cap_ket_qua",
  "Hệ Số Lương Cơ Bản": "he_so_luong_co_ban",
  "Lương Tối Thiểu Công Ty": "luong_toi_thieu_cty",
  "Ngày Công Trong Giờ": "ngay_cong_trong_gio",
  "Giờ Công Tăng Ca": "gio_cong_tang_ca",
  "Giờ Ăn Ca": "gio_an_ca",
  "Tổng Giờ Làm Việc": "tong_gio_lam_viec",
  "Tổng Hệ Số Quy Đổi": "tong_he_so_quy_doi",
  "Tổng Lương Sản Phẩm Công Đoạn": "tong_luong_san_pham_cong_doan",
  "Đơn Giá Tiền Lương Trên Giờ": "don_gia_tien_luong_tren_gio",
  "Tiền Lương Sản Phẩm Trong Giờ": "tien_luong_san_pham_trong_gio",
  "Tiền Lương Tăng Ca": "tien_luong_tang_ca",
  "Tiền Lương 30p Ăn Ca": "tien_luong_30p_an_ca",
  "Tiền Khen Thưởng Chuyên Cần": "tien_khen_thuong_chuyen_can",
  "Lương Học Việc PC Lương": "luong_hoc_viec_pc_luong",
  "Tổng Cộng Tiền Lương Sản Phẩm": "tong_cong_tien_luong_san_pham",
  "Hỗ Trợ Thời Tiết Nóng": "ho_tro_thoi_tiet_nong",
  "Bổ Sung Lương": "bo_sung_luong",
  "BHXH 21.5%": "bhxh_21_5_percent",
  "PC CDCS PCCC ATVSV": "pc_cdcs_pccc_atvsv",
  "Lương Phụ Nữ Hành Kinh": "luong_phu_nu_hanh_kinh",
  "Tiền Con Bú Thai 7 Tháng": "tien_con_bu_thai_7_thang",
  "Hỗ Trợ Gửi Con Nhà Trẻ": "ho_tro_gui_con_nha_tre",
  "Ngày Công Phép Lễ": "ngay_cong_phep_le",
  "Tiền Phép Lễ": "tien_phep_le",
  "Tổng Cộng Tiền Lương": "tong_cong_tien_luong",
  "Tiền Bốc Vác": "tien_boc_vac",
  "Hỗ Trợ Xăng Xe": "ho_tro_xang_xe",
  "Thuế TNCN Năm 2024": "thue_tncn_nam_2024",
  "Tạm Ứng": "tam_ung",
  "Thuế TNCN": "thue_tncn",
  "BHXH BHTN BHYT Total": "bhxh_bhtn_bhyt_total",
  "Truy Thu Thẻ BHYT": "truy_thu_the_bhyt",
  "Tiền Lương Thực Nhận Cuối Kỳ": "tien_luong_thuc_nhan_cuoi_ky"
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

    // Map headers to database fields
    const fieldMapping: Record<number, string> = {}
    headers.forEach((header, index) => {
      const field = HEADER_TO_FIELD[header.trim()]
      if (field) {
        fieldMapping[index] = field
      }
    })

    // Validate required fields
    const requiredFields = ["employee_id", "salary_month"]
    const missingFields = requiredFields.filter(field => 
      !Object.values(fieldMapping).includes(field)
    )

    if (missingFields.length > 0) {
      const error = ApiErrorHandler.createError(
        ApiErrorHandler.ErrorCodes.VALIDATION_ERROR,
        `Thiếu các cột bắt buộc: ${missingFields.join(", ")}`
      )
      return NextResponse.json(ApiErrorHandler.createErrorResponse(error), { status: 400 })
    }

    const supabase = createServiceClient()
    const errors: ImportError[] = []
    let successCount = 0
    let overwriteCount = 0

    // Get all existing employees for validation
    const { data: employees, error: employeesError } = await supabase
      .from("employees")
      .select("employee_id")

    if (employeesError) {
      const error = ApiErrorHandler.createDatabaseError(
        "lấy danh sách nhân viên",
        employeesError.message
      )
      return NextResponse.json(ApiErrorHandler.createErrorResponse(error), { status: 500 })
    }

    const validEmployeeIds = new Set(employees?.map(emp => emp.employee_id) || [])

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNumber = i + 2 // +2 because arrays are 0-indexed and we skip header

      try {
        // Map row data to database fields
        const recordData: Record<string, any> = {
          source_file: file.name,
          import_batch_id: `IMPORT_${Date.now()}`,
          import_status: "imported",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        // Extract data from row
        Object.entries(fieldMapping).forEach(([colIndex, field]) => {
          const value = row[parseInt(colIndex)]
          if (value !== undefined && value !== null && value !== "") {
            if (field === "employee_id" || field === "salary_month") {
              recordData[field] = String(value).trim()
            } else {
              // Convert numeric fields
              const numValue = Number(value)
              recordData[field] = isNaN(numValue) ? 0 : numValue
            }
          }
        })

        // Validate required fields
        if (!recordData.employee_id || !recordData.salary_month) {
          errors.push({
            row: rowNumber,
            employee_id: recordData.employee_id,
            salary_month: recordData.salary_month,
            error: "Thiếu mã nhân viên hoặc tháng lương",
            errorType: "validation"
          })
          continue
        }

        // Validate employee exists
        if (!validEmployeeIds.has(recordData.employee_id)) {
          errors.push({
            row: rowNumber,
            employee_id: recordData.employee_id,
            salary_month: recordData.salary_month,
            error: `Mã nhân viên ${recordData.employee_id} không tồn tại trong hệ thống`,
            errorType: "employee_not_found"
          })
          continue
        }

        // Validate salary month format
        const monthPattern = /^\d{4}-\d{2}$/
        if (!monthPattern.test(recordData.salary_month)) {
          errors.push({
            row: rowNumber,
            employee_id: recordData.employee_id,
            salary_month: recordData.salary_month,
            error: "Tháng lương phải có định dạng YYYY-MM (ví dụ: 2024-01)",
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

      return NextResponse.json(
        ApiErrorHandler.createMultiErrorResponse(standardizedErrors, message, {
          totalRecords: rows.length,
          successCount,
          errorCount: errors.length,
          processingTime,
          autoFixCount: 0
        })
      )
    }

    return NextResponse.json(
      ApiErrorHandler.createSuccess(result, message, {
        totalRecords: rows.length,
        successCount,
        errorCount: errors.length,
        processingTime,
        autoFixCount: 0
      })
    )

  } catch (error) {
    console.error("Payroll import error:", error)
    const apiError = ApiErrorHandler.fromError(error, ApiErrorHandler.ErrorCodes.INTERNAL_ERROR)
    return NextResponse.json(
      ApiErrorHandler.createErrorResponse(apiError),
      { status: 500 }
    )
  }
}
