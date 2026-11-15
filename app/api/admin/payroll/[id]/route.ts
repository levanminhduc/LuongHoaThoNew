import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyToken } from "@/lib/auth-middleware";
import { csrfProtection } from "@/lib/security-middleware";
import { CACHE_HEADERS } from "@/lib/utils/cache-headers";
import {
  parseSchema,
  createValidationErrorResponse,
  PayrollUpdateRequestSchema,
} from "@/lib/validations";
import { toErrorResponse } from "@/lib/errors/app-error";
import { buildPayrollDetailQuery } from "@/lib/payroll/payroll-repository";
import { updatePayrollRecord } from "@/lib/payroll/payroll-update-service";

// Get client IP address
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  return "unknown";
}

// GET single payroll record with full details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Enhanced role-based authentication
    const auth = verifyToken(request);
    if (!auth) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401, headers: CACHE_HEADERS.sensitive },
      );
    }

    const resolvedParams = await params;
    const payrollId = parseInt(resolvedParams.id);
    if (isNaN(payrollId)) {
      return NextResponse.json(
        { error: "ID không hợp lệ" },
        { status: 400, headers: CACHE_HEADERS.sensitive },
      );
    }

    const supabase = createServiceClient();

    // Role-based data access control
    let query = buildPayrollDetailQuery(supabase, payrollId);

    // Apply role-based filtering
    if (
      ["giam_doc", "ke_toan", "nguoi_lap_bieu", "truong_phong"].includes(
        auth.user.role,
      )
    ) {
      // Management roles can only access allowed departments
      const allowedDepts = auth.user.allowed_departments || [];
      if (allowedDepts.length > 0) {
        query = query.in("employees.department", allowedDepts);
      } else {
        // No departments allowed
        return NextResponse.json(
          { error: "Không có quyền truy cập dữ liệu này" },
          { status: 403, headers: CACHE_HEADERS.sensitive },
        );
      }
    } else if (auth.user.role === "to_truong") {
      // To_truong can only access own department
      query = query.eq("employees.department", auth.user.department);
    } else if (auth.user.role === "nhan_vien") {
      // Nhan_vien can only access own data
      query = query.eq("employee_id", auth.user.employee_id);
    }
    // Admin and van_phong have no restrictions

    const { data: payrollData, error: payrollError } = await query.single();

    if (payrollError || !payrollData) {
      return NextResponse.json(
        { error: "Không tìm thấy bản ghi lương hoặc không có quyền truy cập" },
        { status: 404, headers: CACHE_HEADERS.sensitive },
      );
    }

    return NextResponse.json(
      { success: true, payroll: payrollData },
      { headers: CACHE_HEADERS.sensitive },
    );
  } catch (error) {
    console.error("Get payroll error:", error);
    return toErrorResponse(error, {
      fallbackMessage: "Có lỗi xảy ra khi lấy thông tin lương",
      headers: CACHE_HEADERS.sensitive,
    });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const csrfResult = csrfProtection(request);
    if (csrfResult) return csrfResult;

    const auth = verifyToken(request);
    if (!auth) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401, headers: CACHE_HEADERS.sensitive },
      );
    }

    if (!auth.isRole("admin") && !auth.isRole("truong_phong")) {
      return NextResponse.json(
        { error: "Không có quyền chỉnh sửa dữ liệu lương" },
        { status: 403, headers: CACHE_HEADERS.sensitive },
      );
    }

    const payrollId = parseInt((await params).id);
    if (isNaN(payrollId)) {
      return NextResponse.json(
        { error: "ID không hợp lệ" },
        { status: 400, headers: CACHE_HEADERS.sensitive },
      );
    }

    const parsed = parseSchema(
      PayrollUpdateRequestSchema,
      await request.json(),
    );
    if (!parsed.success) {
      return NextResponse.json(createValidationErrorResponse(parsed.errors), {
        status: 400,
        headers: CACHE_HEADERS.sensitive,
      });
    }

    const { payroll, changesCount } = await updatePayrollRecord(
      auth,
      payrollId,
      parsed.data,
      { clientIp: getClientIP(request) },
    );

    return NextResponse.json(
      {
        success: true,
        message: "Cập nhật dữ liệu lương thành công",
        payroll,
        changesCount,
      },
      { headers: CACHE_HEADERS.sensitive },
    );
  } catch (error) {
    console.error("Update payroll error:", error);
    return toErrorResponse(error, {
      fallbackMessage: "Có lỗi xảy ra khi cập nhật dữ liệu lương",
      headers: CACHE_HEADERS.sensitive,
    });
  }
}
