import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { CACHE_HEADERS } from "@/lib/utils/cache-headers";
import {
  verifyBonusViewer,
  resolveAllowedDepartments,
} from "@/lib/bonus/bonus-access";
import {
  BonusTypeSchema,
  BonusPeriodSchema,
  BONUS_TYPE_LABELS,
} from "@/lib/validations/bonus";
import type { BonusListRow, BonusListResponse } from "@/lib/bonus/bonus-types";
import { toErrorResponse } from "@/lib/errors/app-error";
import { buildBonusListQuery } from "@/lib/bonus/bonus-repository";

interface BonusRowWithEmployee {
  employee_id: string;
  bonus_type: BonusListRow["bonus_type"];
  bonus_period: string;
  bonus_title: string | null;
  amount: number;
  detail_data: BonusListRow["detail_data"];
  is_signed: boolean;
  signed_at: string | null;
  employees: {
    full_name: string;
    department: string | null;
    chuc_vu: string | null;
  } | null;
}

function toBonusListRow(row: BonusRowWithEmployee): BonusListRow {
  return {
    employee_id: row.employee_id,
    full_name: row.employees?.full_name ?? "",
    department: row.employees?.department ?? null,
    chuc_vu: row.employees?.chuc_vu ?? null,
    bonus_type: row.bonus_type,
    bonus_type_label: BONUS_TYPE_LABELS[row.bonus_type],
    bonus_period: row.bonus_period,
    bonus_title: row.bonus_title,
    amount: row.amount ?? 0,
    detail_data: Array.isArray(row.detail_data) ? row.detail_data : [],
    is_signed: row.is_signed ?? false,
    signed_at: row.signed_at,
  };
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

    const allowedDepartments = resolveAllowedDepartments(
      access.auth,
      searchParams.get("department"),
    );

    const supabase = createServiceClient();
    const { data, error } = await buildBonusListQuery(
      supabase,
      { bonusType: bonusType.data, bonusPeriod: bonusPeriod.data },
      allowedDepartments,
    );

    if (error) {
      console.error("Get bonuses error:", error);
      return NextResponse.json(
        { error: "Lỗi khi lấy dữ liệu tiền thưởng" },
        { status: 500, headers: CACHE_HEADERS.sensitive },
      );
    }

    const rows = ((data ?? []) as unknown as BonusRowWithEmployee[]).map(
      toBonusListRow,
    );

    const response: BonusListResponse = {
      rows,
      totalCount: rows.length,
      signedCount: rows.filter((row) => row.is_signed).length,
    };

    return NextResponse.json(response, { headers: CACHE_HEADERS.sensitive });
  } catch (error) {
    console.error("Get bonuses error:", error);
    return toErrorResponse(error, {
      fallbackMessage: "Có lỗi xảy ra khi lấy dữ liệu tiền thưởng",
      headers: CACHE_HEADERS.sensitive,
    });
  }
}
