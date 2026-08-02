import "server-only";
import type { createServiceClient } from "@/utils/supabase/server";
import { getPayrollSelect } from "@/lib/payroll/payroll-select";
import {
  applyPayrollFilters,
  MONTHLY_PAYROLL_TYPE_FILTER,
  PAYROLL_WITH_EMPLOYEE_SELECT,
  type PayrollListFilters,
} from "@/lib/payroll/payroll-list-query";

export type SupabaseServiceClient = ReturnType<typeof createServiceClient>;

const YEARLY_SUMMARY_SELECT =
  "salary_month, tien_luong_thuc_nhan_cuoi_ky, is_signed, signed_at, tong_cong_tien_luong, thue_tncn, bhxh_bhtn_bhyt_total";

const SALARY_MONTH_LIST_SELECT = "salary_month, payroll_type";

export function buildMyPayrollListQuery(
  supabase: SupabaseServiceClient,
  employeeId: string,
  filters: PayrollListFilters,
  offset: number,
  limit: number,
) {
  const query = applyPayrollFilters(
    supabase
      .from("payrolls")
      .select(PAYROLL_WITH_EMPLOYEE_SELECT)
      .eq("employee_id", employeeId),
    filters,
  );

  return query
    .order("salary_month", { ascending: false })
    .range(offset, offset + limit - 1);
}

export function buildMyPayrollCountQuery(
  supabase: SupabaseServiceClient,
  employeeId: string,
  isT13: boolean,
) {
  const query = supabase
    .from("payrolls")
    .select("*", { count: "exact", head: true })
    .eq("employee_id", employeeId);

  if (isT13) {
    return query.eq("payroll_type", "t13");
  }
  return query.or(MONTHLY_PAYROLL_TYPE_FILTER);
}

export function findMyYearlySummary(
  supabase: SupabaseServiceClient,
  employeeId: string,
  year: number | string,
) {
  return supabase
    .from("payrolls")
    .select(YEARLY_SUMMARY_SELECT)
    .eq("employee_id", employeeId)
    .like("salary_month", `${year}-%`)
    .order("salary_month", { ascending: true });
}

export function findEmployeeSalaryMonths(
  supabase: SupabaseServiceClient,
  employeeId: string,
  isT13: boolean,
) {
  let query = supabase
    .from("payrolls")
    .select(SALARY_MONTH_LIST_SELECT)
    .eq("employee_id", employeeId);

  if (isT13) {
    query = query.eq("payroll_type", "t13");
  } else {
    query = query.or(MONTHLY_PAYROLL_TYPE_FILTER);
  }

  return query.order("salary_month", { ascending: false });
}

export function findEmployeePayrollForMonth(
  supabase: SupabaseServiceClient,
  employeeId: string,
  salaryMonth: string,
  isT13: boolean,
) {
  let query = supabase
    .from("payrolls")
    .select(getPayrollSelect(isT13))
    .eq("employee_id", employeeId)
    .eq("salary_month", salaryMonth);

  if (isT13) {
    query = query.eq("payroll_type", "t13");
  } else {
    query = query.or(MONTHLY_PAYROLL_TYPE_FILTER);
  }

  return query.single();
}

export function findLatestEmployeePayroll(
  supabase: SupabaseServiceClient,
  employeeId: string,
  isT13: boolean,
) {
  let query = supabase
    .from("payrolls")
    .select(getPayrollSelect(isT13))
    .eq("employee_id", employeeId);

  if (isT13) {
    query = query.eq("payroll_type", "t13");
  } else {
    query = query.or(MONTHLY_PAYROLL_TYPE_FILTER);
  }

  return query.order("created_at", { ascending: false }).limit(1).single();
}
