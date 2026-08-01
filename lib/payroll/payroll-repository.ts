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

export async function findPayrollById(
  supabase: SupabaseServiceClient,
  payrollId: string | number,
) {
  return supabase.from("payrolls").select("*").eq("id", payrollId).single();
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

export function buildPayrollListQuery(supabase: SupabaseServiceClient) {
  return supabase.from("payrolls").select("*");
}

export async function probePayrollAuditTable(supabase: SupabaseServiceClient) {
  return supabase.from("payroll_audit_logs").select("id").limit(1);
}

export async function findPayrollAuditLogs(
  supabase: SupabaseServiceClient,
  payrollId: string | number,
) {
  return supabase
    .from("payroll_audit_logs")
    .select("*")
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
