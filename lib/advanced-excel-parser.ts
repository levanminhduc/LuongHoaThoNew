import * as XLSX from "xlsx"

export interface ColumnMapping {
  [key: string]: string // Excel column name -> Database field name
}

export interface PayrollFieldConfig {
  field: string
  label: string
  type: "text" | "number" | "date"
  required: boolean
  maxLength?: number
  validation?: (value: any) => string | null
}

export interface AdvancedPayrollData {
  employee_id: string
  salary_month: string
  source_file: string

  // Dynamic fields based on column mapping
  [key: string]: any
}

export interface ImportResult {
  success: boolean
  totalRows: number
  successCount: number
  errorCount: number
  warningCount: number
  errors: Array<{
    row: number
    employee_id: string
    field: string
    error: string
    type: "error" | "warning"
  }>
  data: AdvancedPayrollData[]
  columnMappings: ColumnMapping
  detectedColumns: string[]
  summary: {
    filesProcessed: number
    duplicatesFound: number
    missingEmployees: number
    dataInconsistencies: number
  }
}

// Define all possible payroll fields with validation
export const PAYROLL_FIELD_CONFIG: PayrollFieldConfig[] = [
  { field: "employee_id", label: "Mã Nhân Viên", type: "text", required: true, maxLength: 50 },
  { field: "salary_month", label: "Tháng Lương", type: "text", required: true, maxLength: 20 },
  { field: "he_so_lam_viec", label: "Hệ Số Làm Việc", type: "number", required: false },
  { field: "he_so_phu_cap_ket_qua", label: "Hệ Số Phụ Cấp Kết Quả", type: "number", required: false },
  { field: "he_so_luong_co_ban", label: "Hệ Số Lương Cơ Bản", type: "number", required: false },
  { field: "luong_toi_thieu_cty", label: "Lương Tối Thiểu Công Ty", type: "number", required: false },
  { field: "ngay_cong_trong_gio", label: "Ngày Công Trong Giờ", type: "number", required: false },
  { field: "gio_cong_tang_ca", label: "Giờ Công Tăng Ca", type: "number", required: false },
  { field: "gio_an_ca", label: "Giờ Ăn Ca", type: "number", required: false },
  { field: "tong_gio_lam_viec", label: "Tổng Giờ Làm Việc", type: "number", required: false },
  { field: "tong_he_so_quy_doi", label: "Tổng Hệ Số Quy Đổi", type: "number", required: false },
  { field: "tong_luong_san_pham_cong_doan", label: "Tổng Lương Sản Phẩm Công Đoạn", type: "number", required: false },
  { field: "don_gia_tien_luong_tren_gio", label: "Đơn Giá Tiền Lương Trên Giờ", type: "number", required: false },
  { field: "tien_luong_san_pham_trong_gio", label: "Tiền Lương Sản Phẩm Trong Giờ", type: "number", required: false },
  { field: "tien_luong_tang_ca", label: "Tiền Lương Tăng Ca", type: "number", required: false },
  { field: "tien_luong_30p_an_ca", label: "Tiền Lương 30p Ăn Ca", type: "number", required: false },
  { field: "tien_khen_thuong_chuyen_can", label: "Tiền Khen Thưởng Chuyên Cần", type: "number", required: false },
  { field: "luong_hoc_viec_pc_luong", label: "Lương Học Việc PC Lương", type: "number", required: false },
  { field: "tong_cong_tien_luong_san_pham", label: "Tổng Cộng Tiền Lương Sản Phẩm", type: "number", required: false },
  { field: "ho_tro_thoi_tiet_nong", label: "Hỗ Trợ Thời Tiết Nóng", type: "number", required: false },
  { field: "bo_sung_luong", label: "Bổ Sung Lương", type: "number", required: false },
  { field: "bhxh_21_5_percent", label: "BHXH 21.5%", type: "number", required: false },
  { field: "pc_cdcs_pccc_atvsv", label: "PC CDCS PCCC ATVSV", type: "number", required: false },
  { field: "luong_phu_nu_hanh_kinh", label: "Lương Phụ Nữ Hành Kinh", type: "number", required: false },
  { field: "tien_con_bu_thai_7_thang", label: "Tiền Con Bù Thai 7 Tháng", type: "number", required: false },
  { field: "ho_tro_gui_con_nha_tre", label: "Hỗ Trợ Gửi Con Nhà Trẻ", type: "number", required: false },
  { field: "ngay_cong_phep_le", label: "Ngày Công Phép Lễ", type: "number", required: false },
  { field: "tien_phep_le", label: "Tiền Phép Lễ", type: "number", required: false },
  { field: "tong_cong_tien_luong", label: "Tổng Cộng Tiền Lương", type: "number", required: false },
  { field: "tien_boc_vac", label: "Tiền Bốc Vác", type: "number", required: false },
  { field: "ho_tro_xang_xe", label: "Hỗ Trợ Xăng Xe", type: "number", required: false },
  { field: "thue_tncn_nam_2024", label: "Thuế TNCN Năm 2024", type: "number", required: false },
  { field: "tam_ung", label: "Tạm Ứng", type: "number", required: false },
  { field: "thue_tncn", label: "Thuế TNCN", type: "number", required: false },
  { field: "bhxh_bhtn_bhyt_total", label: "BHXH BHTN BHYT Total", type: "number", required: false },
  { field: "truy_thu_the_bhyt", label: "Truy Thu Thẻ BHYT", type: "number", required: false },
  { field: "tien_luong_thuc_nhan_cuoi_ky", label: "Tiền Lương Thực Nhận Cuối Kỳ", type: "number", required: false },
]

