// Debug API endpoint to check all positions/roles in database
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

    // 1. Get all distinct positions with counts
    const { data: positions, error: positionsError } = await supabase
      .from("employees")
      .select("chuc_vu")
      .eq("is_active", true);

    if (positionsError) {
      console.error("Positions query error:", positionsError);
      return NextResponse.json(
        { error: "Lỗi truy vấn positions" },
        { status: 500 },
      );
    }

    // Count positions
    const positionCounts =
      positions?.reduce((acc: any, emp: any) => {
        acc[emp.chuc_vu] = (acc[emp.chuc_vu] || 0) + 1;
        return acc;
      }, {}) || {};

    // 2. Get sample employees for each position
    const { data: sampleEmployees, error: sampleError } = await supabase
      .from("employees")
      .select("employee_id, full_name, chuc_vu, department")
      .eq("is_active", true)
      .order("chuc_vu")
      .limit(50);

    if (sampleError) {
      console.error("Sample employees query error:", sampleError);
    }

    // Group sample employees by position
    const employeesByPosition =
      sampleEmployees?.reduce((acc: any, emp: any) => {
        if (!acc[emp.chuc_vu]) acc[emp.chuc_vu] = [];
        if (acc[emp.chuc_vu].length < 5) {
          // Limit to 5 samples per position
          acc[emp.chuc_vu].push({
            employee_id: emp.employee_id,
            full_name: emp.full_name,
            department: emp.department,
          });
        }
        return acc;
      }, {}) || {};

    // 3. Get department permissions info
    // Updated query syntax: Use exact constraint name to resolve ambiguous relationships
    const { data: permissions, error: permError } = await supabase
      .from("department_permissions")
      .select(
        `
        employee_id,
        department,
        employees!fk_dept_perm_employee(
          chuc_vu,
          full_name
        )
      `,
      )
      .eq("is_active", true);

    if (permError) {
      console.error("Permissions query error:", permError);
    }

    // Count permissions by position
    const permissionsByPosition =
      permissions?.reduce((acc: any, perm: any) => {
        const position = perm.employees?.chuc_vu;
        if (position) {
          acc[position] = (acc[position] || 0) + 1;
        }
        return acc;
      }, {}) || {};

    // 4. Analyze role-based access patterns
    const roleAnalysis = Object.keys(positionCounts).map((position) => {
      const count = positionCounts[position];
      const permissionCount = permissionsByPosition[position] || 0;
      const samples = employeesByPosition[position] || [];

      let expectedAccess = "";
      let canReceivePermissions = false;

      switch (position) {
        case "admin":
          expectedAccess = "Full admin access to all systems";
          canReceivePermissions = false;
          break;
        case "giam_doc":
          expectedAccess =
            "Director dashboard + all departments + financial reports";
          canReceivePermissions = true;
          break;
        case "ke_toan":
          expectedAccess =
            "Accountant dashboard + payroll management + financial data";
          canReceivePermissions = true;
          break;
        case "nguoi_lap_bieu":
          expectedAccess = "Reporter dashboard + data entry + report creation";
          canReceivePermissions = true;
          break;
        case "truong_phong":
          expectedAccess = "Manager dashboard + assigned departments";
          canReceivePermissions = true;
          break;
        case "to_truong":
          expectedAccess = "Supervisor dashboard + own department";
          canReceivePermissions = true;
          break;
        case "nhan_vien":
          expectedAccess = "Employee dashboard + own payroll only";
          canReceivePermissions = false;
          break;
        default:
          expectedAccess = "Unknown role - needs investigation";
          canReceivePermissions = false;
      }

      return {
        position,
        count,
        permissionCount,
        expectedAccess,
        canReceivePermissions,
        samples,
      };
    });

    return NextResponse.json({
      success: true,
      summary: {
        totalActiveEmployees: positions?.length || 0,
        distinctPositions: Object.keys(positionCounts).length,
        totalPermissions: permissions?.length || 0,
      },
      positionCounts,
      roleAnalysis,
      permissionsByPosition,
      debug: {
        timestamp: new Date().toISOString(),
        query:
          "SELECT DISTINCT chuc_vu, COUNT(*) FROM employees WHERE is_active = true GROUP BY chuc_vu",
      },
    });
  } catch (error) {
    console.error("Debug positions error:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi debug positions" },
      { status: 500 },
    );
  }
}
