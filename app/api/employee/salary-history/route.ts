import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import bcrypt from "bcryptjs";
import {
  formatSalaryMonth,
  formatSignatureTime,
} from "@/lib/utils/date-formatter";
import { getPayrollSelect, type PayrollRecord } from "@/lib/payroll-select";

export async function POST(request: NextRequest) {
  try {
    const { action, employee_id, cccd, salary_month, is_t13 } =
      await request.json();

    if (!action || !employee_id || !cccd) {
      return NextResponse.json(
        { error: "Thiếu thông tin bắt buộc" },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();
    const payrollType = is_t13 ? "t13" : "monthly";

    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select(
        "employee_id, full_name, department, chuc_vu, cccd_hash, password_hash, last_password_change_at",
      )
      .eq("employee_id", employee_id.trim())
      .single();

    if (employeeError || !employee) {
      return NextResponse.json(
        { error: "Không tìm thấy nhân viên với mã nhân viên đã nhập" },
        { status: 404 },
      );
    }

    const hasChangedPassword = employee.last_password_change_at !== null;
    const hashToVerify = hasChangedPassword
      ? employee.password_hash
      : employee.cccd_hash;
    const isValidPassword = await bcrypt.compare(cccd.trim(), hashToVerify);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Xác thực không thành công" },
        { status: 401 },
      );
    }

    if (action === "list_months") {
      let listQuery = supabase
        .from("payrolls")
        .select("salary_month, payroll_type")
        .eq("employee_id", employee_id.trim());

      if (is_t13) {
        listQuery = listQuery.eq("payroll_type", "t13");
      } else {
        listQuery = listQuery.or(
          "payroll_type.eq.monthly,payroll_type.is.null",
        );
      }

      const { data: payrolls, error: payrollsError } = await listQuery.order(
        "salary_month",
        { ascending: false },
      );

      if (payrollsError) {
        return NextResponse.json(
          { error: "Không thể tải danh sách tháng lương" },
          { status: 500 },
        );
      }

      const months = payrolls?.map((p) => p.salary_month) || [];

      return NextResponse.json({
        success: true,
        months,
        payrollType,
      });
    }

    if (action === "get_payroll") {
      if (!salary_month) {
        return NextResponse.json(
          { error: "Thiếu thông tin tháng lương" },
          { status: 400 },
        );
      }

      let payrollQuery = supabase
        .from("payrolls")
        .select(getPayrollSelect(is_t13))
        .eq("employee_id", employee_id.trim())
        .eq("salary_month", salary_month.trim());

      if (is_t13) {
        payrollQuery = payrollQuery.eq("payroll_type", "t13");
      } else {
        payrollQuery = payrollQuery.or(
          "payroll_type.eq.monthly,payroll_type.is.null",
        );
      }

      const { data: payrollData, error: payrollError } =
        await payrollQuery.single();

      const payroll = payrollData as PayrollRecord | null;

      if (payrollError || !payroll) {
        const errorMsg = is_t13
          ? "Không tìm thấy thông tin lương tháng 13 cho tháng này"
          : "Không tìm thấy thông tin lương cho tháng này";
        return NextResponse.json({ error: errorMsg }, { status: 404 });
      }

      const baseResponse = {
        employee_id: employee.employee_id,
        full_name: employee.full_name,
        cccd: cccd.trim(),
        position: employee.chuc_vu,
        department: employee.department,
        salary_month: payroll.salary_month,
        salary_month_display: is_t13
          ? `Lương Tháng 13 - ${payroll.salary_month.split("-")[0]}`
          : formatSalaryMonth(payroll.salary_month),
        source_file: payroll.source_file || "Unknown",
        payroll_type: payroll.payroll_type || "monthly",
        is_signed: payroll.is_signed || false,
        signed_at: payroll.signed_at || null,
        signed_at_display: payroll.signed_at
          ? formatSignatureTime(payroll.signed_at)
          : null,
        signed_by_name: payroll.signed_by_name || null,
      };

      if (is_t13) {
        const t13Response = {
          ...baseResponse,
          chi_dot_1_13: payroll.chi_dot_1_13 || 0,
          chi_dot_2_13: payroll.chi_dot_2_13 || 0,
          tong_luong_13: payroll.tong_luong_13 || 0,
          so_thang_chia_13: payroll.so_thang_chia_13 || 0,
          tong_sp_12_thang: payroll.tong_sp_12_thang || 0,
          t13_thang_01: payroll.t13_thang_01 || 0,
          t13_thang_02: payroll.t13_thang_02 || 0,
          t13_thang_03: payroll.t13_thang_03 || 0,
          t13_thang_04: payroll.t13_thang_04 || 0,
          t13_thang_05: payroll.t13_thang_05 || 0,
          t13_thang_06: payroll.t13_thang_06 || 0,
          t13_thang_07: payroll.t13_thang_07 || 0,
          t13_thang_08: payroll.t13_thang_08 || 0,
          t13_thang_09: payroll.t13_thang_09 || 0,
          t13_thang_10: payroll.t13_thang_10 || 0,
          t13_thang_11: payroll.t13_thang_11 || 0,
          t13_thang_12: payroll.t13_thang_12 || 0,
          total_income: payroll.tong_luong_13 || 0,
          deductions: 0,
          net_salary: payroll.tong_luong_13 || 0,
          tien_luong_thuc_nhan_cuoi_ky: payroll.tong_luong_13 || 0,
        };
        return NextResponse.json({ success: true, payroll: t13Response });
      }

      const monthlyResponse = {
        ...baseResponse,
        total_income: payroll.tien_luong_thuc_nhan_cuoi_ky || 0,
        deductions:
          (payroll.bhxh_bhtn_bhyt_total || 0) + (payroll.thue_tncn || 0),
        net_salary: payroll.tien_luong_thuc_nhan_cuoi_ky || 0,
        he_so_lam_viec: payroll.he_so_lam_viec || 0,
        he_so_phu_cap_ket_qua: payroll.he_so_phu_cap_ket_qua || 0,
        he_so_luong_co_ban: payroll.he_so_luong_co_ban || 0,
        luong_toi_thieu_cty: payroll.luong_toi_thieu_cty || 0,
        ngay_cong_trong_gio: payroll.ngay_cong_trong_gio || 0,
        gio_cong_tang_ca: payroll.gio_cong_tang_ca || 0,
        gio_an_ca: payroll.gio_an_ca || 0,
        tong_gio_lam_viec: payroll.tong_gio_lam_viec || 0,
        tong_he_so_quy_doi: payroll.tong_he_so_quy_doi || 0,
        ngay_cong_chu_nhat: payroll.ngay_cong_chu_nhat || 0,
        tong_luong_san_pham_cong_doan:
          payroll.tong_luong_san_pham_cong_doan || 0,
        don_gia_tien_luong_tren_gio: payroll.don_gia_tien_luong_tren_gio || 0,
        tien_luong_san_pham_trong_gio:
          payroll.tien_luong_san_pham_trong_gio || 0,
        tien_luong_tang_ca: payroll.tien_luong_tang_ca || 0,
        tien_luong_30p_an_ca: payroll.tien_luong_30p_an_ca || 0,
        tien_tang_ca_vuot: payroll.tien_tang_ca_vuot || 0,
        tien_luong_chu_nhat: payroll.tien_luong_chu_nhat || 0,
        luong_cnkcp_vuot: payroll.luong_cnkcp_vuot || 0,
        tien_khen_thuong_chuyen_can: payroll.tien_khen_thuong_chuyen_can || 0,
        luong_hoc_viec_pc_luong: payroll.luong_hoc_viec_pc_luong || 0,
        tong_cong_tien_luong_san_pham:
          payroll.tong_cong_tien_luong_san_pham || 0,
        ho_tro_thoi_tiet_nong: payroll.ho_tro_thoi_tiet_nong || 0,
        bo_sung_luong: payroll.bo_sung_luong || 0,
        pc_luong_cho_viec: payroll.pc_luong_cho_viec || 0,
        bhxh_21_5_percent: payroll.bhxh_21_5_percent || 0,
        pc_cdcs_pccc_atvsv: payroll.pc_cdcs_pccc_atvsv || 0,
        luong_phu_nu_hanh_kinh: payroll.luong_phu_nu_hanh_kinh || 0,
        tien_con_bu_thai_7_thang: payroll.tien_con_bu_thai_7_thang || 0,
        ho_tro_gui_con_nha_tre: payroll.ho_tro_gui_con_nha_tre || 0,
        ngay_cong_phep_le: payroll.ngay_cong_phep_le || 0,
        tien_phep_le: payroll.tien_phep_le || 0,
        tong_cong_tien_luong: payroll.tong_cong_tien_luong || 0,
        tien_boc_vac: payroll.tien_boc_vac || 0,
        ho_tro_xang_xe: payroll.ho_tro_xang_xe || 0,
        thue_tncn_nam_2024: payroll.thue_tncn_nam_2024 || 0,
        tam_ung: payroll.tam_ung || 0,
        thue_tncn: payroll.thue_tncn || 0,
        bhxh_bhtn_bhyt_total: payroll.bhxh_bhtn_bhyt_total || 0,
        truy_thu_the_bhyt: payroll.truy_thu_the_bhyt || 0,
        tien_luong_thuc_nhan_cuoi_ky: payroll.tien_luong_thuc_nhan_cuoi_ky || 0,
      };

      return NextResponse.json({ success: true, payroll: monthlyResponse });
    }

    return NextResponse.json({ error: "Action không hợp lệ" }, { status: 400 });
  } catch (error) {
    console.error("Salary history error:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi xử lý yêu cầu" },
      { status: 500 },
    );
  }
}
