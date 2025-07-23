import * as XLSX from "xlsx"

export interface ImportConfig {
  id: number
  config_name: string
  file_type: "file1" | "file2"
  description: string
  is_active: boolean
}

export interface ColumnMapping {
  id: number
  config_id: number
  excel_column_name: string
  database_field: string
  data_type: "text" | "number" | "date"
  is_required: boolean
  default_value?: string
  validation_rules?: any
  display_order: number
}

export interface DualFileImportData {
  employee_id: string
  salary_month: string
  file1_data?: { [key: string]: any }
  file2_data?: { [key: string]: any }
  source_files: {
    file1?: string
    file2?: string
  }
}

export interface DualFileImportResult {
  success: boolean
  session_id: string
  total_employees: number
  file1_processed: number
  file2_processed: number
  matched_records: number
  unmatched_records: number
  errors: Array<{
    employee_id: string
    salary_month: string
    file_type: "file1" | "file2"
    error: string
  }>
  warnings: Array<{
    employee_id: string
    salary_month: string
    message: string
  }>
  summary: {
    file1_only: number
    file2_only: number
    both_files: number
    validation_errors: number
  }
}

export class DualFileImportParser {
  private file1Config: ImportConfig | null = null
  private file2Config: ImportConfig | null = null
  private file1Mappings: ColumnMapping[] = []
  private file2Mappings: ColumnMapping[] = []

  constructor(
    file1Config: ImportConfig,
    file1Mappings: ColumnMapping[],
    file2Config: ImportConfig,
    file2Mappings: ColumnMapping[],
  ) {
    this.file1Config = file1Config
    this.file2Config = file2Config
    this.file1Mappings = file1Mappings.sort((a, b) => a.display_order - b.display_order)
    this.file2Mappings = file2Mappings.sort((a, b) => a.display_order - b.display_order)
  }

