import "server-only";
import type { createServiceClient } from "@/utils/supabase/server";
import { getVietnamTimestamp } from "@/lib/utils/vietnam-timezone";

export type SupabaseServiceClient = ReturnType<typeof createServiceClient>;

const PERMISSION_WITH_EMPLOYEE_SELECT = `
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

const PERMISSION_SUMMARY_SELECT = `
        *,
        employees!fk_dept_perm_employee(
          employee_id,
          full_name,
          department,
          chuc_vu
        )
      `;

export interface DepartmentPermissionFilters {
  employeeId: string | null;
  department: string | null;
  isActive: string | null;
}

export interface GrantDepartmentPermissionInput {
  employeeId: string;
  department: string;
  grantedBy: string;
  notes: string | null | undefined;
}

export function buildDepartmentPermissionListQuery(
  supabase: SupabaseServiceClient,
  filters: DepartmentPermissionFilters,
) {
  const { employeeId, department, isActive } = filters;

  let query = supabase
    .from("department_permissions")
    .select(PERMISSION_WITH_EMPLOYEE_SELECT);

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

export function findDepartmentPermission(
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

export function reactivateDepartmentPermission(
  supabase: SupabaseServiceClient,
  permissionId: number,
  grantedBy: string | null,
  notes: string | null | undefined,
) {
  return supabase
    .from("department_permissions")
    .update({
      is_active: true,
      granted_by: grantedBy,
      granted_at: getVietnamTimestamp(),
      notes,
    })
    .eq("id", permissionId)
    .select()
    .single();
}

export function insertDepartmentPermission(
  supabase: SupabaseServiceClient,
  input: GrantDepartmentPermissionInput,
) {
  return supabase
    .from("department_permissions")
    .insert({
      employee_id: input.employeeId,
      department: input.department,
      granted_by: input.grantedBy,
      notes: input.notes,
    })
    .select()
    .single();
}

export function revokeDepartmentPermissionById(
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

export function revokeDepartmentPermissionByEmployeeDepartment(
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

export function findActiveDepartmentPermissions(
  supabase: SupabaseServiceClient,
) {
  return supabase
    .from("department_permissions")
    .select(PERMISSION_SUMMARY_SELECT)
    .eq("is_active", true)
    .order("department");
}
