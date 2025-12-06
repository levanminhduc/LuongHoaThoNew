import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyToken } from "@/lib/auth-middleware";
import { parseAttendanceExcel } from "@/lib/attendance-parser";
import type { AttendanceImportError } from "@/types/attendance";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const auth = verifyToken(request);
    if (!auth || !auth.isRole("admin")) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Không có file nào được upload" },
        { status: 400 },
      );
    }

    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "File không đúng định dạng. Chỉ chấp nhận file .xlsx hoặc .xls",
        },
        { status: 400 },
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File quá lớn. Kích thước tối đa là 10MB" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parseResult = parseAttendanceExcel(buffer);

    if (!parseResult.success && parseResult.records.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "File không có dữ liệu hợp lệ",
          errors: parseResult.errors,
        },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();

    const employeeIds = [
      ...new Set(parseResult.records.map((r) => r.employeeId)),
    ];
    const { data: existingEmployees } = await supabase
      .from("employees")
      .select("employee_id")
      .in("employee_id", employeeIds);

    const existingEmployeeIds = new Set(
      existingEmployees?.map((e) => e.employee_id) || [],
    );
    const invalidEmployees = employeeIds.filter(
      (id) => !existingEmployeeIds.has(id),
    );

    const validRecords = parseResult.records.filter((r) =>
      existingEmployeeIds.has(r.employeeId),
    );

    const importBatchId = randomUUID();
    const errors: AttendanceImportError[] = [...parseResult.errors];
    let insertedDaily = 0;
    let insertedMonthly = 0;
    let skippedRecords = 0;

    for (const record of validRecords) {
      try {
        for (const daily of record.dailyRecords) {
          if (
            daily.workingUnits === 0 &&
            daily.overtimeUnits === 0 &&
            !daily.checkIn &&
            !daily.checkOut
          ) {
            continue;
          }

          const workDate = `${record.periodYear}-${String(record.periodMonth).padStart(2, "0")}-${String(daily.day).padStart(2, "0")}`;

          const { error: dailyError } = await supabase
            .from("attendance_daily")
            .upsert(
              {
                employee_id: record.employeeId,
                work_date: workDate,
                period_year: record.periodYear,
                period_month: record.periodMonth,
                check_in_time: daily.checkIn,
                check_out_time: daily.checkOut,
                working_units: daily.workingUnits,
                overtime_units: daily.overtimeUnits,
                source_file: file.name,
                import_batch_id: importBatchId,
              },
              { onConflict: "employee_id,work_date" },
            );

          if (dailyError) {
            errors.push({
              row: 0,
              employeeId: record.employeeId,
              message: `Daily error: ${dailyError.message}`,
            });
          } else {
            insertedDaily++;
          }
        }

        const { error: monthlyError } = await supabase
          .from("attendance_monthly")
          .upsert(
            {
              employee_id: record.employeeId,
              period_year: record.periodYear,
              period_month: record.periodMonth,
              total_hours: record.summary.totalHours,
              total_days: record.summary.totalDays,
              total_meal_ot_hours: record.summary.totalMealOtHours,
              total_ot_hours: record.summary.totalOtHours,
              sick_days: record.summary.sickDays,
              source_file: file.name,
              import_batch_id: importBatchId,
            },
            { onConflict: "employee_id,period_year,period_month" },
          );

        if (monthlyError) {
          errors.push({
            row: 0,
            employeeId: record.employeeId,
            message: `Monthly error: ${monthlyError.message}`,
          });
        } else {
          insertedMonthly++;
        }
      } catch (err) {
        errors.push({
          row: 0,
          employeeId: record.employeeId,
          message: `Error: ${err instanceof Error ? err.message : "Unknown"}`,
        });
        skippedRecords++;
      }
    }

    skippedRecords += invalidEmployees.length;

    return NextResponse.json({
      success: true,
      totalRecords: parseResult.totalRecords,
      insertedDaily,
      insertedMonthly,
      skippedRecords,
      errors,
      invalidEmployees,
      importBatchId,
    });
  } catch (error) {
    console.error("Attendance import error:", error);
    return NextResponse.json(
      {
        error: "Có lỗi xảy ra khi import chấm công",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 },
    );
  }
}
