import { type NextRequest, NextResponse } from "next/server";
import { csrfProtection } from "@/lib/security-middleware";

export async function POST(request: NextRequest) {
  const csrfResult = csrfProtection(request);
  if (csrfResult) return csrfResult;
  const response = NextResponse.json({ success: true });
  response.cookies.delete("auth_token");
  return response;
}
