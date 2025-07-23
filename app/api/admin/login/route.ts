import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminCredentials } from "@/lib/auth"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this-in-production"

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: "Thiếu tên đăng nhập hoặc mật khẩu" }, { status: 400 })
    }

    const isValid = await verifyAdminCredentials(username, password)

    if (!isValid) {
      return NextResponse.json({ error: "Tên đăng nhập hoặc mật khẩu không đúng" }, { status: 401 })
    }

    // Tạo JWT token
    const token = jwt.sign({ username, role: "admin" }, JWT_SECRET, { expiresIn: "24h" })

    return NextResponse.json({
      success: true,
      token,
      message: "Đăng nhập thành công",
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Có lỗi xảy ra khi đăng nhập" }, { status: 500 })
  }
}
