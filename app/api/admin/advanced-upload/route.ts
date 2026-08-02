import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { csrfProtection } from "@/lib/security-middleware";
import { getVietnamTimestamp } from "@/lib/utils/vietnam-timezone";
import { verifyAdminAccess } from "@/lib/auth-middleware";
import {
  parseSchema,
  createValidationErrorResponse,
  AdvancedUploadRequestSchema,
} from "@/lib/validations";
import { toErrorResponse } from "@/lib/errors/app-error";

export async function POST(request: NextRequest) {
  try {
    const csrfResult = csrfProtection(request);
    if (csrfResult) return csrfResult;
    const auth = verifyAdminAccess(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const parsed = parseSchema(
      AdvancedUploadRequestSchema,
      await request.json(),
    );
    if (!parsed.success) {
      return NextResponse.json(createValidationErrorResponse(parsed.errors), {
        status: 400,
      });
    }
    const { payrollData } = parsed.data;

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
    return toErrorResponse(error, {
      fallbackMessage: "Có lỗi xảy ra khi xử lý dữ liệu",
    });
  }
}
