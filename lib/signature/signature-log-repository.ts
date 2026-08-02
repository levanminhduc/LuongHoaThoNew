import "server-only";
import type { createServiceClient } from "@/utils/supabase/server";

export type SupabaseServiceClient = ReturnType<typeof createServiceClient>;

const SIGNATURE_LOG_WITH_MONTH_SELECT =
  "employee_id, salary_month, signed_by_name, signed_at";

const SIGNATURE_LOG_SELECT = "employee_id, signed_by_name, signed_at";

const MONTHLY_PAYROLL_TYPE_FILTER =
  "payroll_type.eq.monthly,payroll_type.is.null";

export function findSignatureLogsWithMonth(
  supabase: SupabaseServiceClient,
  salaryMonth: string,
) {
  return supabase
    .from("signature_logs")
    .select(SIGNATURE_LOG_WITH_MONTH_SELECT)
    .eq("salary_month", salaryMonth);
}

export function findSignatureLogs(
  supabase: SupabaseServiceClient,
  salaryMonth: string,
) {
  return supabase
    .from("signature_logs")
    .select(SIGNATURE_LOG_SELECT)
    .eq("salary_month", salaryMonth);
}

export function insertBulkSignatureLog(
  supabase: SupabaseServiceClient,
  record: Record<string, unknown>,
) {
  return supabase.from("admin_bulk_signature_logs").insert(record);
}

export function buildBulkSignatureHistoryQuery(
  supabase: SupabaseServiceClient,
  month: string | null | undefined,
  payrollType: string,
  offset: number,
  limit: number,
) {
  let query = supabase
    .from("admin_bulk_signature_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (month) {
    query = query.eq("salary_month", month);
  }

  if (payrollType === "t13") {
    query = query.eq("payroll_type", "t13");
  } else {
    query = query.or(MONTHLY_PAYROLL_TYPE_FILTER);
  }

  return query;
}
