import { verifyEmployeeCredential } from "@/lib/auth/employee-credential";
import {
  formatSalaryMonth,
  formatSignatureTime,
} from "@/lib/utils/date-formatter";
import {
  getPayrollSelectSummary,
  type PayrollRecord,
} from "@/lib/payroll/payroll-select";
import { createEmployeeSession } from "@/lib/employee-session";
import {
  findEmployeeAuthRecord,
  type EmployeeAuthRecord,
  type SupabaseServiceClient,
} from "./employee-repository";
import type { LookupPayrollResponse } from "./lookup-types";

const T13_MONTH_REGEX = /^\d{4}-(13|T13)$/i;
const MONTHLY_MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

export interface LookupInput {
  employee_id: string;
  cccd: string;
  is_t13: boolean;
}

export type LookupResult =
  | { ok: true; payroll: LookupPayrollResponse; session_token: string }
  | { ok: false; status: number; error: string };

async function findLatestPayroll(
  supabase: SupabaseServiceClient,
  employeeId: string,
  isT13: boolean,
) {
  let query = supabase
    .from("payrolls")
    .select(getPayrollSelectSummary(isT13))
    .eq("employee_id", employeeId);

  query = isT13
    ? query.eq("payroll_type", "t13")
    : query.or("payroll_type.eq.monthly,payroll_type.is.null");

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return { payroll: data as PayrollRecord | null, error };
}

function buildBaseResponse(
  employee: EmployeeAuthRecord,
  payroll: PayrollRecord,
  isT13: boolean,
) {
  return {
    employee_id: employee.employee_id,
    full_name: employee.full_name ?? "",
    position: employee.chuc_vu ?? "",
    department: employee.department ?? "",
    salary_month: payroll.salary_month,
    salary_month_display: isT13
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
}

function buildT13Response(
  base: ReturnType<typeof buildBaseResponse>,
  payroll: PayrollRecord,
): LookupPayrollResponse {
  return {
    ...base,
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
}

function buildMonthlyResponse(
  base: ReturnType<typeof buildBaseResponse>,
  payroll: PayrollRecord,
): LookupPayrollResponse {
  return {
    ...base,
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
}

export async function lookupEmployeePayroll(
  supabase: SupabaseServiceClient,
  input: LookupInput,
): Promise<LookupResult> {
  const { employee_id, cccd, is_t13 } = input;

  const employee = await findEmployeeAuthRecord(supabase, employee_id);
  if (!employee) {
    return {
      ok: false,
      status: 404,
      error: "Không tìm thấy nhân viên với mã nhân viên đã nhập",
    };
  }

  if (!(await verifyEmployeeCredential(employee, cccd))) {
    return { ok: false, status: 401, error: "Mật khẩu không đúng" };
  }

  const { payroll, error } = await findLatestPayroll(
    supabase,
    employee_id,
    is_t13,
  );

  if (error || !payroll) {
    console.error("Payroll query error:", { employee_id, is_t13, error });
    return {
      ok: false,
      status: 404,
      error: is_t13
        ? "Không tìm thấy thông tin lương tháng 13 cho nhân viên này"
        : "Không tìm thấy thông tin lương cho nhân viên này",
    };
  }

  if (is_t13 && !T13_MONTH_REGEX.test(payroll.salary_month)) {
    return {
      ok: false,
      status: 400,
      error: `Tháng lương "${payroll.salary_month}" không hợp lệ cho lương tháng 13. Định dạng đúng: YYYY-13`,
    };
  }

  if (
    !is_t13 &&
    payroll.salary_month &&
    !MONTHLY_MONTH_REGEX.test(payroll.salary_month)
  ) {
    console.warn(
      `Non-standard salary_month format for employee ${employee_id}: ${payroll.salary_month}`,
    );
  }

  const base = buildBaseResponse(employee, payroll, is_t13);

  return {
    ok: true,
    session_token: createEmployeeSession(employee_id),
    payroll: is_t13
      ? buildT13Response(base, payroll)
      : buildMonthlyResponse(base, payroll),
  };
}
