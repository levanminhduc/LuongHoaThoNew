import type { createServiceClient } from "@/utils/supabase/server";

type SupabaseServiceClient = ReturnType<typeof createServiceClient>;

/** app/api/admin/bonus-import/route.ts:191-197 tại commit 395ebab */
export function legacyFindExistingBonusQuery(
  supabase: SupabaseServiceClient,
  employee_id: string,
  bonus_type: string,
  bonus_period: string,
) {
  return supabase
    .from("employee_bonuses")
    .select("id")
    .eq("employee_id", employee_id)
    .eq("bonus_type", bonus_type)
    .eq("bonus_period", bonus_period)
    .single();
}

/** app/api/admin/bonus-import/route.ts:223-226 */
export function legacyUpdateBonusQuery(
  supabase: SupabaseServiceClient,
  bonusRecord: Record<string, unknown>,
  existingId: number,
) {
  return supabase
    .from("employee_bonuses")
    .update(bonusRecord)
    .eq("id", existingId);
}

/** app/api/admin/bonus-import/route.ts:240-242 */
export function legacyInsertBonusQuery(
  supabase: SupabaseServiceClient,
  bonusRecord: Record<string, unknown>,
  createdAt: string,
) {
  return supabase
    .from("employee_bonuses")
    .insert({ ...bonusRecord, created_at: createdAt });
}

/** app/api/admin/bonuses/route.ts:26-33 */
export function legacyActiveSignatureQuery(
  supabase: SupabaseServiceClient,
  bonus_type: string,
  bonus_period: string,
) {
  return supabase
    .from("bonus_management_signatures")
    .select("id")
    .eq("bonus_type", bonus_type)
    .eq("bonus_period", bonus_period)
    .eq("is_active", true)
    .limit(1);
}

/** app/api/admin/bonuses/route.ts:60-65 */
export function legacyFindBatchPeriodQuery(
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

/** app/api/admin/bonuses/route.ts:82-93 */
export function legacyDeleteBonusesQuery(
  supabase: SupabaseServiceClient,
  importBatchId: string | null,
  bonus_type: string,
  bonus_period: string,
) {
  let deleteQuery = supabase
    .from("employee_bonuses")
    .delete({ count: "exact" });

  if (importBatchId) {
    deleteQuery = deleteQuery.eq("import_batch_id", importBatchId);
  } else {
    deleteQuery = deleteQuery
      .eq("bonus_type", bonus_type)
      .eq("bonus_period", bonus_period);
  }

  return deleteQuery;
}

/** app/api/bonuses/periods/route.ts:56-70 */
export function legacyPeriodListQuery(
  supabase: SupabaseServiceClient,
  allowedDepartments: string[] | null,
) {
  let query = supabase
    .from("employee_bonuses")
    .select(
      "bonus_type, bonus_period, bonus_title, created_at, employees!inner(department)",
    );

  if (allowedDepartments !== null) {
    query = query.in("employees.department", allowedDepartments);
  }

  return query.order("created_at", { ascending: false });
}

/** app/api/bonuses/route.ts:77-92 */
export function legacyBonusListQuery(
  supabase: SupabaseServiceClient,
  bonus_type: string,
  bonus_period: string,
  allowedDepartments: string[] | null,
) {
  let query = supabase
    .from("employee_bonuses")
    .select(
      "employee_id, bonus_type, bonus_period, bonus_title, amount, detail_data, is_signed, signed_at, employees!inner(full_name, department, chuc_vu)",
    )
    .eq("bonus_type", bonus_type)
    .eq("bonus_period", bonus_period);

  if (allowedDepartments !== null) {
    query = query.in("employees.department", allowedDepartments);
  }

  return query.order("employee_id", { ascending: true });
}

/** app/api/employee/bonuses/route.ts:59-66 */
export function legacyEmployeeBonusesQuery(
  supabase: SupabaseServiceClient,
  employeeId: string,
) {
  return supabase
    .from("employee_bonuses")
    .select(
      "bonus_type, bonus_period, bonus_title, amount, detail_data, is_signed, signed_at",
    )
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false });
}
