import { NextResponse } from "next/server";
import { getVietnamTimestamp } from "@/lib/utils/vietnam-timezone";

export async function GET() {
  return NextResponse.json(
    {
      alive: true,
      timestamp: getVietnamTimestamp(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    },
  );
}
