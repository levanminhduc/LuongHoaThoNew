import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/utils/supabase/server"
import { verifyToken } from "@/lib/auth-middleware"
import * as XLSX from "xlsx"

// All 39 payroll fields from database
const PAYROLL_FIELDS = [
  "employee_id", "salary_month",
  "he_so_lam_viec", "he_so_phu_cap_ket_qua", "he_so_luong_co_ban", "luong_toi_thieu_cty",
  "ngay_cong_trong_gio", "gio_cong_tang_ca", "gio_an_ca", "tong_gio_lam_viec", "tong_he_so_quy_doi",
  "ngay_cong_chu_nhat", "tong_luong_san_pham_cong_doan", "don_gia_tien_luong_tren_gio", 
  "tien_luong_san_pham_trong_gio", "tien_luong_tang_ca", "tien_luong_30p_an_ca",
  "tien_khen_thuong_chuyen_can", "luong_hoc_viec_pc_luong", "tong_cong_tien_luong_san_pham",
  "ho_tro_thoi_tiet_nong", "bo_sung_luong", "tien_luong_chu_nhat", "luong_cnkcp_vuot", 
  "tien_tang_ca_vuot", "bhxh_21_5_percent", "pc_cdcs_pccc_atvsv", "luong_phu_nu_hanh_kinh", 
  "tien_con_bu_thai_7_thang", "ho_tro_gui_con_nha_tre", "ngay_cong_phep_le", "tien_phep_le",
  "tong_cong_tien_luong", "tien_boc_vac", "ho_tro_xang_xe", "thue_tncn_nam_2024", "tam_ung", 
  "thue_tncn", "bhxh_bhtn_bhyt_total", "truy_thu_the_bhyt", "tien_luong_thuc_nhan_cuoi_ky"
]

