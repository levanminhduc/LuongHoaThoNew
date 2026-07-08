import type { NextRequest } from "next/server";
import { getVietnamTimestamp } from "@/lib/utils/vietnam-timezone";
import type { BonusManagementSignatureRequest } from "@/lib/validations/bonus";
import type { BonusManagementSignatureSuccess } from "@/lib/bonus/bonus-types";
import {
  type SupabaseServiceClient,
  type BonusSignatureServiceResult,
  loadEmployeeSignProgress,
  toBonusSignatureRecord,
  resolveClientIp,
} from "@/lib/bonus/bonus-signature-status";

export async function createBonusManagementSignature(
  supabase: SupabaseServiceClient,
  request: NextRequest,
  input: BonusManagementSignatureRequest,
  signerEmployeeId: string,
  isAdmin: boolean,
): Promise<BonusSignatureServiceResult> {
  const { bonus_type, bonus_period, signature_type, notes, device_info } =
    input;

  const progress = await loadEmployeeSignProgress(
    supabase,
    bonus_type,
    bonus_period,
  );
  if (!progress) {
    return {
      status: 500,
      body: { error: "Lỗi khi kiểm tra danh sách đợt thưởng" },
    };
  }

  if (progress.total === 0) {
    return {
      status: 404,
      body: { error: "Không tìm thấy đợt thưởng để ký duyệt" },
    };
  }

  if (progress.signed !== progress.total) {
    return {
      status: 400,
      body: {
        error: "Chưa đủ 100% nhân viên trong đợt thưởng ký nhận",
        details: {
          total: progress.total,
          signed: progress.signed,
          completion_percentage: progress.percentage,
          message: `Cần ${progress.total - progress.signed} nhân viên ký thêm để đạt 100%`,
        },
      },
    };
  }

  const { data: employee, error: empError } = await supabase
    .from("employees")
    .select("employee_id, full_name, department, chuc_vu")
    .eq("employee_id", signerEmployeeId)
    .eq("is_active", true)
    .single();

  if (empError || !employee) {
    return {
      status: 400,
      body: { error: "Nhân viên không tồn tại hoặc đã bị khóa" },
    };
  }

  if (employee.chuc_vu !== signature_type && !isAdmin) {
    return {
      status: 400,
      body: { error: "Chức vụ nhân viên không khớp với loại chữ ký" },
    };
  }

  const { data: existingSignature } = await supabase
    .from("bonus_management_signatures")
    .select("*")
    .eq("bonus_type", bonus_type)
    .eq("bonus_period", bonus_period)
    .eq("signature_type", signature_type)
    .eq("is_active", true)
    .maybeSingle();

  if (existingSignature) {
    return {
      status: 400,
      body: {
        error: "Đã có chữ ký cho loại này trong đợt thưởng",
        existing_signature: {
          signed_by_id: existingSignature.signed_by_id,
          signed_by_name: existingSignature.signed_by_name,
          signed_at: existingSignature.signed_at,
          department: existingSignature.department,
        },
      },
    };
  }

  const signatureRecord = {
    id: crypto.randomUUID(),
    signature_type,
    bonus_type,
    bonus_period,
    signed_by_id: employee.employee_id,
    signed_by_name: employee.full_name,
    department: employee.department,
    signed_at: getVietnamTimestamp(),
    ip_address: resolveClientIp(request),
    device_info: device_info || "Unknown",
    notes: notes || null,
    is_active: true,
  };

  const { data: insertedSignature, error: insertError } = await supabase
    .from("bonus_management_signatures")
    .insert(signatureRecord)
    .select()
    .single();

  if (insertError || !insertedSignature) {
    console.error("Error inserting bonus signature:", insertError);
    return { status: 500, body: { error: "Lỗi khi lưu chữ ký đợt thưởng" } };
  }

  const success: BonusManagementSignatureSuccess = {
    success: true,
    message: "Ký xác nhận đợt thưởng thành công",
    signature: toBonusSignatureRecord(insertedSignature),
  };
  return { status: 200, body: success as unknown as Record<string, unknown> };
}
