import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { csrfProtection } from "@/lib/security-middleware";
import jwt from "jsonwebtoken";
import { type JWTPayload } from "@/lib/auth";
import { getJwtSecret } from "@/lib/config/jwt";
import { getVietnamTimestamp } from "@/lib/utils/vietnam-timezone";

function verifyAdminToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as JWTPayload;
    return decoded.role === "admin" ? decoded : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const csrfResult = csrfProtection(request);
    if (csrfResult) return csrfResult;
    // Verify admin authentication
    const admin = verifyAdminToken(request);
    if (!admin) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 },
      );
    }

    const { payrollData, columnMappings, summary } = await request.json();

    if (!payrollData || !Array.isArray(payrollData)) {
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ" },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();

    // Generate batch ID for tracking
    const batchId = `BATCH_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const dbRecords = payrollData.map((record) => ({
      ...record,
      import_batch_id: batchId,
      import_status: "imported",
      created_at: getVietnamTimestamp(),
      updated_at: getVietnamTimestamp(),
    }));

    // Insert records in batches to avoid timeout
    const batchSize = 100;
    let insertedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < dbRecords.length; i += batchSize) {
      const batch = dbRecords.slice(i, i + batchSize);

      try {
        const { data, error } = await supabase
          .from("payrolls")
          .insert(batch)
          .select();

        if (error) {
          console.error("Batch insert error:", error);
          errors.push(
            `Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`,
          );
        } else {
          insertedCount += data?.length || 0;
        }
      } catch (batchError) {
        console.error("Batch processing error:", batchError);
        errors.push(
          `Batch ${Math.floor(i / batchSize) + 1}: ${batchError instanceof Error ? batchError.message : "Unknown error"}`,
        );
      }
    }

    // Log import activity
    try {
      await supabase.from("import_logs").insert({
        batch_id: batchId,
        admin_user: admin.username,
        total_records: payrollData.length,
        successful_records: insertedCount,
        failed_records: payrollData.length - insertedCount,
        column_mappings: columnMappings,
        summary: summary,
        errors: errors,
        created_at: getVietnamTimestamp(),
      });
    } catch (logError) {
      console.error("Failed to log import activity:", logError);
    }

    return NextResponse.json({
      success: insertedCount > 0,
      message: `Import hoàn tất! Đã xử lý ${insertedCount}/${payrollData.length} bản ghi thành công`,
      batchId,
      insertedCount,
      totalRecords: payrollData.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Advanced upload error:", error);
    return NextResponse.json(
      {
        error: "Có lỗi xảy ra khi xử lý dữ liệu",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
