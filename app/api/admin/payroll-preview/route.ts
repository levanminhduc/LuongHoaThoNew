import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/utils/supabase/server"
import { verifyAdminToken } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  try {
    const admin = verifyAdminToken(request)
    if (!admin) {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const batchId = searchParams.get("batch_id")

    if (!batchId) {
      return NextResponse.json({ error: "Thiếu batch_id" }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: previewData, error } = await supabase
      .from("payrolls")
      .select(`
        id,
        employee_id,
        salary_month,
        tien_luong_thuc_nhan_cuoi_ky,
        source_file,
        import_batch_id,
        import_status,
        created_at,
        employees!inner(
          full_name,
          department
        )
      `)
      .eq("import_batch_id", batchId)
      .order("employee_id", { ascending: true })
      .limit(1700)

    if (error) {
      console.error("Error fetching preview data:", error)
      return NextResponse.json({ error: "Lỗi khi lấy dữ liệu preview" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: previewData || [],
      total: previewData?.length || 0
    })

  } catch (error) {
    console.error("Preview API error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
