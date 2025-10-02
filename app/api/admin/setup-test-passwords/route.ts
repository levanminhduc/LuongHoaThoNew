// API endpoint to setup test passwords for new position sample employees
import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyToken } from "@/lib/auth-middleware";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    // Only admin can setup test passwords
    const auth = verifyToken(request);
    if (!auth || !auth.isRole("admin")) {
      return NextResponse.json(
        { error: "Chỉ admin mới có quyền setup passwords" },
        { status: 403 },
      );
    }

    const supabase = createServiceClient();

    // Test passwords for sample employees
    const testCredentials = [
      {
        employee_id: "GD001",
        password: "giamdoc123",
        role: "giam_doc",
      },
      {
        employee_id: "KT001",
        password: "ketoan123",
        role: "ke_toan",
      },
      {
        employee_id: "NLB001",
        password: "nguoilapbieu123",
        role: "nguoi_lap_bieu",
      },
    ];

    const results = [];

    for (const cred of testCredentials) {
      // Hash the password
      const hashedPassword = await bcrypt.hash(cred.password, 10);

      // Update employee with hashed password
      const { data, error } = await supabase
        .from("employees")
        .update({ cccd_hash: hashedPassword })
        .eq("employee_id", cred.employee_id)
        .select();

      if (error) {
        console.error(`Error updating ${cred.employee_id}:`, error);
        results.push({
          employee_id: cred.employee_id,
          status: "error",
          error: error.message,
        });
      } else {
        results.push({
          employee_id: cred.employee_id,
          status: "success",
          role: cred.role,
          testPassword: cred.password,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Test passwords setup completed",
      results,
      instructions: {
        giam_doc: "Login: GD001 / Password: giamdoc123",
        ke_toan: "Login: KT001 / Password: ketoan123",
        nguoi_lap_bieu: "Login: NLB001 / Password: nguoilapbieu123",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Setup test passwords error:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi setup passwords" },
      { status: 500 },
    );
  }
}
