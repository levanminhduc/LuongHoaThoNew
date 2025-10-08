import { type NextRequest, NextResponse } from "next/server";
import { authenticateUser, type JWTPayload } from "@/lib/auth";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-this-in-production";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Thiếu tên đăng nhập hoặc mật khẩu" },
        { status: 400 },
      );
    }

    // Use enhanced authentication
    const authResult = await authenticateUser(username, password);

    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        {
          error: authResult.error || "Tên đăng nhập hoặc mật khẩu không đúng",
        },
        { status: 401 },
      );
    }

    const user = authResult.user;

    // Create enhanced JWT token with role-based payload
    const tokenPayload: Omit<JWTPayload, "iat" | "exp"> = {
      username: user.username,
      employee_id: user.employee_id,
      role: user.role as JWTPayload["role"],
      department: user.department,
      allowed_departments: user.allowed_departments,
      permissions: user.permissions,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "24h" });

    return NextResponse.json({
      success: true,
      token,
      user: {
        employee_id: user.employee_id,
        username: user.username,
        role: user.role,
        department: user.department,
        allowed_departments: user.allowed_departments,
        permissions: user.permissions,
      },
      message: "Đăng nhập thành công",
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi đăng nhập" },
      { status: 500 },
    );
  }
}
