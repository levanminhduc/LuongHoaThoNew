import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/utils/supabase/server"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this-in-production"

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

export async function GET(request: NextRequest, { params }: { params: { configId: string } }) {
  try {
    const admin = verifyAdminToken(request)
    if (!admin) {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 401 })
    }

    const configId = Number.parseInt(params.configId)
    if (isNaN(configId)) {
      return NextResponse.json({ error: "Config ID không hợp lệ" }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: mappings, error } = await supabase
      .from("import_column_mappings")
      .select("*")
      .eq("config_id", configId)
      .order("display_order", { ascending: true })

    if (error) {
      console.error("Error fetching column mappings:", error)
      return NextResponse.json({ error: "Lỗi khi lấy ánh xạ cột" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      mappings: mappings || [],
    })
  } catch (error) {
    console.error("Column mappings error:", error)
    return NextResponse.json({ error: "Có lỗi xảy ra khi lấy ánh xạ cột" }, { status: 500 })
  }
}
