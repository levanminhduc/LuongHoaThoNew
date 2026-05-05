import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { csrfProtection } from "@/lib/security-middleware";
import jwt from "jsonwebtoken";
import { type JWTPayload } from "@/lib/auth";
import { getJwtSecret } from "@/lib/config/jwt";
import { sanitizePostgrestValue } from "@/lib/utils/postgrest-sanitize";
import { CACHE_HEADERS } from "@/lib/utils/cache-headers";
import {
  PayrollSearchQuerySchema,
  parseSchema,
  createValidationErrorResponse,
} from "@/lib/validations";

interface EmployeeInfo {
  full_name: string | null;
  department: string | null;
  chuc_vu?: string | null;
}

// Verify admin token
function verifyAdminToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as JWTPayload;
    return decoded.role === "admin" ? decoded : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const admin = verifyAdminToken(request);
    if (!admin) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401, headers: CACHE_HEADERS.sensitive },
      );
    }

    const { searchParams } = new URL(request.url);
    const parsed = parseSchema(
      PayrollSearchQuerySchema,
      Object.fromEntries(searchParams),
    );
    if (!parsed.success) {
      return NextResponse.json(createValidationErrorResponse(parsed.errors), {
        status: 400,
      });
    }
    const {
      q: query,
      salary_month: salaryMonth,
      payroll_type: payrollType,
    } = parsed.data;

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: "Từ khóa tìm kiếm phải có ít nhất 2 ký tự" },
        { status: 400, headers: CACHE_HEADERS.sensitive },
      );
    }

    const supabase = createServiceClient();

    // Test basic database connectivity first
    try {
      const { data: testData, error: testError } = await supabase
        .from("employees")
        .select("employee_id")
        .limit(1);

      if (testError) {
        console.error("Database connectivity failed:", testError?.message);
        return NextResponse.json(
          {
            error: "Không thể kết nối database. Vui lòng kiểm tra cấu hình.",
          },
          { status: 500, headers: CACHE_HEADERS.sensitive },
        );
      }
    } catch (connectError) {
      console.error(
        "Database connection exception:",
        connectError instanceof Error ? connectError.message : connectError,
      );
      return NextResponse.json(
        {
          error: "Lỗi kết nối database nghiêm trọng.",
        },
        { status: 500, headers: CACHE_HEADERS.sensitive },
      );
    }

    // First, check if tables have data using correct Supabase syntax
    const { count: payrollCount, error: payrollCountError } = await supabase
      .from("payrolls")
      .select("*", { count: "exact", head: true });

    const { count: employeeCount, error: employeeCountError } = await supabase
      .from("employees")
      .select("*", { count: "exact", head: true });

    // If count queries fail, try simple existence check
    if (payrollCountError || employeeCountError) {
      const { data: payrollExists, error: payrollExistsError } = await supabase
        .from("payrolls")
        .select("id")
        .limit(1);

      const { data: employeeExists, error: employeeExistsError } =
        await supabase.from("employees").select("employee_id").limit(1);

      // If existence check also fails, there's a fundamental access issue
      if (payrollExistsError || employeeExistsError) {
        return NextResponse.json(
          {
            error:
              "Lỗi truy cập database. Vui lòng kiểm tra cấu hình RLS policies.",
          },
          { status: 500, headers: CACHE_HEADERS.sensitive },
        );
      }

      // Use existence check results
      if (!payrollExists || payrollExists.length === 0) {
        return NextResponse.json(
          {
            success: true,
            results: [],
            total: 0,
            message:
              "Chưa có dữ liệu lương trong hệ thống. Vui lòng import dữ liệu trước.",
          },
          { headers: CACHE_HEADERS.sensitive },
        );
      }

      if (!employeeExists || employeeExists.length === 0) {
        return NextResponse.json(
          {
            success: true,
            results: [],
            total: 0,
            message:
              "Chưa có dữ liệu nhân viên trong hệ thống. Vui lòng import dữ liệu trước.",
          },
          { headers: CACHE_HEADERS.sensitive },
        );
      }
    }

    // If no data exists, return helpful message
    if (!payrollCount || payrollCount === 0) {
      return NextResponse.json(
        {
          success: true,
          results: [],
          total: 0,
          message:
            "Chưa có dữ liệu lương trong hệ thống. Vui lòng import dữ liệu trước.",
        },
        { headers: CACHE_HEADERS.sensitive },
      );
    }

    if (!employeeCount || employeeCount === 0) {
      return NextResponse.json(
        {
          success: true,
          results: [],
          total: 0,
          message:
            "Chưa có dữ liệu nhân viên trong hệ thống. Vui lòng import dữ liệu trước.",
        },
        { headers: CACHE_HEADERS.sensitive },
      );
    }

    let payrollQuery = supabase
      .from("payrolls")
      .select(
        `
        id,
        employee_id,
        salary_month,
        payroll_type,
        tien_luong_thuc_nhan_cuoi_ky,
        source_file,
        created_at,
        employees(
          employee_id,
          full_name,
          department,
          chuc_vu,
          is_active
        )
      `,
      )
      .not("employees.is_active", "is", null)
      .eq("employees.is_active", true)
      .or(`employee_id.ilike.%${sanitizePostgrestValue(query)}%`)
      .order("created_at", { ascending: false });

    if (payrollType === "t13") {
      payrollQuery = payrollQuery.eq("payroll_type", "t13");
    } else {
      payrollQuery = payrollQuery.or(
        "payroll_type.eq.monthly,payroll_type.is.null",
      );
    }

    if (salaryMonth) {
      payrollQuery = payrollQuery.eq("salary_month", salaryMonth);
    }

    const { data: payrollData, error: payrollError } =
      await payrollQuery.limit(20);

    // If main query fails, try alternative approach
    if (payrollError) {
      // Try simple query without join first
      const { data: simpleData, error: simpleError } = await supabase
        .from("payrolls")
        .select(
          "id, employee_id, salary_month, tien_luong_thuc_nhan_cuoi_ky, source_file, created_at",
        )
        .ilike("employee_id", `%${sanitizePostgrestValue(query)}%`)
        .limit(20);

      if (simpleError) {
        console.error("Simple query also failed:", simpleError?.message);
      } else {
        // If simple query works, the issue is with the join
        if (simpleData && simpleData.length > 0) {
          // Get employee data separately
          const employeeIds = simpleData.map((p) => p.employee_id);
          const { data: employeeData } = await supabase
            .from("employees")
            .select("employee_id, full_name, department, chuc_vu, is_active")
            .in("employee_id", employeeIds);

          // Manually join the data with proper typing
          const joinedData = simpleData.map((payroll) => ({
            ...payroll,
            employees:
              employeeData?.find(
                (emp) => emp.employee_id === payroll.employee_id,
              ) || null,
          }));

          // Use the manually joined data with type guards
          const results = joinedData
            .filter(
              (
                record,
              ): record is typeof record & {
                employees: NonNullable<typeof record.employees>;
              } => {
                return (
                  record.employees !== null &&
                  record.employees !== undefined &&
                  typeof record.employees === "object" &&
                  "full_name" in record.employees
                );
              },
            )
            .map((record) => ({
              payroll_id: record.id,
              employee_id: record.employee_id,
              full_name: record.employees.full_name || "N/A",
              department: record.employees.department || "N/A",
              position: record.employees.chuc_vu || "N/A",
              salary_month: record.salary_month,
              net_salary: record.tien_luong_thuc_nhan_cuoi_ky || 0,
              source_file: record.source_file || "N/A",
              created_at: record.created_at,
            }));

          return NextResponse.json(
            {
              success: true,
              results,
              total: results.length,
              note: "Used alternative query method",
            },
            { headers: CACHE_HEADERS.sensitive },
          );
        }
      }
    }

    if (payrollError) {
      console.error("Payroll search error:", payrollError?.message);

      // Provide more specific error messages
      let errorMessage = "Lỗi khi tìm kiếm dữ liệu lương";

      if (payrollError.code === "PGRST116") {
        errorMessage = "Lỗi kết nối database. Vui lòng thử lại sau.";
      } else if (payrollError.code === "42501") {
        errorMessage = "Lỗi quyền truy cập database. Vui lòng liên hệ admin.";
      } else if (
        payrollError.message?.includes("relation") ||
        payrollError.message?.includes("table")
      ) {
        errorMessage = "Lỗi cấu trúc database. Vui lòng liên hệ admin.";
      } else if (payrollError.message?.includes("RLS")) {
        errorMessage = "Lỗi bảo mật database. Vui lòng liên hệ admin.";
      }

      return NextResponse.json(
        {
          error: errorMessage,
        },
        { status: 500, headers: CACHE_HEADERS.sensitive },
      );
    }

    // Transform data for frontend with null safety and proper type guards
    const results =
      payrollData
        ?.filter(
          (
            record,
          ): record is typeof record & {
            employees: NonNullable<typeof record.employees>;
          } => {
            // Filter out records without employee data (due to RLS or missing data)
            return (
              record.employees !== null &&
              record.employees !== undefined &&
              typeof record.employees === "object" &&
              "full_name" in record.employees &&
              record.employees.full_name !== null
            );
          },
        )
        .map((record) => {
          const employee = record.employees as
            | EmployeeInfo
            | EmployeeInfo[]
            | null;
          const employeeData = Array.isArray(employee) ? employee[0] : employee;
          return {
            payroll_id: record.id,
            employee_id: record.employee_id,
            full_name: employeeData?.full_name || "N/A",
            department: employeeData?.department || "N/A",
            position: employeeData?.chuc_vu || "N/A",
            salary_month: record.salary_month,
            net_salary: record.tien_luong_thuc_nhan_cuoi_ky || 0,
            source_file: record.source_file || "N/A",
            created_at: record.created_at,
          };
        }) || [];

    return NextResponse.json(
      { success: true, results, total: results.length },
      { headers: CACHE_HEADERS.sensitive },
    );
  } catch (error) {
    console.error(
      "Employee search error:",
      error instanceof Error ? error.message : error,
    );

    return NextResponse.json(
      {
        error: "Có lỗi xảy ra khi tìm kiếm nhân viên",
      },
      { status: 500, headers: CACHE_HEADERS.sensitive },
    );
  }
}

