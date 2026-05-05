import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyToken } from "@/lib/auth-middleware";
import { csrfProtection } from "@/lib/security-middleware";
import { getVietnamTimestamp } from "@/lib/utils/vietnam-timezone";
import { CACHE_HEADERS } from "@/lib/utils/cache-headers";
import {
  parseSchema,
  createValidationErrorResponse,
  BulkSignSalaryRequestSchema,
} from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const csrfResult = csrfProtection(request);
    if (csrfResult) return csrfResult;
    const auth = verifyToken(request);
    if (!auth || !auth.isRole("admin")) {
      return NextResponse.json(
        { error: "Chỉ admin mới có quyền ký hàng loạt" },
        { status: 403, headers: CACHE_HEADERS.sensitive },
      );
    }

    const rawBody = await request.json();
    const parsed = parseSchema(BulkSignSalaryRequestSchema, rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        createValidationErrorResponse(parsed.errors),
        { status: 400, headers: CACHE_HEADERS.sensitive },
      );
    }
    const {
      salary_month,
      admin_note,
      batch_size = 50,
      is_t13 = false,
    } = parsed.data;

    const supabase = createServiceClient();
    const payrollType = is_t13 ? "t13" : "monthly";

    let unsignedQuery = supabase
      .from("payrolls")
      .select("employee_id")
      .eq("salary_month", salary_month)
      .eq("is_signed", false);

    if (is_t13) {
      unsignedQuery = unsignedQuery.eq("payroll_type", "t13");
    } else {
      unsignedQuery = unsignedQuery.or(
        "payroll_type.eq.monthly,payroll_type.is.null",
      );
    }

    const { data: unsignedPayrolls, error: fetchError } =
      await unsignedQuery.order("employee_id");

    if (fetchError) {
      console.error("Error fetching unsigned payrolls:", fetchError);
      console.error(
        "Fetch error details:",
        JSON.stringify(fetchError, null, 2),
      );
      return NextResponse.json(
        {
          error: "Lỗi khi lấy danh sách chưa ký",
          details: fetchError.message,
        },
        { status: 500, headers: CACHE_HEADERS.sensitive },
      );
    }

    // 4. Check if there are unsigned payrolls
    if (!unsignedPayrolls || unsignedPayrolls.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Tất cả nhân viên đã ký hết rồi!",
        total_processed: 0,
        successful: 0,
        failed: 0,
      }, { headers: CACHE_HEADERS.sensitive });
    }

    const unsignedCount = unsignedPayrolls.length;
    const employeeIds = unsignedPayrolls.map((p) => p.employee_id);

    let totalQuery = supabase
      .from("payrolls")
      .select("*", { count: "exact", head: true })
      .eq("salary_month", salary_month);

    if (is_t13) {
      totalQuery = totalQuery.eq("payroll_type", "t13");
    } else {
      totalQuery = totalQuery.or(
        "payroll_type.eq.monthly,payroll_type.is.null",
      );
    }

    const { count: totalCount } = await totalQuery;

    const alreadySignedCount = (totalCount || 0) - unsignedCount;

    console.log(`📊 Tháng ${salary_month}:`);
    console.log(`   - Tổng: ${totalCount}`);
    console.log(`   - Đã ký: ${alreadySignedCount}`);
    console.log(`   - Chưa ký: ${unsignedCount} ✅`);

    // 6. Generate bulk batch ID
    const bulkBatchId = `BULK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    // 7. Get admin info
    const clientIP =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // 8. Batch processing
    let totalSuccessful = 0;
    let totalFailed = 0;
    const allErrors: Array<{
      employee_id?: string;
      employee_ids?: string[];
      error: string;
      batch?: number;
    }> = [];

    for (let i = 0; i < employeeIds.length; i += batch_size) {
      const batch = employeeIds.slice(i, i + batch_size);
      const batchNumber = Math.floor(i / batch_size) + 1;
      const totalBatches = Math.ceil(employeeIds.length / batch_size);

      console.log(
        `📦 Batch ${batchNumber}/${totalBatches}: ${batch.length} records`,
      );

      try {
        const { data: batchResult, error: batchError } = await supabase.rpc(
          "bulk_sign_salaries",
          {
            p_employee_ids: batch,
            p_salary_month: salary_month,
            p_ip_address: clientIP,
            p_device_info: userAgent,
            p_admin_id: auth.user.employee_id,
            p_admin_name: auth.user.username,
            p_bulk_batch_id: bulkBatchId,
          },
        );

        if (batchError) {
          console.error(`❌ Batch ${batchNumber} error:`, batchError);
          allErrors.push({
            batch: batchNumber,
            error: batchError.message,
            employee_ids: batch,
          });
          totalFailed += batch.length;
        } else if (batchResult) {
          totalSuccessful += batchResult.success_count || 0;
          totalFailed += batchResult.error_count || 0;

          if (batchResult.errors && batchResult.errors.length > 0) {
            allErrors.push(...batchResult.errors);
          }
        }

        // Rate limiting
        if (i + batch_size < employeeIds.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`❌ Batch ${batchNumber} exception:`, error);
        allErrors.push({
          batch: batchNumber,
          error: error instanceof Error ? error.message : "Unknown error",
          employee_ids: batch,
        });
        totalFailed += batch.length;
      }
    }

    const completedTime = Date.now();
    const duration = Math.round((completedTime - startTime) / 1000);

    const { error: logError } = await supabase
      .from("admin_bulk_signature_logs")
      .insert({
        bulk_batch_id: bulkBatchId,
        admin_id: auth.user.employee_id,
        admin_name: auth.user.username,
        salary_month,
        payroll_type: payrollType,
        total_unsigned_before: unsignedCount,
        total_processed: unsignedCount,
        success_count: totalSuccessful,
        error_count: totalFailed,
        errors: allErrors,
        ip_address: clientIP,
        device_info: userAgent,
        admin_note: admin_note || null,
        started_at: new Date(startTime).toISOString(),
        completed_at: new Date(completedTime).toISOString(),
        duration_seconds: duration,
      });

    if (logError) {
      console.error("Failed to insert bulk signature log:", logError);
    }

    const typeLabel = is_t13 ? "lương tháng 13" : "lương";
    return NextResponse.json({
      success: true,
      message: `Hoàn thành ký hàng loạt ${typeLabel}! ${totalSuccessful}/${unsignedCount} thành công`,
      bulk_batch_id: bulkBatchId,
      payroll_type: payrollType,
      statistics: {
        total_employees_in_month: totalCount || 0,
        already_signed_before: alreadySignedCount,
        unsigned_before: unsignedCount,
        processed: unsignedCount,
        successful: totalSuccessful,
        failed: totalFailed,
        now_signed: alreadySignedCount + totalSuccessful,
        still_unsigned: totalFailed,
      },
      errors: allErrors.length > 0 ? allErrors.slice(0, 10) : undefined,
      duration_seconds: duration,
      salary_month,
      timestamp: getVietnamTimestamp(),
    }, { headers: CACHE_HEADERS.sensitive });
  } catch (error) {
    console.error("Bulk sign salary error:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi ký hàng loạt" },
      { status: 500, headers: CACHE_HEADERS.sensitive },
    );
  }
}
