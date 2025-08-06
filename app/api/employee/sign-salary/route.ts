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

    // Bước 1: Verify nhân viên và CCCD
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("employee_id, full_name, cccd_hash")
      .eq("employee_id", employee_id.trim())
      .single()

    if (employeeError || !employee) {
      return NextResponse.json(
        { error: "Không tìm thấy nhân viên với mã nhân viên đã nhập" },
        { status: 404 }
      )
    }

    // Bước 2: Verify CCCD
    const isValidCCCD = await bcrypt.compare(cccd.trim(), employee.cccd_hash)
    if (!isValidCCCD) {
      return NextResponse.json(
        { error: "Số CCCD không đúng" },
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
        { error: "Lỗi hệ thống khi ký tên" },
        { status: 500 }
      )
    }

    // Bước 5: Xử lý kết quả từ function
    if (!signResult.success) {
      return NextResponse.json(
        { error: signResult.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Ký nhận lương thành công!",
      data: {
        employee_name: signResult.signed_by,
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