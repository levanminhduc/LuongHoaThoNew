// API để đếm tổng số departments trong database
import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyToken } from "@/lib/auth-middleware";

export async function GET(request: NextRequest) {
  try {
    // Verify authentication (admin only)
    const auth = verifyToken(request);
    if (!auth || !auth.isRole("admin")) {
      return NextResponse.json(
        { error: "Chỉ admin mới có quyền truy cập" },
        { status: 403 },
      );
    }

    const supabase = createServiceClient();

    // 1. Count ALL departments (including inactive employees)
    const { data: allDepartments, error: allError } = await supabase
      .from("employees")
      .select("department")
      .not("department", "is", null)
      .neq("department", "");

    if (allError) {
      console.error("All departments error:", allError);
      return NextResponse.json(
        { error: "Lỗi truy vấn all departments" },
        { status: 500 },
      );
    }

    // 2. Count departments with ACTIVE employees only
    const { data: activeDepartments, error: activeError } = await supabase
      .from("employees")
      .select("department")
      .eq("is_active", true)
      .not("department", "is", null)
      .neq("department", "");

    if (activeError) {
      console.error("Active departments error:", activeError);
      return NextResponse.json(
        { error: "Lỗi truy vấn active departments" },
        { status: 500 },
      );
    }

    // 3. Get unique departments
    const allUnique = [
      ...new Set(allDepartments?.map((d) => d.department) || []),
    ];
    const activeUnique = [
      ...new Set(activeDepartments?.map((d) => d.department) || []),
    ];

    // 4. Count total employees
    const { count: totalEmployees, error: empError } = await supabase
      .from("employees")
      .select("*", { count: "exact", head: true });

    if (empError) {
      console.error("Employee count error:", empError);
    }

    // 5. Count active employees
    const { count: activeEmployees, error: activeEmpError } = await supabase
      .from("employees")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    if (activeEmpError) {
      console.error("Active employee count error:", activeEmpError);
    }

    // 6. Get department breakdown
    const departmentBreakdown = allUnique.map((dept) => {
      const totalInDept =
        allDepartments?.filter((d) => d.department === dept).length || 0;
      const activeInDept =
        activeDepartments?.filter((d) => d.department === dept).length || 0;

      return {
        department: dept,
        total_employees: totalInDept,
        active_employees: activeInDept,
        inactive_employees: totalInDept - activeInDept,
        is_visible_in_current_api: activeInDept > 0,
      };
    });

    return NextResponse.json({
      success: true,
      summary: {
        total_employees: totalEmployees || 0,
        active_employees: activeEmployees || 0,
        inactive_employees: (totalEmployees || 0) - (activeEmployees || 0),
        total_departments_all: allUnique.length,
        total_departments_active_only: activeUnique.length,
        departments_with_only_inactive_employees:
          allUnique.length - activeUnique.length,
      },
      departments: {
        all_unique: allUnique,
        active_unique: activeUnique,
        missing_from_active: allUnique.filter(
          (dept) => !activeUnique.includes(dept),
        ),
      },
      department_breakdown: departmentBreakdown.sort(
        (a, b) => b.total_employees - a.total_employees,
      ),
      analysis: {
        is_55_limit_issue: allUnique.length > 55,
        actual_department_count: allUnique.length,
        visible_in_current_api: activeUnique.length,
        hidden_departments: allUnique.length - activeUnique.length,
      },
    });
  } catch (error) {
    console.error("Count departments error:", error);
    return NextResponse.json({ error: "Có lỗi xảy ra" }, { status: 500 });
  }
}
