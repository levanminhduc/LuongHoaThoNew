import { sanitizePostgrestValue } from "@/lib/utils/postgrest-sanitize";
import type { SupabaseServiceClient } from "../employee-repository";
import type { AdminEmployeeFilters } from "../employee-admin-repository";
import type { EmployeeListFilters } from "../employee-list-repository";

/** app/api/admin/employees/route.ts:106-136 tại commit aa24142 */
export function legacyAdminEmployeeListQuery(
  supabase: SupabaseServiceClient,
  filters: AdminEmployeeFilters,
  offset: number,
  limit: number,
) {
  let query = supabase
    .from("employees")
    .select(
      "employee_id, full_name, department, chuc_vu, phone_number, is_active, created_at, updated_at",
      { count: "exact" },
    );

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

/** app/api/admin/employees/route.ts:147-151 tại commit aa24142 */
export function legacyDistinctDepartmentsQuery(
  supabase: SupabaseServiceClient,
) {
  return supabase
    .from("employees")
    .select("department")
    .not("department", "is", null)
    .not("department", "eq", "");
}

/** app/api/admin/departments/route.ts:39-43 tại commit aa24142 */
export function legacyAllDepartmentNamesQuery(supabase: SupabaseServiceClient) {
  return supabase
    .from("employees")
    .select("department")
    .not("department", "is", null)
    .neq("department", "");
}

/** app/api/admin/departments/route.ts:54-59 tại commit aa24142 */
export function legacyActiveDepartmentNamesQuery(
  supabase: SupabaseServiceClient,
) {
  return supabase
    .from("employees")
    .select("department")
    .eq("is_active", true)
    .not("department", "is", null)
    .neq("department", "");
}

/** app/api/admin/departments/route.ts:118-121 tại commit aa24142 */
export function legacyDepartmentsOfEmployeesQuery(
  supabase: SupabaseServiceClient,
  departments: string[],
) {
  return supabase
    .from("employees")
    .select("department")
    .in("department", departments);
}

/** app/api/admin/departments/route.ts:125-137 tại commit aa24142 */
export function legacyManagersByPositionQuery(
  supabase: SupabaseServiceClient,
  departments: string[],
  position: string,
) {
  return supabase
    .from("employees")
    .select("employee_id, full_name, department")
    .in("department", departments)
    .eq("chuc_vu", position)
    .eq("is_active", true);
}

/** app/api/admin/departments/route.ts:248-250 tại commit aa24142 */
export function legacyTotalEmployeeCountQuery(supabase: SupabaseServiceClient) {
  return supabase.from("employees").select("*", { count: "exact", head: true });
}

/** app/api/admin/departments/route.ts:320-324 tại commit aa24142 */
export function legacyDepartmentByNameQuery(
  supabase: SupabaseServiceClient,
  name: string,
) {
  return supabase
    .from("employees")
    .select("department")
    .eq("department", name)
    .limit(1);
}

/** app/api/admin/departments/[departmentName]/route.ts:91-104 tại commit aa24142 */
export function legacyDepartmentMembersQuery(
  supabase: SupabaseServiceClient,
  departmentName: string,
) {
  return supabase
    .from("employees")
    .select(
      `
        employee_id,
        full_name,
        chuc_vu,
        department,
        is_active
      `,
    )
    .eq("department", departmentName)
    .eq("is_active", true)
    .order("full_name", { ascending: true });
}

/** app/api/admin/employees/route.ts:296-300 tại commit aa24142 */
export function legacyEmployeeIdByCodeQuery(
  supabase: SupabaseServiceClient,
  employeeId: string,
) {
  return supabase
    .from("employees")
    .select("employee_id")
    .eq("employee_id", employeeId)
    .single();
}

/** app/api/admin/employees/route.ts:314-330 tại commit aa24142 */
export function legacyInsertEmployeeQuery(
  supabase: SupabaseServiceClient,
  record: Record<string, unknown>,
) {
  return supabase
    .from("employees")
    .insert(record)
    .select(
      "employee_id, full_name, department, chuc_vu, phone_number, is_active, created_at, updated_at",
    )
    .single();
}

/** app/api/admin/import-employees/route.ts:102-114 tại commit aa24142 */
export function legacyInsertImportedEmployeeQuery(
  supabase: SupabaseServiceClient,
  record: Record<string, unknown>,
) {
  return supabase.from("employees").insert(record).select().single();
}

/** app/api/admin/employees/[id]/route.ts:66-72 tại commit aa24142 */
export function legacyEmployeeForEditQuery(
  supabase: SupabaseServiceClient,
  employeeId: string,
) {
  return supabase
    .from("employees")
    .select(
      "employee_id, full_name, department, chuc_vu, phone_number, is_active",
    )
    .eq("employee_id", employeeId)
    .single();
}

/** app/api/admin/employees/[id]/route.ts:206-213 tại commit aa24142 */
export function legacyUpdateEmployeeQuery(
  supabase: SupabaseServiceClient,
  employeeId: string,
  updateData: Record<string, unknown>,
) {
  return supabase
    .from("employees")
    .update(updateData)
    .eq("employee_id", employeeId)
    .select(
      "employee_id, full_name, department, chuc_vu, phone_number, is_active, created_at, updated_at",
    )
    .single();
}

/** app/api/admin/employees/[id]/route.ts:365-369 tại commit aa24142 */
export function legacyEmployeeNameByIdQuery(
  supabase: SupabaseServiceClient,
  employeeId: string,
) {
  return supabase
    .from("employees")
    .select("employee_id, full_name")
    .eq("employee_id", employeeId)
    .single();
}

/** app/api/admin/employees/[id]/route.ts:384-387 tại commit aa24142 */
export function legacyDeactivateEmployeeQuery(
  supabase: SupabaseServiceClient,
  employeeId: string,
  updateData: Record<string, unknown>,
) {
  return supabase
    .from("employees")
    .update(updateData)
    .eq("employee_id", employeeId);
}

/** app/api/admin/employees/[id]/route.ts:436-439 tại commit aa24142 */
export function legacyDeleteEmployeeQuery(
  supabase: SupabaseServiceClient,
  employeeId: string,
) {
  return supabase.from("employees").delete().eq("employee_id", employeeId);
}

/** app/api/admin/employees/[id]/route.ts:511-517 tại commit aa24142 */
export function legacyAdminEmployeeRecordQuery(
  supabase: SupabaseServiceClient,
  employeeId: string,
) {
  return supabase
    .from("employees")
    .select(
      "employee_id, full_name, department, chuc_vu, phone_number, is_active, created_at, updated_at",
    )
    .eq("employee_id", employeeId)
    .single();
}

/** app/api/employees/all-employees/route.ts:79-104 tại commit aa24142 */
export function legacyAllEmployeesListQuery(
  supabase: SupabaseServiceClient,
  filters: EmployeeListFilters,
  includeInactive: boolean,
) {
  let employeeQuery = supabase
    .from("employees")
    .select("employee_id, full_name, department, chuc_vu, is_active")
    .order("department")
    .order("chuc_vu", { ascending: false })
    .order("full_name");

  if (!includeInactive) {
    employeeQuery = employeeQuery.eq("is_active", true);
  }

  if (filters.search && filters.search.length >= 2) {
    const safeSearch = sanitizePostgrestValue(filters.search);
    if (safeSearch) {
      employeeQuery = employeeQuery.or(
        `employee_id.ilike.%${safeSearch}%,full_name.ilike.%${safeSearch}%`,
      );
    }
  }

  if (filters.department && filters.department !== "all") {
    employeeQuery = employeeQuery.eq("department", filters.department);
  }

  if (filters.restrictToIds) {
    employeeQuery = employeeQuery.in("employee_id", filters.restrictToIds);
  }

  return employeeQuery;
}

/** app/api/employees/all-employees/route.ts:135-156 tại commit aa24142 */
export function legacyAllEmployeesCountQuery(
  supabase: SupabaseServiceClient,
  filters: EmployeeListFilters,
  includeInactive: boolean,
) {
  let countQuery = supabase
    .from("employees")
    .select("*", { count: "exact", head: true })
    .eq("is_active", includeInactive ? undefined : true);

  if (filters.search && filters.search.length >= 2) {
    const safeSearch = sanitizePostgrestValue(filters.search);
    if (safeSearch) {
      countQuery = countQuery.or(
        `employee_id.ilike.%${safeSearch}%,full_name.ilike.%${safeSearch}%`,
      );
    }
  }

  if (filters.department && filters.department !== "all") {
    countQuery = countQuery.eq("department", filters.department);
  }

  if (filters.restrictToIds) {
    countQuery = countQuery.in("employee_id", filters.restrictToIds);
  }

  return countQuery;
}

/** app/api/employees/all-employees/route.ts:195-216 tại commit aa24142 */
export function legacyAllEmployeesDepartmentStatsQuery(
  supabase: SupabaseServiceClient,
  filters: EmployeeListFilters,
  includeInactive: boolean,
) {
  let deptStatsQuery = supabase.from("employees").select("department");

  if (!includeInactive) {
    deptStatsQuery = deptStatsQuery.eq("is_active", true);
  }

  if (filters.search && filters.search.length >= 2) {
    const safeSearch = sanitizePostgrestValue(filters.search);
    if (safeSearch) {
      deptStatsQuery = deptStatsQuery.or(
        `employee_id.ilike.%${safeSearch}%,full_name.ilike.%${safeSearch}%`,
      );
    }
  }

  if (filters.department && filters.department !== "all") {
    deptStatsQuery = deptStatsQuery.eq("department", filters.department);
  }

  if (filters.restrictToIds) {
    deptStatsQuery = deptStatsQuery.in("employee_id", filters.restrictToIds);
  }

  return deptStatsQuery;
}

/** app/api/admin/attendance-employees/route.ts:88-108 tại commit aa24142 */
export function legacyAttendanceEmployeesQuery(
  supabase: SupabaseServiceClient,
  employeeIds: string[],
  filters: EmployeeListFilters,
) {
  let employeeQuery = supabase
    .from("employees")
    .select("employee_id, full_name, department, chuc_vu, is_active", {
      count: "exact",
    })
    .in("employee_id", employeeIds)
    .eq("is_active", true);

  if (filters.department && filters.department !== "all") {
    employeeQuery = employeeQuery.eq("department", filters.department);
  }

  if (filters.search && filters.search.length >= 2) {
    const safeSearch = sanitizePostgrestValue(filters.search);
    if (safeSearch) {
      employeeQuery = employeeQuery.or(
        `employee_id.ilike.%${safeSearch}%,full_name.ilike.%${safeSearch}%`,
      );
    }
  }

  return employeeQuery;
}

/** app/api/admin/attendance-employees/route.ts:148-152 tại commit aa24142 */
export function legacyAttendanceDepartmentsQuery(
  supabase: SupabaseServiceClient,
  employeeIds: string[],
) {
  return supabase
    .from("employees")
    .select("department")
    .in("employee_id", employeeIds)
    .eq("is_active", true);
}

/** app/api/admin/unsigned-employees-export/route.ts:58-79 tại commit aa24142 */
export function legacyUnsignedEmployeesExportQuery(
  supabase: SupabaseServiceClient,
  employeeIds: string[],
  filters: EmployeeListFilters,
) {
  let employeeQuery = supabase
    .from("employees")
    .select("employee_id, full_name, department, chuc_vu")
    .in("employee_id", employeeIds)
    .eq("is_active", true)
    .order("department")
    .order("chuc_vu", { ascending: false })
    .order("full_name");

  if (filters.search && filters.search.length >= 2) {
    const safeSearch = sanitizePostgrestValue(filters.search);
    if (safeSearch) {
      employeeQuery = employeeQuery.or(
        `employee_id.ilike.%${safeSearch}%,full_name.ilike.%${safeSearch}%`,
      );
    }
  }

  if (filters.department && filters.department !== "all") {
    employeeQuery = employeeQuery.eq("department", filters.department);
  }

  return employeeQuery;
}
