import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyToken } from "@/lib/auth-middleware";
import { csrfProtection } from "@/lib/security-middleware";
import XLSX from "xlsx-js-style";
import { CACHE_HEADERS } from "@/lib/utils/cache-headers";
import {
  PeriodExportRequestSchema,
  parseSchema,
  createValidationErrorResponse,
} from "@/lib/validations";
import { getVietnamDate } from "@/lib/utils/vietnam-timezone";
import { toErrorResponse } from "@/lib/errors/app-error";
import {
  formatTimeHHmm,
  normalizeDailyRecords,
  type DailyExportRecord,
} from "@/lib/attendance/daily-records";
import { buildAttendanceDailySheet } from "@/lib/excel/attendance-daily-sheet";
import { buildAttendanceSummarySheet } from "@/lib/excel/attendance-summary-sheet";
import type { AttendanceSignatureLog } from "@/lib/excel/attendance-sheet-types";

const ATTENDANCE_MONTHLY_SELECT =
  "employee_id, source_file, total_days, total_hours, total_ot_hours, total_meal_ot_hours, sick_days, daily_records_json";

const ATTENDANCE_DAILY_SELECT =
  "employee_id, work_date, check_in_time, check_out_time, working_units, overtime_units";

interface ExportRequestBody {
  period_year: number;
  period_month: number;
  employee_ids?: string[] | null;
  export_type: "selected" | "all";
  include_daily?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const csrfResult = csrfProtection(request);
    if (csrfResult) return csrfResult;
    const auth = verifyToken(request);
    if (!auth || !auth.isRole("admin")) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401, headers: CACHE_HEADERS.sensitive },
      );
    }

    const rawBody: ExportRequestBody = await request.json();
    const parsed = parseSchema(PeriodExportRequestSchema, rawBody);
    if (!parsed.success) {
      return NextResponse.json(createValidationErrorResponse(parsed.errors), {
        status: 400,
        headers: CACHE_HEADERS.sensitive,
      });
    }

    const { period_year, period_month } = parsed.data;
    const { employee_ids, export_type, include_daily = false } = rawBody;

    const supabase = createServiceClient();

    let monthlyQuery = supabase
      .from("attendance_monthly")
      .select(ATTENDANCE_MONTHLY_SELECT)
      .eq("period_year", period_year)
      .eq("period_month", period_month);

    if (export_type === "selected" && employee_ids && employee_ids.length > 0) {
      monthlyQuery = monthlyQuery.in("employee_id", employee_ids);
    }

    const { data: monthlyData, error: monthlyError } = await monthlyQuery;

    if (monthlyError) {
      console.error("Monthly query error:", monthlyError);
      return NextResponse.json(
        { error: "Lỗi truy vấn dữ liệu chấm công" },
        { status: 500, headers: CACHE_HEADERS.sensitive },
      );
    }

    if (!monthlyData || monthlyData.length === 0) {
      return NextResponse.json(
        { error: "Không có dữ liệu để xuất" },
        { status: 404, headers: CACHE_HEADERS.sensitive },
      );
    }

    const employeeIds = monthlyData.map((m) => m.employee_id);

    const { data: employees } = await supabase
      .from("employees")
      .select("employee_id, full_name, department, chuc_vu")
      .in("employee_id", employeeIds);

    const employeeMap = new Map(
      (employees || []).map((e) => [e.employee_id, e]),
    );

    const salaryMonth = `${period_year}-${String(period_month).padStart(2, "0")}`;
    const signatureLogsMap = new Map<string, AttendanceSignatureLog>();

    try {
      const { data: signatureLogs, error: sigLogsError } = await supabase
        .from("signature_logs")
        .select("employee_id, salary_month, signed_by_name, signed_at")
        .eq("salary_month", salaryMonth);

      if (!sigLogsError && signatureLogs) {
        signatureLogs.forEach((log) => {
          signatureLogsMap.set(log.employee_id, log as AttendanceSignatureLog);
        });
      }
    } catch {
      console.log("Could not fetch signature_logs - using fallback");
    }

    const workbook = XLSX.utils.book_new();

    const sheetContext = {
      monthlyData,
      employeeMap,
      signatureLogsMap,
      salaryMonth,
    };

    const summarySheet = buildAttendanceSummarySheet(sheetContext);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Tổng Hợp Tháng");

    if (include_daily) {
      const daysInMonth = new Date(period_year, period_month, 0).getDate();

      const dailyByEmployee = new Map<string, Map<number, DailyExportRecord>>();
      const fallbackEmployeeIds: string[] = [];

      for (const m of monthlyData) {
        const employeeDailyMap = new Map<number, DailyExportRecord>();
        const hasDailyRecordsJson =
          m.daily_records_json !== null && m.daily_records_json !== undefined;
        const normalizedRecords = normalizeDailyRecords(m.daily_records_json);

        if (!hasDailyRecordsJson) {
          fallbackEmployeeIds.push(m.employee_id);
        }

        for (const record of normalizedRecords) {
          employeeDailyMap.set(record.day, record);
        }

        dailyByEmployee.set(m.employee_id, employeeDailyMap);
      }

      if (fallbackEmployeeIds.length > 0) {
        const { data: fallbackDailyData } = await supabase
          .from("attendance_daily")
          .select(ATTENDANCE_DAILY_SELECT)
          .eq("period_year", period_year)
          .eq("period_month", period_month)
          .in("employee_id", fallbackEmployeeIds)
          .order("employee_id")
          .order("work_date");

        for (const d of fallbackDailyData || []) {
          const dayNum = new Date(d.work_date).getDate();
          if (!dailyByEmployee.has(d.employee_id)) {
            dailyByEmployee.set(d.employee_id, new Map());
          }
          dailyByEmployee.get(d.employee_id)!.set(dayNum, {
            day: dayNum,
            checkIn: formatTimeHHmm(d.check_in_time),
            checkOut: formatTimeHHmm(d.check_out_time),
            working: d.working_units || 0,
            ot: d.overtime_units || 0,
          });
        }
      }

      const dailySheet = buildAttendanceDailySheet({
        ...sheetContext,
        dailyByEmployee,
        daysInMonth,
      });
      XLSX.utils.book_append_sheet(workbook, dailySheet, "Chi Tiết Ngày");
    }

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const monthStr = String(period_month).padStart(2, "0");
    const filename = `BangCong_${period_year}-${monthStr}_${getVietnamDate()}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.length.toString(),
        ...CACHE_HEADERS.sensitive,
      },
    });
  } catch (error) {
    console.error("Attendance export error:", error);
    return toErrorResponse(error, {
      fallbackMessage: "Có lỗi xảy ra khi xuất file",
      headers: CACHE_HEADERS.sensitive,
    });
  }
}
