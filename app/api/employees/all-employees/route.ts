// API endpoint for giam_doc, ke_toan, nguoi_lap_bieu to view all employees
import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/utils/supabase/server"
import { verifyToken } from "@/lib/auth-middleware"

// GET all employees for management roles with caching
export async function GET(request: NextRequest) {
  try {
    // Verify authentication and role
    const auth = verifyToken(request)
    if (!auth) {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 401 })
    }

    // Only allow giam_doc, ke_toan, nguoi_lap_bieu to access
    if (!['giam_doc', 'ke_toan', 'nguoi_lap_bieu'].includes(auth.user.role)) {
      return NextResponse.json({ 
        error: "Chỉ Giám Đốc, Kế Toán và Người Lập Biểu mới có quyền xem toàn bộ danh sách nhân viên" 
      }, { status: 403 })
    }

    const supabase = createServiceClient()
    const { searchParams } = new URL(request.url)
    
    // Query parameters
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const search = searchParams.get("search")
    const department = searchParams.get("department")
    const month = searchParams.get("month")
    const includeInactive = searchParams.get("include_inactive") === "true"
    const includePayrollData = searchParams.get("include_payroll") === "true"
    
    const offset = (page - 1) * limit

    // Base query for all employees
    let employeeQuery = supabase
      .from("employees")
      .select("employee_id, full_name, department, chuc_vu, is_active")
      .order("department")
      .order("chuc_vu", { ascending: false })
      .order("full_name")

    // Apply filters
    if (!includeInactive) {
      employeeQuery = employeeQuery.eq("is_active", true)
    }

    if (search && search.length >= 2) {
      employeeQuery = employeeQuery.or(`employee_id.ilike.%${search}%,full_name.ilike.%${search}%`)
    }

    if (department && department !== "all") {
      employeeQuery = employeeQuery.eq("department", department)
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from("employees")
      .select("*", { count: "exact", head: true })
      .eq("is_active", includeInactive ? undefined : true)

    // Apply pagination
    employeeQuery = employeeQuery.range(offset, offset + limit - 1)

    const { data: employees, error: employeeError } = await employeeQuery

    if (employeeError) {
      console.error("Error fetching employees:", employeeError)
      return NextResponse.json({ error: "Lỗi truy vấn dữ liệu nhân viên" }, { status: 500 })
    }

    // Optionally include payroll data for specific month
    let employeesWithPayroll = employees || []
    
    if (includePayrollData && month && employees?.length) {
      const employeeIds = employees.map(emp => emp.employee_id)
      
      const { data: payrollData, error: payrollError } = await supabase
        .from("payrolls")
        .select("employee_id, salary_month, tien_luong_thuc_nhan_cuoi_ky, import_status, created_at")
        .eq("salary_month", month)
        .in("employee_id", employeeIds)

      if (!payrollError && payrollData) {
        // Merge payroll data with employee data
        employeesWithPayroll = employees.map(emp => {
          const payroll = payrollData.find(p => p.employee_id === emp.employee_id)
          return {
            ...emp,
            payroll_data: payroll || null,
            has_payroll: !!payroll,
            salary_amount: payroll?.tien_luong_thuc_nhan_cuoi_ky || 0,
            is_signed: payroll?.import_status === 'signed'
          }
        })
      }
    }

    // Get department statistics
    const { data: deptStats, error: deptError } = await supabase
      .from("employees")
      .select("department")
      .eq("is_active", true)

    const departmentCounts = deptStats?.reduce((acc, emp) => {
      acc[emp.department] = (acc[emp.department] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    const departments = Object.keys(departmentCounts).sort()

    // Prepare response with caching headers
    const response = NextResponse.json({
      success: true,
      employees: employeesWithPayroll,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit),
        hasNext: offset + limit < (totalCount || 0),
        hasPrev: page > 1
      },
      departments,
      departmentCounts,
      filters: {
        search,
        department,
        month,
        includeInactive,
        includePayrollData
      },
      metadata: {
        role: auth.user.role,
        timestamp: new Date().toISOString(),
        cached_until: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 60 minutes
      }
    })

    // Set caching headers for 60 minutes
    response.headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=1800')
    response.headers.set('ETag', `"employees-${auth.user.role}-${Date.now()}"`)
    
    return response

  } catch (error) {
    console.error("All employees API error:", error)
    return NextResponse.json(
      {
        error: "Có lỗi xảy ra khi lấy danh sách nhân viên",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
