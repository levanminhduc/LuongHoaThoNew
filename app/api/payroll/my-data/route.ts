// API endpoint for nhan_vien to view their own payroll data
import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/utils/supabase/server"
import { verifyToken, getAuditInfo } from "@/lib/auth-middleware"

// GET own payroll data for nhan_vien
export async function GET(request: NextRequest) {
  try {
    // Verify authentication and role
    const auth = verifyToken(request)
    if (!auth) {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 401 })
    }

    // Only nhan_vien can access this endpoint
    if (!auth.isRole('nhan_vien')) {
      return NextResponse.json({ error: "Chỉ nhân viên mới có quyền truy cập" }, { status: 403 })
    }

    const supabase = createServiceClient()
    const { searchParams } = new URL(request.url)
    
    // Get query parameters
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "12") // Show 12 months by default
    const month = searchParams.get("month")
    
    const offset = (page - 1) * limit

    // Build query for own data only
    let query = supabase
      .from("payrolls")
      .select(`
        *,
        employees!inner(
          employee_id,
          full_name,
          department,
          chuc_vu
        )
      `)
      .eq("employee_id", auth.user.employee_id)

    // Apply month filter if specified
    if (month) {
      query = query.eq("salary_month", month)
    }

    // Get total count for pagination
    const { count } = await supabase
      .from("payrolls")
      .select("*", { count: "exact", head: true })
      .eq("employee_id", auth.user.employee_id)

    // Get paginated data
    const { data: payrolls, error } = await query
      .order("salary_month", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json(
        { error: "Có lỗi xảy ra khi truy vấn dữ liệu" },
        { status: 500 }
      )
    }

    // Log access for audit trail
    const auditInfo = getAuditInfo(request, auth)
    await supabase.rpc('log_access', {
      p_user_id: auditInfo.user_id,
      p_user_role: auditInfo.user_role,
      p_action: 'VIEW',
      p_resource: 'payroll',
      p_department: auth.user.department,
      p_employee_accessed: auth.user.employee_id,
      p_ip_address: auditInfo.ip_address,
      p_user_agent: auditInfo.user_agent,
      p_request_method: auditInfo.request_method,
      p_request_url: auditInfo.request_url,
      p_response_status: 200
    })

    return NextResponse.json({
      success: true,
      data: payrolls,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      },
      employee: {
        employee_id: auth.user.employee_id,
        department: auth.user.department
      }
    })

  } catch (error) {
    console.error("My data payroll error:", error)
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi lấy dữ liệu lương" },
      { status: 500 }
    )
  }
}

// GET personal payroll summary for nhan_vien
export async function POST(request: NextRequest) {
  try {
    const auth = verifyToken(request)
    if (!auth || !auth.isRole('nhan_vien')) {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 401 })
    }

    const { year } = await request.json()
    const currentYear = year || new Date().getFullYear()
    const supabase = createServiceClient()

    // Get yearly summary for the employee
    const { data: yearlyData, error } = await supabase
      .from("payrolls")
      .select(`
        salary_month,
        tien_luong_thuc_nhan_cuoi_ky,
        is_signed,
        signed_at,
        tong_cong_tien_luong,
        thue_tncn,
        bhxh_bhtn_bhyt_total
      `)
      .eq("employee_id", auth.user.employee_id)
      .like("salary_month", `${currentYear}-%`)
      .order("salary_month", { ascending: true })

    if (error) {
      return NextResponse.json({ error: "Lỗi truy vấn dữ liệu" }, { status: 500 })
    }

    // Calculate summary statistics
    const totalMonths = yearlyData?.length || 0
    const signedMonths = yearlyData?.filter(d => d.is_signed).length || 0
    const totalGrossSalary = yearlyData?.reduce((sum, d) => sum + (d.tong_cong_tien_luong || 0), 0) || 0
    const totalNetSalary = yearlyData?.reduce((sum, d) => sum + (d.tien_luong_thuc_nhan_cuoi_ky || 0), 0) || 0
    const totalTax = yearlyData?.reduce((sum, d) => sum + (d.thue_tncn || 0), 0) || 0
    const totalInsurance = yearlyData?.reduce((sum, d) => sum + (d.bhxh_bhtn_bhyt_total || 0), 0) || 0

    // Monthly breakdown
    const monthlyBreakdown = yearlyData?.map(d => ({
      month: d.salary_month,
      grossSalary: d.tong_cong_tien_luong || 0,
      netSalary: d.tien_luong_thuc_nhan_cuoi_ky || 0,
      tax: d.thue_tncn || 0,
      insurance: d.bhxh_bhtn_bhyt_total || 0,
      isSigned: d.is_signed,
      signedAt: d.signed_at
    })) || []

    return NextResponse.json({
      success: true,
      summary: {
        year: currentYear,
        employee_id: auth.user.employee_id,
        totalMonths,
        signedMonths,
        signedPercentage: totalMonths > 0 ? (signedMonths / totalMonths * 100).toFixed(1) : "0",
        totalGrossSalary,
        totalNetSalary,
        totalTax,
        totalInsurance,
        averageNetSalary: totalMonths > 0 ? Math.round(totalNetSalary / totalMonths) : 0
      },
      monthlyBreakdown
    })

  } catch (error) {
    console.error("Personal summary error:", error)
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi lấy tổng kết" },
      { status: 500 }
    )
  }
}
