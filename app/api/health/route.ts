import { NextResponse } from "next/server";
import { getVietnamTimestamp } from "@/lib/utils/vietnam-timezone";

export async function GET() {
  const healthData = {
    status: "healthy",
    timestamp: getVietnamTimestamp(),
    version: process.env.npm_package_version || "1.0.0",
    environment: process.env.NODE_ENV || "development",
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      unit: "MB",
    },
  };

  return NextResponse.json(healthData, {
    status: 200,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
