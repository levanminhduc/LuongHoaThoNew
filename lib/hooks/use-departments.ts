import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { ENDPOINTS, QUERY_PARAMS } from "@/lib/api/endpoints";
import { withToast } from "@/lib/api/mutation-helpers";
import type { Employee, EmployeesResponse } from "@/lib/hooks/use-employees";

export interface Department {
  name: string;
  employeeCount: number;
  payrollCount: number;
  signedCount: number;
  signedPercentage: string;
  totalSalary: number;
  averageSalary: number;
  managers: Array<{ employee_id: string; full_name: string }>;
  supervisors: Array<{ employee_id: string; full_name: string }>;
}

export interface DepartmentPermission {
  id: number;
  employee_id: string;
  department: string;
  granted_by: string;
  granted_at: string;
  is_active: boolean;
  notes?: string;
  employees?: {
    employee_id: string;
    full_name: string;
    department?: string;
    chuc_vu: string;
  };
  granted_by_employee?: {
    employee_id: string;
    full_name: string;
  };
}

export interface DepartmentsResponse {
  success: boolean;
  departments: Department[];
}

export interface DepartmentPermissionsResponse {
  success: boolean;
  permissions: DepartmentPermission[];
}

export interface DepartmentPermissionFilters {
  employee_id?: string;
  department?: string;
  is_active?: string;
}

export interface GrantDepartmentPermissionInput {
  employee_id: string;
  department: string;
  notes?: string;
}

const MANAGEMENT_ROLES = [
  "giam_doc",
  "ke_toan",
  "nguoi_lap_bieu",
  "truong_phong",
  "to_truong",
] as const;

function appendParams(path: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function permissionParams(filters: DepartmentPermissionFilters = {}) {
  const params = new URLSearchParams();

  if (filters.employee_id) {
    params.set(QUERY_PARAMS.EMPLOYEE_ID, filters.employee_id);
  }
  if (filters.department) {
    params.set(QUERY_PARAMS.DEPARTMENT, filters.department);
  }
  if (filters.is_active) {
    params.set(QUERY_PARAMS.IS_ACTIVE, filters.is_active);
  }

  return params;
}

export function useDepartmentStatsQuery() {
  return useQuery({
    queryKey: ["department-stats"],
    queryFn: ({ signal }) => {
      const params = new URLSearchParams();
      params.set(QUERY_PARAMS.INCLUDE_STATS, "true");

      return apiClient.get<DepartmentsResponse>(
        appendParams(ENDPOINTS.departments.list, params),
        { signal },
      );
    },
    staleTime: 60_000,
  });
}

export function useDepartmentPermissionsQuery(
  filters: DepartmentPermissionFilters = {},
) {
  return useQuery({
    queryKey: ["department-permissions", filters],
    queryFn: ({ signal }) =>
      apiClient.get<DepartmentPermissionsResponse>(
        appendParams(
          ENDPOINTS.departments.permissions,
          permissionParams(filters),
        ),
        { signal },
      ),
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });
}

export function useManagementEmployeesQuery() {
  return useQuery({
    queryKey: ["management-employees"],
    queryFn: async ({ signal }) => {
      const responses = await Promise.all(
        MANAGEMENT_ROLES.map((role) => {
          const params = new URLSearchParams();
          params.set(QUERY_PARAMS.ROLE, role);
          params.set(QUERY_PARAMS.LIMIT, "1000");

          return apiClient.get<EmployeesResponse>(
            appendParams(ENDPOINTS.employees.list, params),
            { signal },
          );
        }),
      );

      return responses.flatMap((response) => response.employees) as Employee[];
    },
    staleTime: 60_000,
  });
}

export function useGrantDepartmentPermissionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: GrantDepartmentPermissionInput) =>
      apiClient.post(ENDPOINTS.departments.permissions, input),
    ...withToast({
      success: "Đã cấp quyền department",
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["department-permissions"],
        });
        queryClient.invalidateQueries({ queryKey: ["management-employees"] });
      },
    }),
  });
}

export function useRevokeDepartmentPermissionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (permissionId: number) => {
      const params = new URLSearchParams();
      params.set(QUERY_PARAMS.ID, String(permissionId));

      return apiClient.delete(
        appendParams(ENDPOINTS.departments.permissions, params),
      );
    },
    ...withToast({
      success: "Đã thu hồi quyền department",
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["department-permissions"],
        });
      },
    }),
  });
}
