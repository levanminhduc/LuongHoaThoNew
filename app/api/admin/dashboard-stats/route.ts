import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/utils/supabase/server"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this-in-production"

// Verify admin token
function verifyAdminToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null
  }

  const token = authHeader.substring(7)
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    return decoded.role === "admin" ? decoded : null
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const admin = verifyAdminToken(request)
    if (!admin) {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 401 })
    }

    const supabase = createServiceClient()

    // Get recent payroll records
    const { data: payrolls, error: payrollsError } = await supabase
      .from("payrolls")
      .select(`
        id,
        employee_id,
        salary_month,
        tien_luong_thuc_nhan_cuoi_ky,
        source_file,
        import_batch_id,
        import_status,
        created_at
      `)
      .order("created_at", { ascending: false })
      .limit(100)

    if (payrollsError) {
      console.error("Error fetching payrolls:", payrollsError)
      return NextResponse.json({ error: "Lỗi khi lấy dữ liệu lương" }, { status: 500 })
    }

    // Calculate comprehensive statistics
    const stats = {
      totalRecords: payrolls?.length || 0,
      totalEmployees: new Set(payrolls?.map((p) => p.employee_id)).size || 0,
      totalSalary: payrolls?.reduce((sum, p) => sum + (p.tien_luong_thuc_nhan_cuoi_ky || 0), 0) || 0,
      currentMonth: new Date().toISOString().substr(0, 7),
      lastImportBatch: payrolls?.[0]?.import_batch_id?.slice(-8) || "N/A",
      signatureRate: payrolls?.length
        ? (payrolls.filter((p) => p.import_status === "signed").length / payrolls.length) * 100
        : 0,
    }

    // Get monthly distribution
    const monthlyStats = payrolls?.reduce(
      (acc, payroll) => {
        const month = payroll.salary_month
        if (!acc[month]) {
          acc[month] = { count: 0, totalSalary: 0 }
        }
        acc[month].count++
        acc[month].totalSalary += payroll.tien_luong_thuc_nhan_cuoi_ky || 0
        return acc
      },
      {} as { [key: string]: { count: number; totalSalary: number } },
    )

    return NextResponse.json({
      success: true,
      payrolls: payrolls || [],
      stats,
      monthlyStats,
    })
  } catch (error) {
    console.error("Dashboard stats error:", error)
    return NextResponse.json(
      {
        error: "Có lỗi xảy ra khi lấy thống kê dashboard",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
