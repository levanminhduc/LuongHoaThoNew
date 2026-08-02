// API endpoint for truong_phong to view payroll data of their assigned departments
import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyToken, getAuditInfo } from "@/lib/auth-middleware";
import { csrfProtection } from "@/lib/security-middleware";
import { CACHE_HEADERS } from "@/lib/utils/cache-headers";
import {
  buildAllowedDepartmentsPayrollCountQuery,
  buildAllowedDepartmentsPayrollListQuery,
  findAllowedDepartmentsPayrollStats,
} from "@/lib/payroll/payroll-department-repository";
import {
  parseSchema,
  createValidationErrorResponse,
  pageQuerySchema,
  DepartmentStatsRequestSchema,
} from "@/lib/validations";
import { getVietnamMonth, getVietnamYear } from "@/lib/utils/vietnam-timezone";
import { toErrorResponse } from "@/lib/errors/app-error";

const MyDepartmentsQuerySchema = pageQuerySchema(20);

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

    const parsedQuery = parseSchema(MyDepartmentsQuerySchema, {
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
    });
    if (!parsedQuery.success) {
      return NextResponse.json(
        createValidationErrorResponse(parsedQuery.errors),
        { status: 400, headers: CACHE_HEADERS.sensitive },
      );
    }
    const { page, limit } = parsedQuery.data;
    const month = searchParams.get("month");
    const search = searchParams.get("search");
    const department = searchParams.get("department");
    const payrollType = searchParams.get("payroll_type") || "monthly";
    const year = searchParams.get("year") || String(getVietnamYear());

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

    // Determine salary_month based on payroll type
    // T13: salary_month = 'YYYY-13' (e.g., '2025-13')
    // Monthly: salary_month = 'YYYY-MM' (e.g., '2025-01')
    const salaryMonthFilter = payrollType === "t13" ? `${year}-13` : month;

    const listFilters = { salaryMonth: salaryMonthFilter, search };
    const selectedDepartment =
      department && allowedDepartments.includes(department) ? department : null;

    const { count } = await buildAllowedDepartmentsPayrollCountQuery(
      supabase,
      allowedDepartments,
      selectedDepartment,
      listFilters,
    );

    const { data: payrolls, error } =
      await buildAllowedDepartmentsPayrollListQuery(
        supabase,
        allowedDepartments,
        selectedDepartment,
        listFilters,
        offset,
        limit,
      );

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

    return NextResponse.json(
      {
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
      },
      { headers: CACHE_HEADERS.sensitive },
    );
  } catch (error) {
    console.error("My departments payroll error:", error);
    return toErrorResponse(error, {
      fallbackMessage: "Có lỗi xảy ra khi lấy dữ liệu lương",
      headers: CACHE_HEADERS.sensitive,
    });
  }
}

// GET departments statistics for truong_phong
export async function POST(request: NextRequest) {
  try {
    const csrfResult = csrfProtection(request);
    if (csrfResult) return csrfResult;

    const auth = verifyToken(request);
    if (!auth || !auth.isRole("truong_phong")) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 },
      );
    }

    const parsedBody = parseSchema(
      DepartmentStatsRequestSchema,
      await request.json(),
    );
    if (!parsedBody.success) {
      return NextResponse.json(
        createValidationErrorResponse(parsedBody.errors),
        { status: 400, headers: CACHE_HEADERS.sensitive },
      );
    }
    const { month } = parsedBody.data;
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
    const { data: stats, error } = await findAllowedDepartmentsPayrollStats(
      supabase,
      allowedDepartments,
      month || getVietnamMonth(),
    );

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

    return NextResponse.json(
      {
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
      },
      { headers: CACHE_HEADERS.sensitive },
    );
  } catch (error) {
    console.error("Departments statistics error:", error);
    return toErrorResponse(error, {
      fallbackMessage: "Có lỗi xảy ra khi lấy thống kê",
      headers: CACHE_HEADERS.sensitive,
    });
  }
}
