import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30 * 60 * 1000;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

function hashIp(ip: string): string {
  return crypto
    .createHash("sha256")
    .update(ip + process.env.IP_SALT || "default-salt")
    .digest("hex")
    .substring(0, 16);
}

function shrinkUA(ua: string | null): string {
  if (!ua) return "unknown";
  const browser =
    ua.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/)?.[0] || "";
  const os = ua.match(/(Windows|Mac|Linux|Android|iOS)[\s\d.]*/)?.[0] || "";
  return `${browser} ${os}`.trim() || "unknown";
}

function checkRateLimit(identifier: string): {
  allowed: boolean;
  message?: string;
} {
  const now = Date.now();
  const limit = rateLimitMap.get(identifier);

  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return { allowed: true };
  }

  if (limit.count >= RATE_LIMIT_MAX) {
    const waitTime = Math.ceil((limit.resetTime - now) / 1000 / 60);
    return {
      allowed: false,
      message: `Quá nhiều lần thử. Vui lòng thử lại sau ${waitTime} phút.`,
    };
  }

  limit.count++;
  return { allowed: true };
}

async function logSecurityEvent(
  supabase: ReturnType<typeof createServiceClient>,
  employeeId: string | null,
  event: string,
  ipHash: string,
  userAgent: string,
  details?: Record<string, unknown>,
) {
  try {
    await supabase.from("employee_security_events").insert({
      employee_id: employeeId,
      event,
      ip_hash: ipHash,
      user_agent: userAgent,
      details: details || {},
      occurred_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to log security event:", error);
  }
}

async function logToSecurityLogs(
  supabase: ReturnType<typeof createServiceClient>,
  employeeId: string | null,
  action: string,
  ipAddress: string,
  _userAgent: string,
  details?: Record<string, unknown>,
) {
  try {
    await supabase.from("security_logs").insert({
      employee_id: employeeId,
      action,
      ip_address: ipAddress,
      details: JSON.stringify(details || {}),
      // created_at sẽ tự động được set bởi database trigger với múi giờ Việt Nam
    });
  } catch (error) {
    console.error("Failed to log to security_logs:", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employee_code, cccd, new_password } = body;

    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const ua = request.headers.get("user-agent");
    const ipHash = hashIp(ip);
    const userAgent = shrinkUA(ua);

    if (!employee_code || !cccd || !new_password) {
      return NextResponse.json(
        { error: "Vui lòng điền đầy đủ thông tin" },
        { status: 400 },
      );
    }

    if (new_password.length < 8) {
      return NextResponse.json(
        { error: "Mật khẩu mới phải có ít nhất 8 ký tự" },
        { status: 400 },
      );
    }

    if (!/[a-zA-Z]/.test(new_password) || !/[0-9]/.test(new_password)) {
      return NextResponse.json(
        { error: "Mật khẩu mới phải có cả chữ và số" },
        { status: 400 },
      );
    }

    const rateLimit = checkRateLimit(`forgot-pw:${ip}:${employee_code}`);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: rateLimit.message }, { status: 429 });
    }

    const supabase = createServiceClient();

    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select(
        "employee_id, cccd_hash, last_password_change_at, recovery_locked_until, recovery_fail_count",
      )
      .eq("employee_id", employee_code.trim())
      .single();

    if (employeeError || !employee) {
      await logSecurityEvent(
        supabase,
        null,
        "forgot_password_failed",
        ipHash,
        userAgent,
        { reason: "employee_not_found", employee_code },
      );
      await logToSecurityLogs(
        supabase,
        null,
        "forgot_password_failed",
        ip,
        userAgent,
        {
          reason: "employee_not_found",
          employee_code,
          user_agent: ua,
        },
      );
      return NextResponse.json(
        { error: "Thông tin không hợp lệ" },
        { status: 404 },
      );
    }

    if (employee.recovery_locked_until) {
      const lockExpiry = new Date(employee.recovery_locked_until);
      if (lockExpiry > new Date()) {
        await logSecurityEvent(
          supabase,
          employee.employee_id,
          "forgot_password_blocked",
          ipHash,
          userAgent,
          { reason: "account_locked" },
        );
        await logToSecurityLogs(
          supabase,
          employee.employee_id,
          "forgot_password_blocked",
          ip,
          userAgent,
          {
            reason: "account_locked",
            employee_code,
            user_agent: ua,
            locked_until: employee.recovery_locked_until,
          },
        );
        return NextResponse.json(
          {
            error:
              "Tài khoản tạm thời bị khóa do quá nhiều lần thử sai. Vui lòng thử lại sau 30 phút.",
          },
          { status: 403 },
        );
      }
    }

    if (employee.last_password_change_at) {
      const lastChangeDate = new Date(employee.last_password_change_at);
      const now = new Date();

      const hoursSinceLastChange =
        (now.getTime() - lastChangeDate.getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastChange < 24) {
        const hoursRemaining = Math.ceil(24 - hoursSinceLastChange);

        const lastChangeDateFormatted = lastChangeDate.toLocaleString("vi-VN", {
          timeZone: "Asia/Ho_Chi_Minh",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        await logSecurityEvent(
          supabase,
          employee.employee_id,
          "forgot_password_too_soon",
          ipHash,
          userAgent,
          {
            last_change_at: employee.last_password_change_at,
            last_change_datetime: lastChangeDateFormatted,
            hours_since_last_change: hoursSinceLastChange.toFixed(2),
            hours_remaining: hoursRemaining,
          },
        );

        return NextResponse.json(
          {
            error: `Vì lý do bảo mật, bạn chỉ có thể sử dụng chức năng Quên mật khẩu sau 24 giờ kể từ lần đổi mật khẩu trước. Bạn đã thay đổi mật khẩu vào lúc ${lastChangeDateFormatted}. Vui lòng thử lại sau ${hoursRemaining} giờ nữa hoặc liên hệ admin nếu cần hỗ trợ.`,
          },
          { status: 403 },
        );
      }
    }

    const isValidCCCD = await bcrypt.compare(cccd.trim(), employee.cccd_hash);

    if (!isValidCCCD) {
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
        failResult?.locked
          ? "forgot_password_account_locked"
          : "forgot_password_failed",
        ipHash,
        userAgent,
        {
          reason: "invalid_cccd",
          fail_count: failResult?.fail_count,
          locked: failResult?.locked,
        },
      );

      await logToSecurityLogs(
        supabase,
        employee.employee_id,
        failResult?.locked
          ? "forgot_password_blocked"
          : "forgot_password_failed",
        ip,
        userAgent,
        {
          reason: "invalid_cccd",
          employee_code,
          user_agent: ua,
          fail_count: failResult?.fail_count,
          locked: failResult?.locked,
        },
      );

      return NextResponse.json(
        { error: "Thông tin không hợp lệ" },
        { status: 401 },
      );
    }

    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(new_password.trim(), saltRounds);

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
        "forgot_password_error",
        ipHash,
        userAgent,
        { error: updateError.message },
      );

      await logToSecurityLogs(
        supabase,
        employee.employee_id,
        "forgot_password_failed",
        ip,
        userAgent,
        {
          reason: "update_error",
          employee_code,
          user_agent: ua,
          error: updateError.message,
        },
      );

      return NextResponse.json(
        { error: "Không thể cập nhật mật khẩu. Vui lòng thử lại." },
        { status: 500 },
      );
    }

    const firstTimeChange = !employee.last_password_change_at;

    await logSecurityEvent(
      supabase,
      employee.employee_id,
      "forgot_password_success",
      ipHash,
      userAgent,
      {
        password_reset_via_forgot_password: true,
      },
    );

    await logToSecurityLogs(
      supabase,
      employee.employee_id,
      "forgot_password_success",
      ip,
      userAgent,
      {
        employee_code,
        user_agent: ua,
        first_time_change: firstTimeChange,
      },
    );

    return NextResponse.json({
      success: true,
      message:
        "Đặt lại mật khẩu thành công! Vui lòng đăng nhập với mật khẩu mới.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra. Vui lòng thử lại sau." },
      { status: 500 },
    );
  }
}