export function detectColumns(worksheet: XLSX.WorkSheet): string[] {
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
  if (jsonData.length === 0) return []

  return jsonData[0].map((header: any) => String(header || "").trim()).filter((header: string) => header.length > 0)
}

export function autoMapColumns(detectedColumns: string[]): ColumnMapping {
  const mapping: ColumnMapping = {}

  // Auto-mapping rules based on common column names
  const autoMappingRules: { [key: string]: string[] } = {
    employee_id: ["mã nhân viên", "employee_id", "ma_nhan_vien", "id", "mã nv", "manv"],
    salary_month: ["tháng lương", "salary_month", "thang_luong", "month", "tháng"],
    he_so_lam_viec: ["hệ số làm việc", "he_so_lam_viec", "hệ số lv"],
    tong_cong_tien_luong: ["tổng cộng tiền lương", "tong_cong_tien_luong", "tổng lương", "total_salary"],
    tien_luong_thuc_nhan_cuoi_ky: [
      "tiền lương thực nhận cuối kỳ",
      "tien_luong_thuc_nhan_cuoi_ky",
      "lương thực nhận",
      "net_salary",
    ],
    bhxh_bhtn_bhyt_total: ["bhxh bhtn bhyt total", "bhxh_bhtn_bhyt_total", "bảo hiểm", "insurance"],
    thue_tncn: ["thuế tncn", "thue_tncn", "thuế", "tax"],
    tam_ung: ["tạm ứng", "tam_ung", "advance"],
  }

  detectedColumns.forEach((column) => {
    const normalizedColumn = column.toLowerCase().trim()

    for (const [field, patterns] of Object.entries(autoMappingRules)) {
      if (patterns.some((pattern) => normalizedColumn.includes(pattern))) {
        mapping[column] = field
        break
      }
    }
  })

  return mapping
}

export function validateValue(value: any, field: PayrollFieldConfig): string | null {
  if (field.required && (!value || String(value).trim() === "")) {
    return `${field.label} là trường bắt buộc`
  }

  if (!value || String(value).trim() === "") {
    return null // Optional field, empty is OK
  }

  const stringValue = String(value).trim()

  if (field.maxLength && stringValue.length > field.maxLength) {
    return `${field.label} vượt quá ${field.maxLength} ký tự`
  }

  if (field.type === "number") {
    const numValue = Number.parseFloat(stringValue)
    if (isNaN(numValue)) {
      return `${field.label} phải là số hợp lệ`
    }
  }

  if (field.type === "date") {
    const dateValue = new Date(stringValue)
    if (isNaN(dateValue.getTime())) {
      return `${field.label} phải là ngày hợp lệ`
    }
  }

  if (field.validation) {
    return field.validation(value)
  }

  return null
}

