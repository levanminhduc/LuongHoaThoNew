import { sanitizePostgrestValue } from "@/lib/utils/postgrest-sanitize";

export const PAYROLL_WITH_EMPLOYEE_SELECT = `
        *,
        employees!payrolls_employee_id_fkey!inner(
          employee_id,
          full_name,
          department,
          chuc_vu
        )
      `;

export const MONTHLY_PAYROLL_TYPE_FILTER =
  "payroll_type.eq.monthly,payroll_type.is.null";

export interface PayrollListFilters {
  salaryMonth?: string | null;
  payrollType?: string | null;
  search?: string | null;
}

interface FilterableQuery<T> {
  eq(column: string, value: string): T;
  or(filter: string): T;
}

export function applyPayrollFilters<T extends FilterableQuery<T>>(
  query: T,
  filters: PayrollListFilters,
): T {
  let filtered = query;

  if (filters.salaryMonth) {
    filtered = filtered.eq("salary_month", filters.salaryMonth);
  }

  if (filters.payrollType === "t13") {
    filtered = filtered.eq("payroll_type", "t13");
  } else if (filters.payrollType) {
    filtered = filtered.or(MONTHLY_PAYROLL_TYPE_FILTER);
  }

  if (filters.search) {
    const safeSearch = sanitizePostgrestValue(filters.search);
    if (safeSearch) {
      filtered = filtered.or(
        `employee_id.ilike.%${safeSearch}%,employees.full_name.ilike.%${safeSearch}%`,
      );
    }
  }

  return filtered;
}
