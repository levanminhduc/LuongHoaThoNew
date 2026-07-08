import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import bcrypt from "bcryptjs";
import { verifyEmployeeSession } from "@/lib/employee-session";
import { csrfProtection } from "@/lib/security-middleware";
import { formatSignatureTime } from "@/lib/utils/date-formatter";
import { CACHE_HEADERS } from "@/lib/utils/cache-headers";
import {
  parseSchema,
  createValidationErrorResponse,
} from "@/lib/validations/errors";
import {
  EmployeeSignBonusRequestSchema,
  BONUS_TYPE_LABELS,
} from "@/lib/validations/bonus";
import type { SignBonusResponse } from "@/lib/bonus/bonus-types";

interface SignBonusRpcResult {
  success: boolean;
  error?: "BONUS_NOT_FOUND" | "ALREADY_SIGNED";
  signed_at?: string;
  signed_by_name?: string;
}

type AuthenticatedEmployee =
  | { ok: true; employee_id: string }
  | { ok: false; response: NextResponse };

async function authenticateEmployee(
  request: NextRequest,
  supabase: ReturnType<typeof createServiceClient>,
  bodyEmployeeId: string | undefined,
  cccd: string | undefined,
): Promise<AuthenticatedEmployee> {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const session = verifyEmployeeSession(authHeader.slice(7));
    if (!session) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Phien lam viec het han", code: "SESSION_EXPIRED" },
          { status: 401, headers: CACHE_HEADERS.sensitive },
        ),
      };
    }
    return { ok: true, employee_id: session.employee_id };
  }

  if (!bodyEmployeeId || !cccd) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Thiếu thông tin bắt buộc (mã nhân viên, CCCD)" },
        { status: 400, headers: CACHE_HEADERS.sensitive },
      ),
    };
  }

  const { data: employee, error } = await supabase
    .from("employees")
    .select("employee_id, cccd_hash, password_hash, last_password_change_at")
    .eq("employee_id", bodyEmployeeId.trim())
    .single();

  if (error || !employee) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Không tìm thấy nhân viên với mã nhân viên đã nhập" },
        { status: 404, headers: CACHE_HEADERS.sensitive },
      ),
    };
  }

  const hasChangedPassword = employee.last_password_change_at !== null;
  const hashToVerify = hasChangedPassword
    ? employee.password_hash
    : employee.cccd_hash;
  const isValid = await bcrypt.compare(cccd.trim(), hashToVerify);
  if (!isValid) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: hasChangedPassword
            ? "Mật khẩu không đúng"
            : "Số CCCD không đúng",
        },
        { status: 401, headers: CACHE_HEADERS.sensitive },
      ),
    };
  }

  return { ok: true, employee_id: bodyEmployeeId.trim() };
}

export async function POST(request: NextRequest) {
  try {
    const csrfResult = csrfProtection(request);
    if (csrfResult) return csrfResult;

    const body = await request.json();
    const parsed = parseSchema(EmployeeSignBonusRequestSchema, body);
    if (!parsed.success) {
      return NextResponse.json(createValidationErrorResponse(parsed.errors), {
        status: 400,
        headers: CACHE_HEADERS.sensitive,
      });
    }
    const { bonus_type, bonus_period, employee_id, cccd } = parsed.data;

    const supabase = createServiceClient();
    const auth = await authenticateEmployee(
      request,
      supabase,
      employee_id,
      cccd,
    );
    if (!auth.ok) return auth.response;

    const clientIP =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    const { data: signResult, error: signError } = await supabase.rpc(
      "sign_bonus",
      {
        p_employee_id: auth.employee_id,
        p_bonus_type: bonus_type,
        p_bonus_period: bonus_period,
        p_ip_address: clientIP,
        p_device_info: userAgent,
      },
    );

    if (signError) {
      console.error("Sign bonus error:", signError);
      return NextResponse.json(
        { error: "Lỗi hệ thống khi ký nhận: " + signError.message },
        { status: 500, headers: CACHE_HEADERS.sensitive },
      );
    }

    const result = signResult as SignBonusRpcResult;

    if (result?.error === "BONUS_NOT_FOUND") {
      return NextResponse.json(
        { error: "Không tìm thấy đợt thưởng để ký nhận" },
        { status: 404, headers: CACHE_HEADERS.sensitive },
      );
    }

    if (result?.error === "ALREADY_SIGNED") {
      return NextResponse.json(
        {
          error: "Bạn đã ký nhận đợt thưởng này rồi",
          signed_at: result.signed_at ?? null,
          signed_at_display: result.signed_at
            ? formatSignatureTime(result.signed_at)
            : null,
          signed_by_name: result.signed_by_name ?? null,
        },
        { status: 400, headers: CACHE_HEADERS.sensitive },
      );
    }

    if (!result?.success || !result.signed_at) {
      return NextResponse.json(
        { error: "Không thể ký nhận tiền thưởng" },
        { status: 400, headers: CACHE_HEADERS.sensitive },
      );
    }

    const response: SignBonusResponse = {
      success: true,
      message: `Ký nhận ${BONUS_TYPE_LABELS[bonus_type]} thành công!`,
      bonus_type,
      bonus_period,
      signed_by_name: result.signed_by_name ?? "",
      signed_at: result.signed_at,
      signed_at_display: formatSignatureTime(result.signed_at),
    };

    return NextResponse.json(response, { headers: CACHE_HEADERS.sensitive });
  } catch (error) {
    console.error("Sign bonus API error:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi ký nhận tiền thưởng" },
      { status: 500, headers: CACHE_HEADERS.sensitive },
    );
  }
}
