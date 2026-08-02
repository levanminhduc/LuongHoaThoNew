import "server-only";
import type { createServiceClient } from "@/utils/supabase/server";
import { MONTHLY_PAYROLL_TYPE_FILTER } from "@/lib/payroll/payroll-list-query";
import { sanitizePostgrestValue } from "@/lib/utils/postgrest-sanitize";

export type SupabaseServiceClient = ReturnType<typeof createServiceClient>;

const SEARCH_WITH_EMPLOYEE_SELECT =
  "id, employee_id, salary_month, payroll_type, tien_luong_thuc_nhan_cuoi_ky, source_file, created_at, employees(employee_id, full_name, department, chuc_vu, is_active)";

const SEARCH_WITHOUT_JOIN_SELECT =
  "id, employee_id, salary_month, tien_luong_thuc_nhan_cuoi_ky, source_file, created_at";

export function buildPayrollTotalCountQuery(supabase: SupabaseServiceClient) {
  return supabase.from("payrolls").select("*", { count: "exact", head: true });
}

export function findAnyPayrollId(supabase: SupabaseServiceClient) {
  return supabase.from("payrolls").select("id").limit(1);
}

export function buildPayrollSearchQuery(
  supabase: SupabaseServiceClient,
  query: string,
  isT13: boolean,
  salaryMonth: string | null | undefined,
  limit: number,
) {
  let payrollQuery = supabase
    .from("payrolls")
    .select(SEARCH_WITH_EMPLOYEE_SELECT)
    .not("employees.is_active", "is", null)
    .eq("employees.is_active", true)
    .or(`employee_id.ilike.%${sanitizePostgrestValue(query)}%`)
    .order("created_at", { ascending: false });

  if (isT13) {
    payrollQuery = payrollQuery.eq("payroll_type", "t13");
  } else {
    payrollQuery = payrollQuery.or(MONTHLY_PAYROLL_TYPE_FILTER);
  }

  if (salaryMonth) {
    payrollQuery = payrollQuery.eq("salary_month", salaryMonth);
  }

  return payrollQuery.limit(limit);
}

export function findPayrollsByEmployeeIdLike(
  supabase: SupabaseServiceClient,
  query: string,
  limit: number,
) {
  return supabase
    .from("payrolls")
    .select(SEARCH_WITHOUT_JOIN_SELECT)
    .ilike("employee_id", `%${sanitizePostgrestValue(query)}%`)
    .limit(limit);
}

export function findAllSalaryMonths(supabase: SupabaseServiceClient) {
  return supabase
    .from("payrolls")
    .select("salary_month")
    .order("salary_month", { ascending: false });
}
