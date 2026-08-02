// API endpoint for getting detailed department information for management roles
import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyToken, getAuditInfo } from "@/lib/auth-middleware";
import { isProduction } from "@/lib/config/runtime";
import {
  getVietnamMonth,
  getVietnamMonthsAgo,
  getVietnamYear,
} from "@/lib/utils/vietnam-timezone";
import { toErrorResponse } from "@/lib/errors/app-error";
import {
  findDepartmentPayrollDetails,
  findDepartmentPayrollHistory,
  type DepartmentHistoryPeriod,
} from "@/lib/payroll/payroll-admin-repository";

interface DepartmentDetailParams {
  params: Promise<{
    departmentName: string;
  }>;
}

// GET detailed department information
export async function GET(
  request: NextRequest,
  { params }: DepartmentDetailParams,
) {
  try {
    // Verify authentication and role
    const auth = verifyToken(request);
    if (!auth) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 },
      );
    }

    // Only management roles can access this endpoint
    // Includes: giam_doc, ke_toan, nguoi_lap_bieu, truong_phong, to_truong
    if (
      ![
        "giam_doc",
        "ke_toan",
        "nguoi_lap_bieu",
        "truong_phong",
        "to_truong",
      ].includes(auth.user.role)
    ) {
      return NextResponse.json(
        { error: "Không có quyền truy cập chức năng này" },
        { status: 403 },
      );
    }

    // Await params for Next.js 15 compatibility
    const resolvedParams = await params;
    const departmentName = decodeURIComponent(resolvedParams.departmentName);
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || getVietnamMonth();
    const payrollType = searchParams.get("payroll_type") as
      | "monthly"
      | "t13"
      | null;
    const year = searchParams.get("year") || String(getVietnamYear());

    // Check if user has permission to access this department
    // For to_truong: use auth.user.department
    // For other management roles: use allowed_departments
    let hasAccess = false;
    if (auth.user.role === "to_truong") {
      // to_truong can only access their own department
      hasAccess = auth.user.department === departmentName;
    } else {
      // Other management roles use allowed_departments
      const allowedDepartments = auth.user.allowed_departments || [];
      hasAccess = allowedDepartments.includes(departmentName);
    }

    if (!hasAccess) {
      return NextResponse.json(
        {
          error: "Không có quyền truy cập department này",
        },
        { status: 403 },
      );
    }

    // Get department employees with their payroll data
    const { data: employees, error: employeesError } = await supabase
      .from("employees")
      .select(
        `
        employee_id,
        full_name,
        chuc_vu,
        department,
        is_active
      `,
      )
      .eq("department", departmentName)
      .eq("is_active", true)
      .order("full_name", { ascending: true });

    if (employeesError) {
      console.error("Employees query error:", employeesError);
      return NextResponse.json(
        { error: "Lỗi truy vấn danh sách nhân viên" },
        { status: 500 },
      );
    }

    // Get payroll data for the department in the specified month
    // Query payroll data với employees join
    // Sử dụng order by created_at thay vì employees(full_name) vì Supabase không hỗ trợ ordering by nested relationship fields

    // Determine salary_month based on payroll type
    // T13: salary_month = 'YYYY-13' (e.g., '2025-13')
    // Monthly: salary_month = 'YYYY-MM' (e.g., '2025-01')
    const salaryMonthFilter = payrollType === "t13" ? `${year}-13` : month;

    const { data: payrolls, error: payrollsError } =
      await findDepartmentPayrollDetails(
        supabase,
        departmentName,
        salaryMonthFilter,
      );

    if (payrollsError) {
      console.error("Payrolls query error:", payrollsError);
      console.error("Query details:", {
        departmentName,
        month,
        userRole: auth.user.role,
        allowedDepartments: auth.user.allowed_departments,
      });
      return NextResponse.json(
        {
          error: "Lỗi truy vấn dữ liệu lương",
          details: isProduction() ? undefined : payrollsError.message,
        },
        { status: 500 },
      );
    }

    // Get historical payroll data for trends
    // For T13: Get last 5 years of T13 data (YYYY-13)
    // For monthly: Get last 6 months of data
    const historyPeriod: DepartmentHistoryPeriod =
      payrollType === "t13"
        ? {
            kind: "t13",
            months: Array.from(
              { length: 5 },
              (_, index) => `${parseInt(year) - index}-13`,
            ),
          }
        : { kind: "monthly", startMonth: getVietnamMonthsAgo(6) };

    const { data: historicalPayrolls, error: historicalError } =
      await findDepartmentPayrollHistory(
        supabase,
        departmentName,
        historyPeriod,
      );

    if (historicalError) {
      console.error("Historical payrolls query error:", historicalError);
    }

    // Calculate department statistics
    const totalEmployees = employees?.length || 0;
    const payrollCount = payrolls?.length || 0;
    const signedCount = payrolls?.filter((p) => p.is_signed).length || 0;
    const totalSalary =
      payrolls?.reduce((sum, p) => {
        if (payrollType === "t13") {
          return sum + (p.tong_luong_13 || 0);
        }
        return sum + (p.tien_luong_thuc_nhan_cuoi_ky || 0);
      }, 0) || 0;
    const averageSalary =
      payrollCount > 0 ? Math.round(totalSalary / payrollCount) : 0;
    const signedPercentage =
      payrollCount > 0 ? ((signedCount / payrollCount) * 100).toFixed(1) : "0";

    // Calculate additional statistics
    const totalWorkDays =
      payrolls?.reduce((sum, p) => sum + (p.ngay_cong_trong_gio || 0), 0) || 0;
    const totalOvertimeHours =
      payrolls?.reduce((sum, p) => sum + (p.gio_cong_tang_ca || 0), 0) || 0;
    const totalAllowances =
      payrolls?.reduce(
        (sum, p) =>
          sum +
          (p.ho_tro_thoi_tiet_nong || 0) +
          (p.pc_cdcs_pccc_atvsv || 0) +
          (p.ho_tro_xang_xe || 0) +
          (p.tien_boc_vac || 0),
        0,
      ) || 0;
    const totalDeductions =
      payrolls?.reduce(
        (sum, p) =>
          sum +
          (p.bhxh_bhtn_bhyt_total || 0) +
          (p.thue_tncn || 0) +
          (p.tam_ung || 0),
        0,
      ) || 0;

    // Calculate salary distribution
    const salaryRanges = [
      { range: "< 5M", min: 0, max: 5000000, count: 0 },
      { range: "5M - 10M", min: 5000000, max: 10000000, count: 0 },
      { range: "10M - 15M", min: 10000000, max: 15000000, count: 0 },
      { range: "15M - 20M", min: 15000000, max: 20000000, count: 0 },
      { range: "> 20M", min: 20000000, max: Infinity, count: 0 },
    ];

    payrolls?.forEach((payroll) => {
      const salary = payroll.tien_luong_thuc_nhan_cuoi_ky || 0;
      const range = salaryRanges.find((r) => salary >= r.min && salary < r.max);
      if (range) range.count++;
    });

    const monthlyTrends: Record<
      string,
      {
        month: string;
        totalSalary: number;
        employeeCount: number;
        signedCount: number;
      }
    > = {};
    historicalPayrolls?.forEach((payroll) => {
      const month = payroll.salary_month;
      if (!monthlyTrends[month]) {
        monthlyTrends[month] = {
          month,
          totalSalary: 0,
          employeeCount: 0,
          signedCount: 0,
        };
      }
      monthlyTrends[month].totalSalary +=
        payroll.tien_luong_thuc_nhan_cuoi_ky || 0;
      monthlyTrends[month].employeeCount++;
      if (payroll.is_signed) {
        monthlyTrends[month].signedCount++;
      }
    });

    const trendsArray = Object.values(monthlyTrends).map((trend) => ({
      ...trend,
      averageSalary:
        trend.employeeCount > 0
          ? Math.round(trend.totalSalary / trend.employeeCount)
          : 0,
      signedPercentage:
        trend.employeeCount > 0
          ? ((trend.signedCount / trend.employeeCount) * 100).toFixed(1)
          : "0",
    }));

    // Log access for audit trail
    const auditInfo = getAuditInfo(request, auth);
    await supabase.rpc("log_access", {
      p_user_id: auditInfo.user_id,
      p_user_role: auditInfo.user_role,
      p_action: "VIEW_DETAIL",
      p_resource: "department",
      p_department: departmentName,
      p_ip_address: auditInfo.ip_address,
      p_user_agent: auditInfo.user_agent,
      p_request_method: auditInfo.request_method,
      p_request_url: auditInfo.request_url,
      p_response_status: 200,
    });

    return NextResponse.json({
      success: true,
      department: {
        name: departmentName,
        month: month,
        stats: {
          totalEmployees,
          payrollCount,
          signedCount,
          signedPercentage,
          totalSalary,
          averageSalary,
          totalWorkDays,
          totalOvertimeHours,
          totalAllowances,
          totalDeductions,
        },
        employees: employees || [],
        payrolls: payrolls || [],
        salaryDistribution: salaryRanges,
        monthlyTrends: trendsArray,
      },
    });
  } catch (error) {
    console.error("Department detail error:", error);
    return toErrorResponse(error, {
      fallbackMessage: "Có lỗi xảy ra khi lấy chi tiết department",
    });
  }
}
