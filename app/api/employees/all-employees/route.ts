// API endpoint for giam_doc, ke_toan, nguoi_lap_bieu to view all employees
import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyToken } from "@/lib/auth-middleware";
import { getVietnamTimestamp } from "@/lib/utils/vietnam-timezone";
import {
  parseSchema,
  createValidationErrorResponse,
  pageQuerySchema,
} from "@/lib/validations";
import { toErrorResponse } from "@/lib/errors/app-error";
import {
  findPayrollSignedFlagsForMonth,
  findPayrollSummaryForEmployees,
} from "@/lib/payroll/payroll-admin-repository";
import {
  buildAllEmployeesCountQuery,
  buildAllEmployeesDepartmentStatsQuery,
  buildAllEmployeesListQuery,
} from "@/lib/employee/employee-list-repository";

const AllEmployeesQuerySchema = pageQuerySchema(50);

// GET all employees for management roles with caching
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

    // Only allow giam_doc, ke_toan, nguoi_lap_bieu to access
    if (!["giam_doc", "ke_toan", "nguoi_lap_bieu"].includes(auth.user.role)) {
      return NextResponse.json(
        {
          error:
            "Chỉ Giám Đốc, Kế Toán và Người Lập Biểu mới có quyền xem toàn bộ danh sách nhân viên",
        },
        { status: 403 },
      );
    }

    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);

    // Query parameters
    const parsedQuery = parseSchema(AllEmployeesQuerySchema, {
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
    });
    if (!parsedQuery.success) {
      return NextResponse.json(
        createValidationErrorResponse(parsedQuery.errors),
        { status: 400 },
      );
    }
    const { page, limit } = parsedQuery.data;
    const search = searchParams.get("search");
    const department = searchParams.get("department");
    const month = searchParams.get("month");
    const includeInactive = searchParams.get("include_inactive") === "true";
    const includePayrollData = searchParams.get("include_payroll") === "true";
    const unsignedOnly = searchParams.get("unsigned_only") === "true";

    const offset = (page - 1) * limit;

    let unsignedEmployeeIds: string[] = [];
    if (unsignedOnly && month) {
      const { data: payrollsData } = await findPayrollSignedFlagsForMonth(
        supabase,
        month,
      );

      unsignedEmployeeIds =
        payrollsData?.filter((p) => !p.is_signed).map((p) => p.employee_id) ||
        [];
    }

    const listFilters = {
      search,
      department,
      restrictToIds:
        unsignedOnly && unsignedEmployeeIds.length > 0
          ? unsignedEmployeeIds
          : null,
    };

    const employeeQuery = buildAllEmployeesListQuery(
      supabase,
      listFilters,
      includeInactive,
    );

    if (unsignedOnly && unsignedEmployeeIds.length === 0) {
      return NextResponse.json({
        success: true,
        employees: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
        departments: [],
        departmentCounts: {},
        filters: {
          search,
          department,
          month,
          includeInactive,
          includePayrollData,
          unsignedOnly,
        },
        metadata: {
          role: auth.user.role,
          timestamp: getVietnamTimestamp(),
          cached_until: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        },
      });
    }

    const countQuery = buildAllEmployeesCountQuery(
      supabase,
      listFilters,
      includeInactive,
    );

    const { count: totalCount } = await countQuery;

    const { data: employees, error: employeeError } = await employeeQuery.range(
      offset,
      offset + limit - 1,
    );

    if (employeeError) {
      console.error("Error fetching employees:", employeeError);
      return NextResponse.json(
        { error: "Lỗi truy vấn dữ liệu nhân viên" },
        { status: 500 },
      );
    }

    let employeesWithPayroll = employees || [];

    if (includePayrollData && month && employees?.length) {
      const employeeIds = employees.map((emp) => emp.employee_id);

      const { data: payrollData, error: payrollError } =
        await findPayrollSummaryForEmployees(supabase, month, employeeIds);

      if (!payrollError && payrollData) {
        employeesWithPayroll = employees.map((emp) => {
          const payroll = payrollData.find(
            (p) => p.employee_id === emp.employee_id,
          );
          return {
            ...emp,
            payroll_data: payroll || null,
            has_payroll: !!payroll,
            salary_amount: payroll?.tien_luong_thuc_nhan_cuoi_ky || 0,
            is_signed: payroll?.import_status === "signed",
          };
        });
      }
    }

    const deptStatsQuery = buildAllEmployeesDepartmentStatsQuery(
      supabase,
      listFilters,
      includeInactive,
    );

    const { data: deptStats } = await deptStatsQuery;

    const departmentCounts =
      deptStats?.reduce(
        (acc, emp) => {
          acc[emp.department] = (acc[emp.department] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ) || {};

    const departments = Object.keys(departmentCounts).sort();

    // Prepare response with caching headers
    const response = NextResponse.json({
      success: true,
      employees: employeesWithPayroll,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit),
        hasNext: offset + limit < (totalCount || 0),
        hasPrev: page > 1,
      },
      departments,
      departmentCounts,
      filters: {
        search,
        department,
        month,
        includeInactive,
        includePayrollData,
        unsignedOnly,
      },
      metadata: {
        role: auth.user.role,
        timestamp: getVietnamTimestamp(),
        cached_until: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 60 minutes
      },
    });

    // Set caching headers for 60 minutes
    response.headers.set(
      "Cache-Control",
      "public, max-age=3600, stale-while-revalidate=1800",
    );
    response.headers.set("ETag", `"employees-${auth.user.role}-${Date.now()}"`);

    return response;
  } catch (error) {
    console.error("All employees API error:", error);
    return toErrorResponse(error, {
      fallbackMessage: "Có lỗi xảy ra khi lấy danh sách nhân viên",
    });
  }
}
