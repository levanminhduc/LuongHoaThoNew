import type { SupabaseServiceClient } from "../payroll-self-repository";

/** app/api/admin/signature-stats/[month]/route.ts:52-63 tại commit 927b26c */
export function legacyMonthCountQuery(
  supabase: SupabaseServiceClient,
  month: string,
  isT13: boolean,
) {
  let q = supabase
    .from("payrolls")
    .select("*", { count: "exact", head: true })
    .eq("salary_month", month);
  if (isT13) {
    q = q.eq("payroll_type", "t13");
  } else {
    q = q.or("payroll_type.eq.monthly,payroll_type.is.null");
  }
  return q;
}

/** app/api/admin/signature-stats/[month]/route.ts:65-77 tại commit 927b26c */
export function legacyMonthCountBySignedQuery(
  supabase: SupabaseServiceClient,
  month: string,
  isT13: boolean,
  signed: boolean,
) {
  let q = supabase
    .from("payrolls")
    .select("*", { count: "exact", head: true })
    .eq("salary_month", month)
    .eq("is_signed", signed);
  if (isT13) {
    q = q.eq("payroll_type", "t13");
  } else {
    q = q.or("payroll_type.eq.monthly,payroll_type.is.null");
  }
  return q;
}

/** app/api/admin/signature-stats/[month]/route.ts:96-108 tại commit 927b26c */
export function legacySignedEmployeeIdsQuery(
  supabase: SupabaseServiceClient,
  month: string,
  isT13: boolean,
) {
  let signedQuery = supabase
    .from("payrolls")
    .select("employee_id")
    .eq("salary_month", month)
    .eq("is_signed", true);
  if (isT13) {
    signedQuery = signedQuery.eq("payroll_type", "t13");
  } else {
    signedQuery = signedQuery.or(
      "payroll_type.eq.monthly,payroll_type.is.null",
    );
  }
  return signedQuery.order("employee_id");
}

/** app/api/signature-status/[month]/route.ts:59-72 tại commit 927b26c */
export function legacySignatureStatusQuery(
  supabase: SupabaseServiceClient,
  month: string,
  isT13: boolean,
) {
  let payrollQuery = supabase
    .from("payrolls")
    .select("employee_id, is_signed")
    .eq("salary_month", month);

  if (isT13) {
    payrollQuery = payrollQuery.eq("payroll_type", "t13");
  } else {
    payrollQuery = payrollQuery.or(
      "payroll_type.eq.monthly,payroll_type.is.null",
    );
  }

  return payrollQuery;
}

/** app/api/signature-progress/[month]/route.ts:62-75 tại commit 927b26c */
export function legacySignatureProgressQuery(
  supabase: SupabaseServiceClient,
  month: string,
  isT13: boolean,
) {
  let payrollQuery = supabase
    .from("payrolls")
    .select("employee_id, is_signed, signed_at", { count: "exact" })
    .eq("salary_month", month);

  if (isT13) {
    payrollQuery = payrollQuery.eq("payroll_type", "t13");
  } else {
    payrollQuery = payrollQuery.or(
      "payroll_type.eq.monthly,payroll_type.is.null",
    );
  }

  return payrollQuery;
}

/** app/api/management-signature/route.ts:69-82 tại commit 927b26c */
export function legacySignatureCountsQuery(
  supabase: SupabaseServiceClient,
  salaryMonth: string,
  isT13Month: boolean,
) {
  let payrollQuery = supabase
    .from("payrolls")
    .select("employee_id, is_signed", { count: "exact" })
    .eq("salary_month", salaryMonth);

  if (isT13Month) {
    payrollQuery = payrollQuery.eq("payroll_type", "t13");
  } else {
    payrollQuery = payrollQuery.or(
      "payroll_type.eq.monthly,payroll_type.is.null",
    );
  }

  return payrollQuery;
}

/** app/api/admin/bulk-sign-salary/route.ts:53-68 tại commit 927b26c */
export function legacyUnsignedEmployeeIdsQuery(
  supabase: SupabaseServiceClient,
  salaryMonth: string,
  isT13Month: boolean,
) {
  let unsignedQuery = supabase
    .from("payrolls")
    .select("employee_id")
    .eq("salary_month", salaryMonth)
    .eq("is_signed", false);

  if (isT13Month) {
    unsignedQuery = unsignedQuery.eq("payroll_type", "t13");
  } else {
    unsignedQuery = unsignedQuery.or(
      "payroll_type.eq.monthly,payroll_type.is.null",
    );
  }

  return unsignedQuery.order("employee_id");
}

/** app/api/admin/update-signature-date/route.ts:46-65 tại commit 927b26c */
export function legacySignedPayrollsForDateUpdateQuery(
  supabase: SupabaseServiceClient,
  salaryMonth: string,
  isT13: boolean,
  scope: string,
  employeeIds: string[] | null,
) {
  let payrollQuery = supabase
    .from("payrolls")
    .select("employee_id")
    .eq("salary_month", salaryMonth)
    .eq("is_signed", true);

  if (isT13) {
    payrollQuery = payrollQuery.eq("payroll_type", "t13");
  } else {
    payrollQuery = payrollQuery.or(
      "payroll_type.eq.monthly,payroll_type.is.null",
    );
  }

  if (scope === "selected" && employeeIds) {
    payrollQuery = payrollQuery.in("employee_id", employeeIds);
  }

  return payrollQuery.order("employee_id");
}

/** app/api/admin/unsigned-employees-export/route.ts:43-57 tại commit 927b26c */
export function legacyUnsignedExportQuery(
  supabase: SupabaseServiceClient,
  month: string,
  isT13: boolean,
) {
  let payrollQuery = supabase
    .from("payrolls")
    .select("employee_id, is_signed, tien_luong_thuc_nhan_cuoi_ky")
    .eq("salary_month", month)
    .eq("is_signed", false);

  if (isT13) {
    payrollQuery = payrollQuery.eq("payroll_type", "t13");
  } else {
    payrollQuery = payrollQuery.or(
      "payroll_type.eq.monthly,payroll_type.is.null",
    );
  }

  return payrollQuery;
}
