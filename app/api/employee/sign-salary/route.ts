import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import bcrypt from "bcryptjs";
import {
  formatSalaryMonth,
  formatSignatureTime,
} from "@/lib/utils/date-formatter";

export async function POST(request: NextRequest) {
  try {
    const { employee_id, cccd, salary_month, is_t13 } = await request.json();

    if (!employee_id || !cccd || !salary_month) {
      return NextResponse.json(
        {
          error: "Thiếu thông tin bắt buộc (mã nhân viên, CCCD, tháng lương)",
        },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();
    const payrollType = is_t13 ? "t13" : "monthly";

    // Bước 1: Verify nhân viên và password
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select(
        "employee_id, full_name, cccd_hash, password_hash, last_password_change_at",
      )
      .eq("employee_id", employee_id.trim())
      .single();

    if (employeeError || !employee) {
      return NextResponse.json(
        { error: "Không tìm thấy nhân viên với mã nhân viên đã nhập" },
        { status: 404 },
      );
    }

    // Bước 2: Verify password based on last_password_change_at
    // If last_password_change_at is NULL, user still uses CCCD (verify against cccd_hash)
    // If last_password_change_at is NOT NULL, user has changed password (verify against password_hash)
    const hasChangedPassword = employee.last_password_change_at !== null;
    const hashToVerify = hasChangedPassword
      ? employee.password_hash
      : employee.cccd_hash;
    const isValidPassword = await bcrypt.compare(cccd.trim(), hashToVerify);
    if (!isValidPassword) {
      // Custom error message based on whether user has changed password
      const errorMsg = hasChangedPassword
        ? "Mật khẩu không đúng"
        : "Số CCCD không đúng";
      return NextResponse.json({ error: errorMsg }, { status: 401 });
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
        p_employee_id: employee_id.trim(),
        p_salary_month: salary_month.trim(),
        p_ip_address: clientIP,
        p_device_info: userAgent,
        p_payroll_type: payrollType,
      },
    );

    if (signError) {
      console.error("Sign salary error:", signError);
      return NextResponse.json(
        { error: "Lỗi hệ thống khi ký tên: " + signError.message },
        { status: 500 },
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

      return NextResponse.json({ error: errorMessage }, { status: statusCode });
    }

    const salaryMonthDisplay = is_t13
      ? `Lương Tháng 13 - ${signResult.salary_month.split("-")[0]}`
      : formatSalaryMonth(signResult.salary_month);

    return NextResponse.json({
      success: true,
      message: is_t13
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
    });
  } catch (error) {
    console.error("Sign salary API error:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi ký nhận lương" },
      { status: 500 },
    );
  }
}
