import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyToken } from "@/lib/auth-middleware";

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

    const periodYear = parseInt(searchParams.get("period_year") || "");
    const periodMonth = parseInt(searchParams.get("period_month") || "");
    const department = searchParams.get("department");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    if (!periodYear || !periodMonth || periodMonth < 1 || periodMonth > 12) {
      return NextResponse.json(
        { error: "Thiếu hoặc sai tham số period_year/period_month" },
        { status: 400 },
      );
    }

    const { data: periodsData } = await supabase
      .from("attendance_monthly")
      .select("period_year, period_month")
      .order("period_year", { ascending: false })
      .order("period_month", { ascending: false });

    const uniquePeriods = Array.from(
      new Map(
        (periodsData || []).map((p) => [
          `${p.period_year}-${p.period_month}`,
          { year: p.period_year, month: p.period_month },
        ]),
      ).values(),
    );

    const { data: attendanceData, error: attendanceError } = await supabase
      .from("attendance_monthly")
      .select(
        "employee_id, total_hours, total_days, total_meal_ot_hours, total_ot_hours, sick_days, source_file, created_at",
      )
      .eq("period_year", periodYear)
      .eq("period_month", periodMonth);

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

    let employeeQuery = supabase
      .from("employees")
      .select("employee_id, full_name, department, chuc_vu, is_active", {
        count: "exact",
      })
      .in("employee_id", employeeIds)
      .eq("is_active", true);

    if (department && department !== "all") {
      employeeQuery = employeeQuery.eq("department", department);
    }

    if (search && search.length >= 2) {
      employeeQuery = employeeQuery.or(
        `employee_id.ilike.%${search}%,full_name.ilike.%${search}%`,
      );
    }

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

    const { data: deptData } = await supabase
      .from("employees")
      .select("department")
      .in("employee_id", employeeIds)
      .eq("is_active", true);

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
    return NextResponse.json(
      {
        error: "Có lỗi xảy ra",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 },
    );
  }
}
