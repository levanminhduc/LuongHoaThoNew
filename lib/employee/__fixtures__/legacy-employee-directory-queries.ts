import type { SupabaseServiceClient } from "../employee-repository";

/** app/api/health/ready/route.ts:13-16 tại commit 1eb4ee9 */
export function legacyProbeEmployeesQuery(supabase: SupabaseServiceClient) {
  return supabase.from("employees").select("employee_id").limit(1);
}

/** app/api/admin/payroll-import/route.ts:223-225 tại commit 1eb4ee9 */
export function legacyAllEmployeeIdsQuery(supabase: SupabaseServiceClient) {
  return supabase.from("employees").select("employee_id");
}

/** app/api/admin/attendance-import/route.ts:73-76 tại commit 1eb4ee9 */
export function legacyEmployeeIdsInQuery(
  supabase: SupabaseServiceClient,
  employeeIds: string[],
) {
  return supabase
    .from("employees")
    .select("employee_id")
    .in("employee_id", employeeIds);
}

/** app/api/admin/generate-import-template/route.ts:58-61 tại commit 1eb4ee9 */
export function legacySampleEmployeeIdsQuery(supabase: SupabaseServiceClient) {
  return supabase.from("employees").select("employee_id").limit(3);
}

/** app/api/admin/sync-template/route.ts:30-34 tại commit 1eb4ee9 */
export function legacySampleActiveEmployeesQuery(
  supabase: SupabaseServiceClient,
) {
  return supabase
    .from("employees")
    .select("employee_id, full_name, department")
    .eq("is_active", true)
    .limit(5);
}

/** app/api/employee/detail/route.ts:37-41 tại commit 1eb4ee9 */
export function legacyEmployeeProfileQuery(
  supabase: SupabaseServiceClient,
  employeeId: string,
) {
  return supabase
    .from("employees")
    .select("employee_id, full_name, department, chuc_vu")
    .eq("employee_id", employeeId)
    .single();
}

/** app/api/management-signature/route.ts:103-108 tại commit 1eb4ee9 */
export function legacyActiveEmployeeProfileQuery(
  supabase: SupabaseServiceClient,
  employeeId: string,
) {
  return supabase
    .from("employees")
    .select("employee_id, full_name, department, chuc_vu")
    .eq("employee_id", employeeId)
    .eq("is_active", true)
    .single();
}

/** app/api/employee/sign-salary/route.ts:76-82 tại commit 1eb4ee9 */
export function legacyEmployeeCredentialProfileQuery(
  supabase: SupabaseServiceClient,
  employeeId: string,
) {
  return supabase
    .from("employees")
    .select(
      "employee_id, full_name, cccd_hash, password_hash, last_password_change_at",
    )
    .eq("employee_id", employeeId)
    .single();
}

/** app/api/employee/salary-history/route.ts:64-70 tại commit 1eb4ee9 */
export function legacyEmployeeLookupRecordQuery(
  supabase: SupabaseServiceClient,
  employeeId: string,
) {
  return supabase
    .from("employees")
    .select(
      "employee_id, full_name, department, chuc_vu, cccd_hash, password_hash, last_password_change_at",
    )
    .eq("employee_id", employeeId)
    .single();
}

/** app/api/admin/department-permissions/route.ts:111-116 tại commit 1eb4ee9 */
export function legacyEmployeeForPermissionQuery(
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

/** app/api/admin/update-management-signature-date/route.ts:103-110 tại commit 1eb4ee9 */
export function legacyFirstActiveSignerQuery(
  supabase: SupabaseServiceClient,
  signatureType: string,
) {
  return supabase
    .from("employees")
    .select("employee_id, full_name, department")
    .eq("chuc_vu", signatureType)
    .eq("is_active", true)
    .order("employee_id", { ascending: true })
    .limit(1)
    .single();
}

/** app/api/admin/payroll-export/route.ts:151-153 tại commit 1eb4ee9 */
export function legacyAllEmployeeNamesQuery(supabase: SupabaseServiceClient) {
  return supabase
    .from("employees")
    .select("employee_id, full_name, department");
}

/** app/api/admin/update-signature-date/route.ts:232-236 tại commit 1eb4ee9 */
export function legacyEmployeeNamesOrderedQuery(
  supabase: SupabaseServiceClient,
  employeeIds: string[],
) {
  return supabase
    .from("employees")
    .select("employee_id, full_name, department")
    .in("employee_id", employeeIds)
    .order("employee_id");
}

/** app/api/admin/signature-stats/[month]/route.ts:82-87 tại commit 1eb4ee9 */
export function legacyActiveEmployeeNamesQuery(
  supabase: SupabaseServiceClient,
  employeeIds: string[],
) {
  return supabase
    .from("employees")
    .select("employee_id, full_name, department")
    .in("employee_id", employeeIds)
    .eq("is_active", true)
    .order("employee_id");
}

/** app/api/admin/attendance-export/route.ts:87-90 tại commit 1eb4ee9 */
export function legacyEmployeeProfilesByIdsQuery(
  supabase: SupabaseServiceClient,
  employeeIds: string[],
) {
  return supabase
    .from("employees")
    .select("employee_id, full_name, department, chuc_vu")
    .in("employee_id", employeeIds);
}

/** app/api/admin/payroll/search/route.ts:193-196 tại commit 1eb4ee9 */
export function legacyEmployeeDirectoryByIdsQuery(
  supabase: SupabaseServiceClient,
  employeeIds: string[],
) {
  return supabase
    .from("employees")
    .select("employee_id, full_name, department, chuc_vu, is_active")
    .in("employee_id", employeeIds);
}

/** app/api/signature-status/[month]/route.ts:90-95 tại commit 1eb4ee9 */
export function legacyUnsignedEmployeePreviewQuery(
  supabase: SupabaseServiceClient,
  employeeIds: string[],
) {
  return supabase
    .from("employees")
    .select("employee_id, full_name, department, chuc_vu")
    .eq("is_active", true)
    .in("employee_id", employeeIds)
    .limit(10);
}

/** app/api/admin/data-validation/route.ts:94-99 tại commit 1eb4ee9 */
export function legacyAllActiveEmployeesQuery(supabase: SupabaseServiceClient) {
  return supabase
    .from("employees")
    .select("employee_id, full_name, department, chuc_vu, is_active")
    .eq("is_active", true)
    .order("department")
    .order("full_name");
}
