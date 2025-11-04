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

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: "Định dạng tháng không hợp lệ (YYYY-MM)" },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();

    // Parallel queries for better performance
    const [totalResult, signedResult, unsignedResult] = await Promise.all([
      supabase
        .from("payrolls")
        .select("*", { count: "exact", head: true })
        .eq("salary_month", month),

      supabase
        .from("payrolls")
        .select("*", { count: "exact", head: true })
        .eq("salary_month", month)
        .eq("is_signed", true),

      supabase
        .from("payrolls")
        .select("*", { count: "exact", head: true })
        .eq("salary_month", month)
        .eq("is_signed", false),
    ]);

    const totalCount = totalResult.count || 0;
    const signedCount = signedResult.count || 0;
    const unsignedCount = unsignedResult.count || 0;

    return NextResponse.json({
      success: true,
      month,
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

