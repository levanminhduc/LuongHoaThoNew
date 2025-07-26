import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/utils/supabase/server"
import bcrypt from "bcryptjs"
import { formatSalaryMonth, formatSignatureTime } from "@/lib/utils/date-formatter"

export async function POST(request: NextRequest) {
  try {
    const { employee_id, cccd } = await request.json()

    if (!employee_id || !cccd) {
      return NextResponse.json({ error: "Thiếu mã nhân viên hoặc số CCCD" }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Bước 1: Tìm nhân viên và verify CCCD
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("employee_id, full_name, cccd_hash, department, chuc_vu")
      .eq("employee_id", employee_id.trim())
      .single()

    if (employeeError || !employee) {
      return NextResponse.json(
        { error: "Không tìm thấy nhân viên với mã nhân viên đã nhập" },
        { status: 404 },
      )
    }

    // Bước 2: Verify CCCD với hash
    const isValidCCCD = await bcrypt.compare(cccd.trim(), employee.cccd_hash)
    if (!isValidCCCD) {
      return NextResponse.json(
        { error: "Số CCCD không đúng" },
        { status: 401 },
      )
    }

    // Bước 3: Tìm thông tin lương mới nhất
    const { data: payroll, error: payrollError } = await supabase
      .from("payrolls")
      .select("*")
      .eq("employee_id", employee_id.trim())
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (payrollError || !payroll) {
      return NextResponse.json(
        { error: "Không tìm thấy thông tin lương cho nhân viên này" },
        { status: 404 },
      )
    }

    // Bước 4: Tạo response với thông tin đầy đủ (bao gồm tất cả 39 cột + thông tin ký)
    const response = {
      // Thông tin cơ bản
      employee_id: employee.employee_id,
      full_name: employee.full_name,
      cccd: cccd.trim(), // Trả về CCCD gốc (không hash)
      position: employee.chuc_vu,
      department: employee.department,
      salary_month: payroll.salary_month, // Keep original for processing
      salary_month_display: formatSalaryMonth(payroll.salary_month), // Formatted for display
      total_income: payroll.tien_luong_thuc_nhan_cuoi_ky || 0,
      deductions: (payroll.bhxh_bhtn_bhyt_total || 0) + (payroll.thue_tncn || 0),
      net_salary: payroll.tien_luong_thuc_nhan_cuoi_ky || 0,
      source_file: payroll.source_file || "Unknown",

      // Hệ số và thông số cơ bản
      he_so_lam_viec: payroll.he_so_lam_viec || 0,
      he_so_phu_cap_ket_qua: payroll.he_so_phu_cap_ket_qua || 0,
      he_so_luong_co_ban: payroll.he_so_luong_co_ban || 0,
      luong_toi_thieu_cty: payroll.luong_toi_thieu_cty || 0,

      // Thời gian làm việc
      ngay_cong_trong_gio: payroll.ngay_cong_trong_gio || 0,
      gio_cong_tang_ca: payroll.gio_cong_tang_ca || 0,
      gio_an_ca: payroll.gio_an_ca || 0,
      tong_gio_lam_viec: payroll.tong_gio_lam_viec || 0,
      tong_he_so_quy_doi: payroll.tong_he_so_quy_doi || 0,

      // Lương sản phẩm và đơn giá
      tong_luong_san_pham_cong_doan: payroll.tong_luong_san_pham_cong_doan || 0,
      don_gia_tien_luong_tren_gio: payroll.don_gia_tien_luong_tren_gio || 0,
      tien_luong_san_pham_trong_gio: payroll.tien_luong_san_pham_trong_gio || 0,
      tien_luong_tang_ca: payroll.tien_luong_tang_ca || 0,
      tien_luong_30p_an_ca: payroll.tien_luong_30p_an_ca || 0,

      // Thưởng và phụ cấp
      tien_khen_thuong_chuyen_can: payroll.tien_khen_thuong_chuyen_can || 0,
      luong_hoc_viec_pc_luong: payroll.luong_hoc_viec_pc_luong || 0,
      tong_cong_tien_luong_san_pham: payroll.tong_cong_tien_luong_san_pham || 0,
      ho_tro_thoi_tiet_nong: payroll.ho_tro_thoi_tiet_nong || 0,
      bo_sung_luong: payroll.bo_sung_luong || 0,

      // Bảo hiểm và phúc lợi
      bhxh_21_5_percent: payroll.bhxh_21_5_percent || 0,
      pc_cdcs_pccc_atvsv: payroll.pc_cdcs_pccc_atvsv || 0,
      luong_phu_nu_hanh_kinh: payroll.luong_phu_nu_hanh_kinh || 0,
      tien_con_bu_thai_7_thang: payroll.tien_con_bu_thai_7_thang || 0,
      ho_tro_gui_con_nha_tre: payroll.ho_tro_gui_con_nha_tre || 0,

      // Phép và lễ
      ngay_cong_phep_le: payroll.ngay_cong_phep_le || 0,
      tien_phep_le: payroll.tien_phep_le || 0,

      // Tổng lương và phụ cấp khác
      tong_cong_tien_luong: payroll.tong_cong_tien_luong || 0,
      tien_boc_vac: payroll.tien_boc_vac || 0,
      ho_tro_xang_xe: payroll.ho_tro_xang_xe || 0,

      // Thuế và khấu trừ
      thue_tncn_nam_2024: payroll.thue_tncn_nam_2024 || 0,
      tam_ung: payroll.tam_ung || 0,
      thue_tncn: payroll.thue_tncn || 0,
      bhxh_bhtn_bhyt_total: payroll.bhxh_bhtn_bhyt_total || 0,
      truy_thu_the_bhyt: payroll.truy_thu_the_bhyt || 0,

      // Lương thực nhận
      tien_luong_thuc_nhan_cuoi_ky: payroll.tien_luong_thuc_nhan_cuoi_ky || 0,

      // Thông tin ký nhận
      is_signed: payroll.is_signed || false,
      signed_at: payroll.signed_at || null,
      signed_at_display: payroll.signed_at ? formatSignatureTime(payroll.signed_at) : null,
      signed_by_name: payroll.signed_by_name || null,
    }

    return NextResponse.json({
      success: true,
      payroll: response,
    })
  } catch (error) {
    console.error("Employee lookup error:", error)
    return NextResponse.json({ error: "Có lỗi xảy ra khi tra cứu thông tin" }, { status: 500 })
  }
}
