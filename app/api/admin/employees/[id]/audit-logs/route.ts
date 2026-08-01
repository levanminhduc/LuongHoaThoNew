import { type NextRequest, NextResponse } from "next/server";
import { verifyAuditLogsAccess } from "@/lib/auth-middleware";
import { auditService } from "@/lib/audit-service";
import {
  parseSchema,
  createValidationErrorResponse,
  PaginationSchema,
} from "@/lib/validations";
import { toErrorResponse } from "@/lib/errors/app-error";

export const runtime = "nodejs"; // ép route này chạy Node.js thay vì Edge

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = verifyAuditLogsAccess(request);
    if (!admin) {
      return NextResponse.json(
        { error: "Không có quyền xem audit logs" },
        { status: 403 },
      );
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;
    const { searchParams } = new URL(request.url);
    const parsedQuery = parseSchema(PaginationSchema, {
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
    });
    if (!parsedQuery.success) {
      return NextResponse.json(
        createValidationErrorResponse(parsedQuery.errors),
        { status: 400 },
      );
    }
    const { limit, offset } = parsedQuery.data;

    // Get audit logs for the employee
    const result = await auditService.getEmployeeAuditLogs(id, limit, offset);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Lỗi khi lấy audit logs",
          details: result.error,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      logs: result.logs || [],
      pagination: {
        limit,
        offset,
        hasMore: (result.logs?.length || 0) === limit,
      },
    });
  } catch (error) {
    console.error("Audit logs GET error:", error);
    return toErrorResponse(error, {
      fallbackMessage: "Lỗi server",
    });
  }
}
