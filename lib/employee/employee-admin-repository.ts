import "server-only";
import type { createServiceClient } from "@/utils/supabase/server";
import { sanitizePostgrestValue } from "@/lib/utils/postgrest-sanitize";

export type SupabaseServiceClient = ReturnType<typeof createServiceClient>;

const ADMIN_EMPLOYEE_SELECT =
  "employee_id, full_name, department, chuc_vu, phone_number, is_active, created_at, updated_at";

const ADMIN_EMPLOYEE_EDIT_SELECT =
  "employee_id, full_name, department, chuc_vu, phone_number, is_active";

const DEPARTMENT_MEMBER_SELECT =
  "employee_id, full_name, chuc_vu, department, is_active";

const EMPLOYEE_NAME_SELECT = "employee_id, full_name, department";

export interface AdminEmployeeFilters {
  search?: string | null;
  department?: string | null;
  role?: string | null;
}

export function buildAdminEmployeeListQuery(
  supabase: SupabaseServiceClient,
  filters: AdminEmployeeFilters,
  offset: number,
  limit: number,
) {
  let query = supabase
    .from("employees")
    .select(ADMIN_EMPLOYEE_SELECT, { count: "exact" });

  if (filters.search) {
    const safeSearch = sanitizePostgrestValue(filters.search);
    if (safeSearch) {
      query = query.or(
        `employee_id.ilike.%${safeSearch}%,full_name.ilike.%${safeSearch}%,phone_number.ilike.%${safeSearch}%`,
      );
    }
  }

  if (filters.department) {
    query = query.eq("department", filters.department);
  }

  if (filters.role) {
    query = query.eq("chuc_vu", filters.role);
  }

  return query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
}

export function findDistinctDepartments(supabase: SupabaseServiceClient) {
  return supabase
    .from("employees")
    .select("department")
    .not("department", "is", null)
    .not("department", "eq", "");
}

export function findAllDepartmentNames(supabase: SupabaseServiceClient) {
  return supabase
    .from("employees")
    .select("department")
    .not("department", "is", null)
    .neq("department", "");
}

export function findActiveDepartmentNames(supabase: SupabaseServiceClient) {
  return supabase
    .from("employees")
    .select("department")
    .eq("is_active", true)
    .not("department", "is", null)
    .neq("department", "");
}

export function findDepartmentsOfEmployees(
  supabase: SupabaseServiceClient,
  departments: string[],
) {
  return supabase
    .from("employees")
    .select("department")
    .in("department", departments);
}

export function findActiveManagersByPosition(
  supabase: SupabaseServiceClient,
  departments: string[],
  position: string,
) {
  return supabase
    .from("employees")
    .select(EMPLOYEE_NAME_SELECT)
    .in("department", departments)
    .eq("chuc_vu", position)
    .eq("is_active", true);
}

export function findDepartmentByName(
  supabase: SupabaseServiceClient,
  name: string,
) {
  return supabase
    .from("employees")
    .select("department")
    .eq("department", name)
    .limit(1);
}

export function findActiveDepartmentMembers(
  supabase: SupabaseServiceClient,
  departmentName: string,
) {
  return supabase
    .from("employees")
    .select(DEPARTMENT_MEMBER_SELECT)
    .eq("department", departmentName)
    .eq("is_active", true)
    .order("full_name", { ascending: true });
}

export function findEmployeeIdByCode(
  supabase: SupabaseServiceClient,
  employeeId: string,
) {
  return supabase
    .from("employees")
    .select("employee_id")
    .eq("employee_id", employeeId)
    .single();
}

export function insertEmployee(
  supabase: SupabaseServiceClient,
  record: Record<string, unknown>,
) {
  return supabase
    .from("employees")
    .insert(record)
    .select(ADMIN_EMPLOYEE_SELECT)
    .single();
}

export function insertImportedEmployee(
  supabase: SupabaseServiceClient,
  record: Record<string, unknown>,
) {
  return supabase.from("employees").insert(record).select().single();
}

export function findEmployeeForEdit(
  supabase: SupabaseServiceClient,
  employeeId: string,
) {
  return supabase
    .from("employees")
    .select(ADMIN_EMPLOYEE_EDIT_SELECT)
    .eq("employee_id", employeeId)
    .single();
}

export function findAdminEmployeeRecord(
  supabase: SupabaseServiceClient,
  employeeId: string,
) {
  return supabase
    .from("employees")
    .select(ADMIN_EMPLOYEE_SELECT)
    .eq("employee_id", employeeId)
    .single();
}

export function findEmployeeNameById(
  supabase: SupabaseServiceClient,
  employeeId: string,
) {
  return supabase
    .from("employees")
    .select("employee_id, full_name")
    .eq("employee_id", employeeId)
    .single();
}

export function updateEmployeeById(
  supabase: SupabaseServiceClient,
  employeeId: string,
  updateData: Record<string, unknown>,
) {
  return supabase
    .from("employees")
    .update(updateData)
    .eq("employee_id", employeeId)
    .select(ADMIN_EMPLOYEE_SELECT)
    .single();
}

export function deactivateEmployee(
  supabase: SupabaseServiceClient,
  employeeId: string,
  updateData: Record<string, unknown>,
) {
  return supabase
    .from("employees")
    .update(updateData)
    .eq("employee_id", employeeId);
}

export function deleteEmployee(
  supabase: SupabaseServiceClient,
  employeeId: string,
) {
  return supabase.from("employees").delete().eq("employee_id", employeeId);
}
