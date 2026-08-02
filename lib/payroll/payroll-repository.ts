import "server-only";
import type { createServiceClient } from "@/utils/supabase/server";

export type SupabaseServiceClient = ReturnType<typeof createServiceClient>;

const PAYROLL_DETAIL_WITH_EMPLOYEE_SELECT = `
        *,
        employees!inner(
          employee_id,
          full_name,
          department,
          chuc_vu
        )
      `;

const PAYROLL_PREVIEW_SELECT = `
        id,
        employee_id,
        salary_month,
        tien_luong_thuc_nhan_cuoi_ky,
        source_file,
        import_batch_id,
        import_status,
        created_at,
        employees!inner(
          full_name,
          department
        )
      `;

const PREVIEW_ROW_LIMIT = 1700;

export function buildPayrollDetailQuery(
  supabase: SupabaseServiceClient,
  payrollId: string | number,
) {
  return supabase
    .from("payrolls")
    .select(PAYROLL_DETAIL_WITH_EMPLOYEE_SELECT)
    .eq("id", payrollId);
}

const PAYROLL_EDITABLE_SELECT =
  "bhxh_21_5_percent, bhxh_bhtn_bhyt_total, bo_sung_luong, don_gia_tien_luong_tren_gio, employee_id, gio_an_ca, gio_cong_tang_ca, he_so_lam_viec, he_so_luong_co_ban, he_so_phu_cap_ket_qua, ho_tro_gui_con_nha_tre, ho_tro_thoi_tiet_nong, ho_tro_xang_xe, luong_cnkcp_vuot, luong_hoc_viec_pc_luong, luong_phu_nu_hanh_kinh, luong_toi_thieu_cty, ngay_cong_chu_nhat, ngay_cong_phep_le, ngay_cong_trong_gio, pc_cdcs_pccc_atvsv, pc_luong_cho_viec, salary_month, tam_ung, thue_tncn, thue_tncn_nam_2024, tien_boc_vac, tien_con_bu_thai_7_thang, tien_khen_thuong_chuyen_can, tien_luong_30p_an_ca, tien_luong_chu_nhat, tien_luong_san_pham_trong_gio, tien_luong_tang_ca, tien_luong_thuc_nhan_cuoi_ky, tien_phep_le, tien_tang_ca_vuot, tong_cong_tien_luong, tong_cong_tien_luong_san_pham, tong_gio_lam_viec, tong_he_so_quy_doi, tong_luong_san_pham_cong_doan, truy_thu_the_bhyt";

export async function findPayrollById(
  supabase: SupabaseServiceClient,
  payrollId: string | number,
) {
  return supabase
    .from("payrolls")
    .select(PAYROLL_EDITABLE_SELECT)
    .eq("id", payrollId)
    .single();
}

export async function updatePayrollById(
  supabase: SupabaseServiceClient,
  payrollId: string | number,
  updates: Record<string, unknown>,
) {
  return supabase
    .from("payrolls")
    .update(updates)
    .eq("id", payrollId)
    .select()
    .single();
}

export async function insertPayrollAuditLogs(
  supabase: SupabaseServiceClient,
  logs: Record<string, unknown>[],
) {
  return supabase.from("payroll_audit_logs").insert(logs);
}

const PAYROLL_AUDIT_LOG_SELECT =
  "id, employee_id, field_name, old_value, new_value, changed_by, changed_at, change_reason, change_ip";

const AUDIT_SUMMARY_SELECT = `
        id,
        employee_id,
        salary_month,
        changed_by,
        changed_at,
        change_reason,
        field_name
      `;

const AUDIT_SUMMARY_LIMIT = 100;

export async function probePayrollAuditTable(supabase: SupabaseServiceClient) {
  return supabase.from("payroll_audit_logs").select("id").limit(1);
}

export async function findPayrollAuditLogs(
  supabase: SupabaseServiceClient,
  payrollId: string | number,
) {
  return supabase
    .from("payroll_audit_logs")
    .select(PAYROLL_AUDIT_LOG_SELECT)
    .eq("payroll_id", payrollId)
    .order("changed_at", { ascending: false });
}

export async function findPayrollIdentity(
  supabase: SupabaseServiceClient,
  payrollId: string | number,
) {
  return supabase
    .from("payrolls")
    .select("id, employee_id, salary_month")
    .eq("id", payrollId)
    .single();
}

export function buildPayrollAuditSummaryQuery(supabase: SupabaseServiceClient) {
  return supabase
    .from("payroll_audit_logs")
    .select(AUDIT_SUMMARY_SELECT)
    .order("changed_at", { ascending: false });
}

export const PAYROLL_AUDIT_SUMMARY_LIMIT = AUDIT_SUMMARY_LIMIT;

export async function findPayrollPreviewByBatch(
  supabase: SupabaseServiceClient,
  batchId: string,
) {
  return supabase
    .from("payrolls")
    .select(PAYROLL_PREVIEW_SELECT)
    .eq("import_batch_id", batchId)
    .order("employee_id", { ascending: true })
    .limit(PREVIEW_ROW_LIMIT);
}
