// API endpoint for nhan_vien to view their own payroll data
import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyToken, getAuditInfo } from "@/lib/auth-middleware";
import { csrfProtection } from "@/lib/security-middleware";
import { CACHE_HEADERS } from "@/lib/utils/cache-headers";
import {
  buildMyPayrollCountQuery,
  buildMyPayrollListQuery,
  findMyYearlySummary,
} from "@/lib/payroll/payroll-self-repository";
import {
  parseSchema,
  createValidationErrorResponse,
  pageQuerySchema,
  YearlySummaryRequestSchema,
} from "@/lib/validations";
import { getVietnamYear } from "@/lib/utils/vietnam-timezone";
import { toErrorResponse } from "@/lib/errors/app-error";

const MyDataQuerySchema = pageQuerySchema(12);

// GET own payroll data for nhan_vien
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

    // Only nhan_vien can access this endpoint
    if (!auth.isRole("nhan_vien")) {
      return NextResponse.json(
        { error: "Chỉ nhân viên mới có quyền truy cập" },
        { status: 403 },
      );
    }

    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);

    const parsedQuery = parseSchema(MyDataQuerySchema, {
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
    const payrollType = searchParams.get("payroll_type") || "monthly";

    const offset = (page - 1) * limit;

    const { count } = await buildMyPayrollCountQuery(
      supabase,
      auth.user.employee_id,
      payrollType === "t13",
    );

    const { data: payrolls, error } = await buildMyPayrollListQuery(
      supabase,
      auth.user.employee_id,
      { payrollType, salaryMonth: month },
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
      p_department: auth.user.department,
      p_employee_accessed: auth.user.employee_id,
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
        employee: {
          employee_id: auth.user.employee_id,
          department: auth.user.department,
        },
        payrollType,
      },
      { headers: CACHE_HEADERS.sensitive },
    );
  } catch (error) {
    console.error("My data payroll error:", error);
    return toErrorResponse(error, {
      fallbackMessage: "Có lỗi xảy ra khi lấy dữ liệu lương",
      headers: CACHE_HEADERS.sensitive,
    });
  }
}

// GET personal payroll summary for nhan_vien
export async function POST(request: NextRequest) {
  try {
    const csrfResult = csrfProtection(request);
    if (csrfResult) return csrfResult;

    const auth = verifyToken(request);
    if (!auth || !auth.isRole("nhan_vien")) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 },
      );
    }

    const parsedBody = parseSchema(
      YearlySummaryRequestSchema,
      await request.json(),
    );
    if (!parsedBody.success) {
      return NextResponse.json(
        createValidationErrorResponse(parsedBody.errors),
        { status: 400, headers: CACHE_HEADERS.sensitive },
      );
    }
    const currentYear = parsedBody.data.year ?? getVietnamYear();
    const supabase = createServiceClient();

    const { data: yearlyData, error } = await findMyYearlySummary(
      supabase,
      auth.user.employee_id,
      currentYear,
    );

    if (error) {
      return NextResponse.json(
        { error: "Lỗi truy vấn dữ liệu" },
        { status: 500 },
      );
    }

    // Calculate summary statistics
    const totalMonths = yearlyData?.length || 0;
    const signedMonths = yearlyData?.filter((d) => d.is_signed).length || 0;
    const totalGrossSalary =
      yearlyData?.reduce((sum, d) => sum + (d.tong_cong_tien_luong || 0), 0) ||
      0;
    const totalNetSalary =
      yearlyData?.reduce(
        (sum, d) => sum + (d.tien_luong_thuc_nhan_cuoi_ky || 0),
        0,
      ) || 0;
    const totalTax =
      yearlyData?.reduce((sum, d) => sum + (d.thue_tncn || 0), 0) || 0;
    const totalInsurance =
      yearlyData?.reduce((sum, d) => sum + (d.bhxh_bhtn_bhyt_total || 0), 0) ||
      0;

    // Monthly breakdown
    const monthlyBreakdown =
      yearlyData?.map((d) => ({
        month: d.salary_month,
        grossSalary: d.tong_cong_tien_luong || 0,
        netSalary: d.tien_luong_thuc_nhan_cuoi_ky || 0,
        tax: d.thue_tncn || 0,
        insurance: d.bhxh_bhtn_bhyt_total || 0,
        isSigned: d.is_signed,
        signedAt: d.signed_at,
      })) || [];

    return NextResponse.json(
      {
        success: true,
        summary: {
          year: currentYear,
          employee_id: auth.user.employee_id,
          totalMonths,
          signedMonths,
          signedPercentage:
            totalMonths > 0
              ? ((signedMonths / totalMonths) * 100).toFixed(1)
              : "0",
          totalGrossSalary,
          totalNetSalary,
          totalTax,
          totalInsurance,
          averageNetSalary:
            totalMonths > 0 ? Math.round(totalNetSalary / totalMonths) : 0,
        },
        monthlyBreakdown,
      },
      { headers: CACHE_HEADERS.sensitive },
    );
  } catch (error) {
    console.error("Personal summary error:", error);
    return toErrorResponse(error, {
      fallbackMessage: "Có lỗi xảy ra khi lấy tổng kết",
      headers: CACHE_HEADERS.sensitive,
    });
  }
}
