import {
  applyPayrollFilters,
  PAYROLL_WITH_EMPLOYEE_SELECT,
  type PayrollListFilters,
} from "@/lib/payroll/payroll-list-query";
import { getPayrollSelect } from "@/lib/payroll/payroll-select";
import type { SupabaseServiceClient } from "../payroll-self-repository";

/** app/api/payroll/my-data/route.ts:61-89 tại commit 25c33d0 */
export function legacyMyPayrollListQuery(
  supabase: SupabaseServiceClient,
  employeeId: string,
  filters: PayrollListFilters,
  offset: number,
  limit: number,
) {
  let query = supabase
    .from("payrolls")
    .select(PAYROLL_WITH_EMPLOYEE_SELECT)
    .eq("employee_id", employeeId);

  query = applyPayrollFilters(query, filters);

  return query
    .order("salary_month", { ascending: false })
    .range(offset, offset + limit - 1);
}

/** app/api/payroll/my-data/route.ts:71-82 tại commit 25c33d0 */
export function legacyMyPayrollCountQuery(
  supabase: SupabaseServiceClient,
  employeeId: string,
  payrollType: string,
) {
  let countQuery = supabase
    .from("payrolls")
    .select("*", { count: "exact", head: true })
    .eq("employee_id", employeeId);

  if (payrollType === "t13") {
    countQuery = countQuery.eq("payroll_type", "t13");
  } else {
    countQuery = countQuery.or("payroll_type.eq.monthly,payroll_type.is.null");
  }

  return countQuery;
}

/** app/api/payroll/my-data/route.ts:170-185 tại commit 25c33d0 */
export function legacyYearlySummaryQuery(
  supabase: SupabaseServiceClient,
  employeeId: string,
  currentYear: number | string,
) {
  return supabase
    .from("payrolls")
    .select(
      `
        salary_month,
        tien_luong_thuc_nhan_cuoi_ky,
        is_signed,
        signed_at,
        tong_cong_tien_luong,
        thue_tncn,
        bhxh_bhtn_bhyt_total
      `,
    )
    .eq("employee_id", employeeId)
    .like("salary_month", `${currentYear}-%`)
    .order("salary_month", { ascending: true });
}

/** app/api/employee/salary-history/route.ts:106-122 tại commit 25c33d0 */
export function legacySalaryMonthsQuery(
  supabase: SupabaseServiceClient,
  employeeId: string,
  is_t13: boolean,
) {
  let listQuery = supabase
    .from("payrolls")
    .select("salary_month, payroll_type")
    .eq("employee_id", employeeId);

  if (is_t13) {
    listQuery = listQuery.eq("payroll_type", "t13");
  } else {
    listQuery = listQuery.or("payroll_type.eq.monthly,payroll_type.is.null");
  }

  return listQuery.order("salary_month", { ascending: false });
}

/** app/api/employee/salary-history/route.ts:147-162 tại commit 25c33d0 */
export function legacyPayrollForMonthQuery(
  supabase: SupabaseServiceClient,
  employeeId: string,
  salaryMonth: string,
  is_t13: boolean,
) {
  let payrollQuery = supabase
    .from("payrolls")
    .select(getPayrollSelect(is_t13))
    .eq("employee_id", employeeId)
    .eq("salary_month", salaryMonth);

  if (is_t13) {
    payrollQuery = payrollQuery.eq("payroll_type", "t13");
  } else {
    payrollQuery = payrollQuery.or(
      "payroll_type.eq.monthly,payroll_type.is.null",
    );
  }

  return payrollQuery.single();
}

/** app/api/employee/detail/route.ts:52-66 tại commit 25c33d0 */
export function legacyLatestPayrollQuery(
  supabase: SupabaseServiceClient,
  employeeId: string,
  is_t13: boolean,
) {
  let query = supabase
    .from("payrolls")
    .select(getPayrollSelect(is_t13))
    .eq("employee_id", employeeId);

  if (is_t13) {
    query = query.eq("payroll_type", "t13");
  } else {
    query = query.or("payroll_type.eq.monthly,payroll_type.is.null");
  }

  return query.order("created_at", { ascending: false }).limit(1).single();
}

