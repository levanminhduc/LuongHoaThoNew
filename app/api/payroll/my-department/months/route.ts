// GET distinct salary months that have payroll data for to_truong's own department
import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyToken } from "@/lib/auth-middleware";
import { CACHE_HEADERS } from "@/lib/utils/cache-headers";
import { toErrorResponse } from "@/lib/errors/app-error";
import { findDepartmentSalaryMonths } from "@/lib/payroll/payroll-department-repository";

export async function GET(request: NextRequest) {
  try {
    const auth = verifyToken(request);
    if (!auth) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 },
      );
    }

    if (!auth.isRole("to_truong")) {
      return NextResponse.json(
        { error: "Chỉ tổ trưởng mới có quyền truy cập" },
        { status: 403 },
      );
    }

    const supabase = createServiceClient();
    const { data, error } = await findDepartmentSalaryMonths(
      supabase,
      auth.user.department,
    );

    if (error) {
      console.error("My department months fetch error:", error.message);
      return NextResponse.json(
        { error: "Lỗi khi lấy danh sách tháng lương" },
        { status: 500 },
      );
    }

    const months = [...new Set((data ?? []).map((item) => item.salary_month))];

    return NextResponse.json(
      { success: true, months },
      { headers: CACHE_HEADERS.sensitive },
    );
  } catch (error) {
    console.error("My department months fetch error:", error);
    return toErrorResponse(error, {
      fallbackMessage: "Có lỗi xảy ra khi lấy danh sách tháng lương",
      headers: CACHE_HEADERS.sensitive,
    });
  }
}
