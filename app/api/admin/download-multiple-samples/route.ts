import { type NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"
import jwt from "jsonwebtoken"
import JSZip from "jszip"

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

function createExcelBuffer(data: any[][], sheetName: string) {
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.aoa_to_sheet(data)

  // Thiết lập độ rộng cột
  worksheet["!cols"] = [
    { wch: 15 },
    { wch: 25 },
    { wch: 15 },
    { wch: 20 },
    { wch: 15 },
    { wch: 18 },
    { wch: 15 },
    { wch: 18 },
  ]

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const admin = verifyAdminToken(request)
    if (!admin) {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 401 })
    }

    // Dữ liệu file 1 - Tháng 1
    const sampleData1 = [
      ["Mã Nhân Viên", "Họ Tên", "CCCD", "Chức Vụ", "Tháng Lương", "Tổng Thu Nhập", "Khấu Trừ", "Lương Thực Lĩnh"],
      ["NV001", "Nguyễn Văn An", "001234567890", "Nhân viên", "2024-01", 15000000, 1500000, 13500000],
      ["NV002", "Trần Thị Bình", "001234567891", "Trưởng phòng", "2024-01", 25000000, 2500000, 22500000],
      ["NV003", "Lê Văn Cường", "001234567892", "Nhân viên", "2024-01", 12000000, 1200000, 10800000],
      ["NV004", "Phạm Thị Dung", "001234567893", "Phó phòng", "2024-01", 20000000, 2000000, 18000000],
      ["NV005", "Hoàng Văn Em", "001234567894", "Nhân viên", "2024-01", 14000000, 1400000, 12600000],
    ]

    // Dữ liệu file 2 - Tháng 2 (English headers)
    const sampleData2 = [
      ["Employee ID", "Full Name", "CCCD", "Position", "Salary Month", "Total Income", "Deductions", "Net Salary"],
      ["NV001", "Nguyễn Văn An", "001234567890", "Nhân viên", "2024-02", 15500000, 1550000, 13950000],
      ["NV002", "Trần Thị Bình", "001234567891", "Trưởng phòng", "2024-02", 26000000, 2600000, 23400000],
      ["NV006", "Vũ Thị Phương", "001234567895", "Chuyên viên", "2024-02", 18500000, 1850000, 16650000],
      ["NV011", "Trương Văn Long", "001234567900", "Nhân viên mới", "2024-02", 10000000, 1000000, 9000000],
    ]

    // Tạo ZIP file chứa nhiều Excel files
    const zip = new JSZip()

    // Tạo file Excel 1
    const buffer1 = createExcelBuffer(sampleData1, "Bảng Lương Tháng 1")
    zip.file("bang-luong-thang-01-2024.xlsx", buffer1)

    // Tạo file Excel 2
    const buffer2 = createExcelBuffer(sampleData2, "Bảng Lương Tháng 2")
    zip.file("bang-luong-thang-02-2024.xlsx", buffer2)

    // Thêm file README
    const readmeContent = `# File Excel Mẫu - Hệ Thống Quản Lý Lương

## Hướng dẫn sử dụng:

1. **Upload file vào hệ thống:**
   - Đăng nhập admin
   - Chọn "Upload File Excel" 
   - Upload một hoặc cả hai file

2. **Định dạng dữ liệu:**
   - File 1: Header tiếng Việt
   - File 2: Header tiếng Anh
   - Cả hai định dạng đều được hỗ trợ

3. **Test tra cứu nhân viên:**
   - Mã NV: NV001, CCCD: 001234567890
   - Mã NV: NV002, CCCD: 001234567891

4. **Lưu ý:**
   - Các cột bắt buộc: Mã NV, Họ Tên, CCCD
   - Số liệu tài chính sử dụng định dạng số
   - Tháng lương theo format: YYYY-MM

## Cấu trúc cột:
- Mã Nhân Viên / Employee ID
- Họ Tên / Full Name  
- CCCD (Căn cước công dân)
- Chức Vụ / Position
- Tháng Lương / Salary Month
- Tổng Thu Nhập / Total Income
- Khấu Trừ / Deductions
- Lương Thực Lĩnh / Net Salary
`

    zip.file("README.txt", readmeContent)

    // Generate ZIP buffer
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" })

    // Trả về ZIP file
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": "attachment; filename=bang-luong-mau-files.zip",
        "Content-Length": zipBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error("Download multiple samples error:", error)
    return NextResponse.json({ error: "Có lỗi xảy ra khi tạo file mẫu" }, { status: 500 })
  }
}
