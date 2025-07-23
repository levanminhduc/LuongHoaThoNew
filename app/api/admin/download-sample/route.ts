import { type NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"
import jwt from "jsonwebtoken"

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

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const admin = verifyAdminToken(request)
    if (!admin) {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 401 })
    }

    // Tạo dữ liệu mẫu cho file Excel
    const sampleData = [
      // Header row
      ["Mã Nhân Viên", "Họ Tên", "CCCD", "Chức Vụ", "Tháng Lương", "Tổng Thu Nhập", "Khấu Trừ", "Lương Thực Lĩnh"],

      // Sample data rows
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

    // Tạo workbook và worksheet
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.aoa_to_sheet(sampleData)

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

    // Thêm style cho header row
    const headerRange = XLSX.utils.decode_range(worksheet["!ref"] || "A1:H1")
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
      if (!worksheet[cellAddress]) continue

      worksheet[cellAddress].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "366092" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } },
        },
      }
    }

    // Thêm worksheet vào workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Bảng Lương Mẫu")

    // Tạo buffer
    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
      cellStyles: true,
    })

    // Trả về file Excel
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=bang-luong-mau.xlsx",
        "Content-Length": buffer.length.toString(),
      },
    })
  } catch (error) {
    console.error("Download sample error:", error)
    return NextResponse.json({ error: "Có lỗi xảy ra khi tạo file mẫu" }, { status: 500 })
  }
}
