// API endpoint for getting detailed department information for truong_phong
import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/utils/supabase/server"
import { verifyToken, getAuditInfo } from "@/lib/auth-middleware"

interface DepartmentDetailParams {
  params: {
    departmentName: string
  }
}

// GET detailed department information
export async function GET(request: NextRequest, { params }: DepartmentDetailParams) {
  try {
    // Verify authentication and role
    const auth = verifyToken(request)
    if (!auth) {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 401 })
    }

    // Only truong_phong can access this endpoint
    if (!auth.isRole('truong_phong')) {
      return NextResponse.json({ error: "Chỉ trưởng phòng mới có quyền truy cập" }, { status: 403 })
    }

    // Await params for Next.js 15 compatibility
    const resolvedParams = await params
    const departmentName = decodeURIComponent(resolvedParams.departmentName)
    const supabase = createServiceClient()
    const { searchParams } = new URL(request.url)
    const month = searchParams.get("month") || new Date().toISOString().slice(0, 7)

    // Check if truong_phong has permission to access this department
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
        *,
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
      return NextResponse.json({ error: "Lỗi truy vấn dữ liệu lương" }, { status: 500 })
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
          averageSalary
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
