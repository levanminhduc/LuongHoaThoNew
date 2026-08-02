import type { createServiceClient } from "@/utils/supabase/server";

type SupabaseServiceClient = ReturnType<typeof createServiceClient>;

const LEGACY_LIST_SELECT = `
        *,
        employees!fk_dept_perm_employee(
          employee_id,
          full_name,
          department,
          chuc_vu
        ),
        granted_by_employee:employees!department_permissions_granted_by_fkey(
          employee_id,
          full_name
        )
      `;

const LEGACY_SUMMARY_SELECT = `
        *,
        employees!fk_dept_perm_employee(
          employee_id,
          full_name,
          department,
          chuc_vu
        )
      `;

/** app/api/admin/department-permissions/route.ts:46-75 tại commit 8a94910 */
export function legacyListQuery(
  supabase: SupabaseServiceClient,
  employeeId: string | null,
  department: string | null,
  isActive: string | null,
) {
  let query = supabase
    .from("department_permissions")
    .select(LEGACY_LIST_SELECT);

  if (employeeId) {
    query = query.eq("employee_id", employeeId);
  }

  if (department) {
    query = query.eq("department", department);
  }

  if (isActive !== null && isActive !== undefined) {
    query = query.eq("is_active", isActive === "true");
  }

  return query.order("granted_at", { ascending: false });
}

/** app/api/admin/department-permissions/route.ts:163-168 */
export function legacyFindExistingQuery(
  supabase: SupabaseServiceClient,
  employeeId: string,
  department: string,
) {
  return supabase
    .from("department_permissions")
    .select("id, is_active")
    .eq("employee_id", employeeId)
    .eq("department", department)
    .single();
}

/** app/api/admin/department-permissions/route.ts:180-190 */
export function legacyReactivateQuery(
  supabase: SupabaseServiceClient,
  permissionId: number,
  grantedBy: string | null,
  grantedAt: string,
  notes: string | null | undefined,
) {
  return supabase
    .from("department_permissions")
    .update({
      is_active: true,
      granted_by: grantedBy,
      granted_at: grantedAt,
      notes,
    })
    .eq("id", permissionId)
    .select()
    .single();
}

/** app/api/admin/department-permissions/route.ts:221-230 */
export function legacyInsertQuery(
  supabase: SupabaseServiceClient,
  employee_id: string,
  department: string,
  grantedBy: string,
  notes: string | null | undefined,
) {
  return supabase
    .from("department_permissions")
    .insert({
      employee_id,
      department,
      granted_by: grantedBy,
      notes,
    })
    .select()
    .single();
}

/** app/api/admin/department-permissions/route.ts:333-338 */
export function legacyRevokeByIdQuery(
  supabase: SupabaseServiceClient,
  permissionId: string,
) {
  return supabase
    .from("department_permissions")
    .update({ is_active: false })
    .eq("id", parseInt(permissionId))
    .select()
    .single();
}

/** app/api/admin/department-permissions/route.ts:340-346 */
export function legacyRevokeByEmployeeDepartmentQuery(
  supabase: SupabaseServiceClient,
  employeeId: string | null,
  department: string | null,
) {
  return supabase
    .from("department_permissions")
    .update({ is_active: false })
    .eq("employee_id", employeeId)
    .eq("department", department)
    .select()
    .single();
}

/** app/api/admin/departments/route.ts:387-401 */
export function legacySummaryQuery(supabase: SupabaseServiceClient) {
  return supabase
    .from("department_permissions")
    .select(LEGACY_SUMMARY_SELECT)
    .eq("is_active", true)
    .order("department");
}
