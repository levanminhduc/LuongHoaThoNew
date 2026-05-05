import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyToken } from "@/lib/auth-middleware";
import { CACHE_HEADERS } from "@/lib/utils/cache-headers";
import { SalaryMonthSchema } from "@/lib/validations";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ month: string }> },
) {
  try {
    const auth = verifyToken(request);
    if (!auth || !auth.isRole("admin")) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 403, headers: CACHE_HEADERS.shortPrivate },
      );
    }

    const { month } = await params;

    const parsedMonth = SalaryMonthSchema.safeParse(month);
    if (!parsedMonth.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Tháng lương không hợp lệ",
          code: "VALIDATION_ERROR",
        },
        { status: 400, headers: CACHE_HEADERS.shortPrivate },
      );
    }

    const isT13 = /^\d{4}-(13|T13)$/i.test(month);
    const { searchParams } = new URL(request.url);
    const clientIsT13 = searchParams.get("is_t13");
    if (clientIsT13 !== null && (clientIsT13 === "true") !== isT13) {
      return NextResponse.json(
        {
          success: false,
          error: "is_t13 không khớp với salary_month",
          code: "VALIDATION_ERROR",
          derived_is_t13: isT13,
        },
        { status: 400, headers: CACHE_HEADERS.shortPrivate },
      );
    }

    const supabase = createServiceClient();

    const buildQuery = () => {
      let q = supabase
        .from("payrolls")
        .select("*", { count: "exact", head: true })
        .eq("salary_month", month);
      if (isT13) {
        q = q.eq("payroll_type", "t13");
      } else {
        q = q.or("payroll_type.eq.monthly,payroll_type.is.null");
      }
      return q;
    };

    const buildSignedQuery = (signed: boolean) => {
      let q = supabase
        .from("payrolls")
        .select("*", { count: "exact", head: true })
        .eq("salary_month", month)
        .eq("is_signed", signed);
      if (isT13) {
        q = q.eq("payroll_type", "t13");
      } else {
        q = q.or("payroll_type.eq.monthly,payroll_type.is.null");
      }
      return q;
    };

    const [totalResult, signedResult, unsignedResult] = await Promise.all([
      buildQuery(),
      buildSignedQuery(true),
      buildSignedQuery(false),
    ]);

    const totalCount = totalResult.count || 0;
    const signedCount = signedResult.count || 0;
    const unsignedCount = unsignedResult.count || 0;

    let signedEmployees: Array<{
      employee_id: string;
      full_name: string;
      department: string;
    }> = [];

    if (searchParams.get("include_signed_employees") === "true") {
      let signedQuery = supabase
        .from("payrolls")
        .select("employee_id")
        .eq("salary_month", month)
        .eq("is_signed", true);
      if (isT13) {
        signedQuery = signedQuery.eq("payroll_type", "t13");
      } else {
        signedQuery = signedQuery.or(
          "payroll_type.eq.monthly,payroll_type.is.null",
        );
      }
      const { data: signedPayrolls } = await signedQuery.order("employee_id");
      const ids = signedPayrolls?.map((p) => p.employee_id) || [];

      if (ids.length > 0) {
        const { data: empData } = await supabase
          .from("employees")
          .select("employee_id, full_name, department")
          .in("employee_id", ids)
          .eq("is_active", true)
          .order("employee_id");
        signedEmployees = empData || [];
      }
    }

    return NextResponse.json(
      {
        success: true,
        month,
        payroll_type: isT13 ? "t13" : "monthly",
        total_employees: totalCount,
        already_signed: signedCount,
        unsigned: unsignedCount,
        completion_percentage: totalCount
          ? Math.round((signedCount / totalCount) * 100)
          : 0,
        ...(signedEmployees.length > 0 && {
          signed_employees: signedEmployees,
        }),
      },
      { headers: CACHE_HEADERS.shortPrivate },
    );
  } catch (error) {
    console.error("Get signature stats error:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra" },
      { status: 500, headers: CACHE_HEADERS.shortPrivate },
    );
  }
}
