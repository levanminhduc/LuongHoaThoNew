import "server-only";
import type { createServiceClient } from "@/utils/supabase/server";
import type { DailyRecord, AttendanceSummary } from "@/types/attendance";

export type SupabaseServiceClient = ReturnType<typeof createServiceClient>;

const MONTHLY_SUMMARY_SELECT =
  "employee_id, total_hours, total_days, total_meal_ot_hours, total_ot_hours, sick_days, source_file, created_at";

const MONTHLY_EXPORT_SELECT =
  "employee_id, source_file, total_days, total_hours, total_ot_hours, total_meal_ot_hours, sick_days, daily_records_json";

const DAILY_EXPORT_SELECT =
  "employee_id, work_date, check_in_time, check_out_time, working_units, overtime_units";

const MONTHLY_DAILY_RECORDS_SELECT = "employee_id, daily_records_json";

const DAILY_CHECK_OUT_SELECT = "employee_id, work_date, check_out_time";

export interface AttendancePeriod {
  periodYear: number;
  periodMonth: number;
}

export interface MonthlyAttendanceExportFilters extends AttendancePeriod {
  employeeIds: string[] | null | undefined;
  exportType: string;
}

export interface DailyAttendanceFilters extends AttendancePeriod {
  employeeIds: string[];
}

export interface MonthlyAttendanceUpsertInput extends AttendancePeriod {
  employeeId: string;
  summary: AttendanceSummary;
  dailyRecords: DailyRecord[];
  sourceFile: string;
  importBatchId: string;
}

export function findAttendancePeriods(supabase: SupabaseServiceClient) {
  return supabase
    .from("attendance_monthly")
    .select("period_year, period_month")
    .order("period_year", { ascending: false })
    .order("period_month", { ascending: false });
}

export function findMonthlyAttendanceSummaries(
  supabase: SupabaseServiceClient,
  period: AttendancePeriod,
) {
  return supabase
    .from("attendance_monthly")
    .select(MONTHLY_SUMMARY_SELECT)
    .eq("period_year", period.periodYear)
    .eq("period_month", period.periodMonth);
}

export function buildMonthlyAttendanceExportQuery(
  supabase: SupabaseServiceClient,
  filters: MonthlyAttendanceExportFilters,
) {
  const query = supabase
    .from("attendance_monthly")
    .select(MONTHLY_EXPORT_SELECT)
    .eq("period_year", filters.periodYear)
    .eq("period_month", filters.periodMonth);

  const exportsSelectedEmployees =
    filters.exportType === "selected" &&
    filters.employeeIds &&
    filters.employeeIds.length > 0;

  if (!exportsSelectedEmployees) {
    return query;
  }

  return query.in("employee_id", filters.employeeIds as string[]);
}

export function findDailyAttendanceForExport(
  supabase: SupabaseServiceClient,
  filters: DailyAttendanceFilters,
) {
  return supabase
    .from("attendance_daily")
    .select(DAILY_EXPORT_SELECT)
    .eq("period_year", filters.periodYear)
    .eq("period_month", filters.periodMonth)
    .in("employee_id", filters.employeeIds)
    .order("employee_id")
    .order("work_date");
}

export function upsertMonthlyAttendance(
  supabase: SupabaseServiceClient,
  input: MonthlyAttendanceUpsertInput,
) {
  return supabase.from("attendance_monthly").upsert(
    {
      employee_id: input.employeeId,
      period_year: input.periodYear,
      period_month: input.periodMonth,
      total_hours: input.summary.totalHours,
      total_days: input.summary.totalDays,
      total_meal_ot_hours: input.summary.totalMealOtHours,
      total_ot_hours: input.summary.totalOtHours,
      sick_days: input.summary.sickDays,
      daily_records_json: input.dailyRecords,
      source_file: input.sourceFile,
      import_batch_id: input.importBatchId,
    },
    { onConflict: "employee_id,period_year,period_month" },
  );
}

export function findMonthlyDailyRecords(
  supabase: SupabaseServiceClient,
  period: AttendancePeriod,
) {
  return supabase
    .from("attendance_monthly")
    .select(MONTHLY_DAILY_RECORDS_SELECT)
    .eq("period_year", period.periodYear)
    .eq("period_month", period.periodMonth);
}

export function findDailyCheckOutTimes(
  supabase: SupabaseServiceClient,
  filters: DailyAttendanceFilters,
) {
  return supabase
    .from("attendance_daily")
    .select(DAILY_CHECK_OUT_SELECT)
    .eq("period_year", filters.periodYear)
    .eq("period_month", filters.periodMonth)
    .in("employee_id", filters.employeeIds);
}
