import "server-only";
import type { createServiceClient } from "@/utils/supabase/server";
import { MONTHLY_PAYROLL_TYPE_FILTER } from "@/lib/payroll/payroll-list-query";

export type SupabaseServiceClient = ReturnType<typeof createServiceClient>;

const RECENT_PAYROLLS_SELECT =
  "id, employee_id, salary_month, payroll_type, tien_luong_thuc_nhan_cuoi_ky, source_file, import_batch_id, import_status, created_at";

const RECENT_PAYROLLS_LIMIT = 100;

const DEPARTMENTS_SUMMARY_SELECT =
  "tien_luong_thuc_nhan_cuoi_ky, tong_luong_13, is_signed, payroll_type, salary_month, employees!payrolls_employee_id_fkey!inner(department)";

const DEPARTMENT_DETAIL_SELECT =
  "id, employee_id, salary_month, payroll_type, source_file, import_batch_id, import_status, he_so_lam_viec, he_so_phu_cap_ket_qua, he_so_luong_co_ban, luong_toi_thieu_cty, ngay_cong_trong_gio, gio_cong_tang_ca, gio_an_ca, tong_gio_lam_viec, tong_he_so_quy_doi, ngay_cong_chu_nhat, tong_luong_san_pham_cong_doan, don_gia_tien_luong_tren_gio, tien_luong_san_pham_trong_gio, tien_luong_tang_ca, tien_luong_30p_an_ca, tien_khen_thuong_chuyen_can, luong_hoc_viec_pc_luong, tong_cong_tien_luong_san_pham, ho_tro_thoi_tiet_nong, bo_sung_luong, pc_luong_cho_viec, tien_luong_chu_nhat, luong_cnkcp_vuot, tien_tang_ca_vuot, bhxh_21_5_percent, pc_cdcs_pccc_atvsv, luong_phu_nu_hanh_kinh, tien_con_bu_thai_7_thang, ho_tro_gui_con_nha_tre, ngay_cong_phep_le, tien_phep_le, tong_cong_tien_luong, tien_boc_vac, ho_tro_xang_xe, thue_tncn_nam_2024, tam_ung, thue_tncn, bhxh_bhtn_bhyt_total, truy_thu_the_bhyt, tien_luong_thuc_nhan_cuoi_ky, is_signed, signed_at, signed_by_name, signature_ip, signature_device, created_at, updated_at, chi_dot_1_13, chi_dot_2_13, tong_luong_13, so_thang_chia_13, tong_sp_12_thang, t13_thang_01, t13_thang_02, t13_thang_03, t13_thang_04, t13_thang_05, t13_thang_06, t13_thang_07, t13_thang_08, t13_thang_09, t13_thang_10, t13_thang_11, t13_thang_12, employees!payrolls_employee_id_fkey!inner(employee_id, full_name, department, chuc_vu)";

const DEPARTMENT_HISTORY_SELECT =
  "salary_month, tien_luong_thuc_nhan_cuoi_ky, is_signed, payroll_type, employees!payrolls_employee_id_fkey!inner(department)";

const EMPLOYEE_PAYROLL_SUMMARY_SELECT =
  "employee_id, salary_month, tien_luong_thuc_nhan_cuoi_ky, import_status, created_at";

export type DepartmentHistoryPeriod =
  | { kind: "t13"; months: string[] }
  | { kind: "monthly"; startMonth: string };

export function buildRecentPayrollsQuery(
  supabase: SupabaseServiceClient,
  isT13: boolean,
) {
  const query = supabase
    .from("payrolls")
    .select(RECENT_PAYROLLS_SELECT)
    .order("created_at", { ascending: false })
    .limit(RECENT_PAYROLLS_LIMIT);

  if (isT13) {
    return query.eq("payroll_type", "t13");
  }
  return query.or(MONTHLY_PAYROLL_TYPE_FILTER);
}

export function findDepartmentsPayrollSummary(
  supabase: SupabaseServiceClient,
  departments: string[],
  salaryMonth: string,
) {
  return supabase
    .from("payrolls")
    .select(DEPARTMENTS_SUMMARY_SELECT)
    .in("employees.department", departments)
    .eq("salary_month", salaryMonth);
}

export function findDepartmentPayrollDetails(
  supabase: SupabaseServiceClient,
  departmentName: string,
  salaryMonth: string,
) {
  return supabase
    .from("payrolls")
    .select(DEPARTMENT_DETAIL_SELECT)
    .eq("employees.department", departmentName)
    .eq("salary_month", salaryMonth)
    .order("created_at", { ascending: false });
}

export function findDepartmentPayrollHistory(
  supabase: SupabaseServiceClient,
  departmentName: string,
  period: DepartmentHistoryPeriod,
) {
  const query = supabase
    .from("payrolls")
    .select(DEPARTMENT_HISTORY_SELECT)
    .eq("employees.department", departmentName);

  const scoped =
    period.kind === "t13"
      ? query.in("salary_month", period.months)
      : query
          .gte("salary_month", period.startMonth)
          .not("salary_month", "like", "%-13");

  return scoped.order("salary_month", { ascending: true });
}

export function findPayrollEmployeeIdsForMonth(
  supabase: SupabaseServiceClient,
  month: string,
) {
  return supabase
    .from("payrolls")
    .select("employee_id")
    .eq("salary_month", month);
}

export function findPayrollSignedFlagsForMonth(
  supabase: SupabaseServiceClient,
  month: string,
) {
  return supabase
    .from("payrolls")
    .select("employee_id, is_signed")
    .eq("salary_month", month);
}

export function findPayrollSummaryForEmployees(
  supabase: SupabaseServiceClient,
  month: string,
  employeeIds: string[],
) {
  return supabase
    .from("payrolls")
    .select(EMPLOYEE_PAYROLL_SUMMARY_SELECT)
    .eq("salary_month", month)
    .in("employee_id", employeeIds);
}

export function findAnyPayrollForEmployee(
  supabase: SupabaseServiceClient,
  employeeId: string,
) {
  return supabase
    .from("payrolls")
    .select("id")
    .eq("employee_id", employeeId)
    .limit(1);
}
