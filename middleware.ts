import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";
import { MAINTENANCE_MODE } from "@/lib/maintenance";

const PROTECTED_PATHS = [
  "/admin",
  "/manager",
  "/supervisor",
  "/employee/dashboard",
  "/director",
  "/accountant",
  "/reporter",
];

const PUBLIC_PATHS = ["/admin/login", "/employee/lookup", "/api", "/_next"];

const MAINTENANCE_ALLOWED_PATHS = ["/maintenance", "/_next", "/favicon.ico"];

function isProtectedRoute(pathname: string): boolean {
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return false;
  }
  return PROTECTED_PATHS.some((path) => pathname.startsWith(path));
}

function isMaintenanceAllowed(pathname: string): boolean {
  return MAINTENANCE_ALLOWED_PATHS.some((path) => pathname.startsWith(path));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (MAINTENANCE_MODE) {
    if (isMaintenanceAllowed(pathname)) {
      return NextResponse.next();
    }

    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        {
          error: "Hệ thống đang bảo trì",
          message: "Vui lòng thử lại sau",
        },
        { status: 503 },
      );
    }

    return NextResponse.redirect(new URL("/maintenance", request.url));
  }

  if (isProtectedRoute(pathname)) {
    const token = request.cookies.get("auth_token")?.value;

    if (!token) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
