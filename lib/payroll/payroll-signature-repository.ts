import "server-only";
import type { createServiceClient } from "@/utils/supabase/server";
import { MONTHLY_PAYROLL_TYPE_FILTER } from "@/lib/payroll/payroll-list-query";

export type SupabaseServiceClient = ReturnType<typeof createServiceClient>;

const SIGNATURE_STATUS_SELECT = "employee_id, is_signed";

const SIGNATURE_PROGRESS_SELECT = "employee_id, is_signed, signed_at";

const UNSIGNED_EXPORT_SELECT =
  "employee_id, is_signed, tien_luong_thuc_nhan_cuoi_ky";

export function buildMonthPayrollCountQuery(
  supabase: SupabaseServiceClient,
  month: string,
  isT13: boolean,
) {
  const query = supabase
    .from("payrolls")
    .select("*", { count: "exact", head: true })
    .eq("salary_month", month);

  if (isT13) {
    return query.eq("payroll_type", "t13");
  }
  return query.or(MONTHLY_PAYROLL_TYPE_FILTER);
}

export function buildMonthPayrollCountBySignedQuery(
  supabase: SupabaseServiceClient,
  month: string,
  isT13: boolean,
  isSigned: boolean,
) {
  const query = supabase
    .from("payrolls")
    .select("*", { count: "exact", head: true })
    .eq("salary_month", month)
    .eq("is_signed", isSigned);

  if (isT13) {
    return query.eq("payroll_type", "t13");
  }
  return query.or(MONTHLY_PAYROLL_TYPE_FILTER);
}

export function findSignedEmployeeIds(
  supabase: SupabaseServiceClient,
  month: string,
  isT13: boolean,
) {
  let query = supabase
    .from("payrolls")
    .select("employee_id")
    .eq("salary_month", month)
    .eq("is_signed", true);

  if (isT13) {
    query = query.eq("payroll_type", "t13");
  } else {
    query = query.or(MONTHLY_PAYROLL_TYPE_FILTER);
  }

  return query.order("employee_id");
}

export function findUnsignedEmployeeIds(
  supabase: SupabaseServiceClient,
  month: string,
  isT13: boolean,
) {
  let query = supabase
    .from("payrolls")
    .select("employee_id")
    .eq("salary_month", month)
    .eq("is_signed", false);

  if (isT13) {
    query = query.eq("payroll_type", "t13");
  } else {
    query = query.or(MONTHLY_PAYROLL_TYPE_FILTER);
  }

  return query.order("employee_id");
}

export function findSignedPayrollsForDateUpdate(
  supabase: SupabaseServiceClient,
  month: string,
  isT13: boolean,
  employeeIds: string[] | null,
) {
  let query = supabase
    .from("payrolls")
    .select("employee_id")
    .eq("salary_month", month)
    .eq("is_signed", true);

  if (isT13) {
    query = query.eq("payroll_type", "t13");
  } else {
    query = query.or(MONTHLY_PAYROLL_TYPE_FILTER);
  }

  if (employeeIds) {
    query = query.in("employee_id", employeeIds);
  }

  return query.order("employee_id");
}

export function findPayrollSignatureStatus(
  supabase: SupabaseServiceClient,
  month: string,
  isT13: boolean,
) {
  const query = supabase
    .from("payrolls")
    .select(SIGNATURE_STATUS_SELECT)
    .eq("salary_month", month);

  if (isT13) {
    return query.eq("payroll_type", "t13");
  }
  return query.or(MONTHLY_PAYROLL_TYPE_FILTER);
}

export function findPayrollSignatureProgress(
  supabase: SupabaseServiceClient,
  month: string,
  isT13: boolean,
) {
  const query = supabase
    .from("payrolls")
    .select(SIGNATURE_PROGRESS_SELECT, { count: "exact" })
    .eq("salary_month", month);

  if (isT13) {
    return query.eq("payroll_type", "t13");
  }
  return query.or(MONTHLY_PAYROLL_TYPE_FILTER);
}

export function findPayrollSignatureCounts(
  supabase: SupabaseServiceClient,
  month: string,
  isT13: boolean,
) {
  const query = supabase
    .from("payrolls")
    .select(SIGNATURE_STATUS_SELECT, { count: "exact" })
    .eq("salary_month", month);

  if (isT13) {
    return query.eq("payroll_type", "t13");
  }
  return query.or(MONTHLY_PAYROLL_TYPE_FILTER);
}

export function findUnsignedPayrollsForExport(
  supabase: SupabaseServiceClient,
  month: string,
  isT13: boolean,
) {
  const query = supabase
    .from("payrolls")
    .select(UNSIGNED_EXPORT_SELECT)
    .eq("salary_month", month)
    .eq("is_signed", false);

  if (isT13) {
    return query.eq("payroll_type", "t13");
  }
  return query.or(MONTHLY_PAYROLL_TYPE_FILTER);
}
