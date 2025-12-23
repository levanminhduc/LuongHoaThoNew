// API endpoint for to_truong to view payroll data of their department
import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyToken, getAuditInfo } from "@/lib/auth-middleware";

// GET payroll data for to_truong's department
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

    // Only to_truong can access this endpoint
    if (!auth.isRole("to_truong")) {
      return NextResponse.json(
        { error: "Chỉ tổ trưởng mới có quyền truy cập" },
        { status: 403 },
      );
    }

    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const month = searchParams.get("month");
    const search = searchParams.get("search");
    const payrollType = searchParams.get("payroll_type") || "monthly";
    const year =
      searchParams.get("year") || new Date().getFullYear().toString();

    const offset = (page - 1) * limit;

    // Determine salary_month based on payroll type
    // T13: salary_month = 'YYYY-13' (e.g., '2025-13')
    // Monthly: salary_month = 'YYYY-MM' (e.g., '2025-01')
    const salaryMonthFilter = payrollType === "t13" ? `${year}-13` : month;

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
      .eq("employees.department", auth.user.department);

    // Apply salary_month filter
    if (salaryMonthFilter) {
      query = query.eq("salary_month", salaryMonthFilter);
    }

    if (search) {
      query = query.or(
        `employee_id.ilike.%${search}%,employees.full_name.ilike.%${search}%`,
      );
    }

    // Count query with same salary_month filter
    let countQuery = supabase
      .from("payrolls")
      .select("*", { count: "exact", head: true })
      .eq("employees.department", auth.user.department);

    if (salaryMonthFilter) {
      countQuery = countQuery.eq("salary_month", salaryMonthFilter);
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
      p_department: auth.user.department,
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
      department: auth.user.department,
      payrollType,
    });
  } catch (error) {
    console.error("My department payroll error:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi lấy dữ liệu lương" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = verifyToken(request);
    if (!auth || !auth.isRole("to_truong")) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 },
      );
    }

    const { month } = await request.json();
    const supabase = createServiceClient();

    const isT13 = month?.endsWith("-13");
    const salaryMonthFilter = month || new Date().toISOString().slice(0, 7);

    const { data: stats, error } = await supabase
      .from("payrolls")
      .select(
        `
        tien_luong_thuc_nhan_cuoi_ky,
        tong_luong_13,
        is_signed,
        employees!payrolls_employee_id_fkey!inner(department)
      `,
      )
      .eq("employees.department", auth.user.department)
      .eq("salary_month", salaryMonthFilter);

    if (error) {
      return NextResponse.json(
        { error: "Lỗi truy vấn dữ liệu" },
        { status: 500 },
      );
    }

    const totalEmployees = stats?.length || 0;
    const signedCount = stats?.filter((s) => s.is_signed).length || 0;

    interface StatRecord {
      tien_luong_thuc_nhan_cuoi_ky: number | null;
      tong_luong_13: number | null;
      is_signed: boolean;
    }

    const totalSalary = isT13
      ? stats?.reduce(
          (sum: number, s: StatRecord) => sum + (s.tong_luong_13 || 0),
          0,
        ) || 0
      : stats?.reduce(
          (sum: number, s: StatRecord) =>
            sum + (s.tien_luong_thuc_nhan_cuoi_ky || 0),
          0,
        ) || 0;

    return NextResponse.json({
      success: true,
      statistics: {
        department: auth.user.department,
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
    });
  } catch (error) {
    console.error("Department statistics error:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi lấy thống kê" },
      { status: 500 },
    );
  }
}
