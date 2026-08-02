import type { createServiceClient } from "@/utils/supabase/server";
import { MANAGEMENT_SIGNATURE_SELECT } from "@/lib/signature/signature-select";

type SupabaseServiceClient = ReturnType<typeof createServiceClient>;

/** app/api/admin/bulk-payroll-export/route.ts:277-281 tại commit 7db9e45 */
export function legacyExportSignatureSummaryQuery(
  supabase: SupabaseServiceClient,
  salary_month: string,
) {
  return supabase
    .from("management_signatures")
    .select("signature_type, signed_by_name, signed_at")
    .eq("salary_month", salary_month)
    .eq("is_active", true);
}

/** app/api/admin/update-management-signature-date/route.ts:46-58 */
export function legacyFindActiveSignatureIdQuery(
  supabase: SupabaseServiceClient,
  salary_month: string,
  signature_type: string,
  is_t13: boolean,
) {
  let query = supabase
    .from("management_signatures")
    .select("id")
    .eq("salary_month", salary_month)
    .eq("signature_type", signature_type)
    .eq("is_active", true);

  if (is_t13) {
    query = query.eq("payroll_type", "t13");
  } else {
    query = query.or("payroll_type.eq.monthly,payroll_type.is.null");
  }

  return query.single();
}

/** app/api/admin/update-management-signature-date/route.ts:68-71 */
export function legacyUpdateSignedAtQuery(
  supabase: SupabaseServiceClient,
  signatureId: string,
  new_signed_at: string,
) {
  return supabase
    .from("management_signatures")
    .update({ signed_at: new_signed_at })
    .eq("id", signatureId);
}

/** app/api/admin/update-management-signature-date/route.ts:134-149 */
export function legacyInsertSignatureQuery(
  supabase: SupabaseServiceClient,
  record: Record<string, unknown>,
) {
  return supabase
    .from("management_signatures")
    .insert(record)
    .select()
    .single();
}

/** app/api/management-signature/route.ts:132-149 */
export function legacyFindExistingSignatureQuery(
  supabase: SupabaseServiceClient,
  salary_month: string,
  signature_type: string,
  isT13Month: boolean,
) {
  let existingQuery = supabase
    .from("management_signatures")
    .select("signed_by_id, signed_by_name, signed_at, department")
    .eq("salary_month", salary_month)
    .eq("signature_type", signature_type)
    .eq("is_active", true);

  if (isT13Month) {
    existingQuery = existingQuery.eq("payroll_type", "t13");
  } else {
    existingQuery = existingQuery.or(
      "payroll_type.eq.monthly,payroll_type.is.null",
    );
  }

  return existingQuery.single();
}

export interface LegacyHistoryFilters {
  isT13: boolean;
  months: string[];
  signatureType: string | null;
  restrictToSignerId: string | null;
}

/** app/api/signature-history/route.ts:70-92 */
export function legacyHistoryCountQuery(
  supabase: SupabaseServiceClient,
  filters: LegacyHistoryFilters,
) {
  let query = supabase
    .from("management_signatures")
    .select("*", { count: "exact" })
    .eq("is_active", true);

  if (filters.isT13) {
    query = query.eq("payroll_type", "t13");
  } else {
    query = query.or("payroll_type.eq.monthly,payroll_type.is.null");
  }

  if (filters.months.length > 0) {
    query = query.in("salary_month", filters.months);
  }

  if (filters.signatureType) {
    query = query.eq("signature_type", filters.signatureType);
  }

  if (filters.restrictToSignerId) {
    query = query.eq("signed_by_id", filters.restrictToSignerId);
  }

  return query;
}

