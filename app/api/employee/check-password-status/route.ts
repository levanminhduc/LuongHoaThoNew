import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/utils/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { employee_id } = await request.json()

    if (!employee_id) {
      return NextResponse.json(
        { error: "Thiếu mã nhân viên" },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Kiểm tra nhân viên và trạng thái password
    const { data: employee, error } = await supabase
      .from("employees")
      .select("employee_id, password_hash, must_change_password")
      .eq("employee_id", employee_id.trim())
      .single()

    if (error || !employee) {
      return NextResponse.json(
        { error: "Không tìm thấy nhân viên" },
        { status: 404 }
      )
    }

    // Xác định trạng thái
    const hasPassword = !!employee.password_hash
    const mustChangePassword = employee.must_change_password ?? !hasPassword

    return NextResponse.json({
      success: true,
      hasPassword,
      mustChangePassword,
      // Trả về label và placeholder phù hợp
      authField: {
        label: hasPassword ? "Mật khẩu" : "Số CCCD",
        placeholder: hasPassword ? "Nhập mật khẩu của bạn" : "Nhập số CCCD",
        type: hasPassword ? "password" : "text"
      }
    })

  } catch (error) {
    console.error("Check password status error:", error)
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi kiểm tra trạng thái" },
      { status: 500 }
    )
  }
}
