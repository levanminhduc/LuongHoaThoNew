import "server-only";
import type { createServiceClient } from "@/utils/supabase/server";
import type { BonusType } from "@/lib/validations/bonus";

export type SupabaseServiceClient = ReturnType<typeof createServiceClient>;

const BONUS_PERIOD_LIST_SELECT =
  "bonus_type, bonus_period, bonus_title, created_at, employees!inner(department)";

const BONUS_LIST_SELECT =
  "employee_id, bonus_type, bonus_period, bonus_title, amount, detail_data, is_signed, signed_at, employees!inner(full_name, department, chuc_vu)";

const EMPLOYEE_BONUS_SELECT =
  "bonus_type, bonus_period, bonus_title, amount, detail_data, is_signed, signed_at";

export interface BonusSignFlag {
  employee_id: string;
  is_signed: boolean;
}

export interface BonusPeriodKey {
  bonusType: string;
  bonusPeriod: string;
}

export interface BonusDeleteFilters extends BonusPeriodKey {
  importBatchId: string | null;
}

export async function findBonusSignFlags(
  supabase: SupabaseServiceClient,
  bonusType: BonusType,
  bonusPeriod: string,
): Promise<BonusSignFlag[] | null> {
  const { data, error } = await supabase
    .from("employee_bonuses")
    .select("employee_id, is_signed")
    .eq("bonus_type", bonusType)
    .eq("bonus_period", bonusPeriod);

  if (error) {
    console.error("Error fetching bonus batch:", error);
    return null;
  }
  return (data ?? []) as BonusSignFlag[];
}

export function findBonusByEmployeeAndPeriod(
  supabase: SupabaseServiceClient,
  employeeId: string,
  key: BonusPeriodKey,
) {
  return supabase
    .from("employee_bonuses")
    .select("id")
    .eq("employee_id", employeeId)
    .eq("bonus_type", key.bonusType)
    .eq("bonus_period", key.bonusPeriod)
    .single();
}

export function updateBonusById(
  supabase: SupabaseServiceClient,
  bonusId: number,
  bonusRecord: Record<string, unknown>,
) {
  return supabase
    .from("employee_bonuses")
    .update(bonusRecord)
    .eq("id", bonusId);
}

export function insertBonus(
  supabase: SupabaseServiceClient,
  bonusRecord: Record<string, unknown>,
  createdAt: string,
) {
  return supabase
    .from("employee_bonuses")
    .insert({ ...bonusRecord, created_at: createdAt });
}

export function findBonusPeriodByImportBatch(
  supabase: SupabaseServiceClient,
  importBatchId: string,
) {
  return supabase
    .from("employee_bonuses")
    .select("bonus_type, bonus_period")
    .eq("import_batch_id", importBatchId)
    .limit(1)
    .single();
}

export function buildBonusDeleteQuery(
  supabase: SupabaseServiceClient,
  filters: BonusDeleteFilters,
) {
  const deleteQuery = supabase
    .from("employee_bonuses")
    .delete({ count: "exact" });

  if (filters.importBatchId) {
    return deleteQuery.eq("import_batch_id", filters.importBatchId);
  }

  return deleteQuery
    .eq("bonus_type", filters.bonusType)
    .eq("bonus_period", filters.bonusPeriod);
}

export function buildBonusPeriodListQuery(
  supabase: SupabaseServiceClient,
  allowedDepartments: string[] | null,
) {
  const query = supabase
    .from("employee_bonuses")
    .select(BONUS_PERIOD_LIST_SELECT);

  const scoped =
    allowedDepartments === null
      ? query
      : query.in("employees.department", allowedDepartments);

  return scoped.order("created_at", { ascending: false });
}

export function buildBonusListQuery(
  supabase: SupabaseServiceClient,
  key: BonusPeriodKey,
  allowedDepartments: string[] | null,
) {
  const query = supabase
    .from("employee_bonuses")
    .select(BONUS_LIST_SELECT)
    .eq("bonus_type", key.bonusType)
    .eq("bonus_period", key.bonusPeriod);

  const scoped =
    allowedDepartments === null
      ? query
      : query.in("employees.department", allowedDepartments);

  return scoped.order("employee_id", { ascending: true });
}

export function findEmployeeBonuses(
  supabase: SupabaseServiceClient,
  employeeId: string,
) {
  return supabase
    .from("employee_bonuses")
    .select(EMPLOYEE_BONUS_SELECT)
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false });
}
