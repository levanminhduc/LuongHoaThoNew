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

    // Tạo dữ liệu template cho file Excel - khớp 100% với database schema
    const templateData = [
      // Header row - khớp chính xác với database columns
      ["Mã Nhân Viên", "Họ Tên", "Số CCCD", "Phòng Ban", "Chức Vụ", "Số Điện Thoại", "Trạng Thái"],

      // Sample data rows - dữ liệu realistic và valid
      ["NV001", "Nguyễn Văn An", "001234567890", "Phòng Sản Xuất", "nhan_vien", "0901234567", "true"],
      ["NV002", "Trần Thị Bình", "001234567891", "Phòng Kế Toán", "to_truong", "0901234568", "true"],
      ["NV003", "Lê Văn Cường", "001234567892", "Phòng QC", "truong_phong", "0901234569", "true"],

      // Dòng trống để phân cách
      [],

      // Hướng dẫn chi tiết
      ["=== HƯỚNG DẪN SỬ DỤNG TEMPLATE NHÂN VIÊN ==="],
      [],
      ["🔴 CÁC CỘT BẮT BUỘC (KHÔNG ĐƯỢC ĐỂ TRỐNG):"],
      ["1. Mã Nhân Viên: Mã duy nhất, tối đa 50 ký tự (VD: NV001, EMP001)"],
      ["2. Họ Tên: Họ và tên đầy đủ, tối đa 255 ký tự (VD: Nguyễn Văn A)"],
      ["3. Số CCCD: Số căn cước công dân, tối đa 20 ký tự (VD: 001234567890)"],
      ["4. Phòng Ban: Tên phòng ban, tối đa 100 ký tự (VD: Phòng Sản Xuất)"],
      [],
      ["🟡 CÁC CỘT TÙY CHỌN:"],
      ["5. Chức Vụ: Chỉ chấp nhận 3 giá trị sau (mặc định: nhan_vien)"],
      ["   - nhan_vien: Nhân viên thường"],
      ["   - to_truong: Tổ trưởng, quản lý nhóm"],
      ["   - truong_phong: Trưởng phòng, quản lý phòng ban"],
      ["6. Số Điện Thoại: Số điện thoại liên hệ, tối đa 15 ký tự (VD: 0901234567)"],
      ["7. Trạng Thái: true/false hoặc có/không (mặc định: true)"],
      [],
      ["⚠️ LƯU Ý QUAN TRỌNG:"],
      ["- XÓA TẤT CẢ CÁC DÒNG HƯỚNG DẪN NÀY TRƯỚC KHI IMPORT"],
      ["- CHỈ GIỮ LẠI DÒNG HEADER VÀ DỮ LIỆU NHÂN VIÊN"],
      ["- Mã nhân viên KHÔNG ĐƯỢC TRÙNG LẶP trong file và hệ thống"],
      ["- File hỗ trợ định dạng .xlsx và .xls"],
      ["- Dữ liệu sẽ được validate nghiêm ngặt trước khi import"],
      [],
      ["📋 VÍ DỤ DỮ LIỆU CHUẨN:"],
      ["Mã NV | Họ Tên | CCCD | Phòng Ban | Chức Vụ | SĐT | Trạng Thái"],
      ["NV004 | Phạm Thị Dung | 001234567893 | Phòng Nhân Sự | nhan_vien | 0901234570 | true"],
      ["NV005 | Hoàng Văn Em | 001234567894 | Phòng IT | to_truong | 0901234571 | true"],
      [],
      ["🔧 XỬ LÝ LỖI THƯỜNG GẶP:"],
      ["- 'Mã nhân viên đã tồn tại': Thay đổi mã nhân viên khác"],
      ["- 'Thiếu trường bắt buộc': Điền đầy đủ 4 cột bắt buộc"],
      ["- 'Chức vụ không hợp lệ': Chỉ dùng: nhan_vien/to_truong/truong_phong"],
      ["- 'Dữ liệu quá dài': Kiểm tra giới hạn ký tự từng trường"],
      [],
      ["✅ SAU KHI HOÀN THÀNH:"],
      ["1. Xóa tất cả dòng hướng dẫn (từ dòng 5 trở xuống)"],
      ["2. Kiểm tra lại dữ liệu"],
      ["3. Lưu file và upload vào hệ thống"],
      ["4. Xem báo cáo kết quả import"],
    ]

    // Tạo workbook và worksheet
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.aoa_to_sheet(templateData)

    // Thiết lập độ rộng cột tối ưu
    const columnWidths = [
      { wch: 15 }, // Mã Nhân Viên
      { wch: 25 }, // Họ Tên
      { wch: 15 }, // Số CCCD
      { wch: 20 }, // Phòng Ban
      { wch: 15 }, // Chức Vụ
      { wch: 15 }, // Số Điện Thoại
      { wch: 12 }, // Trạng Thái
    ]
    worksheet["!cols"] = columnWidths

    // Style cho header row (dòng 1)
    const headerRange = XLSX.utils.decode_range(worksheet["!ref"] || "A1:G1")
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
      if (!worksheet[cellAddress]) continue

      worksheet[cellAddress].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "2563EB" } }, // Blue-600
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } },
        },
      }
    }

    // Style cho sample data rows (dòng 2-4)
    for (let row = 1; row <= 3; row++) {
      for (let col = 0; col < 7; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
        if (!worksheet[cellAddress]) continue

        worksheet[cellAddress].s = {
          fill: { fgColor: { rgb: "F3F4F6" } }, // Gray-100
          border: {
            top: { style: "thin", color: { rgb: "D1D5DB" } },
            bottom: { style: "thin", color: { rgb: "D1D5DB" } },
            left: { style: "thin", color: { rgb: "D1D5DB" } },
            right: { style: "thin", color: { rgb: "D1D5DB" } },
          },
        }
      }
    }

    // Thêm worksheet vào workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template Nhân Viên")

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
        "Content-Disposition": "attachment; filename=template-danh-sach-nhan-vien.xlsx",
        "Content-Length": buffer.length.toString(),
      },
    })
  } catch (error) {
    console.error("Download employee template error:", error)
    return NextResponse.json({ error: "Có lỗi xảy ra khi tạo file template" }, { status: 500 })
  }
}
