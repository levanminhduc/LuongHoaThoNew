import "server-only";
import type { createServiceClient } from "@/utils/supabase/server";
import {
  applyPayrollFilters,
  PAYROLL_WITH_EMPLOYEE_SELECT,
  type PayrollListFilters,
} from "@/lib/payroll/payroll-list-query";

export type SupabaseServiceClient = ReturnType<typeof createServiceClient>;

const DEPARTMENT_STATS_SELECT =
  "tien_luong_thuc_nhan_cuoi_ky, tong_luong_13, is_signed, employees!payrolls_employee_id_fkey!inner(department)";

const DEPARTMENTS_STATS_SELECT =
  "tien_luong_thuc_nhan_cuoi_ky, is_signed, employees!inner(department)";

const SALARY_MONTH_WITH_DEPARTMENT_SELECT =
  "salary_month, employees!payrolls_employee_id_fkey!inner(department)";

export function buildDepartmentPayrollListQuery(
  supabase: SupabaseServiceClient,
  department: string,
  filters: PayrollListFilters,
  offset: number,
  limit: number,
) {
  const query = applyPayrollFilters(
    supabase
      .from("payrolls")
      .select(PAYROLL_WITH_EMPLOYEE_SELECT)
      .eq("employees.department", department),
    filters,
  );

  return query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
}

export function buildDepartmentPayrollCountQuery(
  supabase: SupabaseServiceClient,
  department: string,
  filters: PayrollListFilters,
) {
  return applyPayrollFilters(
    supabase
      .from("payrolls")
      .select(PAYROLL_WITH_EMPLOYEE_SELECT, { count: "exact", head: true })
      .eq("employees.department", department),
    filters,
  );
}

export function findDepartmentPayrollStats(
  supabase: SupabaseServiceClient,
  department: string,
  salaryMonth: string,
) {
  return supabase
    .from("payrolls")
    .select(DEPARTMENT_STATS_SELECT)
    .eq("employees.department", department)
    .eq("salary_month", salaryMonth);
}

export function findDepartmentSalaryMonths(
  supabase: SupabaseServiceClient,
  department: string,
) {
  return supabase
    .from("payrolls")
    .select(SALARY_MONTH_WITH_DEPARTMENT_SELECT)
    .eq("employees.department", department)
    .order("salary_month", { ascending: false });
}

export function buildAllowedDepartmentsPayrollListQuery(
  supabase: SupabaseServiceClient,
  allowedDepartments: string[],
  selectedDepartment: string | null,
  filters: PayrollListFilters,
  offset: number,
  limit: number,
) {
  const scoped = supabase
    .from("payrolls")
    .select(PAYROLL_WITH_EMPLOYEE_SELECT)
    .in("employees.department", allowedDepartments);

  const narrowed = selectedDepartment
    ? scoped.eq("employees.department", selectedDepartment)
    : scoped;

  return applyPayrollFilters(narrowed, filters)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
}

export function buildAllowedDepartmentsPayrollCountQuery(
  supabase: SupabaseServiceClient,
  allowedDepartments: string[],
  selectedDepartment: string | null,
  filters: PayrollListFilters,
) {
  const scoped = supabase
    .from("payrolls")
    .select(PAYROLL_WITH_EMPLOYEE_SELECT, { count: "exact", head: true })
    .in("employees.department", allowedDepartments);

  const narrowed = selectedDepartment
    ? scoped.eq("employees.department", selectedDepartment)
    : scoped;

  return applyPayrollFilters(narrowed, filters);
}

export function findAllowedDepartmentsPayrollStats(
  supabase: SupabaseServiceClient,
  allowedDepartments: string[],
  salaryMonth: string,
) {
  return supabase
    .from("payrolls")
    .select(DEPARTMENTS_STATS_SELECT)
    .in("employees.department", allowedDepartments)
    .eq("salary_month", salaryMonth);
}

export function findAllowedDepartmentsSalaryMonths(
  supabase: SupabaseServiceClient,
  allowedDepartments: string[],
) {
  return supabase
    .from("payrolls")
    .select(SALARY_MONTH_WITH_DEPARTMENT_SELECT)
    .in("employees.department", allowedDepartments)
    .order("salary_month", { ascending: false });
}
