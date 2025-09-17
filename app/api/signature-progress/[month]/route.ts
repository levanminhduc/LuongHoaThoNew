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
      .select("employee_id", { count: 'exact' })
      .eq("salary_month", month)

    if (payrollError) {
      console.error("Error fetching employees with payroll:", payrollError)
      return NextResponse.json({ error: "Lỗi khi lấy danh sách nhân viên có bảng lương" }, { status: 500 })
    }

    const { data: signedEmployees, error: signedError } = await supabase
      .from("signature_logs")
      .select("employee_id, signed_at", { count: 'exact' })
      .eq("salary_month", month)
      .order("signed_at", { ascending: false })

    if (signedError) {
      console.error("Error fetching signed employees:", signedError)
      return NextResponse.json({ error: "Lỗi khi lấy danh sách nhân viên đã ký" }, { status: 500 })
    }

    // Tính toán dựa trên nhân viên có bảng lương
    const totalCount = employeesWithPayroll?.length || 0
    const signedCount = signedEmployees?.length || 0
    const employeeCompletionPercentage = totalCount > 0 ? Math.round((signedCount / totalCount) * 100 * 100) / 100 : 0

    const lastEmployeeSignature = signedEmployees && signedEmployees.length > 0 ? signedEmployees[0].signed_at : null

    let managementProgress = {
      completed_types: [] as string[],
      remaining_types: ['giam_doc', 'ke_toan', 'nguoi_lap_bieu'],
      completion_percentage: 0
    }

    try {
      const { data: managementSignatures, error: mgmtError } = await supabase
        .from("management_signatures")
        .select("signature_type, signed_at")
        .eq("salary_month", month)
        .eq("is_active", true)
        .order("signed_at", { ascending: false })

      if (!mgmtError && managementSignatures) {
        const completedTypes = managementSignatures.map(sig => sig.signature_type)
        const remainingTypes = ['giam_doc', 'ke_toan', 'nguoi_lap_bieu'].filter(
          type => !completedTypes.includes(type)
        )
        const mgmtCompletionPercentage = Math.round((completedTypes.length / 3) * 100 * 100) / 100

        managementProgress = {
          completed_types: completedTypes,
          remaining_types: remainingTypes,
          completion_percentage: mgmtCompletionPercentage
        }
      }
    } catch (error) {
      console.log("Management signatures table not available yet")
    }

    const currentTime = new Date()
    const nextRefreshTime = new Date(currentTime.getTime() + 30000)

    const recentActivity = []
    
    if (signedEmployees && signedEmployees.length > 0) {
      const recentSigns = signedEmployees.slice(0, 5)
      recentActivity.push(...recentSigns.map(sign => ({
        type: 'employee_signature',
        employee_id: sign.employee_id,
        timestamp: sign.signed_at,
        description: `Nhân viên ${sign.employee_id} đã ký lương`
      })))
    }

    try {
      const { data: recentMgmtSignatures, error: recentMgmtError } = await supabase
        .from("management_signatures")
        .select("signature_type, signed_by_name, signed_at")
        .eq("salary_month", month)
        .eq("is_active", true)
        .order("signed_at", { ascending: false })
        .limit(3)

      if (!recentMgmtError && recentMgmtSignatures) {
        recentActivity.push(...recentMgmtSignatures.map(sig => ({
          type: 'management_signature',
          signature_type: sig.signature_type,
          signed_by_name: sig.signed_by_name,
          timestamp: sig.signed_at,
          description: `${sig.signed_by_name} đã ký xác nhận ${sig.signature_type}`
        })))
      }
    } catch (error) {
      console.log("Management signatures table not available for recent activity")
    }

    recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return NextResponse.json({
      success: true,
      month,
      employee_progress: {
        completion_percentage: employeeCompletionPercentage,
        signed_count: signedCount,
        total_count: totalCount,
        last_updated: lastEmployeeSignature || null,
        is_complete: signedCount === totalCount && totalCount > 0
      },
      management_progress: managementProgress,
      recent_activity: recentActivity.slice(0, 10),
      real_time_data: {
        timestamp: getVietnamTimestamp(),
        next_refresh: nextRefreshTime.toISOString(),
        refresh_interval_seconds: 30
      },
      statistics: {
        total_signatures_needed: totalCount + 3,
        total_signatures_completed: signedCount + managementProgress.completed_types.length,
        overall_completion_percentage: totalCount > 0 ? 
          Math.round(((signedCount + managementProgress.completed_types.length) / (totalCount + 3)) * 100 * 100) / 100 : 0
      }
    })

  } catch (error) {
    console.error("Signature progress error:", error)
    return NextResponse.json({ 
      error: "Có lỗi xảy ra khi lấy tiến độ ký",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
