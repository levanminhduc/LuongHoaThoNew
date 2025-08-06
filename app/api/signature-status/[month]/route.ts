import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/utils/supabase/server"
import { getVietnamTimestamp } from "@/lib/utils/vietnam-timezone"
import { verifyToken } from "@/lib/auth-middleware"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ month: string }> }
) {
  try {
    const auth = verifyToken(request)
    if (!auth || !['admin', 'giam_doc', 'ke_toan', 'nguoi_lap_bieu'].includes(auth.user.role)) {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 })
    }

    const { month } = await params
    
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "Định dạng tháng không hợp lệ (YYYY-MM)" }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Thay đổi logic: Lấy nhân viên có bảng lương trong tháng đó
    const { data: employeesWithPayroll, error: payrollError } = await supabase
      .from("payrolls")
      .select("employee_id")
      .eq("salary_month", month)

    if (payrollError) {
      console.error("Error fetching employees with payroll:", payrollError)
      return NextResponse.json({ error: "Lỗi khi lấy danh sách nhân viên có bảng lương" }, { status: 500 })
    }

    const { data: signedEmployees, error: signedError } = await supabase
      .from("signature_logs")
      .select("employee_id")
      .eq("salary_month", month)

    if (signedError) {
      console.error("Error fetching signed employees:", signedError)
      return NextResponse.json({ error: "Lỗi khi lấy danh sách nhân viên đã ký" }, { status: 500 })
    }

    // Tính toán dựa trên nhân viên có bảng lương
    const totalCount = employeesWithPayroll?.length || 0
    const signedCount = signedEmployees?.length || 0
    const completionPercentage = totalCount > 0 ? Math.round((signedCount / totalCount) * 100 * 100) / 100 : 0
    const is100PercentComplete = signedCount === totalCount && totalCount > 0

    const signedEmployeeIds = signedEmployees?.map(s => s.employee_id) || []
    const employeesWithPayrollIds = employeesWithPayroll?.map(p => p.employee_id) || []

    // Lấy sample nhân viên chưa ký trong số những người có bảng lương
    const { data: unsignedSample, error: unsignedError } = await supabase
      .from("employees")
      .select("employee_id, full_name, department, chuc_vu")
      .eq("is_active", true)
      .in("employee_id", employeesWithPayrollIds)
      .not("employee_id", "in", `(${signedEmployeeIds.length > 0 ? signedEmployeeIds.map(id => `'${id}'`).join(',') : "''"})`)
      .limit(10)

    if (unsignedError) {
      console.error("Error fetching unsigned employees:", unsignedError)
    }

    let managementSignatures = {}
    try {
      const { data: signatures, error: sigError } = await supabase
        .from("management_signatures")
        .select("*")
        .eq("salary_month", month)
        .eq("is_active", true)

      if (!sigError && signatures) {
        signatures.forEach(sig => {
          managementSignatures[sig.signature_type] = {
            id: sig.id,
            signed_by_id: sig.signed_by_id,
            signed_by_name: sig.signed_by_name,
            department: sig.department,
            signed_at: sig.signed_at,
            notes: sig.notes
          }
        })
      }
    } catch (error) {
      console.log("Management signatures table not available yet")
      managementSignatures = {
        giam_doc: null,
        ke_toan: null,
        nguoi_lap_bieu: null
      }
    }

    const completedSignatures = Object.values(managementSignatures).filter(sig => sig !== null).length
    const remainingSignatures = ['giam_doc', 'ke_toan', 'nguoi_lap_bieu'].filter(
      type => !managementSignatures[type]
    )

    return NextResponse.json({
      success: true,
      month,
      employee_completion: {
        total_employees: totalCount,
        signed_employees: signedCount,
        completion_percentage: completionPercentage,
        is_100_percent_complete: is100PercentComplete,
        unsigned_employees_sample: unsignedSample || []
      },
      management_signatures: {
        giam_doc: managementSignatures['giam_doc'] || null,
        ke_toan: managementSignatures['ke_toan'] || null,
        nguoi_lap_bieu: managementSignatures['nguoi_lap_bieu'] || null
      },
      summary: {
        total_signature_types: 3,
        completed_signatures: completedSignatures,
        remaining_signatures: remainingSignatures,
        is_fully_signed: completedSignatures === 3,
        employee_completion_required: is100PercentComplete
      },
      timestamp: getVietnamTimestamp()
    })

  } catch (error) {
    console.error("Signature status error:", error)
    return NextResponse.json({ 
      error: "Có lỗi xảy ra khi lấy trạng thái ký",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
