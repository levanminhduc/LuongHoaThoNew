import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import bcrypt from "bcryptjs";
import {
  formatSalaryMonth,
  formatSignatureTime,
} from "@/lib/utils/date-formatter";
import {
  getPayrollSelectSummary,
  type PayrollRecord,
} from "@/lib/payroll-select";
import { createEmployeeSession } from "@/lib/employee-session";

function validateMonthlyFormat(salaryMonth: string): boolean {
  const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
  return monthPattern.test(salaryMonth);
}

function validateT13Format(salaryMonth: string): boolean {
  const t13Pattern = /^\d{4}-(13|T13)$/i;
  return t13Pattern.test(salaryMonth);
}

/**
 * @swagger
 * /employee/lookup:
 *   post:
 *     tags:
 *       - Employee
 *     summary: Tra cứu thông tin lương
 *     description: Nhân viên tra cứu thông tin lương bằng mã NV và mật khẩu/CCCD
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employee_id
 *               - cccd
 *             properties:
 *               employee_id:
 *                 type: string
 *                 description: Mã nhân viên
 *               cccd:
 *                 type: string
 *                 description: Mật khẩu hoặc số CCCD
 *               is_t13:
 *                 type: boolean
 *                 default: false
 *                 description: Tra cứu lương tháng 13
 *     responses:
 *       200:
 *         description: Thông tin lương
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 payroll:
 *                   $ref: '#/components/schemas/Payroll'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
export async function POST(request: NextRequest) {
  try {
    const { employee_id, cccd, is_t13 } = await request.json();

    if (!employee_id || !cccd) {
      return NextResponse.json(
        { error: "Thiếu mã nhân viên hoặc số CCCD" },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();

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
        { error: "Mật khẩu không đúng" },
        { status: 401 },
      );
    }

    const session_token = createEmployeeSession(employee_id.trim());

    let query = supabase
      .from("payrolls")
      .select(getPayrollSelectSummary(is_t13))
      .eq("employee_id", employee_id.trim());

    if (is_t13) {
      query = query.eq("payroll_type", "t13");
    } else {
      query = query.or("payroll_type.eq.monthly,payroll_type.is.null");
    }

    const { data: payrollData, error: payrollError } = await query
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const payroll = payrollData as PayrollRecord | null;

    if (payrollError || !payroll) {
      console.error("Payroll query error:", {
        employee_id: employee_id.trim(),
        is_t13,
        error: payrollError,
        message: payrollError?.message,
        details: payrollError?.details,
        hint: payrollError?.hint,
      });

      const errorMsg = is_t13
        ? "Không tìm thấy thông tin lương tháng 13 cho nhân viên này"
        : "Không tìm thấy thông tin lương cho nhân viên này";
      return NextResponse.json({ error: errorMsg }, { status: 404 });
    }

    if (is_t13) {
      const salaryMonth = payroll.salary_month;
      if (!validateT13Format(salaryMonth)) {
        return NextResponse.json(
          {
            error: `Tháng lương "${salaryMonth}" không hợp lệ cho lương tháng 13. Định dạng đúng: YYYY-13`,
          },
          { status: 400 },
        );
      }
    } else {
      const salaryMonth = payroll.salary_month;
      if (salaryMonth && !validateMonthlyFormat(salaryMonth)) {
        console.warn(
          `Non-standard salary_month format for employee ${employee_id}: ${salaryMonth}`,
        );
      }
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
      must_change_password: employee.last_password_change_at === null,
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
      return NextResponse.json({
        success: true,
        payroll: t13Response,
        session_token,
      });
    }

    const monthlyResponse = {
      ...baseResponse,
      total_income: payroll.tien_luong_thuc_nhan_cuoi_ky || 0,
      deductions: payroll.bhxh_bhtn_bhyt_total || 0,
      net_salary: payroll.tien_luong_thuc_nhan_cuoi_ky || 0,
      he_so_lam_viec: payroll.he_so_lam_viec || 0,
      he_so_phu_cap_ket_qua: payroll.he_so_phu_cap_ket_qua || 0,
      ngay_cong_trong_gio: payroll.ngay_cong_trong_gio ?? null,
      tien_khen_thuong_chuyen_can: payroll.tien_khen_thuong_chuyen_can || 0,
      tien_tang_ca_vuot: payroll.tien_tang_ca_vuot || 0,
      luong_cnkcp_vuot: payroll.luong_cnkcp_vuot || 0,
      luong_hoc_viec_pc_luong: payroll.luong_hoc_viec_pc_luong || 0,
      bhxh_bhtn_bhyt_total: payroll.bhxh_bhtn_bhyt_total || 0,
      tien_luong_thuc_nhan_cuoi_ky: payroll.tien_luong_thuc_nhan_cuoi_ky || 0,
    };

    return NextResponse.json({
      success: true,
      payroll: monthlyResponse,
      session_token,
    });
  } catch (error) {
    console.error("Employee lookup error:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi tra cứu thông tin" },
      { status: 500 },
    );
  }
}