/** app/api/payroll/my-department/route.ts:70-91 tại commit 25c33d0 */
export function legacyDepartmentPayrollListQuery(
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

/** app/api/payroll/my-department/route.ts:78-84 tại commit 25c33d0 */
export function legacyDepartmentPayrollCountQuery(
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

/** app/api/payroll/my-department/route.ts:169-180 tại commit 25c33d0 */
export function legacyDepartmentStatsQuery(
  supabase: SupabaseServiceClient,
  department: string,
  salaryMonthFilter: string,
) {
  return supabase
    .from("payrolls")
    .select(
      `
        tien_luong_thuc_nhan_cuoi_ky,
        tong_luong_13,
        is_signed,
        employees!payrolls_employee_id_fkey!inner(department)
      `,
    )
    .eq("employees.department", department)
    .eq("salary_month", salaryMonthFilter);
}

/** app/api/payroll/my-department/months/route.ts:26-32 tại commit 25c33d0 */
export function legacyDepartmentMonthsQuery(
  supabase: SupabaseServiceClient,
  department: string,
) {
  return supabase
    .from("payrolls")
    .select(
      "salary_month, employees!payrolls_employee_id_fkey!inner(department)",
    )
    .eq("employees.department", department)
    .order("salary_month", { ascending: false });
}

/** app/api/payroll/my-departments/route.ts:83-106 tại commit 25c33d0 */
export function legacyAllowedDepartmentsListQuery(
  supabase: SupabaseServiceClient,
  allowedDepartments: string[],
  selectedDepartment: string | null,
  filters: PayrollListFilters,
  offset: number,
  limit: number,
) {
  let query = supabase
    .from("payrolls")
    .select(PAYROLL_WITH_EMPLOYEE_SELECT)
    .in("employees.department", allowedDepartments);

  if (selectedDepartment) {
    query = query.eq("employees.department", selectedDepartment);
  }

  query = applyPayrollFilters(query, filters);

  return query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
}

/** app/api/payroll/my-departments/route.ts:88-99 tại commit 25c33d0 */
export function legacyAllowedDepartmentsCountQuery(
  supabase: SupabaseServiceClient,
  allowedDepartments: string[],
  selectedDepartment: string | null,
  filters: PayrollListFilters,
) {
  let countQuery = supabase
    .from("payrolls")
    .select(PAYROLL_WITH_EMPLOYEE_SELECT, { count: "exact", head: true })
    .in("employees.department", allowedDepartments);

  if (selectedDepartment) {
    countQuery = countQuery.eq("employees.department", selectedDepartment);
  }

  return applyPayrollFilters(countQuery, filters);
}

/** app/api/payroll/my-departments/route.ts:193-203 tại commit 25c33d0 */
export function legacyAllowedDepartmentsStatsQuery(
  supabase: SupabaseServiceClient,
  allowedDepartments: string[],
  salaryMonth: string,
) {
  return supabase
    .from("payrolls")
    .select(
      `
        tien_luong_thuc_nhan_cuoi_ky,
        is_signed,
        employees!inner(department)
      `,
    )
    .in("employees.department", allowedDepartments)
    .eq("salary_month", salaryMonth);
}

/** app/api/payroll/my-departments/months/route.ts:34-40 tại commit 25c33d0 */
export function legacyAllowedDepartmentsMonthsQuery(
  supabase: SupabaseServiceClient,
  allowedDepartments: string[],
) {
  return supabase
    .from("payrolls")
    .select(
      "salary_month, employees!payrolls_employee_id_fkey!inner(department)",
    )
    .in("employees.department", allowedDepartments)
    .order("salary_month", { ascending: false });
}
