import "server-only";
import type { createServiceClient } from "@/utils/supabase/server";
import { sanitizePostgrestValue } from "@/lib/utils/postgrest-sanitize";

export type SupabaseServiceClient = ReturnType<typeof createServiceClient>;

const PASSWORD_CHANGE_SELECT =
  "employee_id, cccd_hash, password_hash, last_password_change_at, locked_until, failed_login_attempts, must_change_password, password_changed_at";

const PASSWORD_RECOVERY_SELECT =
  "employee_id, cccd_hash, password_hash, recovery_locked_until, recovery_fail_count, last_password_change_at";

const PASSWORD_STATE_SELECT =
  "password_hash, cccd_hash, last_password_change_at, password_version";

const FORGOT_PASSWORD_SELECT =
  "employee_id, cccd_hash, last_password_change_at, recovery_locked_until, recovery_fail_count";

const CCCD_UPDATE_SELECT = "id, employee_id, full_name, cccd_hash";

const EMPLOYEE_DIRECTORY_SELECT =
  "employee_id, full_name, department, chuc_vu, is_active";

const EMPLOYEE_SEARCH_LIMIT = 20;

export function findEmployeeForPasswordChange(
  supabase: SupabaseServiceClient,
  employeeId: string,
) {
  return supabase
    .from("employees")
    .select(PASSWORD_CHANGE_SELECT)
    .eq("employee_id", employeeId)
    .single();
}

export function findEmployeeForPasswordRecovery(
  supabase: SupabaseServiceClient,
  employeeId: string,
) {
  return supabase
    .from("employees")
    .select(PASSWORD_RECOVERY_SELECT)
    .eq("employee_id", employeeId)
    .single();
}

export function findEmployeePasswordState(
  supabase: SupabaseServiceClient,
  employeeId: string,
) {
  return supabase
    .from("employees")
    .select(PASSWORD_STATE_SELECT)
    .eq("employee_id", employeeId)
    .single();
}

export function findEmployeeForForgotPassword(
  supabase: SupabaseServiceClient,
  employeeId: string,
) {
  return supabase
    .from("employees")
    .select(FORGOT_PASSWORD_SELECT)
    .eq("employee_id", employeeId)
    .single();
}

export function findEmployeePasswordFlags(
  supabase: SupabaseServiceClient,
  employeeId: string,
) {
  return supabase
    .from("employees")
    .select("must_change_password, password_changed_at")
    .eq("employee_id", employeeId)
    .single();
}

export function updateEmployeeCredentials(
  supabase: SupabaseServiceClient,
  employeeId: string,
  updateData: Record<string, unknown>,
) {
  return supabase
    .from("employees")
    .update(updateData)
    .eq("employee_id", employeeId);
}

export function findEmployeeForCccdUpdate(
  supabase: SupabaseServiceClient,
  employeeId: string,
) {
  return supabase
    .from("employees")
    .select(CCCD_UPDATE_SELECT)
    .eq("employee_id", employeeId)
    .single();
}

export function searchActiveEmployees(
  supabase: SupabaseServiceClient,
  query: string,
) {
  const safeQuery = sanitizePostgrestValue(query);

  return supabase
    .from("employees")
    .select(EMPLOYEE_DIRECTORY_SELECT)
    .or(`employee_id.ilike.%${safeQuery}%,full_name.ilike.%${safeQuery}%`)
    .eq("is_active", true)
    .order("full_name")
    .limit(EMPLOYEE_SEARCH_LIMIT);
}

export function findEmployeeNamesByIds(
  supabase: SupabaseServiceClient,
  employeeIds: string[],
) {
  return supabase
    .from("employees")
    .select("employee_id, full_name, department")
    .in("employee_id", employeeIds);
}
