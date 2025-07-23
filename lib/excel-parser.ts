import * as XLSX from "xlsx"

export interface PayrollData {
  employee_id: string
  full_name: string
  cccd: string
  position?: string
  salary_month: string
  total_income: number
  deductions: number
  net_salary: number
  source_file: string
}

export function parseExcelFile(buffer: Buffer, filename: string): PayrollData[] {
  try {
    const workbook = XLSX.read(buffer, { type: "buffer" })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]

    // Chuyển đổi sheet thành JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

    if (jsonData.length < 2) {
      throw new Error("File Excel không có dữ liệu hoặc thiếu header")
    }

    const headers = jsonData[0].map((h: any) => String(h).toLowerCase().trim())
    const rows = jsonData.slice(1)

    // Mapping các cột (có thể điều chỉnh theo format Excel thực tế)
    const columnMapping = {
      employee_id: ["mã nhân viên", "employee_id", "ma_nhan_vien", "id"],
      full_name: ["họ tên", "full_name", "ho_ten", "name", "tên"],
      cccd: ["cccd", "cmnd", "số cccd", "so_cccd"],
      position: ["chức vụ", "position", "chuc_vu", "vị trí"],
      salary_month: ["tháng lương", "salary_month", "thang_luong", "month"],
      total_income: ["tổng thu nhập", "total_income", "tong_thu_nhap", "income"],
      deductions: ["khấu trừ", "deductions", "khau_tru", "deduction"],
      net_salary: ["lương thực lĩnh", "net_salary", "luong_thuc_linh", "net"],
    }

    // Tìm index của các cột
    const columnIndexes: { [key: string]: number } = {}

    Object.entries(columnMapping).forEach(([key, possibleNames]) => {
      const index = headers.findIndex((header) => possibleNames.some((name) => header.includes(name)))
      if (index !== -1) {
        columnIndexes[key] = index
      }
    })

    // Kiểm tra các cột bắt buộc
    const requiredColumns = ["employee_id", "full_name", "cccd"]
    const missingColumns = requiredColumns.filter((col) => columnIndexes[col] === undefined)

    if (missingColumns.length > 0) {
      throw new Error(`Thiếu các cột bắt buộc: ${missingColumns.join(", ")}`)
    }

    // Parse dữ liệu
    const payrollData: PayrollData[] = []

    rows.forEach((row, index) => {
      if (!row || row.length === 0) return

      const employeeId = String(row[columnIndexes.employee_id] || "").trim()
      const fullName = String(row[columnIndexes.full_name] || "").trim()
      const cccd = String(row[columnIndexes.cccd] || "").trim()

      if (!employeeId || !fullName || !cccd) {
        console.warn(`Bỏ qua dòng ${index + 2}: thiếu thông tin bắt buộc`)
        return
      }

      const data: PayrollData = {
        employee_id: employeeId,
        full_name: fullName,
        cccd: cccd,
        position: columnIndexes.position !== undefined ? String(row[columnIndexes.position] || "") : "",
        salary_month: columnIndexes.salary_month !== undefined ? String(row[columnIndexes.salary_month] || "") : "",
        total_income:
          columnIndexes.total_income !== undefined
            ? Number.parseFloat(String(row[columnIndexes.total_income] || "0")) || 0
            : 0,
        deductions:
          columnIndexes.deductions !== undefined
            ? Number.parseFloat(String(row[columnIndexes.deductions] || "0")) || 0
            : 0,
        net_salary:
          columnIndexes.net_salary !== undefined
            ? Number.parseFloat(String(row[columnIndexes.net_salary] || "0")) || 0
            : 0,
        source_file: filename,
      }

      payrollData.push(data)
    })

    return payrollData
  } catch (error) {
    console.error("Error parsing Excel file:", error)
    throw new Error(`Lỗi khi đọc file Excel: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}