/** app/api/signature-history/route.ts:97-126 */
export function legacyHistoryListQuery(
  supabase: SupabaseServiceClient,
  filters: LegacyHistoryFilters,
  offset: number,
  limit: number,
) {
  let signatureQuery = supabase
    .from("management_signatures")
    .select(MANAGEMENT_SIGNATURE_SELECT)
    .eq("is_active", true);

  if (filters.isT13) {
    signatureQuery = signatureQuery.eq("payroll_type", "t13");
  } else {
    signatureQuery = signatureQuery.or(
      "payroll_type.eq.monthly,payroll_type.is.null",
    );
  }

  if (filters.months.length > 0) {
    signatureQuery = signatureQuery.in("salary_month", filters.months);
  }
  if (filters.signatureType) {
    signatureQuery = signatureQuery.eq("signature_type", filters.signatureType);
  }
  if (filters.restrictToSignerId) {
    signatureQuery = signatureQuery.eq(
      "signed_by_id",
      filters.restrictToSignerId,
    );
  }

  return signatureQuery
    .order("signed_at", { ascending: false })
    .range(offset, offset + limit - 1);
}

/** app/api/signature-progress/[month]/route.ts:108-113 */
export function legacyProgressSignatureQuery(
  supabase: SupabaseServiceClient,
  month: string,
) {
  return supabase
    .from("management_signatures")
    .select("signature_type, signed_at")
    .eq("salary_month", month)
    .eq("is_active", true)
    .order("signed_at", { ascending: false });
}

/** app/api/signature-progress/[month]/route.ts:154-161 */
export function legacyRecentSignatureQuery(
  supabase: SupabaseServiceClient,
  month: string,
) {
  return supabase
    .from("management_signatures")
    .select("signature_type, signed_by_name, signed_at")
    .eq("salary_month", month)
    .eq("is_active", true)
    .order("signed_at", { ascending: false })
    .limit(3);
}

/** app/api/signature-status/[month]/route.ts:116-129 */
export function legacyStatusSignatureQuery(
  supabase: SupabaseServiceClient,
  month: string,
  isT13: boolean,
) {
  let sigQuery = supabase
    .from("management_signatures")
    .select(
      "id, signature_type, signed_by_id, signed_by_name, department, signed_at, notes, payroll_type",
    )
    .eq("salary_month", month)
    .eq("is_active", true);

  if (isT13) {
    sigQuery = sigQuery.eq("payroll_type", "t13");
  } else {
    sigQuery = sigQuery.or("payroll_type.eq.monthly,payroll_type.is.null");
  }

  return sigQuery;
}

/** lib/management-signature-utils.ts:157-163 */
export function legacyEligibilitySignatureQuery(
  supabase: SupabaseServiceClient,
  month: string,
  signatureType: string,
) {
  return supabase
    .from("management_signatures")
    .select(MANAGEMENT_SIGNATURE_SELECT)
    .eq("salary_month", month)
    .eq("signature_type", signatureType)
    .eq("is_active", true)
    .single();
}

/** lib/management-signature-utils.ts:206-211 */
export function legacyMonthStatusSignatureQuery(
  supabase: SupabaseServiceClient,
  month: string,
) {
  return supabase
    .from("management_signatures")
    .select(MANAGEMENT_SIGNATURE_SELECT)
    .eq("salary_month", month)
    .eq("is_active", true);
}

/** app/api/admin/attendance-export/route.ts:99-102 */
export function legacyAttendanceSignatureLogQuery(
  supabase: SupabaseServiceClient,
  salaryMonth: string,
) {
  return supabase
    .from("signature_logs")
    .select("employee_id, salary_month, signed_by_name, signed_at")
    .eq("salary_month", salaryMonth);
}

/** app/api/admin/bulk-payroll-export/route.ts:273-276 */
export function legacyBulkExportSignatureLogQuery(
  supabase: SupabaseServiceClient,
  salary_month: string,
) {
  return supabase
    .from("signature_logs")
    .select("employee_id, signed_by_name, signed_at")
    .eq("salary_month", salary_month);
}

/** app/api/admin/bulk-sign-salary/route.ts:202-224 */
export function legacyInsertBulkLogQuery(
  supabase: SupabaseServiceClient,
  record: Record<string, unknown>,
) {
  return supabase.from("admin_bulk_signature_logs").insert(record);
}

/** app/api/admin/bulk-signature-history/route.ts:36-51 */
export function legacyBulkHistoryQuery(
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
    query = query.or("payroll_type.eq.monthly,payroll_type.is.null");
  }

  return query;
}
