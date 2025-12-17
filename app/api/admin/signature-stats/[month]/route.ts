import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyToken } from "@/lib/auth-middleware";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ month: string }> },
) {
  try {
    const auth = verifyToken(request);
    if (!auth || !auth.isRole("admin")) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 403 },
      );
    }

    const { month } = await params;
    const { searchParams } = new URL(request.url);
    const isT13 = searchParams.get("is_t13") === "true";

    const monthPattern = isT13 ? /^\d{4}-(13|T13)$/i : /^\d{4}-\d{2}$/;
    const formatMsg = isT13
      ? "Định dạng tháng không hợp lệ (YYYY-13)"
      : "Định dạng tháng không hợp lệ (YYYY-MM)";

    if (!monthPattern.test(month)) {
      return NextResponse.json({ error: formatMsg }, { status: 400 });
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

    return NextResponse.json({
      success: true,
      month,
      payroll_type: isT13 ? "t13" : "monthly",
      total_employees: totalCount,
      already_signed: signedCount,
      unsigned: unsignedCount,
      completion_percentage: totalCount
        ? Math.round((signedCount / totalCount) * 100)
        : 0,
    });
  } catch (error) {
    console.error("Get signature stats error:", error);
    return NextResponse.json({ error: "Có lỗi xảy ra" }, { status: 500 });
  }
}
