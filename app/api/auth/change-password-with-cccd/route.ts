import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import bcrypt from "bcryptjs";
import {
  hasChangedPassword,
  verifyEmployeeCredential,
} from "@/lib/auth/employee-credential";
import { BCRYPT_ROUNDS } from "@/lib/constants/security";
import { getEnv } from "@/lib/config/env";
import { hashClientIp } from "@/lib/utils/hash-ip";
import { rateLimit, csrfProtection } from "@/lib/security-middleware";
import { CACHE_HEADERS } from "@/lib/utils/cache-headers";
import {
  parseSchema,
  createValidationErrorResponse,
  ChangePasswordWithCccdRequestSchema,
} from "@/lib/validations";
import { toErrorResponse } from "@/lib/errors/app-error";
import {
  findEmployeeForPasswordRecovery,
  findEmployeePasswordState,
} from "@/lib/employee/employee-auth-repository";
import {
  insertEmployeeSecurityEvent,
  type SupabaseServiceClient,
} from "@/lib/audit/audit-log-repository";

// Constants for account-level lockout (passed to DB RPC)
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes

// Shrink user agent to essential info
function shrinkUA(ua: string | null): string {
  if (!ua) return "unknown";
  // Extract browser and OS info only
  const browser =
    ua.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/)?.[0] || "";
  const os = ua.match(/(Windows|Mac|Linux|Android|iOS)[\s\d.]*/)?.[0] || "";
  return `${browser} ${os}`.trim() || "unknown";
}

async function logSecurityEvent(
  supabase: SupabaseServiceClient,
  employeeId: string | null,
  event: string,
  ipHash: string,
  userAgent: string,
  details?: Record<string, unknown>,
) {
  await insertEmployeeSecurityEvent(supabase, {
    employeeId,
    event,
    ipHash,
    userAgent,
    details,
  });
}

// Generic success response (neutral message for security)
function okGeneric() {
  return NextResponse.json(
    {
      success: true,
      message:
        "Nếu thông tin hợp lệ, mật khẩu đã được cập nhật. Vui lòng thử đăng nhập với mật khẩu mới.",
    },
    { status: 200, headers: CACHE_HEADERS.sensitive },
  );
}

