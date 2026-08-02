import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyToken } from "@/lib/auth-middleware";
import { CACHE_HEADERS } from "@/lib/utils/cache-headers";
import {
  BulkSignatureHistoryQuerySchema,
  parseSchema,
  createValidationErrorResponse,
} from "@/lib/validations";
import { toErrorResponse } from "@/lib/errors/app-error";
import { buildBulkSignatureHistoryQuery } from "@/lib/signature/signature-log-repository";

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

    const { data, error, count } = await buildBulkSignatureHistoryQuery(
      supabase,
      month,
      payrollType,
      offset,
      limit,
    );

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
    return toErrorResponse(error, {
      fallbackMessage: "Có lỗi xảy ra",
      headers: CACHE_HEADERS.sensitive,
    });
  }
}
