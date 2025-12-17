import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyAdminToken } from "@/lib/auth-middleware";

export async function GET(request: NextRequest) {
  try {
    const admin = verifyAdminToken(request);
    if (!admin) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 },
      );
    }

    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const payrollType = searchParams.get("payroll_type") || "monthly";

    let query = supabase.from("payrolls").select("*");

    if (payrollType === "t13") {
      query = query.eq("payroll_type", "t13");
    } else {
      query = query.or("payroll_type.eq.monthly,payroll_type.is.null");
    }

    const { data: payrolls, error: payrollsError } = await query.order(
      "created_at",
      { ascending: false },
    );

    if (payrollsError) {
      console.error("Error fetching payrolls:", payrollsError);
      return NextResponse.json(
        { error: "Lỗi khi lấy dữ liệu lương" },
        { status: 500 },
      );
    }

    const stats = {
      totalRecords: payrolls?.length || 0,
      totalEmployees: new Set(payrolls?.map((p) => p.employee_id)).size || 0,
      totalSalary:
        payrollType === "t13"
          ? payrolls?.reduce((sum, p) => sum + (p.tong_luong_13 || 0), 0) || 0
          : payrolls?.reduce((sum, p) => sum + (p.net_salary || 0), 0) || 0,
      payrollType,
    };

    return NextResponse.json({
      success: true,
      payrolls: payrolls || [],
      stats,
    });
  } catch (error) {
    console.error("Get payrolls error:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi lấy dữ liệu" },
      { status: 500 },
    );
  }
}
