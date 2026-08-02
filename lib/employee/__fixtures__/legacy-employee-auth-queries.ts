import { sanitizePostgrestValue } from "@/lib/utils/postgrest-sanitize";
import type { SupabaseServiceClient } from "../employee-repository";

/** app/api/employee/change-password/route.ts:66-72 tại commit ce68edc */
export function legacyPasswordChangeEmployeeQuery(
  supabase: SupabaseServiceClient,
  employeeId: string,
) {
  return supabase
    .from("employees")
    .select(
      "employee_id, cccd_hash, password_hash, last_password_change_at, locked_until, failed_login_attempts, must_change_password, password_changed_at",
    )
    .eq("employee_id", employeeId)
    .single();
}

/** app/api/employee/change-password/route.ts:146-149 tại commit ce68edc */
export function legacyUpdateCredentialsQuery(
  supabase: SupabaseServiceClient,
  employeeId: string,
  updateData: Record<string, unknown>,
) {
  return supabase
    .from("employees")
    .update(updateData)
    .eq("employee_id", employeeId);
}

/** app/api/employee/change-password/route.ts:277-281 tại commit ce68edc */
export function legacyPasswordFlagsQuery(
  supabase: SupabaseServiceClient,
  employeeId: string,
) {
  return supabase
    .from("employees")
    .select("must_change_password, password_changed_at")
    .eq("employee_id", employeeId)
    .single();
}

/** app/api/auth/change-password-with-cccd/route.ts:96-102 tại commit ce68edc */
export function legacyPasswordRecoveryQuery(
  supabase: SupabaseServiceClient,
  employeeCode: string,
) {
  return supabase
    .from("employees")
    .select(
      "employee_id, cccd_hash, password_hash, recovery_locked_until, recovery_fail_count, last_password_change_at",
    )
    .eq("employee_id", employeeCode)
    .single();
}

/** app/api/auth/change-password-with-cccd/route.ts:248-254 tại commit ce68edc */
export function legacyPasswordStateQuery(
  supabase: SupabaseServiceClient,
  employeeCode: string,
) {
  return supabase
    .from("employees")
    .select(
      "password_hash, cccd_hash, last_password_change_at, password_version",
    )
    .eq("employee_id", employeeCode)
    .single();
}

/** app/api/auth/forgot-password/route.ts:93-99 tại commit ce68edc */
export function legacyForgotPasswordQuery(
  supabase: SupabaseServiceClient,
  employeeCode: string,
) {
  return supabase
    .from("employees")
    .select(
      "employee_id, cccd_hash, last_password_change_at, recovery_locked_until, recovery_fail_count",
    )
    .eq("employee_id", employeeCode)
    .single();
}

/** app/api/employees/update-cccd/route.ts:39-43 tại commit ce68edc */
export function legacyCccdUpdateEmployeeQuery(
  supabase: SupabaseServiceClient,
  employeeId: string,
) {
  return supabase
    .from("employees")
    .select("id, employee_id, full_name, cccd_hash")
    .eq("employee_id", employeeId)
    .single();
}

/** app/api/employees/update-cccd/route.ts:110-118 tại commit ce68edc */
export function legacySearchActiveEmployeesQuery(
  supabase: SupabaseServiceClient,
  query: string,
) {
  return supabase
    .from("employees")
    .select("employee_id, full_name, department, chuc_vu, is_active")
    .or(
      `employee_id.ilike.%${sanitizePostgrestValue(query)}%,full_name.ilike.%${sanitizePostgrestValue(query)}%`,
    )
    .eq("is_active", true)
    .order("full_name")
    .limit(20);
}

/** app/api/admin/password-reset-history/route.ts:96-99 tại commit ce68edc */
export function legacyEmployeeNamesByIdsQuery(
  supabase: SupabaseServiceClient,
  employeeIds: string[],
) {
  return supabase
    .from("employees")
    .select("employee_id, full_name, department")
    .in("employee_id", employeeIds);
}
