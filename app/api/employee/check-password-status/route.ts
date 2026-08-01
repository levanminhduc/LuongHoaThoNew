import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { findEmployeeAuthRecord } from "@/lib/employee/employee-repository";
import { csrfProtection, rateLimit } from "@/lib/security-middleware";
import { CACHE_HEADERS } from "@/lib/utils/cache-headers";
import {
  parseSchema,
  createValidationErrorResponse,
  CheckPasswordStatusRequestSchema,
} from "@/lib/validations";
import { toErrorResponse } from "@/lib/errors/app-error";

export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = rateLimit("login")(request);
    if (rateLimitResult) return rateLimitResult;

    const csrfResult = csrfProtection(request);
    if (csrfResult) return csrfResult;

    const parsed = parseSchema(
      CheckPasswordStatusRequestSchema,
      await request.json(),
    );
    if (!parsed.success) {
      return NextResponse.json(createValidationErrorResponse(parsed.errors), {
        status: 400,
        headers: CACHE_HEADERS.sensitive,
      });
    }
    const { employee_id } = parsed.data;

    const supabase = createServiceClient();

    const employee = await findEmployeeAuthRecord(supabase, employee_id);

    const hasChangedPassword = employee?.last_password_change_at != null;
    const mustChangePassword = !hasChangedPassword;

    return NextResponse.json(
      {
        success: true,
        hasPassword: hasChangedPassword,
        mustChangePassword,
        authField: {
          label: hasChangedPassword ? "Mật khẩu" : "Số CCCD",
          placeholder: hasChangedPassword
            ? "Nhập mật khẩu của bạn"
            : "Nhập số CCCD",
          type: hasChangedPassword ? "password" : "text",
        },
      },
      { headers: CACHE_HEADERS.sensitive },
    );
  } catch (error) {
    console.error("Check password status error:", error);
    return toErrorResponse(error, {
      fallbackMessage: "Có lỗi xảy ra khi kiểm tra trạng thái",
      headers: CACHE_HEADERS.sensitive,
    });
  }
}
