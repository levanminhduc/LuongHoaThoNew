import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyEmployeeManagementAccess } from "@/lib/auth-middleware";
import { csrfProtection } from "@/lib/security-middleware";
import { CACHE_HEADERS } from "@/lib/utils/cache-headers";
import {
  EmployeeUpdateRequestSchema,
  parseSchema,
  createValidationErrorResponse,
} from "@/lib/validations";
import { toErrorResponse } from "@/lib/errors/app-error";
import { findAdminEmployeeRecord } from "@/lib/employee/employee-admin-repository";
import { updateEmployee } from "@/lib/employee/employee-update-service";
import { removeEmployee } from "@/lib/employee/employee-removal-service";

const ROLES_NGUOI_LAP_BIEU_CANNOT_ASSIGN = ["admin", "giam_doc", "ke_toan"];

function sensitiveJson(body: unknown, status?: number) {
  return NextResponse.json(body, { status, headers: CACHE_HEADERS.sensitive });
}

function unauthorized() {
  return sensitiveJson({ error: "Không có quyền truy cập" }, 401);
}

function notFound() {
  return sensitiveJson({ error: "Nhân viên không tồn tại" }, 404);
}

function serverErrorResponse(error: unknown, context: string) {
  console.error(context, error);
  return toErrorResponse(error, {
    fallbackMessage: "Lỗi server",
    headers: CACHE_HEADERS.sensitive,
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const csrfResult = csrfProtection(request);
    if (csrfResult) return csrfResult;
    const admin = verifyEmployeeManagementAccess(request);
    if (!admin) return unauthorized();

    const { id } = await params;
    const parsedBody = parseSchema(
      EmployeeUpdateRequestSchema,
      await request.json(),
    );
    if (!parsedBody.success) {
      return sensitiveJson(
        createValidationErrorResponse(parsedBody.errors),
        400,
      );
    }

    if (
      admin.role === "nguoi_lap_bieu" &&
      ROLES_NGUOI_LAP_BIEU_CANNOT_ASSIGN.includes(parsedBody.data.chuc_vu)
    ) {
      return sensitiveJson(
        { error: "Không có quyền thay đổi thành chức vụ này" },
        403,
      );
    }

    const result = await updateEmployee(
      createServiceClient(),
      id,
      parsedBody.data,
      admin,
    );

    if (result.status === "not_found") return notFound();

    if (result.status === "cascade_failed") {
      return sensitiveJson(
        { error: result.message, details: result.details },
        400,
      );
    }

    if (result.status === "update_failed") {
      return sensitiveJson({ error: "Lỗi khi cập nhật nhân viên" }, 500);
    }

    if (result.status === "cascade_updated") {
      return sensitiveJson({
        success: true,
        employee: result.employee,
        message: `Cascade update thành công! Mã nhân viên đã được thay đổi từ ${id} thành ${parsedBody.data.employee_id}. ${result.cascadeMessage}`,
        employee_id_changed: true,
        cascade_stats: result.cascadeStats,
      });
    }

    return sensitiveJson({
      success: true,
      employee: result.employee,
      message: "Cập nhật nhân viên thành công",
      employee_id_changed: false,
    });
  } catch (error) {
    return serverErrorResponse(error, "Employee PUT error:");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const csrfResult = csrfProtection(request);
    if (csrfResult) return csrfResult;
    const admin = verifyEmployeeManagementAccess(request);
    if (!admin) return unauthorized();

    if (admin.role === "nguoi_lap_bieu") {
      return sensitiveJson(
        {
          error:
            "Không có quyền xóa nhân viên. Vui lòng vô hiệu hóa thay vì xóa.",
        },
        403,
      );
    }

    const { id } = await params;
    const result = await removeEmployee(createServiceClient(), id, admin);

    if (result.status === "not_found") return notFound();

    if (result.status === "deactivate_failed") {
      return sensitiveJson({ error: "Lỗi khi vô hiệu hóa nhân viên" }, 500);
    }

    if (result.status === "delete_failed") {
      return sensitiveJson({ error: "Lỗi khi xóa nhân viên" }, 500);
    }

    return sensitiveJson({
      success: true,
      message:
        result.status === "deactivated"
          ? "Nhân viên đã được vô hiệu hóa (có dữ liệu lương liên quan)"
          : "Xóa nhân viên thành công",
    });
  } catch (error) {
    return serverErrorResponse(error, "Employee DELETE error:");
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = verifyEmployeeManagementAccess(request);
    if (!admin) return unauthorized();

    const { id } = await params;
    const { data: employee, error } = await findAdminEmployeeRecord(
      createServiceClient(),
      id,
    );

    if (error || !employee) return notFound();

    return sensitiveJson({ success: true, employee });
  } catch (error) {
    return serverErrorResponse(error, "Employee GET by ID error:");
  }
}
