import type { createServiceClient } from "@/utils/supabase/server";

type SupabaseServiceClient = ReturnType<typeof createServiceClient>;

const LEGACY_EXPORT_MONTHLY_SELECT =
  "employee_id, source_file, total_days, total_hours, total_ot_hours, total_meal_ot_hours, sick_days, daily_records_json";

const LEGACY_EXPORT_DAILY_SELECT =
  "employee_id, work_date, check_in_time, check_out_time, working_units, overtime_units";

/** app/api/admin/attendance-employees/route.ts:47-51 tại commit 35b7fe8 */
export function legacyPeriodListQuery(supabase: SupabaseServiceClient) {
  return supabase
    .from("attendance_monthly")
    .select("period_year, period_month")
    .order("period_year", { ascending: false })
    .order("period_month", { ascending: false });
}

/** app/api/admin/attendance-employees/route.ts:62-68 */
export function legacyMonthlySummaryQuery(
  supabase: SupabaseServiceClient,
  periodYear: number,
  periodMonth: number,
) {
  return supabase
    .from("attendance_monthly")
    .select(
      "employee_id, total_hours, total_days, total_meal_ot_hours, total_ot_hours, sick_days, source_file, created_at",
    )
    .eq("period_year", periodYear)
    .eq("period_month", periodMonth);
}

/** app/api/admin/attendance-export/route.ts:63-73 */
export function legacyExportMonthlyQuery(
  supabase: SupabaseServiceClient,
  period_year: number,
  period_month: number,
  export_type: string,
  employee_ids: string[] | null | undefined,
) {
  let monthlyQuery = supabase
    .from("attendance_monthly")
    .select(LEGACY_EXPORT_MONTHLY_SELECT)
    .eq("period_year", period_year)
    .eq("period_month", period_month);

  if (export_type === "selected" && employee_ids && employee_ids.length > 0) {
    monthlyQuery = monthlyQuery.in("employee_id", employee_ids);
  }

  return monthlyQuery;
}

/** app/api/admin/attendance-export/route.ts:155-162 */
export function legacyExportDailyFallbackQuery(
  supabase: SupabaseServiceClient,
  period_year: number,
  period_month: number,
  fallbackEmployeeIds: string[],
) {
  return supabase
    .from("attendance_daily")
    .select(LEGACY_EXPORT_DAILY_SELECT)
    .eq("period_year", period_year)
    .eq("period_month", period_month)
    .in("employee_id", fallbackEmployeeIds)
    .order("employee_id")
    .order("work_date");
}

/** app/api/admin/attendance-import/route.ts:108-125 */
export function legacyMonthlyUpsertQuery(
  supabase: SupabaseServiceClient,
  record: {
    employeeId: string;
    periodYear: number;
    periodMonth: number;
    summary: {
      totalHours: number;
      totalDays: number;
      totalMealOtHours: number;
      totalOtHours: number;
      sickDays: number;
    };
  },
  dailyRecords: unknown[],
  fileName: string,
  importBatchId: string,
) {
  return supabase.from("attendance_monthly").upsert(
    {
      employee_id: record.employeeId,
      period_year: record.periodYear,
      period_month: record.periodMonth,
      total_hours: record.summary.totalHours,
      total_days: record.summary.totalDays,
      total_meal_ot_hours: record.summary.totalMealOtHours,
      total_ot_hours: record.summary.totalOtHours,
      sick_days: record.summary.sickDays,
      daily_records_json: dailyRecords,
      source_file: fileName,
      import_batch_id: importBatchId,
    },
    { onConflict: "employee_id,period_year,period_month" },
  );
}

/** app/api/admin/overtime-registration-export/route.ts:324-328 */
export function legacyOvertimeMonthlyQuery(
  supabase: SupabaseServiceClient,
  period_year: number,
  period_month: number,
) {
  return supabase
    .from("attendance_monthly")
    .select("employee_id, daily_records_json")
    .eq("period_year", period_year)
    .eq("period_month", period_month);
}

/** app/api/admin/overtime-registration-export/route.ts:371-377 */
export function legacyOvertimeDailyFallbackQuery(
  supabase: SupabaseServiceClient,
  period_year: number,
  period_month: number,
  fallbackIds: string[],
) {
  return supabase
    .from("attendance_daily")
    .select("employee_id, work_date, check_out_time")
    .eq("period_year", period_year)
    .eq("period_month", period_month)
    .in("employee_id", fallbackIds);
}
