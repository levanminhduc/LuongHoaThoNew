import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";
import { MAINTENANCE_MODE } from "@/lib/maintenance";
import { applySecurityHeadersTo } from "@/lib/security-middleware";
import { isProduction } from "@/lib/config/runtime";

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

const DEV_ONLY_PATHS = [
  "/test-roles",
  "/test-forgot-password",
  "/admin/test-column-mapping",
  "/debug/browser",
];

function isProtectedRoute(pathname: string): boolean {
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return false;
  }
  return PROTECTED_PATHS.some((path) => pathname.startsWith(path));
}

function isDevOnlyRoute(pathname: string): boolean {
  return DEV_ONLY_PATHS.some((path) => pathname.startsWith(path));
}

function isMaintenanceAllowed(pathname: string): boolean {
  return MAINTENANCE_ALLOWED_PATHS.some((path) => pathname.startsWith(path));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isProduction() && isDevOnlyRoute(pathname)) {
    const response = new NextResponse(null, { status: 404 });
    applySecurityHeadersTo(response);
    return response;
  }

  if (MAINTENANCE_MODE) {
    if (isMaintenanceAllowed(pathname)) {
      const response = NextResponse.next();
      applySecurityHeadersTo(response);
      return response;
    }

    if (pathname.startsWith("/api")) {
      const response = NextResponse.json(
        {
          error: "Hệ thống đang bảo trì",
          message: "Vui lòng thử lại sau",
        },
        { status: 503 },
      );
      applySecurityHeadersTo(response);
      return response;
    }

    const response = NextResponse.redirect(
      new URL("/maintenance", request.url),
    );
    applySecurityHeadersTo(response);
    return response;
  }

  if (isProtectedRoute(pathname)) {
    const token = request.cookies.get("auth_token")?.value;

    if (!token) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      const response = NextResponse.redirect(loginUrl);
      applySecurityHeadersTo(response);
      return response;
    }
  }

  const response = await updateSession(request);
  applySecurityHeadersTo(response);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
