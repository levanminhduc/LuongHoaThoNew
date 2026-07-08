import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyToken } from "@/lib/auth-middleware";
import { csrfProtection } from "@/lib/security-middleware";
import { CACHE_HEADERS } from "@/lib/utils/cache-headers";
import {
  parseSchema,
  createValidationErrorResponse,
} from "@/lib/validations/errors";
import {
  BonusManagementSignatureRequestSchema,
  BonusTypeSchema,
  BonusPeriodSchema,
} from "@/lib/validations";
import {
  BONUS_SIGNER_ROLES,
  getBonusManagementSignatureStatus,
} from "@/lib/bonus/bonus-signature-status";
import { createBonusManagementSignature } from "@/lib/bonus/bonus-signature-service";

function isBonusSignerRole(role: string): boolean {
  return (BONUS_SIGNER_ROLES as readonly string[]).includes(role);
}

export async function POST(request: NextRequest) {
  try {
    const csrfResult = csrfProtection(request);
    if (csrfResult) return csrfResult;

    const auth = verifyToken(request);
    if (!auth || !isBonusSignerRole(auth.user.role)) {
      return NextResponse.json(
        { error: "Không có quyền ký xác nhận" },
        { status: 403, headers: CACHE_HEADERS.sensitive },
      );
    }

    const body = await request.json();
    const parsed = parseSchema(BonusManagementSignatureRequestSchema, body);
    if (!parsed.success) {
      return NextResponse.json(createValidationErrorResponse(parsed.errors), {
        status: 400,
        headers: CACHE_HEADERS.sensitive,
      });
    }

    if (
      auth.user.role !== "admin" &&
      auth.user.role !== parsed.data.signature_type
    ) {
      return NextResponse.json(
        { error: "Chức vụ không có quyền ký loại này" },
        { status: 403, headers: CACHE_HEADERS.sensitive },
      );
    }

    const supabase = createServiceClient();
    const result = await createBonusManagementSignature(
      supabase,
      request,
      parsed.data,
      auth.user.employee_id,
      auth.user.role === "admin",
    );

    return NextResponse.json(result.body, {
      status: result.status,
      headers: CACHE_HEADERS.sensitive,
    });
  } catch (error) {
    console.error("Bonus management signature error:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi ký xác nhận đợt thưởng" },
      { status: 500, headers: CACHE_HEADERS.sensitive },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = verifyToken(request);
    if (!auth || !isBonusSignerRole(auth.user.role)) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 403, headers: CACHE_HEADERS.sensitive },
      );
    }

    const { searchParams } = new URL(request.url);
    const bonusType = BonusTypeSchema.safeParse(searchParams.get("bonus_type"));
    const bonusPeriod = BonusPeriodSchema.safeParse(
      searchParams.get("bonus_period"),
    );
    if (!bonusType.success || !bonusPeriod.success) {
      return NextResponse.json(
        { error: "Vui lòng chọn đợt thưởng hợp lệ" },
        { status: 400, headers: CACHE_HEADERS.sensitive },
      );
    }

    const supabase = createServiceClient();
    const result = await getBonusManagementSignatureStatus(
      supabase,
      bonusType.data,
      bonusPeriod.data,
    );

    return NextResponse.json(result.body, {
      status: result.status,
      headers: CACHE_HEADERS.sensitive,
    });
  } catch (error) {
    console.error("Bonus management signature status error:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi lấy trạng thái chữ ký đợt thưởng" },
      { status: 500, headers: CACHE_HEADERS.sensitive },
    );
  }
}
