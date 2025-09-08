import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/utils/supabase/server"
import bcrypt from "bcryptjs"
import { formatSalaryMonth, formatSignatureTime } from "@/lib/utils/date-formatter"
import { getVietnamTimestamp } from "@/lib/utils/vietnam-timezone"

export async function POST(request: NextRequest) {
  try {
    const { employee_id, cccd, salary_month, client_timestamp } = await request.json()

    if (!employee_id || !cccd || !salary_month) {
      return NextResponse.json({
        error: "Thiếu thông tin bắt buộc (mã nhân viên, CCCD, tháng lương)"
      }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Bước 1: Verify nhân viên và password
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("employee_id, full_name, cccd_hash, password_hash")
      .eq("employee_id", employee_id.trim())
      .single()

    if (employeeError || !employee) {
      return NextResponse.json(
        { error: "Không tìm thấy nhân viên với mã nhân viên đã nhập" },
        { status: 404 }
      )
    }

    // Bước 2: Verify password (use password_hash if exists, fallback to cccd_hash)
    const hashToVerify = employee.password_hash || employee.cccd_hash
    const isValidPassword = await bcrypt.compare(cccd.trim(), hashToVerify)
    if (!isValidPassword) {
      // Custom error message based on whether user has changed password
      const errorMsg = employee.password_hash 
        ? "Mật khẩu không đúng" 
        : "Số CCCD không đúng"
      return NextResponse.json(
        { error: errorMsg },
        { status: 401 }
      )
    }

    // Bước 3: Lấy thông tin client để tracking
    const clientIP = request.headers.get("x-forwarded-for") || 
                     request.headers.get("x-real-ip") || 
                     "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"

    // Bước 4: Tạo Vietnam timestamp - KHÔNG gửi client_timestamp
    // Để database function tự tạo Vietnam time từ server UTC
    console.log("Using server-side Vietnam timezone conversion")

    // Gọi function ký tên tự động - KHÔNG gửi client_timestamp
    const { data: signResult, error: signError } = await supabase
      .rpc("auto_sign_salary", {
        p_employee_id: employee_id.trim(),
        p_salary_month: salary_month.trim(),
        p_ip_address: clientIP,
        p_device_info: userAgent
        // ✅ KHÔNG gửi p_client_timestamp để tránh double conversion
      })

    if (signError) {
      console.error("Sign salary error:", signError)
      return NextResponse.json(
        { error: "Lỗi hệ thống khi ký tên: " + signError.message },
        { status: 500 }
      )
    }

    // Bước 5: Xử lý kết quả từ function
    if (!signResult || !signResult.success) {
      const errorMessage = signResult?.message || "Không thể ký nhận lương"

      // Determine appropriate status code based on error
      let statusCode = 400
      if (errorMessage.includes("không tìm thấy")) {
        statusCode = 404
      } else if (errorMessage.includes("đã ký")) {
        statusCode = 409 // Conflict
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: statusCode }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Ký nhận lương thành công!",
      data: {
        employee_name: signResult.signed_by,  // Keep for backward compatibility
        signed_by: signResult.signed_by,      // ✅ Add this field for consistency
        signed_at: signResult.signed_at, // Raw timestamp for processing
        signed_at_display: formatSignatureTime(signResult.signed_at), // Formatted for display
        employee_id: signResult.employee_id,
        salary_month: signResult.salary_month,
        salary_month_display: formatSalaryMonth(signResult.salary_month)
      }
    })

  } catch (error) {
    console.error("Sign salary API error:", error)
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi ký nhận lương" },
      { status: 500 }
    )
  }
} 