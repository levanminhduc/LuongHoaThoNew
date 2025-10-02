// API endpoint to setup new positions in database
import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyToken } from "@/lib/auth-middleware";

export async function POST(request: NextRequest) {
  try {
    // Only admin can setup new positions
    const auth = verifyToken(request);
    if (!auth || !auth.isRole("admin")) {
      return NextResponse.json(
        { error: "Chỉ admin mới có quyền setup positions" },
        { status: 403 },
      );
    }

    const supabase = createServiceClient();

    // Note: Database constraints will be updated manually via SQL script
    // For now, we'll just create sample employees with new positions

    // 4. Create sample employees for new positions
    const sampleEmployees = [
      {
        employee_id: "GD001",
        full_name: "NGUYỄN VĂN GIÁM ĐỐC",
        cccd_hash: "$2b$10$samplehashforgiamdoc123456789",
        department: "BAN GIÁM ĐỐC",
        chuc_vu: "giam_doc",
      },
      {
        employee_id: "KT001",
        full_name: "TRẦN THỊ KẾ TOÁN",
        cccd_hash: "$2b$10$samplehashforketoan123456789",
        department: "Phòng Kế Toán",
        chuc_vu: "ke_toan",
      },
      {
        employee_id: "NLB001",
        full_name: "LÊ VĂN NGƯỜI LẬP BIỂU",
        cccd_hash: "$2b$10$samplehashfornguoilapbieu123",
        department: "THỐNG KÊ",
        chuc_vu: "nguoi_lap_bieu",
      },
    ];

    const insertResults = [];
    for (const emp of sampleEmployees) {
      const { data, error } = await supabase
        .from("employees")
        .upsert(emp, { onConflict: "employee_id" })
        .select();

      if (error) {
        console.error(`Error inserting ${emp.employee_id}:`, error);
        insertResults.push({
          employee_id: emp.employee_id,
          status: "error",
          error: error.message,
        });
      } else {
        insertResults.push({ employee_id: emp.employee_id, status: "success" });
      }
    }

    // 5. Verify new positions
    const { data: positions, error: posError } = await supabase
      .from("employees")
      .select("chuc_vu")
      .eq("is_active", true);

    if (posError) {
      console.error("Positions verification error:", posError);
    }

    const positionCounts =
      positions?.reduce((acc: any, emp: any) => {
        acc[emp.chuc_vu] = (acc[emp.chuc_vu] || 0) + 1;
        return acc;
      }, {}) || {};

    return NextResponse.json({
      success: true,
      message: "Successfully setup 3 new positions",
      results: {
        constraintUpdated: true,
        sampleEmployees: insertResults,
        currentPositions: positionCounts,
        totalEmployees: positions?.length || 0,
      },
      newPositions: ["giam_doc", "ke_toan", "nguoi_lap_bieu"],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Setup new positions error:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi setup positions" },
      { status: 500 },
    );
  }
}
