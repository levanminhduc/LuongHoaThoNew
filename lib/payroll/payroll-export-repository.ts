import "server-only";
import type { createServiceClient } from "@/utils/supabase/server";
import { MONTHLY_PAYROLL_TYPE_FILTER } from "@/lib/payroll/payroll-list-query";

export type SupabaseServiceClient = ReturnType<typeof createServiceClient>;

const EXPORT_WITH_EMPLOYEE_SELECT =
  "*, employees!payrolls_employee_id_fkey!inner(full_name, department)";

const AVAILABLE_MONTHS_LIMIT = 10;

const SAMPLE_ROW_LIMIT = 3;

const TEMPLATE_ROW_LIMIT = 100;

export interface PayrollExportScope {
  allowedDepartments: string[] | null;
  department: string | null;
}

export function buildPayrollExportQuery(
  supabase: SupabaseServiceClient,
  month: string | null,
  isT13: boolean,
  scope: PayrollExportScope,
) {
  let query = supabase
    .from("payrolls")
    .select(EXPORT_WITH_EMPLOYEE_SELECT)
    .order("employee_id");

  if (isT13) {
    query = query.eq("payroll_type", "t13");
  } else {
    query = query.or(MONTHLY_PAYROLL_TYPE_FILTER);
  }

  if (month) {
    query = query.eq("salary_month", month);
  }

  if (scope.allowedDepartments) {
    query = query.in("employees.department", scope.allowedDepartments);
  }

  if (scope.department) {
    query = query.eq("employees.department", scope.department);
  }

  return query;
}

export function buildPayrollExportFallbackQuery(
  supabase: SupabaseServiceClient,
  month: string | null,
) {
  const query = supabase.from("payrolls").select("*").order("employee_id");

  if (month) {
    return query.eq("salary_month", month);
  }
  return query;
}

export function findAvailableSalaryMonths(supabase: SupabaseServiceClient) {
  return supabase
    .from("payrolls")
    .select("salary_month")
    .order("salary_month", { ascending: false })
    .limit(AVAILABLE_MONTHS_LIMIT);
}

export function findPayrollsForBulkExport(
  supabase: SupabaseServiceClient,
  salaryMonth: string,
  isT13: boolean,
) {
  const query = supabase
    .from("payrolls")
    .select(EXPORT_WITH_EMPLOYEE_SELECT)
    .eq("salary_month", salaryMonth)
    .order("employee_id");

  if (isT13) {
    return query.eq("payroll_type", "t13");
  }
  return query.or(MONTHLY_PAYROLL_TYPE_FILTER);
}

const SAMPLE_PAYROLL_SELECT =
  "bhxh_21_5_percent, bhxh_bhtn_bhyt_total, bo_sung_luong, don_gia_tien_luong_tren_gio, employee_id, gio_an_ca, gio_cong_tang_ca, he_so_lam_viec, he_so_luong_co_ban, he_so_phu_cap_ket_qua, ho_tro_gui_con_nha_tre, ho_tro_thoi_tiet_nong, ho_tro_xang_xe, luong_cnkcp_vuot, luong_hoc_viec_pc_luong, luong_phu_nu_hanh_kinh, luong_toi_thieu_cty, ngay_cong_chu_nhat, ngay_cong_phep_le, ngay_cong_trong_gio, pc_cdcs_pccc_atvsv, salary_month, tam_ung, thue_tncn, thue_tncn_nam_2024, tien_boc_vac, tien_con_bu_thai_7_thang, tien_khen_thuong_chuyen_can, tien_luong_30p_an_ca, tien_luong_chu_nhat, tien_luong_san_pham_trong_gio, tien_luong_tang_ca, tien_luong_thuc_nhan_cuoi_ky, tien_phep_le, tien_tang_ca_vuot, tong_cong_tien_luong, tong_cong_tien_luong_san_pham, tong_gio_lam_viec, tong_he_so_quy_doi, tong_luong_san_pham_cong_doan, truy_thu_the_bhyt";

export function findSamplePayrolls(supabase: SupabaseServiceClient) {
  return supabase
    .from("payrolls")
    .select(SAMPLE_PAYROLL_SELECT)
    .limit(SAMPLE_ROW_LIMIT)
    .order("created_at", { ascending: false });
}

export function buildTemplateDataQuery(
  supabase: SupabaseServiceClient,
  columns: string,
  salaryMonth: string | null,
) {
  const query = supabase
    .from("payrolls")
    .select(columns)
    .order("created_at", { ascending: false });

  if (salaryMonth) {
    return query.eq("salary_month", salaryMonth);
  }
  return query.limit(TEMPLATE_ROW_LIMIT);
}
