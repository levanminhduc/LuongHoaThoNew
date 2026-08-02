import "server-only";
import type { createServiceClient } from "@/utils/supabase/server";

export type SupabaseServiceClient = ReturnType<typeof createServiceClient>;

const EMPLOYEE_PROFILE_SELECT = "employee_id, full_name, department, chuc_vu";

const EMPLOYEE_NAME_SELECT = "employee_id, full_name, department";

const EMPLOYEE_DIRECTORY_SELECT =
  "employee_id, full_name, department, chuc_vu, is_active";

const EMPLOYEE_CREDENTIAL_SELECT =
  "employee_id, full_name, cccd_hash, password_hash, last_password_change_at";

const EMPLOYEE_LOOKUP_SELECT =
  "employee_id, full_name, department, chuc_vu, cccd_hash, password_hash, last_password_change_at";

const UNSIGNED_PREVIEW_LIMIT = 10;

const SAMPLE_EMPLOYEE_LIMIT = 5;

const TEMPLATE_EMPLOYEE_LIMIT = 3;

export function probeEmployeesTable(supabase: SupabaseServiceClient) {
  return supabase.from("employees").select("employee_id").limit(1);
}

export function findAllEmployeeIds(supabase: SupabaseServiceClient) {
  return supabase.from("employees").select("employee_id");
}

export function findEmployeeIdsIn(
  supabase: SupabaseServiceClient,
  employeeIds: string[],
) {
  return supabase
    .from("employees")
    .select("employee_id")
    .in("employee_id", employeeIds);
}

export function findSampleEmployeeIds(supabase: SupabaseServiceClient) {
  return supabase
    .from("employees")
    .select("employee_id")
    .limit(TEMPLATE_EMPLOYEE_LIMIT);
}

export function findSampleActiveEmployees(supabase: SupabaseServiceClient) {
  return supabase
    .from("employees")
    .select(EMPLOYEE_NAME_SELECT)
    .eq("is_active", true)
    .limit(SAMPLE_EMPLOYEE_LIMIT);
}

export function findEmployeeProfile(
  supabase: SupabaseServiceClient,
  employeeId: string,
) {
  return supabase
    .from("employees")
    .select(EMPLOYEE_PROFILE_SELECT)
    .eq("employee_id", employeeId)
    .single();
}

export function findActiveEmployeeProfile(
  supabase: SupabaseServiceClient,
  employeeId: string,
) {
  return supabase
    .from("employees")
    .select(EMPLOYEE_PROFILE_SELECT)
    .eq("employee_id", employeeId)
    .eq("is_active", true)
    .single();
}

export function findEmployeeCredentialProfile(
  supabase: SupabaseServiceClient,
  employeeId: string,
) {
  return supabase
    .from("employees")
    .select(EMPLOYEE_CREDENTIAL_SELECT)
    .eq("employee_id", employeeId)
    .single();
}

export function findEmployeeLookupRecord(
  supabase: SupabaseServiceClient,
  employeeId: string,
) {
  return supabase
    .from("employees")
    .select(EMPLOYEE_LOOKUP_SELECT)
    .eq("employee_id", employeeId)
    .single();
}

export function findActiveEmployeeForPermission(
  supabase: SupabaseServiceClient,
  employeeId: string,
) {
  return supabase
    .from("employees")
    .select("employee_id, full_name, chuc_vu")
    .eq("employee_id", employeeId)
    .eq("is_active", true)
    .single();
}

export function findFirstActiveSignerByPosition(
  supabase: SupabaseServiceClient,
  position: string,
) {
  return supabase
    .from("employees")
    .select(EMPLOYEE_NAME_SELECT)
    .eq("chuc_vu", position)
    .eq("is_active", true)
    .order("employee_id", { ascending: true })
    .limit(1)
    .single();
}

export function findAllEmployeeNames(supabase: SupabaseServiceClient) {
  return supabase.from("employees").select(EMPLOYEE_NAME_SELECT);
}

export function findEmployeeNamesByIdsOrdered(
  supabase: SupabaseServiceClient,
  employeeIds: string[],
) {
  return supabase
    .from("employees")
    .select(EMPLOYEE_NAME_SELECT)
    .in("employee_id", employeeIds)
    .order("employee_id");
}

export function findActiveEmployeeNamesByIds(
  supabase: SupabaseServiceClient,
  employeeIds: string[],
) {
  return supabase
    .from("employees")
    .select(EMPLOYEE_NAME_SELECT)
    .in("employee_id", employeeIds)
    .eq("is_active", true)
    .order("employee_id");
}

export function findEmployeeProfilesByIds(
  supabase: SupabaseServiceClient,
  employeeIds: string[],
) {
  return supabase
    .from("employees")
    .select(EMPLOYEE_PROFILE_SELECT)
    .in("employee_id", employeeIds);
}

export function findEmployeeDirectoryByIds(
  supabase: SupabaseServiceClient,
  employeeIds: string[],
) {
  return supabase
    .from("employees")
    .select(EMPLOYEE_DIRECTORY_SELECT)
    .in("employee_id", employeeIds);
}

export function findUnsignedEmployeePreview(
  supabase: SupabaseServiceClient,
  employeeIds: string[],
) {
  return supabase
    .from("employees")
    .select(EMPLOYEE_PROFILE_SELECT)
    .eq("is_active", true)
    .in("employee_id", employeeIds)
    .limit(UNSIGNED_PREVIEW_LIMIT);
}

export function findAllActiveEmployees(supabase: SupabaseServiceClient) {
  return supabase
    .from("employees")
    .select(EMPLOYEE_DIRECTORY_SELECT)
    .eq("is_active", true)
    .order("department")
    .order("full_name");
}
