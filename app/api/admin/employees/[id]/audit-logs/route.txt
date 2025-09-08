import { type NextRequest, NextResponse } from "next/server"
import { verifyAuditLogsAccess } from "@/lib/auth-middleware"
import { auditService } from "@/lib/audit-service"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = verifyAuditLogsAccess(request)
    if (!admin) {
      return NextResponse.json({ error: "Không có quyền xem audit logs" }, { status: 403 })
    }

    const { id } = params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Validate parameters
    if (limit > 100) {
      return NextResponse.json({ error: "Limit không được vượt quá 100" }, { status: 400 })
    }

    if (offset < 0) {
      return NextResponse.json({ error: "Offset phải >= 0" }, { status: 400 })
    }

    // Get audit logs for the employee
    const result = await auditService.getEmployeeAuditLogs(id, limit, offset)

    if (!result.success) {
      return NextResponse.json({
        error: "Lỗi khi lấy audit logs",
        details: result.error
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      logs: result.logs || [],
      pagination: {
        limit,
        offset,
        hasMore: (result.logs?.length || 0) === limit
      }
    })

  } catch (error) {
    console.error("Audit logs GET error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
