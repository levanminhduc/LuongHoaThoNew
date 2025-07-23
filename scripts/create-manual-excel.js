// Script để tạo file Excel thủ công với dữ liệu tùy chỉnh
import * as XLSX from "xlsx"
import fs from "fs"

function createCustomExcelFile() {
  // Tạo dữ liệu tùy chỉnh
  const customData = [
    // Header - có thể thay đổi theo nhu cầu
    ["Mã NV", "Tên", "Số CCCD", "Vị trí", "Tháng", "Thu nhập", "Trừ", "Thực lĩnh"],

    // Dữ liệu mẫu - có thể chỉnh sửa
    ["EMP001", "Nguyễn Văn A", "123456789012", "Developer", "2024-03", 20000000, 2000000, 18000000],
    ["EMP002", "Trần Thị B", "123456789013", "Designer", "2024-03", 15000000, 1500000, 13500000],
    ["EMP003", "Lê Văn C", "123456789014", "Manager", "2024-03", 30000000, 3000000, 27000000],
    ["EMP004", "Phạm Thị D", "123456789015", "Tester", "2024-03", 12000000, 1200000, 10800000],
    ["EMP005", "Hoàng Văn E", "123456789016", "BA", "2024-03", 18000000, 1800000, 16200000],
  ]

  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.aoa_to_sheet(customData)

  // Format worksheet
  worksheet["!cols"] = [
    { wch: 12 },
    { wch: 20 },
    { wch: 15 },
    { wch: 15 },
    { wch: 12 },
    { wch: 15 },
    { wch: 12 },
    { wch: 15 },
  ]

  XLSX.utils.book_append_sheet(workbook, worksheet, "Payroll")

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })
  fs.writeFileSync("custom-payroll-sample.xlsx", buffer)

  console.log("Đã tạo file: custom-payroll-sample.xlsx")
  console.log("\nThông tin test:")
  console.log("- Mã NV: EMP001, CCCD: 123456789012")
  console.log("- Mã NV: EMP002, CCCD: 123456789013")
  console.log("- Mã NV: EMP003, CCCD: 123456789014")
}

// Chạy function
createCustomExcelFile()
