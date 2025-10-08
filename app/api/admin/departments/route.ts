// API endpoint for managing departments and getting department information
import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyToken } from "@/lib/auth-middleware";

// GET all departments with statistics
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const auth = verifyToken(request);
    if (!auth) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 },
      );
    }

    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get("include_stats") === "true";
    const month =
      searchParams.get("month") || new Date().toISOString().slice(0, 7);

    // Get ALL departments (including those with only inactive employees)
    const { data: allDepartments, error: allDeptError } = await supabase
      .from("employees")
      .select("department")
      .not("department", "is", null)
      .neq("department", "");

    if (allDeptError) {
      console.error("All departments query error:", allDeptError);
      return NextResponse.json(
        { error: "Lỗi truy vấn all departments" },
        { status: 500 },
      );
    }

    // Get departments with ACTIVE employees only
    const { data: activeDepartments, error: activeDeptError } = await supabase
      .from("employees")
      .select("department")
      .eq("is_active", true)
      .not("department", "is", null)
      .neq("department", "");

    if (activeDeptError) {
      console.error("Active departments query error:", activeDeptError);
      return NextResponse.json(
        { error: "Lỗi truy vấn active departments" },
        { status: 500 },
      );
    }

    // Get unique departments
    const allUniqueDepartments = [
      ...new Set(allDepartments?.map((d) => d.department) || []),
    ];
    const activeUniqueDepartments = [
      ...new Set(activeDepartments?.map((d) => d.department) || []),
    ];

    console.log(
      "🔍 All unique departments found:",
      allUniqueDepartments.length,
    );
    console.log(
      "🔍 Active unique departments found:",
      activeUniqueDepartments.length,
    );

    // Use active departments for display (departments with at least 1 active employee)
    const uniqueDepartments = activeUniqueDepartments;

    if (!includeStats) {
      return NextResponse.json({
        success: true,
        departments: uniqueDepartments.map((dept) => ({ name: dept })),
      });
    }

    console.log(
      "🔍 Unique departments found:",
      uniqueDepartments.length,
      uniqueDepartments,
    );

    // Get statistics for each department
    const departmentStats = await Promise.all(
      uniqueDepartments.map(async (dept) => {
        try {
          // Get employee count (ALL employees, not just active)
          const { count: employeeCount, error: empCountError } = await supabase
            .from("employees")
            .select("*", { count: "exact", head: true })
            .eq("department", dept);

          if (empCountError) {
            console.error(`Employee count error for ${dept}:`, empCountError);
            return null;
          }

          // Get payroll statistics for the month
          const { data: payrollData, error: payrollError } = await supabase
            .from("payrolls")
            .select(
              `
              tien_luong_thuc_nhan_cuoi_ky,
              is_signed,
              employees!inner(department)
            `,
            )
            .eq("employees.department", dept)
            .eq("salary_month", month);

          if (payrollError) {
            console.error(`Payroll query error for ${dept}:`, payrollError);
          }

          const payrollCount = payrollData?.length || 0;
          const signedCount =
            payrollData?.filter((p) => p.is_signed).length || 0;
          const totalSalary =
            payrollData?.reduce(
              (sum, p) => sum + (p.tien_luong_thuc_nhan_cuoi_ky || 0),
              0,
            ) || 0;

          // Get truong_phong for this department
          const { data: managers } = await supabase
            .from("employees")
            .select("employee_id, full_name")
            .eq("department", dept)
            .eq("chuc_vu", "truong_phong")
            .eq("is_active", true);

          // Get to_truong for this department
          const { data: supervisors } = await supabase
            .from("employees")
            .select("employee_id, full_name")
            .eq("department", dept)
            .eq("chuc_vu", "to_truong")
            .eq("is_active", true);

          return {
            name: dept,
            employeeCount: employeeCount || 0,
            payrollCount,
            signedCount,
            signedPercentage:
              payrollCount > 0
                ? ((signedCount / payrollCount) * 100).toFixed(1)
                : "0",
            totalSalary,
            averageSalary:
              payrollCount > 0 ? Math.round(totalSalary / payrollCount) : 0,
            managers: managers || [],
            supervisors: supervisors || [],
          };
        } catch (error) {
          console.error(`Error processing department ${dept}:`, error);
          return null;
        }
      }),
    );

    // Filter out null results and log
    const validDepartmentStats = departmentStats.filter(Boolean);
    console.log(
      "🔍 Valid department stats:",
      validDepartmentStats.length,
      "out of",
      uniqueDepartments.length,
    );

    // Filter departments based on user role
    let filteredStats = validDepartmentStats;
    if (
      ["giam_doc", "ke_toan", "nguoi_lap_bieu", "truong_phong"].includes(
        auth.user.role,
      )
    ) {
      const allowedDepts = auth.user.allowed_departments || [];
      filteredStats = validDepartmentStats.filter(
        (dept) => dept && allowedDepts.includes(dept.name),
      );
    } else if (auth.user.role === "to_truong") {
      filteredStats = validDepartmentStats.filter(
        (dept) => dept && dept.name === auth.user.department,
      );
    }

    console.log("🔍 Final filtered stats:", filteredStats.length);

    // Sắp xếp departments theo chữ cái A-Z
    filteredStats.sort((a, b) => {
      if (!a || !b) return 0;
      return a.name.localeCompare(b.name, "vi", { sensitivity: "base" });
    });

    // Calculate total employees across ALL employees (including inactive)
    const { count: totalAllEmployees, error: totalEmpError } = await supabase
      .from("employees")
      .select("*", { count: "exact", head: true });

    if (totalEmpError) {
      console.error("Total employees count error:", totalEmpError);
    }

    console.log(
      "🔍 Sample department stats:",
      filteredStats
        .slice(0, 3)
        .map((d) =>
          d ? { name: d.name, employeeCount: d.employeeCount } : null,
        )
        .filter(Boolean),
    );
    console.log(
      "🔍 Total ALL employees (including inactive):",
      totalAllEmployees,
    );
    console.log("🔍 Active departments count:", activeUniqueDepartments.length);
    console.log("🔍 All departments count:", allUniqueDepartments.length);

    return NextResponse.json({
      success: true,
      departments: filteredStats,
      summary: {
        totalDepartments: activeUniqueDepartments.length, // Active departments (có ít nhất 1 employee active)
        totalEmployees: totalAllEmployees || 0, // TẤT CẢ employees (bao gồm cả inactive)
        allDepartments: allUniqueDepartments.length, // All departments (bao gồm cả departments chỉ có inactive employees)
        activeDepartments: activeUniqueDepartments.length, // Active departments
      },
      month,
      total_departments: activeUniqueDepartments.length,
    });
  } catch (error) {
    console.error("Get departments error:", error);
    return NextResponse.json({ error: "Có lỗi xảy ra" }, { status: 500 });
  }
}

