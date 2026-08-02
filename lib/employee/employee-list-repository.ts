import "server-only";
import type { createServiceClient } from "@/utils/supabase/server";
import { sanitizePostgrestValue } from "@/lib/utils/postgrest-sanitize";

export type SupabaseServiceClient = ReturnType<typeof createServiceClient>;

const EMPLOYEE_DIRECTORY_SELECT =
  "employee_id, full_name, department, chuc_vu, is_active";

const EMPLOYEE_PROFILE_SELECT = "employee_id, full_name, department, chuc_vu";

const MIN_SEARCH_LENGTH = 2;

export interface EmployeeListFilters {
  search: string | null;
  department: string | null;
  restrictToIds: string[] | null;
}

function hasSearchTerm(search: string | null): search is string {
  return Boolean(search) && (search as string).length >= MIN_SEARCH_LENGTH;
}

function selectsSpecificDepartment(department: string | null) {
  return Boolean(department) && department !== "all";
}

function nameSearchFilter(search: string) {
  const safeSearch = sanitizePostgrestValue(search);
  if (!safeSearch) {
    return null;
  }
  return `employee_id.ilike.%${safeSearch}%,full_name.ilike.%${safeSearch}%`;
}

export function buildAllEmployeesListQuery(
  supabase: SupabaseServiceClient,
  filters: EmployeeListFilters,
  includeInactive: boolean,
) {
  let query = supabase
    .from("employees")
    .select(EMPLOYEE_DIRECTORY_SELECT)
    .order("department")
    .order("chuc_vu", { ascending: false })
    .order("full_name");

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  if (hasSearchTerm(filters.search)) {
    const searchFilter = nameSearchFilter(filters.search);
    if (searchFilter) {
      query = query.or(searchFilter);
    }
  }

  if (selectsSpecificDepartment(filters.department)) {
    query = query.eq("department", filters.department as string);
  }

  if (filters.restrictToIds) {
    query = query.in("employee_id", filters.restrictToIds);
  }

  return query;
}

export function buildAllEmployeesCountQuery(
  supabase: SupabaseServiceClient,
  filters: EmployeeListFilters,
  includeInactive: boolean,
) {
  let query = supabase
    .from("employees")
    .select("*", { count: "exact", head: true })
    .eq("is_active", includeInactive ? undefined : true);

  if (hasSearchTerm(filters.search)) {
    const searchFilter = nameSearchFilter(filters.search);
    if (searchFilter) {
      query = query.or(searchFilter);
    }
  }

  if (selectsSpecificDepartment(filters.department)) {
    query = query.eq("department", filters.department as string);
  }

  if (filters.restrictToIds) {
    query = query.in("employee_id", filters.restrictToIds);
  }

  return query;
}

export function buildAllEmployeesDepartmentStatsQuery(
  supabase: SupabaseServiceClient,
  filters: EmployeeListFilters,
  includeInactive: boolean,
) {
  let query = supabase.from("employees").select("department");

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  if (hasSearchTerm(filters.search)) {
    const searchFilter = nameSearchFilter(filters.search);
    if (searchFilter) {
      query = query.or(searchFilter);
    }
  }

  if (selectsSpecificDepartment(filters.department)) {
    query = query.eq("department", filters.department as string);
  }

  if (filters.restrictToIds) {
    query = query.in("employee_id", filters.restrictToIds);
  }

  return query;
}

export function buildAttendanceEmployeesQuery(
  supabase: SupabaseServiceClient,
  employeeIds: string[],
  filters: EmployeeListFilters,
) {
  let query = supabase
    .from("employees")
    .select(EMPLOYEE_DIRECTORY_SELECT, { count: "exact" })
    .in("employee_id", employeeIds)
    .eq("is_active", true);

  if (selectsSpecificDepartment(filters.department)) {
    query = query.eq("department", filters.department as string);
  }

  if (hasSearchTerm(filters.search)) {
    const searchFilter = nameSearchFilter(filters.search);
    if (searchFilter) {
      query = query.or(searchFilter);
    }
  }

  return query;
}

export function findAttendanceEmployeeDepartments(
  supabase: SupabaseServiceClient,
  employeeIds: string[],
) {
  return supabase
    .from("employees")
    .select("department")
    .in("employee_id", employeeIds)
    .eq("is_active", true);
}

export function buildUnsignedEmployeesExportQuery(
  supabase: SupabaseServiceClient,
  employeeIds: string[],
  filters: EmployeeListFilters,
) {
  let query = supabase
    .from("employees")
    .select(EMPLOYEE_PROFILE_SELECT)
    .in("employee_id", employeeIds)
    .eq("is_active", true)
    .order("department")
    .order("chuc_vu", { ascending: false })
    .order("full_name");

  if (hasSearchTerm(filters.search)) {
    const searchFilter = nameSearchFilter(filters.search);
    if (searchFilter) {
      query = query.or(searchFilter);
    }
  }

  if (selectsSpecificDepartment(filters.department)) {
    query = query.eq("department", filters.department as string);
  }

  return query;
}

export function buildEmployeeTotalCountQuery(supabase: SupabaseServiceClient) {
  return supabase.from("employees").select("*", { count: "exact", head: true });
}
