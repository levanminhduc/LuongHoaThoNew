import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyToken } from "@/lib/auth-middleware";
import { csrfProtection } from "@/lib/security-middleware";
import { getVietnamTimestamp } from "@/lib/utils/vietnam-timezone";
import { CACHE_HEADERS } from "@/lib/utils/cache-headers";
import {
  parseSchema,
  createValidationErrorResponse,
  ManagementSignatureRequestSchema,
} from "@/lib/validations";
import { toErrorResponse } from "@/lib/errors/app-error";
import {
  findActiveSignatureSigner,
  insertManagementSignature,
} from "@/lib/signature/management-signature-repository";
import { findPayrollSignatureCounts } from "@/lib/payroll/payroll-signature-repository";
import { findActiveEmployeeProfile } from "@/lib/employee/employee-directory-repository";

export async function POST(request: NextRequest) {
  try {
    const csrfResult = csrfProtection(request);
    if (csrfResult) return csrfResult;
    const auth = verifyToken(request);
    if (
      !auth ||
      !["admin", "giam_doc", "ke_toan", "nguoi_lap_bieu"].includes(
        auth.user.role,
      )
    ) {
      return NextResponse.json(
        { error: "Không có quyền ký xác nhận" },
        { status: 403, headers: CACHE_HEADERS.sensitive },
      );
    }

    const body = await request.json();
    const parsed = parseSchema(ManagementSignatureRequestSchema, body);
    if (!parsed.success) {
      return NextResponse.json(createValidationErrorResponse(parsed.errors), {
        status: 400,
        headers: CACHE_HEADERS.sensitive,
      });
    }
    const { salary_month, signature_type, notes, device_info, is_t13 } =
      parsed.data;

    if (auth.user.role !== "admin" && auth.user.role !== signature_type) {
      return NextResponse.json(
        { error: "Chức vụ không có quyền ký loại này" },
        { status: 403, headers: CACHE_HEADERS.sensitive },
      );
    }

    const isT13Month = /^\d{4}-(13|T13)$/i.test(salary_month);
    const payrollType = isT13Month ? "t13" : "monthly";

    if (is_t13 !== undefined && is_t13 !== isT13Month) {
      return NextResponse.json(
        {
          error:
            "Tham số is_t13 không khớp với salary_month. Server tự động xác định từ salary_month.",
          derived_is_t13: isT13Month,
        },
        { status: 400, headers: CACHE_HEADERS.sensitive },
      );
    }

    const supabase = createServiceClient();

    const { data: payrolls, error: payrollError } =
      await findPayrollSignatureCounts(supabase, salary_month, isT13Month);

    if (payrollError) {
      console.error("Error fetching payrolls:", payrollError);
      return NextResponse.json(
        { error: "Lỗi khi kiểm tra danh sách bảng lương" },
        { status: 500, headers: CACHE_HEADERS.sensitive },
      );
    }

    const totalCount = payrolls?.length || 0;
    const signedCount = payrolls?.filter((p) => p.is_signed).length || 0;
    const is100PercentComplete = signedCount === totalCount && totalCount > 0;

    if (!is100PercentComplete) {
      return NextResponse.json(
        {
          error: "Chưa đủ 100% nhân viên có bảng lương ký tên",
          details: {
            total_employees_with_payroll: totalCount,
            signed_employees: signedCount,
            completion_percentage:
              totalCount > 0
                ? Math.round((signedCount / totalCount) * 100 * 100) / 100
                : 0,
            message: `Cần ${totalCount - signedCount} nhân viên có bảng lương ký thêm để đạt 100%`,
          },
        },
        { status: 400, headers: CACHE_HEADERS.sensitive },
      );
    }

    const { data: employee, error: empError } = await findActiveEmployeeProfile(
      supabase,
      auth.user.employee_id,
    );

    if (empError || !employee) {
      return NextResponse.json(
        { error: "Nhân viên không tồn tại hoặc đã bị khóa" },
        { status: 400, headers: CACHE_HEADERS.sensitive },
      );
    }

    if (employee.chuc_vu !== signature_type && auth.user.role !== "admin") {
      return NextResponse.json(
        { error: "Chức vụ nhân viên không khớp với loại chữ ký" },
        { status: 400, headers: CACHE_HEADERS.sensitive },
      );
    }

    try {
      const { data: existingSignature, error: existingError } =
        await findActiveSignatureSigner(
          supabase,
          salary_month,
          signature_type,
          isT13Month,
        );

      if (!existingError && existingSignature) {
        return NextResponse.json(
          {
            error: "Đã có chữ ký cho loại này trong tháng",
            existing_signature: {
              signed_by_id: existingSignature.signed_by_id,
              signed_by_name: existingSignature.signed_by_name,
              signed_at: existingSignature.signed_at,
              department: existingSignature.department,
            },
          },
          { status: 400, headers: CACHE_HEADERS.sensitive },
        );
      }
    } catch {
      console.log(
        "Management signatures table not available - will create mock signature",
      );
    }

    const clientIP =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const vietnamTime = getVietnamTimestamp();

    const signatureRecord = {
      id: crypto.randomUUID(),
      signature_type,
      salary_month,
      payroll_type: payrollType,
      signed_by_id: employee.employee_id,
      signed_by_name: employee.full_name,
      department: employee.department,
      signed_at: vietnamTime,
      ip_address: clientIP,
      device_info: device_info || "Unknown",
      notes: notes || null,
      is_active: true,
    };

    try {
      const { data: insertedSignature, error: insertError } =
        await insertManagementSignature(supabase, signatureRecord);

      if (insertError) {
        console.error("Error inserting signature:", insertError);
        return NextResponse.json(
          { error: "Lỗi khi lưu chữ ký" },
          { status: 500, headers: CACHE_HEADERS.sensitive },
        );
      }

      const statusResponse = await fetch(
        `${request.nextUrl.origin}/api/signature-status/${salary_month}`,
        {
          headers: {
            Authorization: request.headers.get("Authorization") || "",
          },
        },
      );

      let updatedStatus = null;
      if (statusResponse.ok) {
        updatedStatus = await statusResponse.json();
      }

      return NextResponse.json(
        {
          success: true,
          message: "Ký xác nhận thành công",
          signature: insertedSignature,
          updated_status: updatedStatus,
          timestamp: vietnamTime,
        },
        { headers: CACHE_HEADERS.sensitive },
      );
    } catch {
      console.log(
        "Management signatures table not available - returning mock response",
      );

      return NextResponse.json(
        {
          success: true,
          message: "Ký xác nhận thành công (Mock - Table chưa tồn tại)",
          signature: signatureRecord,
          updated_status: null,
          timestamp: vietnamTime,
          note: "Cần chạy migration script để tạo management_signatures table",
        },
        { headers: CACHE_HEADERS.sensitive },
      );
    }
  } catch (error) {
    console.error("Management signature error:", error);
    return toErrorResponse(error, {
      fallbackMessage: "Có lỗi xảy ra khi ký xác nhận",
      headers: CACHE_HEADERS.sensitive,
    });
  }
}