// Field headers in Vietnamese
const FIELD_HEADERS: Record<string, string> = {
  "employee_id": "Mã Nhân Viên",
  "salary_month": "Tháng Lương",
  "he_so_lam_viec": "Hệ Số Làm Việc",
  "he_so_phu_cap_ket_qua": "Hệ Số Phụ Cấp Kết Quả",
  "he_so_luong_co_ban": "Hệ Số Lương Cơ Bản",
  "luong_toi_thieu_cty": "Lương Tối Thiểu Công Ty",
  "ngay_cong_trong_gio": "Ngày Công Trong Giờ",
  "gio_cong_tang_ca": "Giờ Công Tăng Ca",
  "gio_an_ca": "Giờ Ăn Ca",
  "tong_gio_lam_viec": "Tổng Giờ Làm Việc",
  "tong_he_so_quy_doi": "Tổng Hệ Số Quy Đổi",
  "ngay_cong_chu_nhat": "Ngày Công Chủ Nhật",
  "tong_luong_san_pham_cong_doan": "Tổng Lương Sản Phẩm Công Đoàn",
  "don_gia_tien_luong_tren_gio": "Đơn Giá Tiền Lương Trên Giờ",
  "tien_luong_san_pham_trong_gio": "Tiền Lương Sản Phẩm Trong Giờ",
  "tien_luong_tang_ca": "Tiền Lương Tăng Ca",
  "tien_luong_30p_an_ca": "Tiền Lương 30p Ăn Ca",
  "tien_khen_thuong_chuyen_can": "Tiền Khen Thưởng Chuyên Cần",
  "luong_hoc_viec_pc_luong": "Lương Học Việc PC Lương",
  "tong_cong_tien_luong_san_pham": "Tổng Cộng Tiền Lương Sản Phẩm",
  "ho_tro_thoi_tiet_nong": "Hỗ Trợ Thời Tiết Nóng",
  "bo_sung_luong": "Bổ Sung Lương",
  "tien_luong_chu_nhat": "Tiền Lương Chủ Nhật",
  "luong_cnkcp_vuot": "Lương CNKCP Vượt",
  "tien_tang_ca_vuot": "Tiền Tăng Ca Vượt",
  "bhxh_21_5_percent": "BHXH 21.5%",
  "pc_cdcs_pccc_atvsv": "PC CDCS PCCC ATVSV",
  "luong_phu_nu_hanh_kinh": "Lương Phụ Nữ Hành Kinh",
  "tien_con_bu_thai_7_thang": "Tiền Con Bú Thai 7 Tháng",
  "ho_tro_gui_con_nha_tre": "Hỗ Trợ Gửi Con Nhà Trẻ",
  "ngay_cong_phep_le": "Ngày Công Phép Lễ",
  "tien_phep_le": "Tiền Phép Lễ",
  "tong_cong_tien_luong": "Tổng Cộng Tiền Lương",
  "tien_boc_vac": "Tiền Bốc Vác",
  "ho_tro_xang_xe": "Hỗ Trợ Xăng Xe",
  "thue_tncn_nam_2024": "Thuế TNCN Năm 2024",
  "tam_ung": "Tạm Ứng",
  "thue_tncn": "Thuế TNCN",
  "bhxh_bhtn_bhyt_total": "BHXH BHTN BHYT Total",
  "truy_thu_the_bhyt": "Truy Thu Thẻ BHYT",
  "tien_luong_thuc_nhan_cuoi_ky": "Tiền Lương Thực Nhận Cuối Kỳ"
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const auth = verifyToken(request)
    if (!auth) {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 401 })
    }

    // Check role permissions
    if (!['admin', 'truong_phong', 'to_truong'].includes(auth.user.role)) {
      return NextResponse.json({ error: "Không có quyền xuất dữ liệu" }, { status: 403 })
    }

    const supabase = createServiceClient()
    const { searchParams } = new URL(request.url)
    
    const month = searchParams.get("month")
    const department = searchParams.get("department")

    // Build query with role-based filtering
    let query = supabase
      .from("payrolls")
      .select(`
        ${PAYROLL_FIELDS.join(", ")},
        is_signed,
        employees!inner(
          full_name,
          department
        )
      `)
      .order("employees.department")
      .order("employee_id")

    // Apply month filter
    if (month) {
      query = query.eq("salary_month", month)
    }

    // Apply role-based department filtering
    if (auth.user.role === 'truong_phong') {
      // Manager can only access allowed departments
      const allowedDepartments = auth.user.allowed_departments || []
      if (allowedDepartments.length === 0) {
        return NextResponse.json({ 
          error: "Chưa được phân quyền truy cập department nào" 
        }, { status: 403 })
      }
      query = query.in("employees.department", allowedDepartments)
      
      // If specific department requested, check permission
      if (department && !allowedDepartments.includes(department)) {
        return NextResponse.json({ 
          error: "Không có quyền truy cập department này" 
        }, { status: 403 })
      }
      
      if (department) {
        query = query.eq("employees.department", department)
      }
    } else if (auth.user.role === 'to_truong') {
      // Supervisor can only access own department
      query = query.eq("employees.department", auth.user.department)
    } else if (auth.user.role === 'admin') {
      // Admin can access all, apply department filter if specified
      if (department) {
        query = query.eq("employees.department", department)
      }
    }

    const { data: payrollData, error } = await query

    if (error) {
      console.error("Error fetching payroll data:", error)
      return NextResponse.json({ error: "Lỗi khi lấy dữ liệu lương" }, { status: 500 })
    }

    if (!payrollData || payrollData.length === 0) {
      return NextResponse.json({ error: "Không có dữ liệu để xuất" }, { status: 404 })
    }

    // Create workbook
    const workbook = XLSX.utils.book_new()

    // Prepare headers (all 39 fields + Ký Nhận column)
    const headers = [
      "STT",
      ...PAYROLL_FIELDS.map(field => FIELD_HEADERS[field] || field),
      "Ký Nhận"
    ]

    // Prepare data rows
    const dataRows = payrollData.map((record, index) => [
      index + 1, // STT
      ...PAYROLL_FIELDS.map(field => record[field] || ""),
      // Ký Nhận logic: full_name if signed, "Chưa Ký" if not
      record.is_signed 
        ? (record.employees?.full_name || "N/A")
        : "Chưa Ký"
    ])

    // Create worksheet data
    const worksheetData = [headers, ...dataRows]
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)

    // Set column widths
    const columnWidths = headers.map(() => ({ width: 20 }))
    worksheet['!cols'] = columnWidths

    // Add worksheet to workbook
    const departmentName = department || "TatCa"
    const monthName = month || "TatCa"
    const sheetName = `Lương ${departmentName} ${monthName}`
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

    // Generate Excel buffer
    const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })

    // Create meaningful filename
    const timestamp = new Date().toISOString().slice(0, 10)
    const filename = `Luong_${departmentName}_${monthName}_${timestamp}.xlsx`

    // Return Excel file
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": excelBuffer.length.toString(),
      },
    })

  } catch (error) {
    console.error("Payroll export error:", error)
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi xuất dữ liệu lương" },
      { status: 500 }
    )
  }
}
