import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { csrfProtection } from "@/lib/security-middleware";
import { verifyAdminAccess } from "@/lib/auth-middleware";
import { CACHE_HEADERS } from "@/lib/utils/cache-headers";
import { BonusTypeSchema, BonusPeriodSchema } from "@/lib/validations/bonus";
import { toErrorResponse } from "@/lib/errors/app-error";
import {
  buildBonusDeleteQuery,
  findBonusPeriodByImportBatch,
} from "@/lib/bonus/bonus-repository";
import {
  hasActiveManagementSignature,
  type BonusPeriodTarget,
} from "@/lib/bonus/bonus-signature-repository";

function badRequest(message: string) {
  return NextResponse.json(
    { error: message },
    { status: 400, headers: CACHE_HEADERS.sensitive },
  );
}

export async function DELETE(request: NextRequest) {
  try {
    const csrfResult = csrfProtection(request);
    if (csrfResult) return csrfResult;

    const auth = verifyAdminAccess(request);
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status, headers: CACHE_HEADERS.sensitive },
      );
    }

    const { searchParams } = new URL(request.url);
    const importBatchId = searchParams.get("import_batch_id");
    const bonusType = BonusTypeSchema.safeParse(searchParams.get("bonus_type"));
    const bonusPeriod = BonusPeriodSchema.safeParse(
      searchParams.get("bonus_period"),
    );

    const supabase = createServiceClient();

    let target: BonusPeriodTarget;
    if (importBatchId) {
      const { data: batchRow, error: batchError } =
        await findBonusPeriodByImportBatch(supabase, importBatchId);
      if (batchError || !batchRow) {
        return badRequest("Không tìm thấy dữ liệu của lần import này");
      }
      target = batchRow as BonusPeriodTarget;
    } else if (bonusType.success && bonusPeriod.success) {
      target = { bonus_type: bonusType.data, bonus_period: bonusPeriod.data };
    } else {
      return badRequest(
        "Cần cung cấp import_batch_id hoặc (bonus_type + bonus_period)",
      );
    }

    if (await hasActiveManagementSignature(supabase, target)) {
      return badRequest("Đợt đã được ký duyệt, cần hủy chữ ký trước");
    }

    const { count, error: deleteError } = await buildBonusDeleteQuery(
      supabase,
      {
        importBatchId,
        bonusType: target.bonus_type,
        bonusPeriod: target.bonus_period,
      },
    );
    if (deleteError) {
      console.error("Delete bonuses error:", deleteError);
      return NextResponse.json(
        { error: "Lỗi khi xóa đợt thưởng" },
        { status: 500, headers: CACHE_HEADERS.sensitive },
      );
    }

    return NextResponse.json(
      { success: true, deletedCount: count ?? 0 },
      { headers: CACHE_HEADERS.sensitive },
    );
  } catch (error) {
    console.error("Delete bonuses error:", error);
    return toErrorResponse(error, {
      fallbackMessage: "Có lỗi xảy ra khi xóa đợt thưởng",
      headers: CACHE_HEADERS.sensitive,
    });
  }
}
