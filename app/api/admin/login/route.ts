import { type NextRequest, NextResponse } from "next/server";
import { authenticateUser, type JWTPayload } from "@/lib/auth";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "@/lib/config/jwt";
import { csrfProtection, rateLimit } from "@/lib/security-middleware";
import { isProduction } from "@/lib/config/runtime";
import { CACHE_HEADERS } from "@/lib/utils/cache-headers";
import {
  parseSchema,
  createValidationErrorResponse,
  AdminLoginRequestSchema,
} from "@/lib/validations";
import { toErrorResponse } from "@/lib/errors/app-error";

/**
 * @swagger
 * /admin/login:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Đăng nhập hệ thống
 *     description: Xác thực người dùng và trả về JWT token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Đăng nhập thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
export async function POST(request: NextRequest) {
  try {
    const csrfResult = csrfProtection(request);
    if (csrfResult) return csrfResult;

    const rateLimitResult = rateLimit("login")(request);
    if (rateLimitResult) return rateLimitResult;

    const body = await request.json();
    const parsed = parseSchema(AdminLoginRequestSchema, body);
    if (!parsed.success) {
      return NextResponse.json(createValidationErrorResponse(parsed.errors), {
        status: 400,
        headers: CACHE_HEADERS.sensitive,
      });
    }
    const { username, password } = parsed.data;

    const authResult = await authenticateUser(username, password);

    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        {
          error: authResult.error || "Tên đăng nhập hoặc mật khẩu không đúng",
        },
        { status: 401, headers: CACHE_HEADERS.sensitive },
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

    const token = jwt.sign(tokenPayload, getJwtSecret(), { expiresIn: "24h" });

    const response = NextResponse.json({
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

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: isProduction(),
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return toErrorResponse(error, {
      fallbackMessage: "Có lỗi xảy ra khi đăng nhập",
      headers: CACHE_HEADERS.sensitive,
    });
  }
}
