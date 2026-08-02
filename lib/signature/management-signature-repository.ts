import "server-only";
import type { createServiceClient } from "@/utils/supabase/server";
import {
  MANAGEMENT_SIGNATURE_SELECT,
  MONTHLY_PAYROLL_TYPE_FILTER,
} from "@/lib/signature/signature-select";

export type SupabaseServiceClient = ReturnType<typeof createServiceClient>;

const EXPORT_SUMMARY_SELECT = "signature_type, signed_by_name, signed_at";

const EXISTING_SIGNATURE_SELECT =
  "signed_by_id, signed_by_name, signed_at, department";

const STATUS_SELECT =
  "id, signature_type, signed_by_id, signed_by_name, department, signed_at, notes, payroll_type";

const PROGRESS_SELECT = "signature_type, signed_at";

export function findSignatureSummaryForMonth(
  supabase: SupabaseServiceClient,
  salaryMonth: string,
) {
  return supabase
    .from("management_signatures")
    .select(EXPORT_SUMMARY_SELECT)
    .eq("salary_month", salaryMonth)
    .eq("is_active", true);
}

export function findActiveSignatureId(
  supabase: SupabaseServiceClient,
  salaryMonth: string,
  signatureType: string,
  isT13: boolean,
) {
  let query = supabase
    .from("management_signatures")
    .select("id")
    .eq("salary_month", salaryMonth)
    .eq("signature_type", signatureType)
    .eq("is_active", true);

  if (isT13) {
    query = query.eq("payroll_type", "t13");
  } else {
    query = query.or(MONTHLY_PAYROLL_TYPE_FILTER);
  }

  return query.single();
}

export function findActiveSignatureSigner(
  supabase: SupabaseServiceClient,
  salaryMonth: string,
  signatureType: string,
  isT13: boolean,
) {
  let query = supabase
    .from("management_signatures")
    .select(EXISTING_SIGNATURE_SELECT)
    .eq("salary_month", salaryMonth)
    .eq("signature_type", signatureType)
    .eq("is_active", true);

  if (isT13) {
    query = query.eq("payroll_type", "t13");
  } else {
    query = query.or(MONTHLY_PAYROLL_TYPE_FILTER);
  }

  return query.single();
}

export function updateSignatureSignedAt(
  supabase: SupabaseServiceClient,
  signatureId: string,
  newSignedAt: string,
) {
  return supabase
    .from("management_signatures")
    .update({ signed_at: newSignedAt })
    .eq("id", signatureId);
}

export function insertManagementSignature(
  supabase: SupabaseServiceClient,
  record: Record<string, unknown>,
) {
  return supabase
    .from("management_signatures")
    .insert(record)
    .select()
    .single();
}

export function findSignatureProgressForMonth(
  supabase: SupabaseServiceClient,
  month: string,
) {
  return supabase
    .from("management_signatures")
    .select(PROGRESS_SELECT)
    .eq("salary_month", month)
    .eq("is_active", true)
    .order("signed_at", { ascending: false });
}

export function findRecentSignaturesForMonth(
  supabase: SupabaseServiceClient,
  month: string,
) {
  return supabase
    .from("management_signatures")
    .select(EXPORT_SUMMARY_SELECT)
    .eq("salary_month", month)
    .eq("is_active", true)
    .order("signed_at", { ascending: false })
    .limit(3);
}

export function findSignatureStatusForMonth(
  supabase: SupabaseServiceClient,
  month: string,
  isT13: boolean,
) {
  let query = supabase
    .from("management_signatures")
    .select(STATUS_SELECT)
    .eq("salary_month", month)
    .eq("is_active", true);

  if (isT13) {
    query = query.eq("payroll_type", "t13");
  } else {
    query = query.or(MONTHLY_PAYROLL_TYPE_FILTER);
  }

  return query;
}

export function findSignatureForEligibility(
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

export function findActiveSignaturesForMonth(
  supabase: SupabaseServiceClient,
  month: string,
) {
  return supabase
    .from("management_signatures")
    .select(MANAGEMENT_SIGNATURE_SELECT)
    .eq("salary_month", month)
    .eq("is_active", true);
}
