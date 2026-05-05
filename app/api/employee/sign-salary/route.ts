import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import bcrypt from "bcryptjs";
import {
  formatSalaryMonth,
  formatSignatureTime,
} from "@/lib/utils/date-formatter";
import { verifyEmployeeSession } from "@/lib/employee-session";
import { csrfProtection } from "@/lib/security-middleware";
import { CACHE_HEADERS } from "@/lib/utils/cache-headers";
import {
  parseSchema,
  createValidationErrorResponse,
  EmployeeSignSalaryRequestSchema,
} from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const csrfResult = csrfProtection(request);
    if (csrfResult) return csrfResult;
    const body = await request.json();
    const parsed = parseSchema(EmployeeSignSalaryRequestSchema, body);
    if (!parsed.success) {
      return NextResponse.json(createValidationErrorResponse(parsed.errors), {
        status: 400,
        headers: CACHE_HEADERS.sensitive,
      });
    }
    const {
      salary_month,
      is_t13,
      employee_id: bodyEmployeeId,
      cccd,
    } = parsed.data;

    const isT13Month = /^\d{4}-(13|T13)$/i.test(salary_month);
    const payrollType = isT13Month ? "t13" : "monthly";

    if (is_t13 !== undefined && is_t13 !== isT13Month) {
      return NextResponse.json(
        {
          error:
            "Tham số is_t13 không khớp với salary_month. Server tự động xác định từ salary_month.",
          derived_is_t13: isT13Month,
        },
        { status: 400, headers: CACHE_HEADERS.sensitive },
      );
    }

    const supabase = createServiceClient();

    let authenticatedEmployeeId: string;

    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const session = verifyEmployeeSession(authHeader.slice(7));
      if (!session) {
        return NextResponse.json(
          { error: "Phien lam viec het han", code: "SESSION_EXPIRED" },
          { status: 401, headers: CACHE_HEADERS.sensitive },
        );
      }
      authenticatedEmployeeId = session.employee_id;
    } else {
      if (!bodyEmployeeId || !cccd) {
        return NextResponse.json(
          { error: "Thiếu thông tin bắt buộc (mã nhân viên, CCCD)" },
          { status: 400, headers: CACHE_HEADERS.sensitive },
        );
      }

      const { data: employee, error: employeeError } = await supabase
        .from("employees")
        .select(
          "employee_id, full_name, cccd_hash, password_hash, last_password_change_at",
        )
        .eq("employee_id", bodyEmployeeId.trim())
        .single();

      if (employeeError || !employee) {
        return NextResponse.json(
          { error: "Không tìm thấy nhân viên với mã nhân viên đã nhập" },
          { status: 404, headers: CACHE_HEADERS.sensitive },
        );
      }

      const hasChangedPassword = employee.last_password_change_at !== null;
      const hashToVerify = hasChangedPassword
        ? employee.password_hash
        : employee.cccd_hash;
      const isValidPassword = await bcrypt.compare(cccd.trim(), hashToVerify);
      if (!isValidPassword) {
        const errorMsg = hasChangedPassword
          ? "Mật khẩu không đúng"
          : "Số CCCD không đúng";
        return NextResponse.json(
          { error: errorMsg },
          { status: 401, headers: CACHE_HEADERS.sensitive },
        );
      }
      authenticatedEmployeeId = bodyEmployeeId.trim();
    }

    // Bước 3: Lấy thông tin client để tracking
    const clientIP =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // Bước 4: Tạo Vietnam timestamp - KHÔNG gửi client_timestamp
    // Để database function tự tạo Vietnam time từ server UTC
    console.log("Using server-side Vietnam timezone conversion");

    const { data: signResult, error: signError } = await supabase.rpc(
      "auto_sign_salary",
      {
        p_employee_id: authenticatedEmployeeId,
        p_salary_month: salary_month.trim(),
        p_ip_address: clientIP,
        p_device_info: userAgent,
      },
    );

    if (signError) {
      console.error("Sign salary error:", signError);
      return NextResponse.json(
        { error: "Lỗi hệ thống khi ký tên: " + signError.message },
        { status: 500, headers: CACHE_HEADERS.sensitive },
      );
    }

    // Bước 5: Xử lý kết quả từ function
    if (!signResult || !signResult.success) {
      const errorMessage = signResult?.message || "Không thể ký nhận lương";

      // Determine appropriate status code based on error
      let statusCode = 400;
      if (errorMessage.includes("không tìm thấy")) {
        statusCode = 404;
      } else if (errorMessage.includes("đã ký")) {
        statusCode = 409; // Conflict
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: statusCode, headers: CACHE_HEADERS.sensitive },
      );
    }

    const salaryMonthDisplay = isT13Month
      ? `Lương Tháng 13 - ${signResult.salary_month.split("-")[0]}`
      : formatSalaryMonth(signResult.salary_month);

    return NextResponse.json(
      {
        success: true,
        message: isT13Month
          ? "Ký nhận lương tháng 13 thành công!"
          : "Ký nhận lương thành công!",
        data: {
          employee_name: signResult.signed_by,
          signed_by: signResult.signed_by,
          signed_at: signResult.signed_at,
          signed_at_display: formatSignatureTime(signResult.signed_at),
          employee_id: signResult.employee_id,
          salary_month: signResult.salary_month,
          salary_month_display: salaryMonthDisplay,
          payroll_type: payrollType,
        },
      },
      { headers: CACHE_HEADERS.sensitive },
    );
  } catch (error) {
    console.error("Sign salary API error:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi ký nhận lương" },
      { status: 500, headers: CACHE_HEADERS.sensitive },
    );
  }
}
