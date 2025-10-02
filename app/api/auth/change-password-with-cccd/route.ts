import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Rate limiting map (in production, use Redis/KV store)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Constants
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 5; // 5 attempts per 15 minutes

// Hash IP for privacy (don't store raw IPs)
function hashIp(ip: string): string {
  return crypto
    .createHash("sha256")
    .update(ip + process.env.IP_SALT || "default-salt")
    .digest("hex")
    .substring(0, 16);
}

// Shrink user agent to essential info
function shrinkUA(ua: string | null): string {
  if (!ua) return "unknown";
  // Extract browser and OS info only
  const browser =
    ua.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/)?.[0] || "";
  const os = ua.match(/(Windows|Mac|Linux|Android|iOS)[\s\d.]*/)?.[0] || "";
  return `${browser} ${os}`.trim() || "unknown";
}

// Rate limiting helper
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
      message: `Quá nhiều yêu cầu. Vui lòng thử lại sau ${waitTime} phút.`,
    };
  }

  limit.count++;
  return { allowed: true };
}

// Log security event
async function logSecurityEvent(
  supabase: any,
  employeeId: string | null,
  event: string,
  ipHash: string,
  userAgent: string,
  details?: any,
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
    // Don't throw - logging failure shouldn't break the main flow
  }
}

// Generic success response (neutral message for security)
function okGeneric() {
  return NextResponse.json(
    {
      success: true,
      message:
        "Nếu thông tin hợp lệ, mật khẩu đã được cập nhật. Vui lòng thử đăng nhập với mật khẩu mới.",
    },
    { status: 200 },
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employee_code, cccd, new_password } = body;

    // Get IP and UA for rate limiting and logging
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const ua = request.headers.get("user-agent");
    const ipHash = hashIp(ip);
    const userAgent = shrinkUA(ua);

    // Input validation
    if (!employee_code || !cccd || !new_password) {
      return NextResponse.json(
        { error: "Vui lòng điền đầy đủ thông tin" },
        { status: 400 },
      );
    }

    // Password strength validation
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

    // Check rate limit
    const rateLimit = checkRateLimit(`pw-reset:${ip}:${employee_code}`);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: rateLimit.message }, { status: 429 });
    }

    const supabase = createServiceClient();

    // Step 1: Get employee with necessary fields only
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select(
        "employee_id, cccd_hash, password_hash, recovery_locked_until, recovery_fail_count, last_password_change_at",
      )
      .eq("employee_id", employee_code.trim())
      .single();

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

    // Step 3: Verify credentials based on last_password_change_at
    // If last_password_change_at is NULL, user still uses CCCD (verify against cccd_hash)
    // If last_password_change_at is NOT NULL, user has changed password (verify against password_hash)
    const hasChangedPassword = employee.last_password_change_at !== null;
    const hashToVerify = hasChangedPassword
      ? employee.password_hash
      : employee.cccd_hash;
    const isValidCCCD = await bcrypt.compare(cccd.trim(), hashToVerify);

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
          reason: hasChangedPassword ? "invalid_password" : "invalid_cccd",
          fail_count: failResult?.fail_count,
          locked: failResult?.locked,
        },
      );

      return okGeneric(); // Neutral response
    }

    // Step 4: Hash new password and update ONLY password_hash
    const saltRounds = 12; // High security
    const newPasswordHash = await bcrypt.hash(new_password.trim(), saltRounds);

    // Use the stored function for atomic update
    const { data: updateResult, error: updateError } = await supabase.rpc(
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
        { status: 500 },
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
    return NextResponse.json({
      success: true,
      message: "Đổi mật khẩu thành công! Vui lòng đăng nhập với mật khẩu mới.",
      data: {
        password_changed: true,
      },
    });
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra. Vui lòng thử lại sau." },
      { status: 500 },
    );
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
        { status: 400 },
      );
    }

    const supabase = createServiceClient();

    const { data: employee, error } = await supabase
      .from("employees")
      .select(
        "password_hash, cccd_hash, last_password_change_at, password_version",
      )
      .eq("employee_id", employeeCode)
      .single();

    if (error || !employee) {
      return NextResponse.json(
        { error: "Không tìm thấy nhân viên" },
        { status: 404 },
      );
    }

    // Check if still using CCCD as password
    const isUsingCCCD =
      !employee.password_hash ||
      employee.password_hash === employee.cccd_hash ||
      !employee.last_password_change_at;

    return NextResponse.json({
      using_cccd_as_password: isUsingCCCD,
      password_version: employee.password_version || 0,
      last_change: employee.last_password_change_at,
    });
  } catch (error) {
    console.error("Check password status error:", error);
    return NextResponse.json({ error: "Có lỗi xảy ra" }, { status: 500 });
  }
}
