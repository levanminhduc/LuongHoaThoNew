import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/utils/supabase/server"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const { employee_id, cccd } = await request.json()

    if (!employee_id || !cccd) {
      return NextResponse.json({ error: "Thiếu mã nhân viên hoặc số CCCD" }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Bước 1: Tìm nhân viên và verify CCCD
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("employee_id, full_name, cccd_hash, department, chuc_vu")
      .eq("employee_id", employee_id.trim())
      .single()

    if (employeeError || !employee) {
      return NextResponse.json(
        { error: "Không tìm thấy nhân viên với mã nhân viên đã nhập" },
        { status: 404 },
      )
    }

    // Bước 2: Verify CCCD với hash
    const isValidCCCD = await bcrypt.compare(cccd.trim(), employee.cccd_hash)
    if (!isValidCCCD) {
      return NextResponse.json(
        { error: "Số CCCD không đúng" },
        { status: 401 },
      )
    }

    // Bước 3: Tìm thông tin lương mới nhất
    const { data: payroll, error: payrollError } = await supabase
      .from("payrolls")
      .select("*")
      .eq("employee_id", employee_id.trim())
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (payrollError || !payroll) {
      return NextResponse.json(
        { error: "Không tìm thấy thông tin lương cho nhân viên này" },
        { status: 404 },
      )
    }

    // Bước 4: Tạo response với thông tin đầy đủ
    const response = {
      employee_id: employee.employee_id,
      full_name: employee.full_name,
      cccd: cccd.trim(), // Trả về CCCD gốc (không hash)
      position: employee.chuc_vu,
      department: employee.department,
      salary_month: payroll.salary_month,
      total_income: payroll.tien_luong_thuc_nhan_cuoi_ky || 0,
      deductions: (payroll.bhxh_bhtn_bhyt_total || 0) + (payroll.thue_tncn || 0),
      net_salary: payroll.tien_luong_thuc_nhan_cuoi_ky || 0,
      source_file: payroll.source_file || "Unknown",
    }

    return NextResponse.json({
      success: true,
      payroll: response,
    })
  } catch (error) {
    console.error("Employee lookup error:", error)
    return NextResponse.json({ error: "Có lỗi xảy ra khi tra cứu thông tin" }, { status: 500 })
  }
}
