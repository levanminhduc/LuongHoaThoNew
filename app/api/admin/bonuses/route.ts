import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { csrfProtection } from "@/lib/security-middleware";
import { verifyAdminAccess } from "@/lib/auth-middleware";
import { CACHE_HEADERS } from "@/lib/utils/cache-headers";
import { BonusTypeSchema, BonusPeriodSchema } from "@/lib/validations/bonus";
import type { BonusType } from "@/lib/validations/bonus";
import { toErrorResponse } from "@/lib/errors/app-error";

interface BonusPeriodTarget {
  bonus_type: BonusType;
  bonus_period: string;
}

function badRequest(message: string) {
  return NextResponse.json(
    { error: message },
    { status: 400, headers: CACHE_HEADERS.sensitive },
  );
}

async function hasActiveManagementSignature(
  supabase: ReturnType<typeof createServiceClient>,
  target: BonusPeriodTarget,
): Promise<boolean> {
  const { data } = await supabase
    .from("bonus_management_signatures")
    .select("id")
    .eq("bonus_type", target.bonus_type)
    .eq("bonus_period", target.bonus_period)
    .eq("is_active", true)
    .limit(1);
  return (data?.length ?? 0) > 0;
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
      const { data: batchRow, error: batchError } = await supabase
        .from("employee_bonuses")
        .select("bonus_type, bonus_period")
        .eq("import_batch_id", importBatchId)
        .limit(1)
        .single();
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

    let deleteQuery = supabase
      .from("employee_bonuses")
      .delete({ count: "exact" });
    if (importBatchId) {
      deleteQuery = deleteQuery.eq("import_batch_id", importBatchId);
    } else {
      deleteQuery = deleteQuery
        .eq("bonus_type", target.bonus_type)
        .eq("bonus_period", target.bonus_period);
    }

    const { count, error: deleteError } = await deleteQuery;
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
