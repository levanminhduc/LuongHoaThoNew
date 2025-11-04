import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyToken } from "@/lib/auth-middleware";

export async function GET(request: NextRequest) {
  try {
    const auth = verifyToken(request);
    if (!auth || !auth.isRole("admin")) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const supabase = createServiceClient();

    let query = supabase
      .from("admin_bulk_signature_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (month) {
      query = query.eq("salary_month", month);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching bulk signature history:", error);
      return NextResponse.json(
        { error: "Lỗi khi lấy lịch sử ký hàng loạt" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    console.error("Get bulk signature history error:", error);
    return NextResponse.json({ error: "Có lỗi xảy ra" }, { status: 500 });
  }
}

