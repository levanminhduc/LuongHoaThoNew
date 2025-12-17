import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { getVietnamTimestamp } from "@/lib/utils/vietnam-timezone";
import { verifyToken } from "@/lib/auth-middleware";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ month: string }> },
) {
  try {
    const auth = verifyToken(request);
    if (
      !auth ||
      !["admin", "giam_doc", "ke_toan", "nguoi_lap_bieu"].includes(
        auth.user.role,
      )
    ) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 403 },
      );
    }

    const { month } = await params;
    const { searchParams } = new URL(request.url);
    const isT13 = searchParams.get("is_t13") === "true";

    const monthPattern = isT13 ? /^\d{4}-(13|T13)$/i : /^\d{4}-\d{2}$/;
    const formatMsg = isT13
      ? "Định dạng tháng không hợp lệ (YYYY-13)"
      : "Định dạng tháng không hợp lệ (YYYY-MM)";

    if (!month || !monthPattern.test(month)) {
      return NextResponse.json({ error: formatMsg }, { status: 400 });
    }

    const supabase = createServiceClient();

    let payrollQuery = supabase
      .from("payrolls")
      .select("employee_id, is_signed")
      .eq("salary_month", month);

    if (isT13) {
      payrollQuery = payrollQuery.eq("payroll_type", "t13");
    } else {
      payrollQuery = payrollQuery.or(
        "payroll_type.eq.monthly,payroll_type.is.null",
      );
    }

    const { data: payrolls, error: payrollError } = await payrollQuery;

    if (payrollError) {
      console.error("Error fetching payrolls:", payrollError);
      return NextResponse.json(
        { error: "Lỗi khi lấy danh sách bảng lương" },
        { status: 500 },
      );
    }

    const totalCount = payrolls?.length || 0;
    const signedCount = payrolls?.filter((p) => p.is_signed).length || 0;
    const completionPercentage =
      totalCount > 0
        ? Math.round((signedCount / totalCount) * 100 * 100) / 100
        : 0;
    const is100PercentComplete = signedCount === totalCount && totalCount > 0;

    const unsignedEmployeeIds =
      payrolls?.filter((p) => !p.is_signed).map((p) => p.employee_id) || [];

    let unsignedSample: Array<{
      employee_id: string;
      full_name: string;
      department: string;
      chuc_vu: string;
    }> = [];

    if (unsignedEmployeeIds.length > 0) {
      const { data: unsignedData, error: unsignedError } = await supabase
        .from("employees")
        .select("employee_id, full_name, department, chuc_vu")
        .eq("is_active", true)
        .in("employee_id", unsignedEmployeeIds)
        .limit(10);

      if (unsignedError) {
        console.error("Error fetching unsigned employees:", unsignedError);
      } else {
        unsignedSample = unsignedData || [];
      }
    }

    let managementSignatures: Record<string, unknown> = {};
    const payrollType = isT13 ? "t13" : "monthly";
    try {
      let sigQuery = supabase
        .from("management_signatures")
        .select("*")
        .eq("salary_month", month)
        .eq("is_active", true);

      if (isT13) {
        sigQuery = sigQuery.eq("payroll_type", "t13");
      } else {
        sigQuery = sigQuery.or("payroll_type.eq.monthly,payroll_type.is.null");
      }

      const { data: signatures, error: sigError } = await sigQuery;

      if (!sigError && signatures) {
        signatures.forEach((sig) => {
          managementSignatures[sig.signature_type] = {
            id: sig.id,
            signed_by_id: sig.signed_by_id,
            signed_by_name: sig.signed_by_name,
            department: sig.department,
            signed_at: sig.signed_at,
            notes: sig.notes,
            payroll_type: sig.payroll_type,
          };
        });
      }
    } catch (error) {
      console.log("Management signatures table not available yet");
      managementSignatures = {
        giam_doc: null,
        ke_toan: null,
        nguoi_lap_bieu: null,
      };
    }

    const completedSignatures = Object.values(managementSignatures).filter(
      (sig) => sig !== null,
    ).length;
    const remainingSignatures = [
      "giam_doc",
      "ke_toan",
      "nguoi_lap_bieu",
    ].filter((type) => !managementSignatures[type]);

    return NextResponse.json({
      success: true,
      month,
      payroll_type: isT13 ? "t13" : "monthly",
      employee_completion: {
        total_employees: totalCount,
        signed_employees: signedCount,
        completion_percentage: completionPercentage,
        is_100_percent_complete: is100PercentComplete,
        unsigned_employees_sample: unsignedSample || [],
      },
      management_signatures: {
        giam_doc: managementSignatures["giam_doc"] || null,
        ke_toan: managementSignatures["ke_toan"] || null,
        nguoi_lap_bieu: managementSignatures["nguoi_lap_bieu"] || null,
      },
      summary: {
        total_signature_types: 3,
        completed_signatures: completedSignatures,
        remaining_signatures: remainingSignatures,
        is_fully_signed: completedSignatures === 3,
        employee_completion_required: is100PercentComplete,
      },
      timestamp: getVietnamTimestamp(),
    });
  } catch (error) {
    console.error("Signature status error:", error);
    return NextResponse.json(
      {
        error: "Có lỗi xảy ra khi lấy trạng thái ký",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
