import "server-only";
import type { createServiceClient } from "@/utils/supabase/server";
import type { BonusType } from "@/lib/validations/bonus";
import { BONUS_SIGNATURE_SELECT } from "@/lib/bonus/bonus-select";

export type SupabaseServiceClient = ReturnType<typeof createServiceClient>;

const SIGNER_COLUMNS = "employee_id, full_name, department, chuc_vu";

export interface BonusSignerRecord {
  employee_id: string;
  full_name: string;
  department: string;
  chuc_vu: string;
}

export interface BonusSignatureRow {
  signature_type: string;
  bonus_type: string;
  bonus_period: string;
  signed_by_id: string;
  signed_by_name: string;
  department: string | null;
  signed_at: string;
  notes: string | null;
}

export interface BonusPeriodTarget {
  bonus_type: BonusType;
  bonus_period: string;
}

export async function findActiveSigner(
  supabase: SupabaseServiceClient,
  employeeId: string,
): Promise<BonusSignerRecord | null> {
  const { data, error } = await supabase
    .from("employees")
    .select(SIGNER_COLUMNS)
    .eq("employee_id", employeeId)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    return null;
  }
  return data as unknown as BonusSignerRecord;
}

export async function findActiveBonusSignatures(
  supabase: SupabaseServiceClient,
  bonusType: BonusType,
  bonusPeriod: string,
): Promise<BonusSignatureRow[] | null> {
  const { data, error } = await supabase
    .from("bonus_management_signatures")
    .select(BONUS_SIGNATURE_SELECT)
    .eq("bonus_type", bonusType)
    .eq("bonus_period", bonusPeriod)
    .eq("is_active", true);

  if (error) {
    console.error("Error fetching bonus signatures:", error);
    return null;
  }
  return (data ?? []) as unknown as BonusSignatureRow[];
}

export async function findActiveBonusSignatureByType(
  supabase: SupabaseServiceClient,
  bonusType: BonusType,
  bonusPeriod: string,
  signatureType: string,
): Promise<BonusSignatureRow | null> {
  const { data } = await supabase
    .from("bonus_management_signatures")
    .select(BONUS_SIGNATURE_SELECT)
    .eq("bonus_type", bonusType)
    .eq("bonus_period", bonusPeriod)
    .eq("signature_type", signatureType)
    .eq("is_active", true)
    .maybeSingle();

  return (data as unknown as BonusSignatureRow) ?? null;
}

export async function insertBonusSignature(
  supabase: SupabaseServiceClient,
  record: Record<string, unknown>,
): Promise<BonusSignatureRow | null> {
  const { data, error } = await supabase
    .from("bonus_management_signatures")
    .insert(record)
    .select(BONUS_SIGNATURE_SELECT)
    .single();

  if (error || !data) {
    console.error("Error inserting bonus signature:", error);
    return null;
  }
  return data as unknown as BonusSignatureRow;
}

export function findActiveSignatureIdsForPeriod(
  supabase: SupabaseServiceClient,
  target: BonusPeriodTarget,
) {
  return supabase
    .from("bonus_management_signatures")
    .select("id")
    .eq("bonus_type", target.bonus_type)
    .eq("bonus_period", target.bonus_period)
    .eq("is_active", true)
    .limit(1);
}

export async function hasActiveManagementSignature(
  supabase: SupabaseServiceClient,
  target: BonusPeriodTarget,
): Promise<boolean> {
  const { data } = await findActiveSignatureIdsForPeriod(supabase, target);
  return (data?.length ?? 0) > 0;
}
