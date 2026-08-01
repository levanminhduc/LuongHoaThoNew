import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { CACHE_HEADERS } from "@/lib/utils/cache-headers";
import {
  verifyBonusViewer,
  resolveAllowedDepartments,
} from "@/lib/bonus/bonus-access";
import { BONUS_TYPE_LABELS } from "@/lib/validations/bonus";
import type { BonusType } from "@/lib/validations/bonus";
import type {
  BonusPeriodOption,
  BonusPeriodsResponse,
} from "@/lib/bonus/bonus-types";
import { toErrorResponse } from "@/lib/errors/app-error";

interface PeriodRow {
  bonus_type: BonusType;
  bonus_period: string;
  bonus_title: string | null;
}

function dedupePeriods(rows: PeriodRow[]): BonusPeriodOption[] {
  const seen = new Set<string>();
  const periods: BonusPeriodOption[] = [];
  for (const row of rows) {
    const key = `${row.bonus_type}__${row.bonus_period}`;
    if (seen.has(key)) continue;
    seen.add(key);
    periods.push({
      bonus_type: row.bonus_type,
      bonus_type_label: BONUS_TYPE_LABELS[row.bonus_type],
      bonus_period: row.bonus_period,
      bonus_title: row.bonus_title,
    });
  }
  return periods;
}

export async function GET(request: NextRequest) {
  try {
    const access = verifyBonusViewer(request);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status, headers: CACHE_HEADERS.sensitive },
      );
    }

    const { searchParams } = new URL(request.url);
    const allowedDepartments = resolveAllowedDepartments(
      access.auth,
      searchParams.get("department"),
    );

    const supabase = createServiceClient();
    let query = supabase
      .from("employee_bonuses")
      .select(
        "bonus_type, bonus_period, bonus_title, created_at, employees!inner(department)",
      );

    if (allowedDepartments !== null) {
      query = query.in("employees.department", allowedDepartments);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      console.error("Get bonus periods error:", error);
      return NextResponse.json(
        { error: "Lỗi khi lấy danh sách đợt thưởng" },
        { status: 500, headers: CACHE_HEADERS.sensitive },
      );
    }

    const response: BonusPeriodsResponse = {
      periods: dedupePeriods((data ?? []) as unknown as PeriodRow[]),
    };

    return NextResponse.json(response, { headers: CACHE_HEADERS.sensitive });
  } catch (error) {
    console.error("Get bonus periods error:", error);
    return toErrorResponse(error, {
      fallbackMessage: "Có lỗi xảy ra khi lấy danh sách đợt thưởng",
      headers: CACHE_HEADERS.sensitive,
    });
  }
}
