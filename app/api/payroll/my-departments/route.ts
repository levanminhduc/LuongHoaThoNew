// API endpoint for truong_phong to view payroll data of their assigned departments
import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyToken, getAuditInfo } from "@/lib/auth-middleware";

// GET payroll data for truong_phong's assigned departments
export async function GET(request: NextRequest) {
  try {
    // Verify authentication and role
    const auth = verifyToken(request);
    if (!auth) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 },
      );
    }

    // Only truong_phong can access this endpoint
    if (!auth.isRole("truong_phong")) {
      return NextResponse.json(
        { error: "Chỉ trưởng phòng mới có quyền truy cập" },
        { status: 403 },
      );
    }

    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const month = searchParams.get("month");
    const search = searchParams.get("search");
    const department = searchParams.get("department");
    const payrollType = searchParams.get("payroll_type") || "monthly";

    const offset = (page - 1) * limit;

    const allowedDepartments = auth.user.allowed_departments || [];
    if (allowedDepartments.length === 0) {
      return NextResponse.json(
        {
          error: "Chưa được phân quyền truy cập department nào",
        },
        { status: 403 },
      );
    }

    let query = supabase
      .from("payrolls")
      .select(
        `
        *,
        employees!payrolls_employee_id_fkey!inner(
          employee_id,
          full_name,
          department,
          chuc_vu
        )
      `,
      )
      .in("employees.department", allowedDepartments);

    if (payrollType === "t13") {
      query = query.eq("payroll_type", "t13");
    } else {
      query = query.or("payroll_type.eq.monthly,payroll_type.is.null");
    }

    if (month) {
      query = query.eq("salary_month", month);
    }

    if (search) {
      query = query.or(
        `employee_id.ilike.%${search}%,employees.full_name.ilike.%${search}%`,
      );
    }

    if (department && allowedDepartments.includes(department)) {
      query = query.eq("employees.department", department);
    }

    let countQuery = supabase
      .from("payrolls")
      .select("*", { count: "exact", head: true })
      .in("employees.department", allowedDepartments);

    if (payrollType === "t13") {
      countQuery = countQuery.eq("payroll_type", "t13");
    } else {
      countQuery = countQuery.or(
        "payroll_type.eq.monthly,payroll_type.is.null",
      );
    }

    const { count } = await countQuery;

    // Get paginated data
    const { data: payrolls, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Có lỗi xảy ra khi truy vấn dữ liệu" },
        { status: 500 },
      );
    }

    // Log access for audit trail
    const auditInfo = getAuditInfo(request, auth);
    await supabase.rpc("log_access", {
      p_user_id: auditInfo.user_id,
      p_user_role: auditInfo.user_role,
      p_action: "VIEW",
      p_resource: "payroll",
      p_department: department || "MULTIPLE",
      p_ip_address: auditInfo.ip_address,
      p_user_agent: auditInfo.user_agent,
      p_request_method: auditInfo.request_method,
      p_request_url: auditInfo.request_url,
      p_response_status: 200,
    });

    return NextResponse.json({
      success: true,
      data: payrolls,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      allowed_departments: allowedDepartments,
      payrollType,
    });
  } catch (error) {
    console.error("My departments payroll error:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi lấy dữ liệu lương" },
      { status: 500 },
    );
  }
}

// GET departments statistics for truong_phong
export async function POST(request: NextRequest) {
  try {
    const auth = verifyToken(request);
    if (!auth || !auth.isRole("truong_phong")) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 },
      );
    }

    const { month } = await request.json();
    const supabase = createServiceClient();
    const allowedDepartments = auth.user.allowed_departments || [];

    if (allowedDepartments.length === 0) {
      return NextResponse.json(
        {
          error: "Chưa được phân quyền truy cập department nào",
        },
        { status: 403 },
      );
    }

    // Get statistics for all assigned departments
    const { data: stats, error } = await supabase
      .from("payrolls")
      .select(
        `
        tien_luong_thuc_nhan_cuoi_ky,
        is_signed,
        employees!inner(department)
      `,
      )
      .in("employees.department", allowedDepartments)
      .eq("salary_month", month || new Date().toISOString().slice(0, 7));

    if (error) {
      return NextResponse.json(
        { error: "Lỗi truy vấn dữ liệu" },
        { status: 500 },
      );
    }

    interface EmployeeInfo {
      department?: string;
    }

    // Calculate statistics by department
    const departmentStats = allowedDepartments.map((dept) => {
      const deptData =
        stats?.filter((s) => {
          const employee = s.employees as EmployeeInfo | EmployeeInfo[] | null;
          const employeeData = Array.isArray(employee) ? employee[0] : employee;
          return employeeData?.department === dept;
        }) || [];
      const totalEmployees = deptData.length;
      const signedCount = deptData.filter((s) => s.is_signed).length;
      const totalSalary = deptData.reduce(
        (sum, s) => sum + (s.tien_luong_thuc_nhan_cuoi_ky || 0),
        0,
      );

      return {
        department: dept,
        totalEmployees,
        signedCount,
        signedPercentage:
          totalEmployees > 0
            ? ((signedCount / totalEmployees) * 100).toFixed(1)
            : "0",
        totalSalary,
        averageSalary:
          totalEmployees > 0 ? Math.round(totalSalary / totalEmployees) : 0,
      };
    });

    // Overall statistics
    const totalEmployees = stats?.length || 0;
    const signedCount = stats?.filter((s) => s.is_signed).length || 0;
    const totalSalary =
      stats?.reduce(
        (sum, s) => sum + (s.tien_luong_thuc_nhan_cuoi_ky || 0),
        0,
      ) || 0;

    return NextResponse.json({
      success: true,
      overall: {
        totalEmployees,
        signedCount,
        signedPercentage:
          totalEmployees > 0
            ? ((signedCount / totalEmployees) * 100).toFixed(1)
            : "0",
        totalSalary,
        averageSalary:
          totalEmployees > 0 ? Math.round(totalSalary / totalEmployees) : 0,
      },
      departments: departmentStats,
      allowed_departments: allowedDepartments,
    });
  } catch (error) {
    console.error("Departments statistics error:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi lấy thống kê" },
      { status: 500 },
    );
  }
}
