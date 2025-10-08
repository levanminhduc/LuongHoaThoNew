// DEBUG API: Kiểm tra departments trong database
import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyToken } from "@/lib/auth-middleware";

export async function GET(request: NextRequest) {
  try {
    // Verify authentication (admin only for debug)
    const auth = verifyToken(request);
    if (!auth || !auth.isRole("admin")) {
      return NextResponse.json(
        { error: "Chỉ admin mới có quyền debug" },
        { status: 403 },
      );
    }

    const supabase = createServiceClient();

    // 1. Get ALL departments (including inactive employees)
    const { data: allDepartments, error: allDeptError } = await supabase
      .from("employees")
      .select("department, is_active")
      .order("department");

    if (allDeptError) {
      console.error("All departments query error:", allDeptError);
      return NextResponse.json(
        { error: "Lỗi truy vấn all departments" },
        { status: 500 },
      );
    }

    // 2. Get departments with ACTIVE employees only (current API logic)
    const { data: activeDepartments, error: activeDeptError } = await supabase
      .from("employees")
      .select("department")
      .eq("is_active", true)
      .order("department");

    if (activeDeptError) {
      console.error("Active departments query error:", activeDeptError);
      return NextResponse.json(
        { error: "Lỗi truy vấn active departments" },
        { status: 500 },
      );
    }

    // 3. Get employees with null/empty departments
    const { data: nullDepartments, error: nullDeptError } = await supabase
      .from("employees")
      .select("employee_id, full_name, department, is_active")
      .or("department.is.null,department.eq.");

    if (nullDeptError) {
      console.error("Null departments query error:", nullDeptError);
    }

    // 4. Get department statistics
    const { data: deptStats, error: statsError } = await supabase
      .from("employees")
      .select("department, is_active, chuc_vu")
      .not("department", "is", null)
      .neq("department", "");

    if (statsError) {
      console.error("Department stats query error:", statsError);
    }

    // 5. Get department permissions
    // Updated query syntax: Use exact constraint name to resolve ambiguous relationships
    const { data: permissions, error: permError } = await supabase.from(
      "department_permissions",
    ).select(`
        department,
        employee_id,
        is_active,
        employees!fk_dept_perm_employee(
          full_name,
          chuc_vu
        )
      `);

    if (permError) {
      console.error("Permissions query error:", permError);
    }

    // Process data
    const allDeptList =
      allDepartments?.map((d) => d.department).filter(Boolean) || [];
    const activeDeptList =
      activeDepartments?.map((d) => d.department).filter(Boolean) || [];
    const uniqueAllDepts = [...new Set(allDeptList)];
    const uniqueActiveDepts = [...new Set(activeDeptList)];

    // Department statistics
    const deptStatsMap =
      deptStats?.reduce(
        (acc, emp) => {
          const dept = emp.department;
          if (!acc[dept]) {
            acc[dept] = {
              total: 0,
              active: 0,
              inactive: 0,
              managers: 0,
              supervisors: 0,
              employees: 0,
            };
          }

          acc[dept].total++;
          if (emp.is_active) {
            acc[dept].active++;
          } else {
            acc[dept].inactive++;
          }

          if (emp.chuc_vu === "truong_phong") acc[dept].managers++;
          else if (emp.chuc_vu === "to_truong") acc[dept].supervisors++;
          else acc[dept].employees++;

          return acc;
        },
        {} as Record<
          string,
          { managers: number; supervisors: number; employees: number }
        >,
      ) || {};

    interface EmployeeInfo {
      full_name?: string;
      chuc_vu?: string;
    }

    interface PermissionStats {
      total: number;
      active: number;
      employees: Array<{
        employee_id: string;
        full_name?: string;
        chuc_vu?: string;
      }>;
    }

    // Permission statistics
    const permStatsMap =
      permissions?.reduce(
        (acc, perm) => {
          const dept = perm.department;
          if (!acc[dept]) {
            acc[dept] = {
              total: 0,
              active: 0,
              employees: [],
            };
          }

          acc[dept].total++;
          if (perm.is_active) {
            acc[dept].active++;
            const employeeInfo = perm.employees as
              | EmployeeInfo
              | EmployeeInfo[]
              | null;
            const employee = Array.isArray(employeeInfo)
              ? employeeInfo[0]
              : employeeInfo;
            acc[dept].employees.push({
              employee_id: perm.employee_id,
              full_name: employee?.full_name,
              chuc_vu: employee?.chuc_vu,
            });
          }

          return acc;
        },
        {} as Record<string, PermissionStats>,
      ) || {};

    // Find missing departments
    const missingFromActive = uniqueAllDepts.filter(
      (dept) => !uniqueActiveDepts.includes(dept),
    );
    const onlyInActive = uniqueActiveDepts.filter(
      (dept) => !uniqueAllDepts.includes(dept),
    );

    return NextResponse.json({
      success: true,
      debug_info: {
        query_results: {
          all_departments_count: allDeptList.length,
          active_departments_count: activeDeptList.length,
          unique_all_departments: uniqueAllDepts.length,
          unique_active_departments: uniqueActiveDepts.length,
          null_empty_departments: nullDepartments?.length || 0,
        },
        departments: {
          all_unique: uniqueAllDepts,
          active_unique: uniqueActiveDepts,
          missing_from_active: missingFromActive,
          only_in_active: onlyInActive,
        },
        employees_with_null_departments: nullDepartments || [],
        department_statistics: deptStatsMap,
        permission_statistics: permStatsMap,
        analysis: {
          departments_with_only_inactive_employees: missingFromActive,
          departments_without_permissions: uniqueActiveDepts.filter(
            (dept) => !permStatsMap[dept],
          ),
          departments_with_permissions_but_no_employees: Object.keys(
            permStatsMap,
          ).filter((dept) => !uniqueActiveDepts.includes(dept)),
        },
      },
    });
  } catch (error) {
    console.error("Debug departments error:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra trong debug" },
      { status: 500 },
    );
  }
}