// POST create new department (admin only)
export async function POST(request: NextRequest) {
  try {
    // Only admin can create departments
    const auth = verifyToken(request);
    if (!auth || !auth.isRole("admin")) {
      return NextResponse.json(
        { error: "Chỉ admin mới có quyền tạo department" },
        { status: 403 },
      );
    }

    const { name, description } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "Tên department không được để trống" },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();

    // Check if department already exists
    const { data: existingDept } = await supabase
      .from("employees")
      .select("department")
      .eq("department", name)
      .limit(1);

    if (existingDept && existingDept.length > 0) {
      return NextResponse.json(
        {
          error: "Department này đã tồn tại",
        },
        { status: 400 },
      );
    }

    // Note: We don't actually create a separate departments table
    // Departments are managed through the employees table
    // This endpoint is mainly for validation and future extensibility

    return NextResponse.json(
      {
        success: true,
        message:
          "Department sẽ được tạo khi có nhân viên đầu tiên được thêm vào",
        department: { name, description },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create department error:", error);
    return NextResponse.json({ error: "Có lỗi xảy ra" }, { status: 500 });
  }
}

// GET department permissions summary (admin only)
export async function PUT(request: NextRequest) {
  try {
    // Only admin can view permission summary
    const auth = verifyToken(request);
    if (!auth || !auth.isRole("admin")) {
      return NextResponse.json(
        { error: "Chỉ admin mới có quyền xem tổng kết phân quyền" },
        { status: 403 },
      );
    }

    const supabase = createServiceClient();

    // Get all department permissions with employee info
    // Updated query syntax: Use exact constraint name to resolve ambiguous relationships
    const { data: permissions, error } = await supabase
      .from("department_permissions")
      .select(
        `
        *,
        employees!fk_dept_perm_employee(
          employee_id,
          full_name,
          department,
          chuc_vu
        )
      `,
      )
      .eq("is_active", true)
      .order("department");

    if (error) {
      console.error("Permissions query error:", error);
      return NextResponse.json(
        { error: "Lỗi truy vấn phân quyền" },
        { status: 500 },
      );
    }

    // Group permissions by department
    const permissionsByDept =
      permissions?.reduce(
        (acc, perm) => {
          const dept = perm.department;
          if (!acc[dept]) {
            acc[dept] = [];
          }
          acc[dept].push({
            employee_id: perm.employee_id,
            full_name: perm.employees?.full_name,
            granted_at: perm.granted_at,
            notes: perm.notes,
          });
          return acc;
        },
        {} as Record<
          string,
          Array<{
            employee_id: string;
            full_name: string | undefined;
            granted_at: string;
            notes: string | null;
          }>
        >,
      ) || {};

    const permissionsByEmployee =
      permissions?.reduce(
        (acc, perm) => {
          const empId = perm.employee_id;
          if (!acc[empId]) {
            acc[empId] = {
              employee_id: empId,
              full_name: perm.employees?.full_name,
              departments: [],
            };
          }
          acc[empId].departments.push({
            department: perm.department,
            granted_at: perm.granted_at,
            notes: perm.notes,
          });
          return acc;
        },
        {} as Record<
          string,
          {
            employee_id: string;
            full_name: string | undefined;
            departments: Array<{
              department: string;
              granted_at: string;
              notes: string | null;
            }>;
          }
        >,
      ) || {};

    return NextResponse.json({
      success: true,
      summary: {
        total_permissions: permissions?.length || 0,
        departments_with_permissions: Object.keys(permissionsByDept).length,
        employees_with_permissions: Object.keys(permissionsByEmployee).length,
      },
      by_department: permissionsByDept,
      by_employee: Object.values(permissionsByEmployee),
    });
  } catch (error) {
    console.error("Department permissions summary error:", error);
    return NextResponse.json({ error: "Có lỗi xảy ra" }, { status: 500 });
  }
}