export function parseAdvancedExcelFiles(
  files: { buffer: Buffer; filename: string }[],
  columnMappings: ColumnMapping[],
): ImportResult {
  const result: ImportResult = {
    success: false,
    totalRows: 0,
    successCount: 0,
    errorCount: 0,
    warningCount: 0,
    errors: [],
    data: [],
    columnMappings: {},
    detectedColumns: [],
    summary: {
      filesProcessed: 0,
      duplicatesFound: 0,
      missingEmployees: 0,
      dataInconsistencies: 0,
    },
  }

  const allData: AdvancedPayrollData[] = []
  const seenEmployeeMonths = new Set<string>()
  const fieldConfigs = PAYROLL_FIELD_CONFIG.reduce(
    (acc, config) => {
      acc[config.field] = config
      return acc
    },
    {} as { [key: string]: PayrollFieldConfig },
  )

  try {
    files.forEach((file, fileIndex) => {
      const workbook = XLSX.read(file.buffer, { type: "buffer" })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]

      result.summary.filesProcessed++

      // Detect columns if not provided
      const detectedColumns = detectColumns(worksheet)
      if (fileIndex === 0) {
        result.detectedColumns = detectedColumns
      }

      // Use provided mapping or auto-detect
      const mapping = columnMappings[fileIndex] || autoMapColumns(detectedColumns)
      if (fileIndex === 0) {
        result.columnMappings = mapping
      }

      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
      if (jsonData.length < 2) return

      const headers = jsonData[0]
      const rows = jsonData.slice(1)

      rows.forEach((row, rowIndex) => {
        const actualRowNumber = rowIndex + 2
        result.totalRows++

        if (!row || row.length === 0) return

        const rowData: AdvancedPayrollData = {
          employee_id: "",
          salary_month: "",
          source_file: file.filename,
        }

        let hasError = false

        // Map each column to database field
        Object.entries(mapping).forEach(([excelColumn, dbField]) => {
          const columnIndex = headers.indexOf(excelColumn)
          if (columnIndex === -1) return

          const cellValue = row[columnIndex]
          const fieldConfig = fieldConfigs[dbField]

          if (fieldConfig) {
            const validationError = validateValue(cellValue, fieldConfig)
            if (validationError) {
              result.errors.push({
                row: actualRowNumber,
                employee_id: rowData.employee_id || "N/A",
                field: dbField,
                error: validationError,
                type: fieldConfig.required ? "error" : "warning",
              })

              if (fieldConfig.required) {
                hasError = true
              } else {
                result.warningCount++
              }
            }
          }

          // Convert value based on type
          if (fieldConfig?.type === "number") {
            rowData[dbField] = Number.parseFloat(String(cellValue || "0")) || 0
          } else {
            rowData[dbField] = String(cellValue || "").trim()
          }
        })

        // Check for required fields
        if (!rowData.employee_id) {
          result.errors.push({
            row: actualRowNumber,
            employee_id: "N/A",
            field: "employee_id",
            error: "Thiếu mã nhân viên",
            type: "error",
          })
          hasError = true
        }

        if (!rowData.salary_month) {
          result.errors.push({
            row: actualRowNumber,
            employee_id: rowData.employee_id,
            field: "salary_month",
            error: "Thiếu tháng lương",
            type: "error",
          })
          hasError = true
        }

        // Check for duplicates
        const employeeMonthKey = `${rowData.employee_id}-${rowData.salary_month}`
        if (seenEmployeeMonths.has(employeeMonthKey)) {
          result.errors.push({
            row: actualRowNumber,
            employee_id: rowData.employee_id,
            field: "duplicate",
            error: "Dữ liệu trùng lặp (cùng nhân viên và tháng)",
            type: "warning",
          })
          result.summary.duplicatesFound++
          result.warningCount++
        } else {
          seenEmployeeMonths.add(employeeMonthKey)
        }

        if (hasError) {
          result.errorCount++
        } else {
          result.successCount++
          allData.push(rowData)
        }
      })
    })

    result.data = allData
    result.success = result.errorCount === 0
  } catch (error) {
    result.errors.push({
      row: 0,
      employee_id: "N/A",
      field: "general",
      error: `Lỗi khi xử lý file: ${error instanceof Error ? error.message : "Unknown error"}`,
      type: "error",
    })
    result.errorCount++
  }

  return result
}
