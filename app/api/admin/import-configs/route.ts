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

export async function GET(request: NextRequest) {
  try {
    const admin = verifyAdminToken(request)
    if (!admin) {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 401 })
    }

    const supabase = createServiceClient()

    const { data: configs, error } = await supabase
      .from("import_file_configs")
      .select("*")
      .eq("is_active", true)
      .order("file_type", { ascending: true })

    if (error) {
      console.error("Error fetching import configs:", error)
      return NextResponse.json({ error: "Lỗi khi lấy cấu hình import" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      configs: configs || [],
    })
  } catch (error) {
    console.error("Import configs error:", error)
    return NextResponse.json({ error: "Có lỗi xảy ra khi lấy cấu hình" }, { status: 500 })
  }
}
