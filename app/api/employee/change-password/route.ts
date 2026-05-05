import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import bcrypt from "bcryptjs";
import { getVietnamTimestamp } from "@/lib/utils/vietnam-timezone";
import { BCRYPT_ROUNDS } from "@/lib/constants/security";
import { rateLimit } from "@/lib/security-middleware";
import { CACHE_HEADERS } from "@/lib/utils/cache-headers";
import {
  parseSchema,
  createValidationErrorResponse,
  EmployeeChangePasswordRequestSchema,
} from "@/lib/validations";

// Constants
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

// Security logging helper
async function logSecurityEvent(
  supabase: ReturnType<typeof createServiceClient>,
  employeeId: string,
  action: string,
  ipAddress: string,
  details: string,
) {
  try {
    await supabase.from("security_logs").insert({
      employee_id: employeeId,
      action,
      ip_address: ipAddress,
      details,
      // created_at sẽ tự động được set bởi database trigger với múi giờ Việt Nam
    });
  } catch (error) {
    console.error("Failed to log security event:", error);
    // Don't throw - logging failure shouldn't break the main flow
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = parseSchema(EmployeeChangePasswordRequestSchema, body);
    if (!parsed.success) {
      return NextResponse.json(
        createValidationErrorResponse(parsed.errors),
        { status: 400, headers: CACHE_HEADERS.sensitive },
      );
    }
    const { employee_id, current_password, new_password } = parsed.data;

    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const rateLimitResult = rateLimit("passwordChange")(request);
    if (rateLimitResult) return rateLimitResult;

    if (current_password === new_password) {
      return NextResponse.json(
        { error: "Mật khẩu mới phải khác mật khẩu hiện tại" },
        { status: 400, headers: CACHE_HEADERS.sensitive },
      );
    }

    const supabase = createServiceClient();

    // Step 1: Get employee and check if account is locked
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("*") // Select all to handle missing columns gracefully
      .eq("employee_id", employee_id.trim())
      .single();

    if (employeeError || !employee) {
      await logSecurityEvent(
        supabase,
        employee_id,
        "password_change_failed",
        ip,
        "Employee not found",
      );

      return NextResponse.json(
        { error: "Không tìm thấy nhân viên" },
        { status: 404, headers: CACHE_HEADERS.sensitive },
      );
    }

    // Check if account is locked (only if column exists)
    if (employee.locked_until !== undefined && employee.locked_until) {
      const lockExpiry = new Date(employee.locked_until);
      if (lockExpiry > new Date()) {
        const minutesLeft = Math.ceil(
          (lockExpiry.getTime() - Date.now()) / 60000,
        );

        await logSecurityEvent(
          supabase,
          employee_id,
          "password_change_blocked",
          ip,
          "Account locked",
        );

        return NextResponse.json(
          {
            error: `Tài khoản đã bị khóa. Vui lòng thử lại sau ${minutesLeft} phút.`,
          },
          { status: 423, headers: CACHE_HEADERS.sensitive }, // Locked
        );
      }
    }

    // Step 2: Verify current password based on last_password_change_at
    // If last_password_change_at is NULL, user still uses CCCD (verify against cccd_hash)
    // If last_password_change_at is NOT NULL, user has changed password (verify against password_hash)
    const hasChangedPassword = employee.last_password_change_at !== null;
    const passwordToCheck = hasChangedPassword
      ? employee.password_hash
      : employee.cccd_hash;
    const isValidPassword = await bcrypt.compare(
      current_password.trim(),
      passwordToCheck,
    );

    if (!isValidPassword) {
      // Only track failed attempts if columns exist
      if (employee.failed_login_attempts !== undefined) {
        // Increment failed attempts
        const newFailedAttempts = (employee.failed_login_attempts || 0) + 1;
        const updateData: Record<string, unknown> = {
          failed_login_attempts: newFailedAttempts,
        };

        // Lock account if too many failures
        if (
          newFailedAttempts >= MAX_ATTEMPTS &&
          employee.locked_until !== undefined
        ) {
          updateData.locked_until = new Date(
            Date.now() + LOCKOUT_DURATION,
          ).toISOString();

          await logSecurityEvent(
            supabase,
            employee_id,
            "account_locked",
            ip,
            `Locked after ${newFailedAttempts} failed attempts`,
          );
        }

        await supabase
          .from("employees")
          .update(updateData)
          .eq("employee_id", employee_id);

        await logSecurityEvent(
          supabase,
          employee_id,
          "password_change_failed",
          ip,
          `Invalid current password. Attempts: ${newFailedAttempts}`,
        );

        return NextResponse.json(
          {
            error:
              newFailedAttempts >= MAX_ATTEMPTS
                ? "Tài khoản đã bị khóa do nhập sai quá nhiều lần"
                : `Mật khẩu hiện tại không đúng. Còn ${MAX_ATTEMPTS - newFailedAttempts} lần thử.`,
          },
          { status: 401, headers: CACHE_HEADERS.sensitive },
        );
      } else {
        // If columns don't exist, just return error without tracking
        return NextResponse.json(
          { error: "Mật khẩu hiện tại không đúng" },
          { status: 401, headers: CACHE_HEADERS.sensitive },
        );
      }
    }

    // Step 3: Hash new password
    const newPasswordHash = await bcrypt.hash(new_password.trim(), BCRYPT_ROUNDS);

    // Step 4: Update password and reset security fields
    // Build update object based on what columns exist
    const updateData: Record<string, unknown> = {};

    // Update password_hash if column exists, otherwise fallback to cccd_hash
    if (employee.password_hash !== undefined) {
      updateData.password_hash = newPasswordHash;
    } else {
      updateData.cccd_hash = newPasswordHash; // Fallback for old schema
    }

    // Only update new columns if they exist in the employee record
    if (employee.must_change_password !== undefined) {
      updateData.must_change_password = false;
    }
    if (employee.password_changed_at !== undefined) {
      updateData.password_changed_at = getVietnamTimestamp();
    }
    if (employee.failed_login_attempts !== undefined) {
      updateData.failed_login_attempts = 0;
    }
    if (employee.locked_until !== undefined) {
      updateData.locked_until = null;
    }

    const { error: updateError } = await supabase
      .from("employees")
      .update(updateData)
      .eq("employee_id", employee_id);

    if (updateError) {
      console.error("Password update error:", updateError);

      await logSecurityEvent(
        supabase,
        employee_id,
        "password_change_error",
        ip,
        updateError.message,
      );

      return NextResponse.json(
        { error: "Không thể cập nhật mật khẩu. Vui lòng thử lại." },
        { status: 500, headers: CACHE_HEADERS.sensitive },
      );
    }

    // Step 5: Log successful password change
    await logSecurityEvent(
      supabase,
      employee_id,
      "password_change_success",
      ip,
      employee.password_changed_at
        ? "Password updated"
        : "First-time password change from CCCD",
    );

    return NextResponse.json({
      success: true,
      message: "Đổi mật khẩu thành công",
      data: {
        employee_id,
        password_changed: true,
        must_change_password: false,
      },
    }, { headers: CACHE_HEADERS.sensitive });
  } catch (error) {
    console.error("Password change error:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi đổi mật khẩu" },
      { status: 500, headers: CACHE_HEADERS.sensitive },
    );
  }
}

// GET endpoint to check if user needs to change password
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employee_id");

    if (!employeeId) {
      return NextResponse.json(
        { error: "Thiếu mã nhân viên" },
        { status: 400, headers: CACHE_HEADERS.sensitive },
      );
    }

    const supabase = createServiceClient();

    const { data: employee, error } = await supabase
      .from("employees")
      .select("must_change_password, password_changed_at")
      .eq("employee_id", employeeId)
      .single();

    if (error || !employee) {
      return NextResponse.json(
        { error: "Không tìm thấy nhân viên" },
        { status: 404, headers: CACHE_HEADERS.sensitive },
      );
    }

    return NextResponse.json({
      must_change_password:
        employee.must_change_password || !employee.password_changed_at,
      password_changed_at: employee.password_changed_at,
    }, { headers: CACHE_HEADERS.sensitive });
  } catch (error) {
    console.error("Check password status error:", error);
    return NextResponse.json({ error: "Có lỗi xảy ra" }, { status: 500, headers: CACHE_HEADERS.sensitive });
  }
}
