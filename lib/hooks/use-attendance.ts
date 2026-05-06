import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { ENDPOINTS, QUERY_PARAMS } from "@/lib/api/endpoints";
import { withToast } from "@/lib/api/mutation-helpers";

export interface AttendanceEmployee {
  employee_id: string;
  full_name: string;
  department: string;
  chuc_vu: string;
  attendance: {
    total_hours: number;
    total_days: number;
    total_meal_ot_hours: number;
    total_ot_hours: number;
    sick_days: number;
  } | null;
}

export interface AttendancePeriod {
  year: number;
  month: number;
}

export interface AttendanceEmployeesResponse {
  success: boolean;
  employees: AttendanceEmployee[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  periods: AttendancePeriod[];
  departments: string[];
  totalEmployees: number;
  currentPeriod?: { year: number; month: number };
}

export interface AttendanceEmployeesFilters {
  periodYear: number;
  periodMonth: number;
  department?: string;
  search?: string;
  limit?: number;
}

export interface AttendanceImportError {
  row: number;
  employeeId: string;
  message: string;
}

export interface AttendanceImportResult {
  success: boolean;
  totalRecords: number;
  insertedDaily: number;
  insertedMonthly: number;
  skippedRecords: number;
  errors: AttendanceImportError[];
  invalidEmployees: string[];
  importBatchId: string;
}

function appendParams(path: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function attendanceEmployeesParams(filters: AttendanceEmployeesFilters) {
  const params = new URLSearchParams();
  params.set(QUERY_PARAMS.PERIOD_YEAR, String(filters.periodYear));
  params.set(QUERY_PARAMS.PERIOD_MONTH, String(filters.periodMonth));
  params.set(QUERY_PARAMS.LIMIT, String(filters.limit ?? 50));

  if (filters.department) {
    params.set(QUERY_PARAMS.DEPARTMENT, filters.department);
  }
  if (filters.search) {
    params.set(QUERY_PARAMS.SEARCH, filters.search);
  }

  return params;
}

export function useAttendanceEmployeesQuery(
  filters: AttendanceEmployeesFilters,
) {
  return useQuery({
    queryKey: ["attendance-employees", filters],
    queryFn: ({ signal }) =>
      apiClient.get<AttendanceEmployeesResponse>(
        appendParams(
          ENDPOINTS.attendance.employees,
          attendanceEmployeesParams(filters),
        ),
        { signal },
      ),
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });
}

export function useAttendanceImportMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: FormData) =>
      apiClient.post<AttendanceImportResult>(
        ENDPOINTS.attendance.import,
        formData,
      ),
    ...withToast({
      success: "Đã import chấm công",
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["attendance-employees"] });
      },
    }),
  });
}
