import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

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

function isProtectedRoute(pathname: string): boolean {
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return false;
  }
  return PROTECTED_PATHS.some((path) => pathname.startsWith(path));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
