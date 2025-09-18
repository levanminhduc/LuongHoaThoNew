// API endpoint for getting detailed department information for management roles
import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/utils/supabase/server"
import { verifyToken, getAuditInfo } from "@/lib/auth-middleware"

interface DepartmentDetailParams {
  params: Promise<{
    departmentName: string
  }>
}

// GET detailed department information
export async function GET(request: NextRequest, { params }: DepartmentDetailParams) {
  try {
    // Verify authentication and role
    const auth = verifyToken(request)
    if (!auth) {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 401 })
    }

    // Only management roles can access this endpoint
    if (!['giam_doc', 'ke_toan', 'nguoi_lap_bieu', 'truong_phong'].includes(auth.user.role)) {
      return NextResponse.json({ error: "Không có quyền truy cập chức năng này" }, { status: 403 })
    }

    // Await params for Next.js 15 compatibility
    const resolvedParams = await params
    const departmentName = decodeURIComponent(resolvedParams.departmentName)
    const supabase = createServiceClient()
    const { searchParams } = new URL(request.url)
    const month = searchParams.get("month") || new Date().toISOString().slice(0, 7)

    // Check if user has permission to access this department
    const allowedDepartments = auth.user.allowed_departments || []
    if (!allowedDepartments.includes(departmentName)) {
      return NextResponse.json({ 
        error: "Không có quyền truy cập department này" 
      }, { status: 403 })
    }

    // Get department employees with their payroll data
    const { data: employees, error: employeesError } = await supabase
      .from("employees")
      .select(`
        employee_id,
        full_name,
        chuc_vu,
        department,
        is_active
      `)
      .eq("department", departmentName)
      .eq("is_active", true)
      .order("full_name", { ascending: true })

    if (employeesError) {
      console.error("Employees query error:", employeesError)
      return NextResponse.json({ error: "Lỗi truy vấn danh sách nhân viên" }, { status: 500 })
    }

    // Get payroll data for the department in the specified month
    const { data: payrolls, error: payrollsError } = await supabase
      .from("payrolls")
      .select(`
        id,
        employee_id,
        salary_month,
        source_file,
        import_batch_id,
        import_status,
        he_so_lam_viec,
        he_so_phu_cap_ket_qua,
        he_so_luong_co_ban,
        luong_toi_thieu_cty,
        ngay_cong_trong_gio,
        gio_cong_tang_ca,
        gio_an_ca,
        tong_gio_lam_viec,
        tong_he_so_quy_doi,
        ngay_cong_chu_nhat,
        tong_luong_san_pham_cong_doan,
        don_gia_tien_luong_tren_gio,
        tien_luong_san_pham_trong_gio,
        tien_luong_tang_ca,
        tien_luong_30p_an_ca,
        tien_khen_thuong_chuyen_can,
        luong_hoc_viec_pc_luong,
        tong_cong_tien_luong_san_pham,
        ho_tro_thoi_tiet_nong,
        bo_sung_luong,
        tien_luong_chu_nhat,
        luong_cnkcp_vuot,
        tien_tang_ca_vuot,
        bhxh_21_5_percent,
        pc_cdcs_pccc_atvsv,
        luong_phu_nu_hanh_kinh,
        tong_cong_tien_luong,
        tien_boc_vac,
        ho_tro_xang_xe,
        thue_tncn_nam_2024,
        tam_ung,
        thue_tncn,
        bhxh_bhtn_bhyt_total,
        truy_thu_the_bhyt,
        tien_luong_thuc_nhan_cuoi_ky,
        is_signed,
        signed_at,
        signed_by_name,
        signature_ip,
        signature_device,
        created_at,
        updated_at,
        employees!inner(
          employee_id,
          full_name,
          department,
          chuc_vu
        )
      `)
      .eq("employees.department", departmentName)
      .eq("salary_month", month)
      .order("employees(full_name)", { ascending: true })

    if (payrollsError) {
      console.error("Payrolls query error:", payrollsError)
      console.error("Query details:", {
        departmentName,
        month,
        userRole: auth.user.role,
        allowedDepartments: auth.user.allowed_departments
      })
      return NextResponse.json({
        error: "Lỗi truy vấn dữ liệu lương",
        details: process.env.NODE_ENV === 'development' ? payrollsError.message : undefined
      }, { status: 500 })
    }

    // Get historical payroll data for trends (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    const startMonth = sixMonthsAgo.toISOString().slice(0, 7)

    const { data: historicalPayrolls, error: historicalError } = await supabase
      .from("payrolls")
      .select(`
        salary_month,
        tien_luong_thuc_nhan_cuoi_ky,
        is_signed,
        employees!inner(department)
      `)
      .eq("employees.department", departmentName)
      .gte("salary_month", startMonth)
      .order("salary_month", { ascending: true })

    if (historicalError) {
      console.error("Historical payrolls query error:", historicalError)
    }

    // Calculate department statistics
    const totalEmployees = employees?.length || 0
    const payrollCount = payrolls?.length || 0
    const signedCount = payrolls?.filter(p => p.is_signed).length || 0
    const totalSalary = payrolls?.reduce((sum, p) => sum + (p.tien_luong_thuc_nhan_cuoi_ky || 0), 0) || 0
    const averageSalary = payrollCount > 0 ? Math.round(totalSalary / payrollCount) : 0
    const signedPercentage = payrollCount > 0 ? (signedCount / payrollCount * 100).toFixed(1) : "0"

    // Calculate additional statistics
    const totalWorkDays = payrolls?.reduce((sum, p) => sum + (p.ngay_cong_trong_gio || 0), 0) || 0
    const totalOvertimeHours = payrolls?.reduce((sum, p) => sum + (p.gio_cong_tang_ca || 0), 0) || 0
    const totalAllowances = payrolls?.reduce((sum, p) =>
      sum + (p.ho_tro_thoi_tiet_nong || 0) + (p.pc_cdcs_pccc_atvsv || 0) + (p.ho_tro_xang_xe || 0) + (p.tien_boc_vac || 0), 0) || 0
    const totalDeductions = payrolls?.reduce((sum, p) =>
      sum + (p.bhxh_bhtn_bhyt_total || 0) + (p.thue_tncn || 0) + (p.tam_ung || 0), 0) || 0

    // Calculate salary distribution
    const salaryRanges = [
      { range: "< 5M", min: 0, max: 5000000, count: 0 },
      { range: "5M - 10M", min: 5000000, max: 10000000, count: 0 },
      { range: "10M - 15M", min: 10000000, max: 15000000, count: 0 },
      { range: "15M - 20M", min: 15000000, max: 20000000, count: 0 },
      { range: "> 20M", min: 20000000, max: Infinity, count: 0 }
    ]

    payrolls?.forEach(payroll => {
      const salary = payroll.tien_luong_thuc_nhan_cuoi_ky || 0
      const range = salaryRanges.find(r => salary >= r.min && salary < r.max)
      if (range) range.count++
    })

    // Calculate monthly trends
    const monthlyTrends: { [key: string]: any } = {}
    historicalPayrolls?.forEach(payroll => {
      const month = payroll.salary_month
      if (!monthlyTrends[month]) {
        monthlyTrends[month] = {
          month,
          totalSalary: 0,
          employeeCount: 0,
          signedCount: 0
        }
      }
      monthlyTrends[month].totalSalary += payroll.tien_luong_thuc_nhan_cuoi_ky || 0
      monthlyTrends[month].employeeCount++
      if (payroll.is_signed) {
        monthlyTrends[month].signedCount++
      }
    })

    const trendsArray = Object.values(monthlyTrends).map((trend: any) => ({
      ...trend,
      averageSalary: trend.employeeCount > 0 ? Math.round(trend.totalSalary / trend.employeeCount) : 0,
      signedPercentage: trend.employeeCount > 0 ? (trend.signedCount / trend.employeeCount * 100).toFixed(1) : "0"
    }))

    // Log access for audit trail
    const auditInfo = getAuditInfo(request, auth)
    await supabase.rpc('log_access', {
      p_user_id: auditInfo.user_id,
      p_user_role: auditInfo.user_role,
      p_action: 'VIEW_DETAIL',
      p_resource: 'department',
      p_department: departmentName,
      p_ip_address: auditInfo.ip_address,
      p_user_agent: auditInfo.user_agent,
      p_request_method: auditInfo.request_method,
      p_request_url: auditInfo.request_url,
      p_response_status: 200
    })

    return NextResponse.json({
      success: true,
      department: {
        name: departmentName,
        month: month,
        stats: {
          totalEmployees,
          payrollCount,
          signedCount,
          signedPercentage,
          totalSalary,
          averageSalary,
          totalWorkDays,
          totalOvertimeHours,
          totalAllowances,
          totalDeductions
        },
        employees: employees || [],
        payrolls: payrolls || [],
        salaryDistribution: salaryRanges,
        monthlyTrends: trendsArray
      }
    })

  } catch (error) {
    console.error("Department detail error:", error)
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi lấy chi tiết department" },
      { status: 500 }
    )
  }
}
