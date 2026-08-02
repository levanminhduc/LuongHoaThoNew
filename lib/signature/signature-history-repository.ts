import "server-only";
import type { createServiceClient } from "@/utils/supabase/server";
import {
  MANAGEMENT_SIGNATURE_SELECT,
  MONTHLY_PAYROLL_TYPE_FILTER,
} from "@/lib/signature/signature-select";

export type SupabaseServiceClient = ReturnType<typeof createServiceClient>;

export interface SignatureHistoryFilters {
  isT13: boolean;
  months: string[];
  signatureType: string | null;
  restrictToSignerId: string | null;
}

export function buildSignatureHistoryCountQuery(
  supabase: SupabaseServiceClient,
  filters: SignatureHistoryFilters,
) {
  let query = supabase
    .from("management_signatures")
    .select("*", { count: "exact" })
    .eq("is_active", true);

  if (filters.isT13) {
    query = query.eq("payroll_type", "t13");
  } else {
    query = query.or(MONTHLY_PAYROLL_TYPE_FILTER);
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

export function buildSignatureHistoryListQuery(
  supabase: SupabaseServiceClient,
  filters: SignatureHistoryFilters,
  offset: number,
  limit: number,
) {
  let query = supabase
    .from("management_signatures")
    .select(MANAGEMENT_SIGNATURE_SELECT)
    .eq("is_active", true);

  if (filters.isT13) {
    query = query.eq("payroll_type", "t13");
  } else {
    query = query.or(MONTHLY_PAYROLL_TYPE_FILTER);
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

  return query
    .order("signed_at", { ascending: false })
    .range(offset, offset + limit - 1);
}