// GET available salary months
export async function POST(request: NextRequest) {
  try {
    const csrfResult = csrfProtection(request);
    if (csrfResult) return csrfResult;
    // Verify admin authentication
    const admin = verifyAdminToken(request);
    if (!admin) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401, headers: CACHE_HEADERS.sensitive },
      );
    }

    const supabase = createServiceClient();

    // Get distinct salary months
    const { data: monthsData, error: monthsError } = await supabase
      .from("payrolls")
      .select("salary_month")
      .order("salary_month", { ascending: false });

    if (monthsError) {
      console.error("Salary months fetch error:", monthsError?.message);

      let errorMessage = "Lỗi khi lấy danh sách tháng lương";

      if (monthsError.code === "42501") {
        errorMessage = "Lỗi quyền truy cập. Vui lòng đăng nhập lại.";
      } else if (monthsError.code === "PGRST116") {
        errorMessage = "Lỗi kết nối database. Vui lòng thử lại sau.";
      }

      return NextResponse.json(
        {
          error: errorMessage,
        },
        { status: 500, headers: CACHE_HEADERS.sensitive },
      );
    }

    // Get unique months
    const uniqueMonths = [
      ...new Set(monthsData?.map((item) => item.salary_month) || []),
    ];

    return NextResponse.json(
      { success: true, months: uniqueMonths },
      { headers: CACHE_HEADERS.sensitive },
    );
  } catch (error) {
    console.error("Salary months fetch error:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi lấy danh sách tháng lương" },
      { status: 500, headers: CACHE_HEADERS.sensitive },
    );
  }
}
