// API endpoint for data validation - comparing employees vs payroll data
import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/utils/supabase/server"
import { verifyToken } from "@/lib/auth-middleware"

interface ValidationStats {
  totalEmployees: number
  employeesWithPayroll: number
  missingEmployees: number
  percentage: number
}

interface MissingEmployee {
  employee_id: string
  full_name: string
  department: string
  chuc_vu: string
  is_active: boolean
}

interface ValidationResponse {
  success: boolean
  stats: ValidationStats
  missingEmployees: MissingEmployee[]
  selectedMonth: string
  cacheTimestamp?: string
}

// Cache for 24 hours (24 * 60 * 60 * 1000 ms)
const CACHE_DURATION = 24 * 60 * 60 * 1000
const cache = new Map<string, { data: ValidationResponse; timestamp: number }>()

export async function GET(request: NextRequest) {
  try {
    // Verify authentication - only admin can access
    const auth = verifyToken(request)
    if (!auth) {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 401 })
    }

    // Only admin role can access this endpoint
    if (!auth.isRole('admin')) {
      return NextResponse.json({ 
        error: "Chỉ admin mới có quyền truy cập trang kiểm tra dữ liệu" 
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const month = searchParams.get("month") || getCurrentMonth()
    const forceRefresh = searchParams.get("force_refresh") === "true"

    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ 
        error: "Định dạng tháng không hợp lệ. Sử dụng format YYYY-MM" 
      }, { status: 400 })
    }

    // Check cache first (unless force refresh)
    const cacheKey = `validation_${month}`
    if (!forceRefresh && cache.has(cacheKey)) {
      const cached = cache.get(cacheKey)!
      const isExpired = Date.now() - cached.timestamp > CACHE_DURATION
      
      if (!isExpired) {
        return NextResponse.json({
          ...cached.data,
          cacheTimestamp: new Date(cached.timestamp).toISOString()
        })
      } else {
        cache.delete(cacheKey)
      }
    }

    const supabase = createServiceClient()

    // Get all active employees
    const { data: allEmployees, error: employeesError } = await supabase
      .from("employees")
      .select("employee_id, full_name, department, chuc_vu, is_active")
      .eq("is_active", true)
      .order("department")
      .order("full_name")

    if (employeesError) {
      console.error("Error fetching employees:", employeesError)
      return NextResponse.json({ 
        error: "Lỗi khi lấy danh sách nhân viên" 
      }, { status: 500 })
    }

    // Get employees who have payroll data for the selected month
    const { data: employeesWithPayroll, error: payrollError } = await supabase
      .from("payrolls")
      .select("employee_id")
      .eq("salary_month", month)

    if (payrollError) {
      console.error("Error fetching payroll data:", payrollError)
      return NextResponse.json({ 
        error: "Lỗi khi lấy dữ liệu lương" 
      }, { status: 500 })
    }

    // Create set of employee IDs who have payroll data
    const employeeIdsWithPayroll = new Set(
      employeesWithPayroll?.map(p => p.employee_id) || []
    )

    // Find missing employees (those without payroll data)
    const missingEmployees: MissingEmployee[] = (allEmployees || [])
      .filter(emp => !employeeIdsWithPayroll.has(emp.employee_id))
      .map(emp => ({
        employee_id: emp.employee_id,
        full_name: emp.full_name,
        department: emp.department,
        chuc_vu: emp.chuc_vu,
        is_active: emp.is_active
      }))

    // Calculate statistics
    const totalEmployees = allEmployees?.length || 0
    const employeesWithPayrollCount = employeeIdsWithPayroll.size
    const missingEmployeesCount = missingEmployees.length
    const percentage = totalEmployees > 0 
      ? Math.round((employeesWithPayrollCount / totalEmployees) * 100) 
      : 0

    const stats: ValidationStats = {
      totalEmployees,
      employeesWithPayroll: employeesWithPayrollCount,
      missingEmployees: missingEmployeesCount,
      percentage
    }

    const response: ValidationResponse = {
      success: true,
      stats,
      missingEmployees,
      selectedMonth: month
    }

    // Cache the result
    cache.set(cacheKey, {
      data: response,
      timestamp: Date.now()
    })

    return NextResponse.json(response)

  } catch (error) {
    console.error("Error in data validation API:", error)
    return NextResponse.json({ 
      error: "Lỗi server khi xử lý yêu cầu" 
    }, { status: 500 })
  }
}

// Helper function to get current month in YYYY-MM format
function getCurrentMonth(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

// Clear cache endpoint (for admin use)
export async function DELETE(request: NextRequest) {
  try {
    const auth = verifyToken(request)
    if (!auth || !auth.isRole('admin')) {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const month = searchParams.get("month")

    if (month) {
      // Clear specific month cache
      cache.delete(`validation_${month}`)
    } else {
      // Clear all cache
      cache.clear()
    }

    return NextResponse.json({ 
      success: true, 
      message: "Cache đã được xóa thành công" 
    })

  } catch (error) {
    console.error("Error clearing cache:", error)
    return NextResponse.json({ 
      error: "Lỗi khi xóa cache" 
    }, { status: 500 })
  }
}
