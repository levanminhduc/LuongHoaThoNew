// GET distinct salary months that have payroll data for truong_phong's assigned departments
import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyToken } from "@/lib/auth-middleware";
import { CACHE_HEADERS } from "@/lib/utils/cache-headers";
import { toErrorResponse } from "@/lib/errors/app-error";

export async function GET(request: NextRequest) {
  try {
    const auth = verifyToken(request);
    if (!auth) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 },
      );
    }

    if (!auth.isRole("truong_phong")) {
      return NextResponse.json(
        { error: "Chỉ trưởng phòng mới có quyền truy cập" },
        { status: 403 },
      );
    }

    const allowedDepartments = auth.user.allowed_departments || [];
    if (allowedDepartments.length === 0) {
      return NextResponse.json(
        { error: "Chưa được phân quyền truy cập department nào" },
        { status: 403 },
      );
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("payrolls")
      .select(
        "salary_month, employees!payrolls_employee_id_fkey!inner(department)",
      )
      .in("employees.department", allowedDepartments)
      .order("salary_month", { ascending: false });

    if (error) {
      console.error("My departments months fetch error:", error.message);
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
    console.error("My departments months fetch error:", error);
    return toErrorResponse(error, {
      fallbackMessage: "Có lỗi xảy ra khi lấy danh sách tháng lương",
      headers: CACHE_HEADERS.sensitive,
    });
  }
}
