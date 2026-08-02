import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyAdminAccess } from "@/lib/auth-middleware";
import { CACHE_HEADERS } from "@/lib/utils/cache-headers";
import {
  DashboardStatsQuerySchema,
  parseSchema,
  createValidationErrorResponse,
} from "@/lib/validations";
import { getVietnamMonth } from "@/lib/utils/vietnam-timezone";
import { toErrorResponse } from "@/lib/errors/app-error";
import { buildRecentPayrollsQuery } from "@/lib/payroll/payroll-admin-repository";

export async function GET(request: NextRequest) {
  try {
    const auth = verifyAdminAccess(request);
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status, headers: CACHE_HEADERS.sensitive },
      );
    }

    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const parsed = parseSchema(
      DashboardStatsQuerySchema,
      Object.fromEntries(searchParams),
    );
    if (!parsed.success) {
      return NextResponse.json(createValidationErrorResponse(parsed.errors), {
        status: 400,
      });
    }
    const payrollType = parsed.data.payroll_type;

    const { data: payrolls, error: payrollsError } =
      await buildRecentPayrollsQuery(supabase, payrollType === "t13");

    if (payrollsError) {
      console.error("Error fetching payrolls:", payrollsError);
      return NextResponse.json(
        { error: "Lỗi khi lấy dữ liệu lương" },
        { status: 500, headers: CACHE_HEADERS.sensitive },
      );
    }

    // Calculate comprehensive statistics
    const stats = {
      totalRecords: payrolls?.length || 0,
      totalEmployees: new Set(payrolls?.map((p) => p.employee_id)).size || 0,
      totalSalary:
        payrolls?.reduce(
          (sum, p) => sum + (p.tien_luong_thuc_nhan_cuoi_ky || 0),
          0,
        ) || 0,
      currentMonth: getVietnamMonth(),
      lastImportBatch: payrolls?.[0]?.import_batch_id?.slice(-8) || "N/A",
      signatureRate: payrolls?.length
        ? (payrolls.filter((p) => p.import_status === "signed").length /
            payrolls.length) *
          100
        : 0,
    };

    // Get monthly distribution
    const monthlyStats = payrolls?.reduce(
      (acc, payroll) => {
        const month = payroll.salary_month;
        if (!acc[month]) {
          acc[month] = { count: 0, totalSalary: 0 };
        }
        acc[month].count++;
        acc[month].totalSalary += payroll.tien_luong_thuc_nhan_cuoi_ky || 0;
        return acc;
      },
      {} as { [key: string]: { count: number; totalSalary: number } },
    );

    return NextResponse.json(
      {
        success: true,
        payrolls: payrolls || [],
        stats,
        monthlyStats,
        payrollType,
      },
      { headers: CACHE_HEADERS.shortPrivate },
    );
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return toErrorResponse(error, {
      fallbackMessage: "Có lỗi xảy ra khi lấy thống kê dashboard",
      headers: CACHE_HEADERS.sensitive,
    });
  }
}
