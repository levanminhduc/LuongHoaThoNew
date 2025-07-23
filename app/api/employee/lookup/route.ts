import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/utils/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { employee_id, cccd } = await request.json()

    if (!employee_id || !cccd) {
      return NextResponse.json({ error: "Thiếu mã nhân viên hoặc số CCCD" }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Tìm kiếm thông tin lương dựa trên mã nhân viên và CCCD
    const { data: payroll, error } = await supabase
      .from("payrolls")
      .select("*")
      .eq("employee_id", employee_id.trim())
      .eq("cccd", cccd.trim())
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (error || !payroll) {
      return NextResponse.json(
        { error: "Không tìm thấy thông tin lương với mã nhân viên và CCCD đã nhập" },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      payroll,
    })
  } catch (error) {
    console.error("Employee lookup error:", error)
    return NextResponse.json({ error: "Có lỗi xảy ra khi tra cứu thông tin" }, { status: 500 })
  }
}
