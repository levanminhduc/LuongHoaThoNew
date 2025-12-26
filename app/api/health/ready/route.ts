import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { getVietnamTimestamp } from "@/lib/utils/vietnam-timezone";

export async function GET() {
  const checks = {
    database: false,
    timestamp: getVietnamTimestamp(),
  };

  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("employees")
      .select("employee_id")
      .limit(1);

    if (!error) {
      checks.database = true;
    }
  } catch {
    checks.database = false;
  }

  const isReady = checks.database;

  return NextResponse.json(
    {
      ready: isReady,
      checks,
    },
    {
      status: isReady ? 200 : 503,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    },
  );
}
