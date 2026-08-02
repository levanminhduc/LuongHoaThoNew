import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyEmployeeSession } from "@/lib/employee-session";
import { formatSignatureTime } from "@/lib/utils/date-formatter";
import { CACHE_HEADERS } from "@/lib/utils/cache-headers";
import { BONUS_TYPE_LABELS } from "@/lib/validations/bonus";
import type { BonusType, BonusDetailItem } from "@/lib/validations/bonus";
import type {
  EmployeeBonusItem,
  EmployeeBonusesResponse,
} from "@/lib/bonus/bonus-types";
import { toErrorResponse } from "@/lib/errors/app-error";
import { findEmployeeBonuses } from "@/lib/bonus/bonus-repository";

interface EmployeeBonusRow {
  bonus_type: BonusType;
  bonus_period: string;
  bonus_title: string | null;
  amount: number;
  detail_data: BonusDetailItem[];
  is_signed: boolean;
  signed_at: string | null;
}

function toEmployeeBonusItem(row: EmployeeBonusRow): EmployeeBonusItem {
  return {
    bonus_type: row.bonus_type,
    bonus_type_label: BONUS_TYPE_LABELS[row.bonus_type],
    bonus_period: row.bonus_period,
    bonus_title: row.bonus_title,
    amount: row.amount ?? 0,
    detail_data: Array.isArray(row.detail_data) ? row.detail_data : [],
    is_signed: row.is_signed ?? false,
    signed_at: row.signed_at,
    signed_at_display: row.signed_at
      ? formatSignatureTime(row.signed_at)
      : null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Phien khong hop le", code: "INVALID_SESSION" },
        { status: 401, headers: CACHE_HEADERS.sensitive },
      );
    }

    const session = verifyEmployeeSession(authHeader.slice(7));
    if (!session) {
      return NextResponse.json(
        { error: "Phien lam viec het han", code: "SESSION_EXPIRED" },
        { status: 401, headers: CACHE_HEADERS.sensitive },
      );
    }

    const supabase = createServiceClient();
    const { data, error } = await findEmployeeBonuses(
      supabase,
      session.employee_id,
    );

    if (error) {
      console.error("Employee bonuses error:", error);
      return NextResponse.json(
        { error: "Lỗi khi lấy danh sách tiền thưởng" },
        { status: 500, headers: CACHE_HEADERS.sensitive },
      );
    }

    const response: EmployeeBonusesResponse = {
      bonuses: ((data ?? []) as EmployeeBonusRow[]).map(toEmployeeBonusItem),
    };

    return NextResponse.json(response, { headers: CACHE_HEADERS.sensitive });
  } catch (error) {
    console.error("Employee bonuses error:", error);
    return toErrorResponse(error, {
      fallbackMessage: "Có lỗi xảy ra khi lấy danh sách tiền thưởng",
      headers: CACHE_HEADERS.sensitive,
    });
  }
}
