import * as XLSX from "xlsx"
import fs from "fs"

// Dữ liệu mẫu cho file Excel
const sampleData = [
  // Header row
  ["Mã Nhân Viên", "Họ Tên", "CCCD", "Chức Vụ", "Tháng Lương", "Tổng Thu Nhập", "Khấu Trừ", "Lương Thực Lĩnh"],
  // Data rows
  ["NV001", "Nguyễn Văn An", "001234567890", "Nhân viên", "2024-01", 15000000, 1500000, 13500000],
  ["NV002", "Trần Thị Bình", "001234567891", "Trưởng phòng", "2024-01", 25000000, 2500000, 22500000],
  ["NV003", "Lê Văn Cường", "001234567892", "Nhân viên", "2024-01", 12000000, 1200000, 10800000],
  ["NV004", "Phạm Thị Dung", "001234567893", "Phó phòng", "2024-01", 20000000, 2000000, 18000000],
  ["NV005", "Hoàng Văn Em", "001234567894", "Nhân viên", "2024-01", 14000000, 1400000, 12600000],
  ["NV006", "Vũ Thị Phương", "001234567895", "Chuyên viên", "2024-01", 18000000, 1800000, 16200000],
  ["NV007", "Đỗ Văn Giang", "001234567896", "Nhân viên", "2024-01", 13000000, 1300000, 11700000],
  ["NV008", "Bùi Thị Hoa", "001234567897", "Kế toán trưởng", "2024-01", 22000000, 2200000, 19800000],
  ["NV009", "Ngô Văn Inh", "001234567898", "Nhân viên", "2024-01", 11000000, 1100000, 9900000],
  ["NV010", "Lý Thị Kim", "001234567899", "Thư ký", "2024-01", 16000000, 1600000, 14400000],
]

// Dữ liệu cho file thứ 2 (tháng 2)
const sampleData2 = [
  // Header row
  ["Employee ID", "Full Name", "CCCD", "Position", "Salary Month", "Total Income", "Deductions", "Net Salary"],
  // Data rows - same employees, different month
  ["NV001", "Nguyễn Văn An", "001234567890", "Nhân viên", "2024-02", 15500000, 1550000, 13950000],
  ["NV002", "Trần Thị Bình", "001234567891", "Trưởng phòng", "2024-02", 26000000, 2600000, 23400000],
  ["NV003", "Lê Văn Cường", "001234567892", "Nhân viên", "2024-02", 12500000, 1250000, 11250000],
  ["NV004", "Phạm Thị Dung", "001234567893", "Phó phòng", "2024-02", 21000000, 2100000, 18900000],
  ["NV005", "Hoàng Văn Em", "001234567894", "Nhân viên", "2024-02", 14500000, 1450000, 13050000],
  ["NV011", "Trương Văn Long", "001234567900", "Nhân viên mới", "2024-02", 10000000, 1000000, 9000000],
  ["NV012", "Phan Thị Mai", "001234567901", "Thực tập sinh", "2024-02", 8000000, 800000, 7200000],
]

function generateExcelFile(data, filename) {
  // Tạo workbook mới
  const workbook = XLSX.utils.book_new()

  // Tạo worksheet từ dữ liệu
  const worksheet = XLSX.utils.aoa_to_sheet(data)

  // Thiết lập độ rộng cột
  const columnWidths = [
    { wch: 15 }, // Mã Nhân Viên
    { wch: 25 }, // Họ Tên
    { wch: 15 }, // CCCD
    { wch: 20 }, // Chức Vụ
    { wch: 15 }, // Tháng Lương
    { wch: 18 }, // Tổng Thu Nhập
    { wch: 15 }, // Khấu Trừ
    { wch: 18 }, // Lương Thực Lĩnh
  ]
  worksheet["!cols"] = columnWidths

  // Thêm worksheet vào workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, "Bảng Lương")

  // Tạo buffer
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })

  // Ghi file
  fs.writeFileSync(filename, buffer)
  console.log(`Đã tạo file: ${filename}`)
}

// Tạo 2 file Excel mẫu
generateExcelFile(sampleData, "bang-luong-thang-01-2024.xlsx")
generateExcelFile(sampleData2, "bang-luong-thang-02-2024.xlsx")

console.log("Hoàn thành tạo file Excel mẫu!")
console.log("\nHướng dẫn sử dụng:")
console.log("1. Chạy script: node scripts/generate-sample-excel.js")
console.log("2. Upload các file .xlsx vừa tạo vào hệ thống admin")
console.log("3. Test tra cứu với:")
console.log("   - Mã NV: NV001, CCCD: 001234567890")
console.log("   - Mã NV: NV002, CCCD: 001234567891")
