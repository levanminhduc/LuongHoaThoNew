import "server-only";
import type { NextRequest } from "next/server";
import type { createServiceClient } from "@/utils/supabase/server";
import { SIGNATURE_TYPES } from "@/lib/validations";
import type { SignatureType } from "@/lib/validations/common";
import type { BonusType } from "@/lib/validations/bonus";
import type {
  BonusSignatureRecord,
  BonusEmployeeSignProgress,
  BonusManagementSignatureStatus,
} from "@/lib/bonus/bonus-types";
import {
  findActiveBonusSignatures,
  findBonusSignFlags,
  type BonusSignatureRow,
} from "@/lib/bonus/bonus-repository";

export const BONUS_SIGNER_ROLES = [
  "admin",
  "giam_doc",
  "ke_toan",
  "nguoi_lap_bieu",
] as const;

const PERCENTAGE_ROUNDING_FACTOR = 100;

export type SupabaseServiceClient = ReturnType<typeof createServiceClient>;

interface BonusSignFlag {
  employee_id: string;
  is_signed: boolean;
}

export interface BonusSignatureServiceResult {
  status: number;
  body: Record<string, unknown>;
}

export function resolveClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function computeCompletionPercentage(signed: number, total: number): number {
  if (total === 0) return 0;
  return (
    Math.round((signed / total) * 100 * PERCENTAGE_ROUNDING_FACTOR) /
    PERCENTAGE_ROUNDING_FACTOR
  );
}

function summarizeEmployeeSignProgress(
  bonuses: BonusSignFlag[],
): BonusEmployeeSignProgress {
  const total = bonuses.length;
  const signed = bonuses.filter((bonus) => bonus.is_signed).length;
  return {
    total,
    signed,
    percentage: computeCompletionPercentage(signed, total),
  };
}

export function toBonusSignatureRecord(
  row: BonusSignatureRow,
): BonusSignatureRecord {
  return {
    signature_type: row.signature_type as SignatureType,
    bonus_type: row.bonus_type as BonusType,
    bonus_period: String(row.bonus_period),
    signed_by_id: String(row.signed_by_id),
    signed_by_name: String(row.signed_by_name),
    department: row.department ?? null,
    signed_at: String(row.signed_at),
    notes: row.notes ?? null,
  };
}

export async function loadEmployeeSignProgress(
  supabase: SupabaseServiceClient,
  bonusType: BonusType,
  bonusPeriod: string,
): Promise<BonusEmployeeSignProgress | null> {
  const flags = await findBonusSignFlags(supabase, bonusType, bonusPeriod);
  if (!flags) return null;
  return summarizeEmployeeSignProgress(flags);
}

export async function getBonusManagementSignatureStatus(
  supabase: SupabaseServiceClient,
  bonusType: BonusType,
  bonusPeriod: string,
): Promise<BonusSignatureServiceResult> {
  const progress = await loadEmployeeSignProgress(
    supabase,
    bonusType,
    bonusPeriod,
  );
  if (!progress) {
    return {
      status: 500,
      body: { error: "Lỗi khi kiểm tra danh sách đợt thưởng" },
    };
  }

  const signatureRows = await findActiveBonusSignatures(
    supabase,
    bonusType,
    bonusPeriod,
  );

  if (!signatureRows) {
    return {
      status: 500,
      body: { error: "Lỗi khi lấy trạng thái chữ ký đợt thưởng" },
    };
  }

  const signatures = SIGNATURE_TYPES.reduce(
    (acc, type) => {
      const matched = signatureRows.find((row) => row.signature_type === type);
      acc[type] = matched ? toBonusSignatureRecord(matched) : null;
      return acc;
    },
    {} as Record<SignatureType, BonusSignatureRecord | null>,
  );

  const status: BonusManagementSignatureStatus = {
    bonus_type: bonusType,
    bonus_period: bonusPeriod,
    employee_sign_progress: progress,
    signatures,
  };
  return { status: 200, body: status as unknown as Record<string, unknown> };
}
