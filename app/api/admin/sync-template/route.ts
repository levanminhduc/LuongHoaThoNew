import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/utils/supabase/server"
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

    const supabase = createServiceClient()

    // Get current salary data structure from database
    const { data: samplePayrolls, error } = await supabase
      .from("payrolls")
      .select("*")
      .limit(3)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching sample data:", error)
      return NextResponse.json({ error: "Lỗi khi lấy dữ liệu mẫu" }, { status: 500 })
    }

    // Get available employees for realistic template
    const { data: employees } = await supabase
      .from("employees")
      .select("employee_id, full_name, department")
      .eq("is_active", true)
      .limit(5)

    // Create template based on current database structure
    const templateData = [
      // Header row - all 39 columns from database
      [
        "Mã Nhân Viên",
        "Tháng Lương",
        "Hệ Số Làm Việc",
        "Hệ Số Phụ Cấp Kết Quả",
        "Hệ Số Lương Cơ Bản",
        "Lương Tối Thiểu Công Ty",
        "Ngày Công Trong Giờ",
        "Giờ Công Tăng Ca",
        "Giờ Ăn Ca",
        "Tổng Giờ Làm Việc",
        "Tổng Hệ Số Quy Đổi",
        "Tổng Lương Sản Phẩm Công Đoạn",
        "Đơn Giá Tiền Lương Trên Giờ",
        "Tiền Lương Sản Phẩm Trong Giờ",
        "Tiền Lương Tăng Ca",
        "Tiền Lương 30p Ăn Ca",
        "Tiền Khen Thưởng Chuyên Cần",
        "Lương Học Việc PC Lương",
        "Tổng Cộng Tiền Lương Sản Phẩm",
        "Hỗ Trợ Thời Tiết Nóng",
        "Bổ Sung Lương",
        "BHXH 21.5%",
        "PC CDCS PCCC ATVSV",
        "Lương Phụ Nữ Hành Kinh",
        "Tiền Con Bù Thai 7 Tháng",
        "Hỗ Trợ Gửi Con Nhà Trẻ",
        "Ngày Công Phép Lễ",
        "Tiền Phép Lễ",
        "Tổng Cộng Tiền Lương",
        "Tiền Bốc Vác",
        "Hỗ Trợ Xăng Xe",
        "Thuế TNCN Năm 2024",
        "Tạm Ứng",
        "Thuế TNCN",
        "BHXH BHTN BHYT Total",
        "Truy Thu Thẻ BHYT",
        "Tiền Lương Thực Nhận Cuối Kỳ",
      ],
    ]

    // Add sample data rows based on current database or employees
    if (samplePayrolls && samplePayrolls.length > 0) {
      samplePayrolls.forEach((payroll) => {
        templateData.push([
          payroll.employee_id,
          payroll.salary_month,
          payroll.he_so_lam_viec || 1.0,
          payroll.he_so_phu_cap_ket_qua || 1.0,
          payroll.he_so_luong_co_ban || 1.0,
          payroll.luong_toi_thieu_cty || 4680000,
          payroll.ngay_cong_trong_gio || 22,
          payroll.gio_cong_tang_ca || 0,
          payroll.gio_an_ca || 0,
          payroll.tong_gio_lam_viec || 22,
          payroll.tong_he_so_quy_doi || 22,
          payroll.tong_luong_san_pham_cong_doan || 0,
          payroll.don_gia_tien_luong_tren_gio || 0,
          payroll.tien_luong_san_pham_trong_gio || 0,
          payroll.tien_luong_tang_ca || 0,
          payroll.tien_luong_30p_an_ca || 0,
          payroll.tien_khen_thuong_chuyen_can || 0,
          payroll.luong_hoc_viec_pc_luong || 0,
          payroll.tong_cong_tien_luong_san_pham || 0,
          payroll.ho_tro_thoi_tiet_nong || 0,
          payroll.bo_sung_luong || 0,
          payroll.bhxh_21_5_percent || 0,
          payroll.pc_cdcs_pccc_atvsv || 0,
          payroll.luong_phu_nu_hanh_kinh || 0,
          payroll.tien_con_bu_thai_7_thang || 0,
          payroll.ho_tro_gui_con_nha_tre || 0,
          payroll.ngay_cong_phep_le || 0,
          payroll.tien_phep_le || 0,
          payroll.tong_cong_tien_luong || 0,
          payroll.tien_boc_vac || 0,
          payroll.ho_tro_xang_xe || 0,
          payroll.thue_tncn_nam_2024 || 0,
          payroll.tam_ung || 0,
          payroll.thue_tncn || 0,
          payroll.bhxh_bhtn_bhyt_total || 0,
          payroll.truy_thu_the_bhyt || 0,
          payroll.tien_luong_thuc_nhan_cuoi_ky || 0,
        ])
      })
    } else if (employees && employees.length > 0) {
      // Generate sample data if no payrolls exist
      employees.forEach((employee, index) => {
        const currentMonth = new Date().toISOString().substr(0, 7)
        templateData.push([
          employee.employee_id,
          currentMonth,
          1.2,
          1.0,
          1.0,
          4680000,
          22,
          8,
          0.5,
          30,
          30,
          12000000,
          400000,
          10000000,
          2000000,
          200000,
          500000,
          0,
          12500000,
          200000,
          0,
          1500000,
          100000,
          0,
          0,
          0,
          2,
          400000,
          15000000,
          0,
          0,
          0,
          1000000,
          500000,
          1500000,
          0,
          12000000,
        ])
      })
    }

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.aoa_to_sheet(templateData)

    // Set column widths
    const columnWidths = Array(37).fill({ wch: 15 })
    worksheet["!cols"] = columnWidths

    // Style header row
    const headerRange = XLSX.utils.decode_range(worksheet["!ref"] || "A1:AK1")
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
      if (!worksheet[cellAddress]) continue

      worksheet[cellAddress].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "2563EB" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } },
        },
      }
    }

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template Lương Đồng Bộ")

    // Create buffer
    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
      cellStyles: true,
    })

    // Return synchronized template
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=template-luong-dong-bo-${new Date().toISOString().substr(0, 10)}.xlsx`,
        "Content-Length": buffer.length.toString(),
      },
    })
  } catch (error) {
    console.error("Sync template error:", error)
    return NextResponse.json(
      {
        error: "Có lỗi xảy ra khi tạo template đồng bộ",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
