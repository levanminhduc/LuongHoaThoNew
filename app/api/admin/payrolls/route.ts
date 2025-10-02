import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyAdminToken } from "@/lib/auth-middleware";

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const admin = verifyAdminToken(request);
    if (!admin) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 },
      );
    }

    const supabase = createServiceClient();

    // Get all payroll records
    const { data: payrolls, error: payrollsError } = await supabase
      .from("payrolls")
      .select("*")
      .order("created_at", { ascending: false });

    if (payrollsError) {
      console.error("Error fetching payrolls:", payrollsError);
      return NextResponse.json(
        { error: "Lỗi khi lấy dữ liệu lương" },
        { status: 500 },
      );
    }

    // Calculate statistics
    const stats = {
      totalRecords: payrolls?.length || 0,
      totalEmployees: new Set(payrolls?.map((p) => p.employee_id)).size || 0,
      totalSalary:
        payrolls?.reduce((sum, p) => sum + (p.net_salary || 0), 0) || 0,
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
