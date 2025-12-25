import { type NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import type { JWTPayload } from "@/lib/auth";
import { getOpenAPISpec } from "@/lib/openapi-spec";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-this-in-production";

const ALLOWED_ROLES = ["admin", "giam_doc", "ke_toan", "nguoi_lap_bieu"];

function verifyApiDocsAccess(request: NextRequest): JWTPayload | null {
  const authHeader = request.headers.get("authorization");
  const cookieToken = request.cookies.get("auth_token")?.value;

  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7)
    : cookieToken;

  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    if (!ALLOWED_ROLES.includes(decoded.role)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const user = verifyApiDocsAccess(request);

  if (!user) {
    return NextResponse.json(
      {
        error:
          "Unauthorized - Bạn cần đăng nhập với quyền admin để xem tài liệu API",
      },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  }

  try {
    const spec = getOpenAPISpec();

    return NextResponse.json(spec, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error generating OpenAPI spec:", error);
    return NextResponse.json(
      { error: "Internal Server Error - Không thể tạo tài liệu API" },
      { status: 500 },
    );
  }
}
