import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyToken } from "@/lib/auth-middleware";
import { csrfProtection } from "@/lib/security-middleware";
import {
  parseSchema,
  createValidationErrorResponse,
  UpdateSignatureDateRequestSchema,
} from "@/lib/validations";
import { getVietnamYear } from "@/lib/utils/vietnam-timezone";
import { toErrorResponse } from "@/lib/errors/app-error";

const BATCH_SIZE = 200;

export async function POST(request: NextRequest) {
  try {
    const csrfResult = csrfProtection(request);
    if (csrfResult) return csrfResult;
    const auth = verifyToken(request);
    if (!auth || !auth.isRole("admin")) {
      return NextResponse.json(
        { error: "Chỉ admin mới có quyền thực hiện" },
        { status: 403 },
      );
    }

    const parsed = parseSchema(
      UpdateSignatureDateRequestSchema,
      await request.json(),
    );
    if (!parsed.success) {
      return NextResponse.json(createValidationErrorResponse(parsed.errors), {
        status: 400,
      });
    }
    const {
      salary_month,
      base_date,
      random_range_days,
      scope,
      employee_ids,
      is_t13,
    } = parsed.data;

    const supabase = createServiceClient();
    let payrollQuery = supabase
      .from("payrolls")
      .select("employee_id")
      .eq("salary_month", salary_month)
      .eq("is_signed", true);

    if (is_t13) {
      payrollQuery = payrollQuery.eq("payroll_type", "t13");
    } else {
      payrollQuery = payrollQuery.or(
        "payroll_type.eq.monthly,payroll_type.is.null",
      );
    }

    if (scope === "selected" && employee_ids) {
      payrollQuery = payrollQuery.in("employee_id", employee_ids);
    }

    const { data: signedPayrolls, error: fetchError } =
      await payrollQuery.order("employee_id");

    if (fetchError) {
      return NextResponse.json(
        {
          error: "Lỗi khi lấy danh sách bảng lương",
          details: fetchError.message,
        },
        { status: 500 },
      );
    }

    if (!signedPayrolls || signedPayrolls.length === 0) {
      return NextResponse.json(
        { success: false, error: "Không có bản ghi đã ký trong tháng này" },
        { status: 404 },
      );
    }

    const allEmployeeIds = signedPayrolls.map((p) => p.employee_id);
    const batches: string[][] = [];
    for (let i = 0; i < allEmployeeIds.length; i += BATCH_SIZE) {
      batches.push(allEmployeeIds.slice(i, i + BATCH_SIZE));
    }

    const startTime = Date.now();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: Record<string, unknown>) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
          );
        };

        send({
          type: "start",
          total: allEmployeeIds.length,
          batches: batches.length,
        });

        let totalSuccess = 0;
        let totalFailed = 0;
        let totalProcessed = 0;
        const allErrors: Array<{ employee_id: string; error: string }> = [];

        for (let i = 0; i < batches.length; i++) {
          if (request.signal.aborted) {
            break;
          }

          const batch = batches[i];
          try {
            const { data: rpcResult, error: rpcError } = await supabase.rpc(
              "bulk_update_signature_dates",
              {
                p_employee_ids: batch,
                p_salary_month: salary_month,
                p_base_date: base_date,
                p_random_range_days: random_range_days,
                p_is_t13: is_t13,
              },
            );

            if (rpcError) {
              send({
                type: "error",
                batch: i + 1,
                message: `RPC failed: ${rpcError.message}`,
              });
              totalFailed += batch.length;
              totalProcessed += batch.length;
              continue;
            }

            const result = rpcResult as {
              success_count: number;
              error_count: number;
              errors: Array<{ employee_id: string; error: string }>;
            };
            totalSuccess += result.success_count;
            totalFailed += result.error_count;
            totalProcessed += batch.length;

            if (result.errors && result.errors.length > 0) {
              allErrors.push(...result.errors);
            }

            send({
              type: "batch_complete",
              batch: i + 1,
              processed: totalProcessed,
              success: totalSuccess,
              failed: totalFailed,
              elapsed_ms: Date.now() - startTime,
            });
          } catch (err) {
            send({
              type: "error",
              batch: i + 1,
              message: `RPC failed: ${err instanceof Error ? err.message : String(err)}`,
            });
            totalFailed += batch.length;
            totalProcessed += batch.length;
          }
        }

        if (!request.signal.aborted) {
          send({
            type: "complete",
            total: allEmployeeIds.length,
            success: totalSuccess,
            failed: totalFailed,
            duration_seconds: Number(
              ((Date.now() - startTime) / 1000).toFixed(2),
            ),
            errors: allErrors.slice(0, 10),
          });
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return toErrorResponse(error, {
      fallbackMessage: "Có lỗi xảy ra",
    });
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = verifyToken(request);
    if (!auth || !auth.isRole("admin")) {
      return NextResponse.json(
        { error: "Chỉ admin mới có quyền thực hiện" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const isT13 = searchParams.get("is_t13") === "true";

    const supabase = createServiceClient();

    if (month) {
      let payrollQuery = supabase
        .from("payrolls")
        .select("employee_id")
        .eq("salary_month", month)
        .eq("is_signed", true);

      if (isT13) {
        payrollQuery = payrollQuery.eq("payroll_type", "t13");
      } else {
        payrollQuery = payrollQuery.or(
          "payroll_type.eq.monthly,payroll_type.is.null",
        );
      }

      const { data: signedPayrolls, error: fetchError } =
        await payrollQuery.order("employee_id");

      if (fetchError) {
        console.error("Error fetching signed payrolls:", fetchError);
        return NextResponse.json(
          { error: "Lỗi khi lấy danh sách", details: fetchError.message },
          { status: 500 },
        );
      }

      const ids = (signedPayrolls || []).map((p) => p.employee_id);

      const signedEmployees: Array<{
        employee_id: string;
        full_name: string;
        department: string;
      }> = [];

      const BATCH_SIZE = 200;
      for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const batch = ids.slice(i, i + BATCH_SIZE);
        const { data: empBatch } = await supabase
          .from("employees")
          .select("employee_id, full_name, department")
          .in("employee_id", batch)
          .order("employee_id");
        if (empBatch) signedEmployees.push(...empBatch);
      }

      return NextResponse.json({
        success: true,
        month,
        signed_employees: signedEmployees,
        signed_count: signedEmployees.length,
      });
    }

    const currentYear = getVietnamYear();
    const prevYear = currentYear - 1;

    const allMonths: string[] = [];
    for (const year of [currentYear, prevYear]) {
      for (let m = 12; m >= 1; m--) {
        allMonths.push(`${year}-${String(m).padStart(2, "0")}`);
      }
      allMonths.push(`${year}-13`);
    }

    return NextResponse.json({ success: true, months: allMonths });
  } catch (error) {
    return toErrorResponse(error, {
      fallbackMessage: "Có lỗi xảy ra",
    });
  }
}
