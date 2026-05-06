import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { ENDPOINTS, QUERY_PARAMS } from "@/lib/api/endpoints";

export interface Employee {
  employee_id: string;
  full_name: string;
  department: string | null;
  chuc_vu: string;
  phone_number: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeesFilters {
  page?: number;
  limit?: number;
  search?: string;
  department?: string;
  role?: string;
}

export interface EmployeesResponse {
  employees: Employee[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  departments: string[];
}

export interface EmployeeAuditLog {
  id: string;
  audit_timestamp: string;
  admin_user_name: string;
  action_type: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  change_reason?: string;
  status: "SUCCESS" | "FAILED" | "PARTIAL";
}

export interface EmployeeAuditLogsResponse {
  success: boolean;
  logs: EmployeeAuditLog[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface UpdateCccdInput {
  employee_id: string;
  new_cccd: string;
}

export interface UpdateCccdResponse {
  success: boolean;
  message: string;
  error?: string;
  employee?: Pick<Employee, "employee_id" | "full_name">;
}

type EmployeeMutationInput =
  | {
      action: "create";
      employee: Partial<Employee> & {
        employee_id: string;
        cccd?: string;
        password?: string;
      };
    }
  | {
      action: "update";
      employee: Partial<Employee> & {
        employee_id: string;
        cccd?: string;
        password?: string;
      };
      originalEmployeeId?: string;
    }
  | {
      action: "delete";
      employee: Pick<Employee, "employee_id">;
    };

function appendParams(path: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function employeeParams(filters: EmployeesFilters) {
  const params = new URLSearchParams();

  if (filters.page) {
    params.set(QUERY_PARAMS.PAGE, String(filters.page));
  }
  if (filters.limit) {
    params.set(QUERY_PARAMS.LIMIT, String(filters.limit));
  }
  if (filters.search) {
    params.set(QUERY_PARAMS.SEARCH, filters.search);
  }
  if (filters.department && filters.department !== "all_departments") {
    params.set(QUERY_PARAMS.DEPARTMENT, filters.department);
  }
  if (filters.role && filters.role !== "all_roles") {
    params.set(QUERY_PARAMS.ROLE, filters.role);
  }

  return params;
}

export function employeesKey(filters: EmployeesFilters) {
  return ["employees", filters] as const;
}

export function useEmployeesQuery(filters: EmployeesFilters = {}, enabled = true) {
  return useQuery({
    queryKey: employeesKey(filters),
    queryFn: ({ signal }) =>
      apiClient.get<EmployeesResponse>(
        appendParams(ENDPOINTS.employees.list, employeeParams(filters)),
        { signal },
      ),
    enabled,
    staleTime: 60_000,
    placeholderData: (previous) => previous,
  });
}

export function useEmployeeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: EmployeeMutationInput) => {
      if (input.action === "create") {
        return apiClient.post<{ success: boolean; message?: string; employee?: Employee }>(
          ENDPOINTS.employees.create,
          input.employee,
        );
      }

      const id =
        input.action === "update"
          ? input.originalEmployeeId ?? input.employee.employee_id
          : input.employee.employee_id;

      if (input.action === "update") {
        return apiClient.put<{ success: boolean; message?: string; employee?: Employee }>(
          ENDPOINTS.employees.update(id),
          input.employee,
        );
      }

      return apiClient.delete<{ success: boolean; message?: string }>(
        ENDPOINTS.employees.delete(id),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employee-audit-logs"] });
    },
  });
}

export function useEmployeeAuditLogsQuery(
  employeeId: string | undefined,
  filters: { limit?: number; offset?: number },
  enabled = true,
) {
  return useQuery({
    queryKey: ["employee-audit-logs", employeeId, filters],
    queryFn: ({ signal }) => {
      const params = new URLSearchParams();
      params.set(QUERY_PARAMS.LIMIT, String(filters.limit ?? 20));
      params.set(QUERY_PARAMS.OFFSET, String(filters.offset ?? 0));

      return apiClient.get<EmployeeAuditLogsResponse>(
        appendParams(ENDPOINTS.employees.auditLogs(employeeId!), params),
        { signal },
      );
    },
    enabled: enabled && Boolean(employeeId),
    staleTime: 30_000,
  });
}

export function useEmployeeCccdSearchQuery(query: string) {
  return useQuery({
    queryKey: ["employee-cccd-search", query],
    queryFn: ({ signal }) => {
      const params = new URLSearchParams();
      params.set(QUERY_PARAMS.QUERY, query);

      return apiClient.get<{ success: boolean; employees: Employee[] }>(
        appendParams(ENDPOINTS.employees.updateCccd, params),
        { signal },
      );
    },
    enabled: query.trim().length >= 2,
    staleTime: 30_000,
  });
}

export function useUpdateCccdMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateCccdInput) =>
      apiClient.post<UpdateCccdResponse>(ENDPOINTS.employees.updateCccd, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employee-cccd-search"] });
    },
  });
}