  parseFiles(
    file1Buffer: Buffer | null,
    file1Name: string | null,
    file2Buffer: Buffer | null,
    file2Name: string | null,
  ): DualFileImportResult {
    const sessionId = `DUAL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const result: DualFileImportResult = {
      success: false,
      session_id: sessionId,
      total_employees: 0,
      file1_processed: 0,
      file2_processed: 0,
      matched_records: 0,
      unmatched_records: 0,
      errors: [],
      warnings: [],
      summary: {
        file1_only: 0,
        file2_only: 0,
        both_files: 0,
        validation_errors: 0,
      },
    }

    try {
      // Parse File 1 if provided
      const file1Data = file1Buffer ? this.parseFile(file1Buffer, file1Name!, this.file1Mappings, "file1") : new Map()

      // Parse File 2 if provided
      const file2Data = file2Buffer ? this.parseFile(file2Buffer, file2Name!, this.file2Mappings, "file2") : new Map()

      // Merge data based on employee_id + salary_month key
      const mergedData = this.mergeFileData(file1Data, file2Data, file1Name, file2Name)

      // Validate merged data
      const validationResult = this.validateMergedData(mergedData)

      result.file1_processed = file1Data.size
      result.file2_processed = file2Data.size
      result.total_employees = mergedData.size
      result.matched_records = validationResult.matched
      result.unmatched_records = validationResult.unmatched
      result.errors = validationResult.errors
      result.warnings = validationResult.warnings
      result.summary = validationResult.summary
      result.success = validationResult.errors.length === 0

      return result
    } catch (error) {
      result.errors.push({
        employee_id: "SYSTEM",
        salary_month: "N/A",
        file_type: "file1",
        error: `System error: ${error instanceof Error ? error.message : "Unknown error"}`,
      })
      return result
    }
  }

  private parseFile(
    buffer: Buffer,
    filename: string,
    mappings: ColumnMapping[],
    fileType: "file1" | "file2",
  ): Map<string, any> {
    const workbook = XLSX.read(buffer, { type: "buffer" })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]

    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

    if (jsonData.length < 2) {
      throw new Error(`File ${filename} không có dữ liệu hoặc thiếu header`)
    }

    const headers = jsonData[0].map((h: any) => String(h).toLowerCase().trim())
    const rows = jsonData.slice(1)

    const dataMap = new Map<string, any>()

    rows.forEach((row, rowIndex) => {
      if (!row || row.length === 0) return

      const rowData: any = {
        source_file: filename,
        file_type: fileType,
      }

      let employeeId = ""
      let salaryMonth = ""

      // Map columns based on configuration
      mappings.forEach((mapping) => {
        const normalizedExcelColumn = mapping.excel_column_name.toLowerCase().trim()
        const columnIndex = headers.findIndex(
          (header) => header.includes(normalizedExcelColumn) || normalizedExcelColumn.includes(header),
        )

        if (columnIndex !== -1) {
          const cellValue = row[columnIndex]
          const processedValue = this.processValue(cellValue, mapping)

          rowData[mapping.database_field] = processedValue

          // Capture key fields
          if (mapping.database_field === "employee_id") {
            employeeId = String(processedValue || "").trim()
          }
          if (mapping.database_field === "salary_month") {
            salaryMonth = String(processedValue || "").trim()
          }
        }
      })

      // Create composite key
      if (employeeId && salaryMonth) {
        const key = `${employeeId}-${salaryMonth}`
        dataMap.set(key, rowData)
      }
    })

    return dataMap
  }

  private processValue(value: any, mapping: ColumnMapping): any {
    if (!value || String(value).trim() === "") {
      return mapping.default_value || (mapping.data_type === "number" ? 0 : "")
    }

    const stringValue = String(value).trim()

    switch (mapping.data_type) {
      case "number":
        const numValue = Number.parseFloat(stringValue)
        return isNaN(numValue) ? 0 : numValue
      case "date":
        const dateValue = new Date(stringValue)
        return isNaN(dateValue.getTime()) ? null : dateValue.toISOString().substr(0, 10)
      default:
        return stringValue
    }
  }

  private mergeFileData(
    file1Data: Map<string, any>,
    file2Data: Map<string, any>,
    file1Name: string | null,
    file2Name: string | null,
  ): Map<string, DualFileImportData> {
    const mergedData = new Map<string, DualFileImportData>()

    // Get all unique keys from both files
    const allKeys = new Set([...file1Data.keys(), ...file2Data.keys()])

    allKeys.forEach((key) => {
      const [employee_id, salary_month] = key.split("-")
      const file1Record = file1Data.get(key)
      const file2Record = file2Data.get(key)

      const mergedRecord: DualFileImportData = {
        employee_id,
        salary_month,
        source_files: {},
      }

      if (file1Record) {
        mergedRecord.file1_data = file1Record
        mergedRecord.source_files.file1 = file1Name || "file1.xlsx"
      }

      if (file2Record) {
        mergedRecord.file2_data = file2Record
        mergedRecord.source_files.file2 = file2Name || "file2.xlsx"
      }

      mergedData.set(key, mergedRecord)
    })

    return mergedData
  }

  private validateMergedData(mergedData: Map<string, DualFileImportData>) {
    const errors: Array<{ employee_id: string; salary_month: string; file_type: "file1" | "file2"; error: string }> = []
    const warnings: Array<{ employee_id: string; salary_month: string; message: string }> = []

    let matched = 0
    let unmatched = 0
    let file1Only = 0
    let file2Only = 0
    let bothFiles = 0
    let validationErrors = 0

    mergedData.forEach((record, key) => {
      const hasFile1 = !!record.file1_data
      const hasFile2 = !!record.file2_data

      if (hasFile1 && hasFile2) {
        bothFiles++
        matched++
      } else {
        unmatched++
        if (hasFile1 && !hasFile2) {
          file1Only++
          warnings.push({
            employee_id: record.employee_id,
            salary_month: record.salary_month,
            message: "Chỉ có dữ liệu từ File 1, thiếu dữ liệu File 2",
          })
        } else if (!hasFile1 && hasFile2) {
          file2Only++
          warnings.push({
            employee_id: record.employee_id,
            salary_month: record.salary_month,
            message: "Chỉ có dữ liệu từ File 2, thiếu dữ liệu File 1",
          })
        }
      }

      // Validate required fields for File 1
      if (hasFile1) {
        this.file1Mappings
          .filter((m) => m.is_required)
          .forEach((mapping) => {
            const value = record.file1_data![mapping.database_field]
            if (!value || String(value).trim() === "") {
              errors.push({
                employee_id: record.employee_id,
                salary_month: record.salary_month,
                file_type: "file1",
                error: `Thiếu trường bắt buộc: ${mapping.excel_column_name}`,
              })
              validationErrors++
            }
          })
      }

      // Validate required fields for File 2
      if (hasFile2) {
        this.file2Mappings
          .filter((m) => m.is_required)
          .forEach((mapping) => {
            const value = record.file2_data![mapping.database_field]
            if (!value || String(value).trim() === "") {
              errors.push({
                employee_id: record.employee_id,
                salary_month: record.salary_month,
                file_type: "file2",
                error: `Thiếu trường bắt buộc: ${mapping.excel_column_name}`,
              })
              validationErrors++
            }
          })
      }
    })

    return {
      matched,
      unmatched,
      errors,
      warnings,
      summary: {
        file1_only: file1Only,
        file2_only: file2Only,
        both_files: bothFiles,
        validation_errors: validationErrors,
      },
    }
  }

  // Convert merged data to database format
  convertToPayrollRecords(mergedData: Map<string, DualFileImportData>, sessionId: string) {
    const records: any[] = []

    mergedData.forEach((record) => {
      const dbRecord: any = {
        employee_id: record.employee_id,
        salary_month: record.salary_month,
        import_batch_id: sessionId,
        import_status: "imported",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      // Merge File 1 data
      if (record.file1_data) {
        Object.keys(record.file1_data).forEach((key) => {
          if (key !== "source_file" && key !== "file_type" && key !== "employee_id" && key !== "salary_month") {
            dbRecord[key] = record.file1_data![key]
          }
        })
        dbRecord.source_file = record.source_files.file1
      }

      // Merge File 2 data (will override File 1 if same field exists)
      if (record.file2_data) {
        Object.keys(record.file2_data).forEach((key) => {
          if (key !== "source_file" && key !== "file_type" && key !== "employee_id" && key !== "salary_month") {
            dbRecord[key] = record.file2_data![key]
          }
        })
        // Update source file to include both if both exist
        if (record.source_files.file1 && record.source_files.file2) {
          dbRecord.source_file = `${record.source_files.file1} + ${record.source_files.file2}`
        } else if (record.source_files.file2) {
          dbRecord.source_file = record.source_files.file2
        }
      }

      records.push(dbRecord)
    })

    return records
  }
}