export async function POST(request: NextRequest) {
  try {
    const csrfResult = csrfProtection(request);
    if (csrfResult) return csrfResult;

    const body = await request.json();
    const parsed = parseSchema(ChangePasswordWithCccdRequestSchema, body);
    if (!parsed.success) {
      return NextResponse.json(createValidationErrorResponse(parsed.errors), {
        status: 400,
        headers: CACHE_HEADERS.sensitive,
      });
    }
    const { employee_code, cccd, new_password } = parsed.data;

    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const ua = request.headers.get("user-agent");
    const ipHash = hashClientIp(ip, getEnv().IP_SALT);
    const userAgent = shrinkUA(ua);

    const rateLimitResult = rateLimit("passwordReset")(request);
    if (rateLimitResult) return rateLimitResult;

    const supabase = createServiceClient();

    // Step 1: Get employee with necessary fields only
    const { data: employee, error: employeeError } =
      await findEmployeeForPasswordRecovery(supabase, employee_code.trim());

    // Don't reveal if user exists or not
    if (employeeError || !employee) {
      await logSecurityEvent(
        supabase,
        null,
        "change_pw_cccd_failed",
        ipHash,
        userAgent,
        { reason: "employee_not_found", employee_code },
      );
      return okGeneric(); // Neutral response
    }

    // Step 2: Check if account is locked
    if (employee.recovery_locked_until) {
      const lockExpiry = new Date(employee.recovery_locked_until);
      if (lockExpiry > new Date()) {
        await logSecurityEvent(
          supabase,
          employee.employee_id,
          "change_pw_cccd_blocked",
          ipHash,
          userAgent,
          { reason: "account_locked" },
        );
        return okGeneric(); // Neutral response
      }
    }

    const isValidCCCD = await verifyEmployeeCredential(employee, cccd.trim());

    if (!isValidCCCD) {
      // Increment fail count and possibly lock
      const { data: failResult } = await supabase.rpc(
        "handle_password_reset_failure",
        {
          p_employee_id: employee.employee_id,
          p_max_attempts: MAX_ATTEMPTS,
          p_lock_duration: `${LOCKOUT_DURATION / 60000} minutes`,
        },
      );

      await logSecurityEvent(
        supabase,
        employee.employee_id,
        failResult?.locked ? "account_locked" : "change_pw_cccd_failed",
        ipHash,
        userAgent,
        {
          reason: hasChangedPassword(employee)
            ? "invalid_password"
            : "invalid_cccd",
          fail_count: failResult?.fail_count,
          locked: failResult?.locked,
        },
      );

      return okGeneric(); // Neutral response
    }

    // Step 4: Hash new password and update ONLY password_hash
    const newPasswordHash = await bcrypt.hash(
      new_password.trim(),
      BCRYPT_ROUNDS,
    );

    // Use the stored function for atomic update
    const { error: updateError } = await supabase.rpc(
      "update_employee_password",
      {
        p_employee_id: employee.employee_id,
        p_new_password_hash: newPasswordHash,
      },
    );

    if (updateError) {
      console.error("Password update error:", updateError);

      await logSecurityEvent(
        supabase,
        employee.employee_id,
        "password_change_error",
        ipHash,
        userAgent,
        { error: updateError.message },
      );

      return NextResponse.json(
        { error: "Không thể cập nhật mật khẩu. Vui lòng thử lại." },
        { status: 500, headers: CACHE_HEADERS.sensitive },
      );
    }

    // Step 5: Log successful password change
    await logSecurityEvent(
      supabase,
      employee.employee_id,
      "password_changed_via_cccd",
      ipHash,
      userAgent,
      {
        password_version_incremented: true,
        first_time_change:
          !employee.password_hash ||
          employee.password_hash === employee.cccd_hash,
      },
    );

    // Return success with clear message
    return NextResponse.json(
      {
        success: true,
        message:
          "Đổi mật khẩu thành công! Vui lòng đăng nhập với mật khẩu mới.",
        data: {
          password_changed: true,
        },
      },
      { headers: CACHE_HEADERS.sensitive },
    );
  } catch (error) {
    console.error("Password reset error:", error);
    return toErrorResponse(error, {
      fallbackMessage: "Có lỗi xảy ra. Vui lòng thử lại sau.",
      headers: CACHE_HEADERS.sensitive,
    });
  }
}

// GET endpoint to check if user needs password change
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeCode = searchParams.get("employee_code");

    if (!employeeCode) {
      return NextResponse.json(
        { error: "Thiếu mã nhân viên" },
        { status: 400, headers: CACHE_HEADERS.sensitive },
      );
    }

    const supabase = createServiceClient();

    const { data: employee, error } = await findEmployeePasswordState(
      supabase,
      employeeCode,
    );

    if (error || !employee) {
      return NextResponse.json(
        { error: "Không tìm thấy nhân viên" },
        { status: 404, headers: CACHE_HEADERS.sensitive },
      );
    }

    // Check if still using CCCD as password
    const isUsingCCCD =
      !employee.password_hash ||
      employee.password_hash === employee.cccd_hash ||
      !employee.last_password_change_at;

    return NextResponse.json(
      {
        using_cccd_as_password: isUsingCCCD,
        password_version: employee.password_version || 0,
        last_change: employee.last_password_change_at,
      },
      { headers: CACHE_HEADERS.sensitive },
    );
  } catch (error) {
    console.error("Check password status error:", error);
    return toErrorResponse(error, {
      fallbackMessage: "Có lỗi xảy ra",
      headers: CACHE_HEADERS.sensitive,
    });
  }
}
