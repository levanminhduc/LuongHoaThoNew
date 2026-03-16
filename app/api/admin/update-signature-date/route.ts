import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyToken } from "@/lib/auth-middleware";
import { getVietnamTimestamp } from "@/lib/utils/vietnam-timezone";

function generateRandomTimestamp(
  baseDate: string,
  randomRangeDays: number,
): string {
  const base = new Date(baseDate + "T00:00:00");
  const offsetDays =
    randomRangeDays > 0
      ? Math.floor(Math.random() * (randomRangeDays + 1))
      : 0;
  const randomHour = Math.floor(Math.random() * 24);
  const randomMinute = Math.floor(Math.random() * 60);

  base.setDate(base.getDate() + offsetDays);
  base.setHours(randomHour, randomMinute, 0, 0);

  const year = base.getFullYear();
  const month = String(base.getMonth() + 1).padStart(2, "0");
  const day = String(base.getDate()).padStart(2, "0");
  const hour = String(base.getHours()).padStart(2, "0");
  const minute = String(base.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hour}:${minute}:00`;
}

export async function POST(request: NextRequest) {
  try {
    const auth = verifyToken(request);
    if (!auth || !auth.isRole("admin")) {
      return NextResponse.json(
        { error: "Chỉ admin mới có quyền thực hiện" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const {
      salary_month,
      base_date,
      random_range_days = 0,
      scope,
      employee_ids,
      is_t13 = false,
    } = body;

    const monthPattern = is_t13 ? /^\d{4}-(13|T13)$/i : /^\d{4}-\d{2}$/;
    if (!salary_month || !monthPattern.test(salary_month)) {
      return NextResponse.json(
        {
          error: is_t13
            ? "Định dạng tháng không hợp lệ (YYYY-13)"
            : "Định dạng tháng không hợp lệ (YYYY-MM)",
        },
        { status: 400 },
      );
    }

    if (!base_date || !/^\d{4}-\d{2}-\d{2}$/.test(base_date)) {
      return NextResponse.json(
        { error: "Ngày cơ sở không hợp lệ (YYYY-MM-DD)" },
        { status: 400 },
      );
    }

    if (!scope || !["all", "selected"].includes(scope)) {
      return NextResponse.json(
        { error: "Phạm vi không hợp lệ (all/selected)" },
        { status: 400 },
      );
    }

    if (scope === "selected" && (!employee_ids || !employee_ids.length)) {
      return NextResponse.json(
        { error: "Chưa chọn nhân viên nào" },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();

    let payrollQuery = supabase
      .from("payrolls")
      .select("id, employee_id")
      .eq("salary_month", salary_month)
      .eq("is_signed", true);

    if (is_t13) {
      payrollQuery = payrollQuery.eq("payroll_type", "t13");
    } else {
      payrollQuery = payrollQuery.or(
        "payroll_type.eq.monthly,payroll_type.is.null",
      );
    }

    if (scope === "selected") {
      payrollQuery = payrollQuery.in("employee_id", employee_ids);
    }

    const { data: signedPayrolls, error: fetchError } =
      await payrollQuery.order("employee_id");

    if (fetchError) {
      return NextResponse.json(
        { error: "Lỗi khi lấy danh sách bảng lương", details: fetchError.message },
        { status: 500 },
      );
    }

    if (!signedPayrolls || signedPayrolls.length === 0) {
      return NextResponse.json(
        { success: false, error: "Không có bản ghi đã ký trong tháng này" },
        { status: 404 },
      );
    }

    const vietnamNow = getVietnamTimestamp();
    let updatedCount = 0;
    const errors: Array<{ employee_id: string; error: string }> = [];

    for (const payroll of signedPayrolls) {
      const randomSignedAt = generateRandomTimestamp(
        base_date,
        random_range_days,
      );

      const { error: payrollUpdateError } = await supabase
        .from("payrolls")
        .update({
          signed_at: randomSignedAt,
          updated_at: vietnamNow,
        })
        .eq("id", payroll.id);

      if (payrollUpdateError) {
        errors.push({
          employee_id: payroll.employee_id,
          error: `payrolls: ${payrollUpdateError.message}`,
        });
        continue;
      }

      const { error: logUpdateError } = await supabase
        .from("signature_logs")
        .update({ signed_at: randomSignedAt })
        .eq("employee_id", payroll.employee_id)
        .eq("salary_month", salary_month);

      if (logUpdateError) {
        errors.push({
          employee_id: payroll.employee_id,
          error: `signature_logs: ${logUpdateError.message}`,
        });
        continue;
      }

      updatedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Đã cập nhật ngày ký cho ${updatedCount}/${signedPayrolls.length} nhân viên`,
      updated_count: updatedCount,
      total: signedPayrolls.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Có lỗi xảy ra",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
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

      let signedEmployees: Array<{
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

    const now = new Date();
    const currentYear = now.getFullYear();
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
    return NextResponse.json(
      {
        error: "Có lỗi xảy ra",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
