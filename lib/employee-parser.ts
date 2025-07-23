import * as XLSX from "xlsx"

export interface EmployeeData {
  employee_id: string
  full_name: string
  cccd: string
  department: string
  chuc_vu: string
  phone_number?: string
  is_active: boolean
}

export interface ImportResult {
  success: boolean
  totalRows: number
  successCount: number
  errorCount: number
  errors: Array<{
    row: number
    employee_id: string
    error: string
  }>
  data: EmployeeData[]
}

export function parseEmployeeExcelFile(buffer: Buffer, filename: string): ImportResult {
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

    // Mapping các cột - hỗ trợ nhiều tên cột khác nhau
    const columnMapping = {
      employee_id: ["mã nhân viên", "employee_id", "ma_nhan_vien", "id", "mã nv", "manv"],
      full_name: ["họ tên", "full_name", "ho_ten", "name", "tên", "họ và tên", "hoten"],
      cccd: ["cccd", "cmnd", "số cccd", "so_cccd", "căn cước", "can_cuoc"],
      department: ["phòng ban", "department", "phong_ban", "dept", "bộ phận", "bo_phan"],
      chuc_vu: ["chức vụ", "position", "chuc_vu", "vai trò", "role", "chucvu"],
      phone_number: ["số điện thoại", "phone", "phone_number", "sdt", "điện thoại", "dien_thoai"],
      is_active: ["trạng thái", "status", "is_active", "active", "hoạt động", "hoat_dong"],
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
    const requiredColumns = ["employee_id", "full_name", "cccd", "department"]
    const missingColumns = requiredColumns.filter((col) => columnIndexes[col] === undefined)

    if (missingColumns.length > 0) {
      throw new Error(
        `Thiếu các cột bắt buộc: ${missingColumns.join(", ")}. Vui lòng kiểm tra lại header của file Excel.`,
      )
    }

    // Parse dữ liệu
    const employeeData: EmployeeData[] = []
    const errors: Array<{ row: number; employee_id: string; error: string }> = []
    const seenEmployeeIds = new Set<string>()

    rows.forEach((row, index) => {
      const rowNumber = index + 2 // +2 vì bắt đầu từ row 2 (sau header)

      // Bỏ qua dòng trống hoặc dòng hướng dẫn
      if (
        !row ||
        row.length === 0 ||
        String(row[0] || "")
          .trim()
          .startsWith("===")
      ) {
        return
      }

      const employeeId = String(row[columnIndexes.employee_id] || "").trim()
      const fullName = String(row[columnIndexes.full_name] || "").trim()
      const cccd = String(row[columnIndexes.cccd] || "").trim()
      const department = String(row[columnIndexes.department] || "").trim()

      // Validate dữ liệu bắt buộc
      if (!employeeId) {
        errors.push({ row: rowNumber, employee_id: employeeId, error: "Thiếu mã nhân viên" })
        return
      }

      if (!fullName) {
        errors.push({ row: rowNumber, employee_id: employeeId, error: "Thiếu họ tên" })
        return
      }

      if (!cccd) {
        errors.push({ row: rowNumber, employee_id: employeeId, error: "Thiếu số CCCD" })
        return
      }

      if (!department) {
        errors.push({ row: rowNumber, employee_id: employeeId, error: "Thiếu phòng ban" })
        return
      }

      // Kiểm tra duplicate trong file
      if (seenEmployeeIds.has(employeeId)) {
        errors.push({ row: rowNumber, employee_id: employeeId, error: "Mã nhân viên bị trùng trong file" })
        return
      }
      seenEmployeeIds.add(employeeId)

      // Validate format và length
      if (employeeId.length > 50) {
        errors.push({ row: rowNumber, employee_id: employeeId, error: "Mã nhân viên quá dài (tối đa 50 ký tự)" })
        return
      }

      if (fullName.length > 255) {
        errors.push({ row: rowNumber, employee_id: employeeId, error: "Họ tên quá dài (tối đa 255 ký tự)" })
        return
      }

      if (cccd.length > 20) {
        errors.push({ row: rowNumber, employee_id: employeeId, error: "Số CCCD quá dài (tối đa 20 ký tự)" })
        return
      }

      if (department.length > 100) {
        errors.push({ row: rowNumber, employee_id: employeeId, error: "Tên phòng ban quá dài (tối đa 100 ký tự)" })
        return
      }

      // Parse optional fields
      const chucVuRaw =
        columnIndexes.chuc_vu !== undefined
          ? String(row[columnIndexes.chuc_vu] || "nhan_vien")
              .trim()
              .toLowerCase()
          : "nhan_vien"

      const phoneNumber =
        columnIndexes.phone_number !== undefined ? String(row[columnIndexes.phone_number] || "").trim() : ""

      const isActiveStr =
        columnIndexes.is_active !== undefined
          ? String(row[columnIndexes.is_active] || "true")
              .trim()
              .toLowerCase()
          : "true"

      // Normalize chức vụ
      let normalizedChucVu = chucVuRaw
      if (chucVuRaw === "nhân viên" || chucVuRaw === "nhanvien") {
        normalizedChucVu = "nhan_vien"
      } else if (chucVuRaw === "tổ trưởng" || chucVuRaw === "totruong" || chucVuRaw === "tổ_trưởng") {
        normalizedChucVu = "to_truong"
      } else if (
        chucVuRaw === "trưởng phòng" ||
        chucVuRaw === "truongphong" ||
        chucVuRaw === "trưởng_phòng" ||
        chucVuRaw === "phó phòng" ||
        chucVuRaw === "phophong"
      ) {
        normalizedChucVu = "truong_phong"
      }

      // Validate chức vụ
      const validChucVu = ["nhan_vien", "to_truong", "truong_phong"]
      if (!validChucVu.includes(normalizedChucVu)) {
        errors.push({
          row: rowNumber,
          employee_id: employeeId,
          error: `Chức vụ không hợp lệ: "${chucVuRaw}". Chỉ chấp nhận: nhan_vien, to_truong, truong_phong`,
        })
        return
      }

      // Validate phone number
      if (phoneNumber && (phoneNumber.length > 15 || !/^[0-9+\-\s()]*$/.test(phoneNumber))) {
        errors.push({
          row: rowNumber,
          employee_id: employeeId,
          error: "Số điện thoại không hợp lệ (chỉ chấp nhận số, +, -, khoảng trắng, dấu ngoặc)",
        })
        return
      }

      // Parse is_active
      const isActive =
        isActiveStr === "true" ||
        isActiveStr === "1" ||
        isActiveStr === "có" ||
        isActiveStr === "hoạt động" ||
        isActiveStr === "active" ||
        isActiveStr === "yes"

      const data: EmployeeData = {
        employee_id: employeeId,
        full_name: fullName,
        cccd: cccd,
        department: department,
        chuc_vu: normalizedChucVu,
        phone_number: phoneNumber || undefined,
        is_active: isActive,
      }

      employeeData.push(data)
    })

    return {
      success: errors.length === 0,
      totalRows: rows.filter(
        (row) =>
          row &&
          row.length > 0 &&
          !String(row[0] || "")
            .trim()
            .startsWith("==="),
      ).length,
      successCount: employeeData.length,
      errorCount: errors.length,
      errors,
      data: employeeData,
    }
  } catch (error) {
    console.error("Error parsing employee Excel file:", error)
    throw new Error(`Lỗi khi đọc file Excel: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}
