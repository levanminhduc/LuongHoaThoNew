import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyToken } from "@/lib/auth-middleware";
import { csrfProtection } from "@/lib/security-middleware";
import {
  parseSchema,
  createValidationErrorResponse,
  UpdateManagementSignatureDateRequestSchema,
} from "@/lib/validations";
import { toErrorResponse } from "@/lib/errors/app-error";
import {
  findActiveSignatureId,
  insertManagementSignature,
  updateSignatureSignedAt,
} from "@/lib/signature/management-signature-repository";
import { findFirstActiveSignerByPosition } from "@/lib/employee/employee-directory-repository";

const SIGNATURE_TYPE_LABELS: Record<string, string> = {
  giam_doc: "Giám Đốc",
  ke_toan: "Kế Toán",
  nguoi_lap_bieu: "Người Lập Biểu",
};

export async function POST(request: NextRequest) {
  try {
    const csrfResult = csrfProtection(request);
    if (csrfResult) return csrfResult;
    const auth = verifyToken(request);
    if (!auth || !auth.isRole("admin")) {
      return NextResponse.json(
        { error: "Chỉ admin mới có quyền thực hiện" },
        { status: 403 },
      );
    }

    const parsed = parseSchema(
      UpdateManagementSignatureDateRequestSchema,
      await request.json(),
    );
    if (!parsed.success) {
      return NextResponse.json(createValidationErrorResponse(parsed.errors), {
        status: 400,
      });
    }
    const { salary_month, signature_type, new_signed_at, action, is_t13 } =
      parsed.data;

    const supabase = createServiceClient();
    const payrollType = is_t13 ? "t13" : "monthly";

    if (action === "update") {
      const { data: existing, error: findError } = await findActiveSignatureId(
        supabase,
        salary_month,
        signature_type,
        is_t13,
      );

      if (findError || !existing) {
        return NextResponse.json(
          { success: false, error: "Không tìm thấy chữ ký quản lý" },
          { status: 404 },
        );
      }

      const { error: updateError } = await updateSignatureSignedAt(
        supabase,
        existing.id,
        new_signed_at,
      );

      if (updateError) {
        return NextResponse.json(
          { error: "Lỗi khi cập nhật ngày ký", details: updateError.message },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: `Đã cập nhật ngày ký ${SIGNATURE_TYPE_LABELS[signature_type]}`,
        signature_id: existing.id,
      });
    }

    if (action === "create") {
      const { data: existingSig } = await findActiveSignatureId(
        supabase,
        salary_month,
        signature_type,
        is_t13,
      );

      if (existingSig) {
        return NextResponse.json(
          {
            success: false,
            error: "Chữ ký đã tồn tại, sử dụng chức năng sửa ngày",
          },
          { status: 409 },
        );
      }

      const { data: signer, error: signerError } =
        await findFirstActiveSignerByPosition(supabase, signature_type);

      if (signerError || !signer) {
        return NextResponse.json(
          {
            success: false,
            error: `Không tìm thấy người có chức vụ ${SIGNATURE_TYPE_LABELS[signature_type]}`,
          },
          { status: 404 },
        );
      }

      const { data: inserted, error: insertError } =
        await insertManagementSignature(supabase, {
          signature_type,
          salary_month,
          payroll_type: payrollType,
          signed_by_id: signer.employee_id,
          signed_by_name: signer.full_name,
          department: signer.department,
          signed_at: new_signed_at,
          ip_address: "admin-override",
          device_info: "Admin Update Signature Date",
          notes: `Admin tạo chữ ký thay cho ${signer.full_name}`,
          is_active: true,
        });

      if (insertError) {
        return NextResponse.json(
          { error: "Lỗi khi tạo chữ ký", details: insertError.message },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: `Đã tạo chữ ký ${SIGNATURE_TYPE_LABELS[signature_type]} cho ${signer.full_name}`,
        signature: inserted,
      });
    }

    return NextResponse.json(
      { error: "Action không hợp lệ (update/create)" },
      { status: 400 },
    );
  } catch (error) {
    return toErrorResponse(error, {
      fallbackMessage: "Có lỗi xảy ra",
    });
  }
}
