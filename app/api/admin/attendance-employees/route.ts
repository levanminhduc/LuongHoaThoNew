import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyToken } from "@/lib/auth-middleware";
import {
  parseSchema,
  createValidationErrorResponse,
  AttendanceEmployeesQuerySchema,
} from "@/lib/validations";
import { toErrorResponse } from "@/lib/errors/app-error";
import {
  findAttendancePeriods,
  findMonthlyAttendanceSummaries,
} from "@/lib/attendance/attendance-repository";
import {
  buildAttendanceEmployeesQuery,
  findAttendanceEmployeeDepartments,
} from "@/lib/employee/employee-list-repository";

export async function GET(request: NextRequest) {
  try {
    const auth = verifyToken(request);
    if (!auth || !auth.isRole("admin")) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 },
      );
    }

    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);

    const parsedQuery = parseSchema(AttendanceEmployeesQuerySchema, {
      period_year: searchParams.get("period_year"),
      period_month: searchParams.get("period_month"),
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
    });
    if (!parsedQuery.success) {
      return NextResponse.json(
        createValidationErrorResponse(parsedQuery.errors),
        { status: 400 },
      );
    }
    const {
      period_year: periodYear,
      period_month: periodMonth,
      page,
      limit,
    } = parsedQuery.data;
    const department = searchParams.get("department");
    const search = searchParams.get("search");
    const offset = (page - 1) * limit;

    const { data: periodsData } = await findAttendancePeriods(supabase);

    const uniquePeriods = Array.from(
      new Map(
        (periodsData || []).map((p) => [
          `${p.period_year}-${p.period_month}`,
          { year: p.period_year, month: p.period_month },
        ]),
      ).values(),
    );

    const { data: attendanceData, error: attendanceError } =
      await findMonthlyAttendanceSummaries(supabase, {
        periodYear,
        periodMonth,
      });

    if (attendanceError) {
      console.error("Attendance query error:", attendanceError);
      return NextResponse.json(
        { error: "Lỗi truy vấn dữ liệu chấm công" },
        { status: 500 },
      );
    }

    if (!attendanceData || attendanceData.length === 0) {
      return NextResponse.json({
        success: true,
        employees: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
        periods: uniquePeriods,
        totalEmployees: 0,
      });
    }

    const employeeIds = attendanceData.map((a) => a.employee_id);

    const employeeQuery = buildAttendanceEmployeesQuery(supabase, employeeIds, {
      search,
      department,
      restrictToIds: null,
    });

    const {
      data: employees,
      error: employeesError,
      count,
    } = await employeeQuery
      .order("department")
      .order("full_name")
      .range(offset, offset + limit - 1);

    if (employeesError) {
      console.error("Employees query error:", employeesError);
      return NextResponse.json(
        { error: "Lỗi truy vấn danh sách nhân viên" },
        { status: 500 },
      );
    }

    const attendanceMap = new Map(
      attendanceData.map((a) => [a.employee_id, a]),
    );

    const employeesWithAttendance = (employees || []).map((emp) => {
      const attendance = attendanceMap.get(emp.employee_id);
      return {
        ...emp,
        attendance: attendance
          ? {
              total_hours: attendance.total_hours,
              total_days: attendance.total_days,
              total_meal_ot_hours: attendance.total_meal_ot_hours,
              total_ot_hours: attendance.total_ot_hours,
              sick_days: attendance.sick_days,
              source_file: attendance.source_file,
              created_at: attendance.created_at,
            }
          : null,
      };
    });

    const { data: deptData } = await findAttendanceEmployeeDepartments(
      supabase,
      employeeIds,
    );

    const departments = [
      ...new Set((deptData || []).map((d) => d.department)),
    ].sort();

    return NextResponse.json({
      success: true,
      employees: employeesWithAttendance,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      periods: uniquePeriods,
      departments,
      totalEmployees: attendanceData.length,
      currentPeriod: { year: periodYear, month: periodMonth },
    });
  } catch (error) {
    console.error("Attendance employees error:", error);
    return toErrorResponse(error, {
      fallbackMessage: "Có lỗi xảy ra",
    });
  }
}
