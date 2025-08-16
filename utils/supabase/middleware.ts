// middleware.ts
import { NextResponse, type NextRequest } from "next/server"

// Middleware chạy trước tất cả request
export function middleware(request: NextRequest) {
  // Supabase tự động lưu token trong cookie khi login
  // Cookie mặc định: sb-access-token và sb-refresh-token
  const accessToken = request.cookies.get("sb-access-token")?.value

  // Nếu không có token => chặn và redirect về trang login
  if (!accessToken) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Nếu có token => cho phép request đi tiếp
  return NextResponse.next()
}

// Cấu hình matcher để middleware chỉ áp dụng cho các route cần bảo vệ
export const config = {
  matcher: [
    "/admin/:path*",    // bảo vệ toàn bộ route trong /admin
    "/api/admin/:path*" // bảo vệ luôn API admin
  ],
}
