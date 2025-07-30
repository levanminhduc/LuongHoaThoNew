// API endpoint for getting employees by role (managers and supervisors)
import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/utils/supabase/server"
import { verifyToken } from "@/lib/auth-middleware"

// GET employees by role (for permission assignment)
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const auth = verifyToken(request)
    if (!auth || !auth.isRole('admin')) {
      return NextResponse.json({ error: "Chỉ admin mới có quyền truy cập" }, { status: 403 })
    }

    const supabase = createServiceClient()
    const { searchParams } = new URL(request.url)
    const roles = searchParams.get("roles") // e.g., "truong_phong,to_truong"
    const includeInactive = searchParams.get("include_inactive") === "true"

    let query = supabase
      .from("employees")
      .select("employee_id, full_name, department, chuc_vu, is_active")
      .order("chuc_vu", { ascending: false }) // truong_phong first
      .order("full_name")

    // Filter by roles if specified
    if (roles) {
      const roleArray = roles.split(',').map(r => r.trim())
      query = query.in("chuc_vu", roleArray)
    } else {
      // Default: only managers and supervisors
      query = query.in("chuc_vu", ["truong_phong", "to_truong"])
    }

    // Filter by active status
    if (!includeInactive) {
      query = query.eq("is_active", true)
    }

    const { data: employees, error } = await query

    if (error) {
      console.error("Error fetching employees:", error)
      return NextResponse.json({ error: "Lỗi truy vấn dữ liệu nhân viên" }, { status: 500 })
    }

    // Group employees by role for easier frontend handling
    const groupedEmployees = {
      truong_phong: employees?.filter(e => e.chuc_vu === 'truong_phong') || [],
      to_truong: employees?.filter(e => e.chuc_vu === 'to_truong') || [],
      all: employees || []
    }

    return NextResponse.json({
      success: true,
      employees: groupedEmployees,
      total: employees?.length || 0
    })

  } catch (error) {
    console.error("Get employees error:", error)
    return NextResponse.json({ error: "Có lỗi xảy ra" }, { status: 500 })
  }
}
