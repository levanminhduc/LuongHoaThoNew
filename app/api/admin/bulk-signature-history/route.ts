import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyToken } from "@/lib/auth-middleware";
import { CACHE_HEADERS } from "@/lib/utils/cache-headers";
import {
  BulkSignatureHistoryQuerySchema,
  parseSchema,
  createValidationErrorResponse,
} from "@/lib/validations";

export async function GET(request: NextRequest) {
  try {
    const auth = verifyToken(request);
    if (!auth || !auth.isRole("admin")) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 403, headers: CACHE_HEADERS.sensitive },
      );
    }

    const { searchParams } = new URL(request.url);
    const parsed = parseSchema(
      BulkSignatureHistoryQuerySchema,
      Object.fromEntries(searchParams),
    );
    if (!parsed.success) {
      return NextResponse.json(createValidationErrorResponse(parsed.errors), {
        status: 400,
      });
    }
    const { month, payroll_type: payrollType, limit, offset } = parsed.data;

    const supabase = createServiceClient();

    let query = supabase
      .from("admin_bulk_signature_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (month) {
      query = query.eq("salary_month", month);
    }

    if (payrollType === "t13") {
      query = query.eq("payroll_type", "t13");
    } else {
      query = query.or("payroll_type.eq.monthly,payroll_type.is.null");
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching bulk signature history:", error);
      return NextResponse.json(
        { error: "Lỗi khi lấy lịch sử ký hàng loạt" },
        { status: 500, headers: CACHE_HEADERS.sensitive },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data,
        pagination: {
          total: count || 0,
          limit,
          offset,
          hasMore: (count || 0) > offset + limit,
        },
      },
      { headers: CACHE_HEADERS.shortPrivate },
    );
  } catch (error) {
    console.error("Get bulk signature history error:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra" },
      { status: 500, headers: CACHE_HEADERS.sensitive },
    );
  }
}
