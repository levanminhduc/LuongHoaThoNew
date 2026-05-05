import { type NextRequest, NextResponse } from "next/server";
import { csrfProtection } from "@/lib/security-middleware";
import { CACHE_HEADERS } from "@/lib/utils/cache-headers";

export async function POST(request: NextRequest) {
  const csrfResult = csrfProtection(request);
  if (csrfResult) return csrfResult;
  const response = NextResponse.json({ success: true });
  response.cookies.delete("auth_token");
  response.headers.set(
    "Cache-Control",
    CACHE_HEADERS.sensitive["Cache-Control"],
  );
  return response;
}
