import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyToken } from "@/lib/auth-middleware";
import { getVietnamTimestamp } from "@/lib/utils/vietnam-timezone";

export async function POST(request: NextRequest) {
  try {
    const auth = verifyToken(request);
    if (
      !auth ||
      !["admin", "giam_doc", "ke_toan", "nguoi_lap_bieu"].includes(
        auth.user.role,
      )
    ) {
      return NextResponse.json(
        { error: "Không có quyền ký xác nhận" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { salary_month, signature_type, notes, device_info } = body;

    if (!salary_month || !/^\d{4}-\d{2}$/.test(salary_month)) {
      return NextResponse.json(
        { error: "Định dạng tháng không hợp lệ (YYYY-MM)" },
        { status: 400 },
      );
    }

    if (
      !signature_type ||
      !["giam_doc", "ke_toan", "nguoi_lap_bieu"].includes(signature_type)
    ) {
      return NextResponse.json(
        { error: "Loại chữ ký không hợp lệ" },
        { status: 400 },
      );
    }

    if (auth.user.role !== "admin" && auth.user.role !== signature_type) {
      return NextResponse.json(
        { error: "Chức vụ không có quyền ký loại này" },
        { status: 403 },
      );
    }

    const supabase = createServiceClient();

    // Thay đổi logic: Kiểm tra dựa trên nhân viên có bảng lương trong tháng đó
    const { data: employeesWithPayroll, error: payrollError } = await supabase
      .from("payrolls")
      .select("employee_id", { count: "exact" })
      .eq("salary_month", salary_month);

    if (payrollError) {
      console.error("Error fetching employees with payroll:", payrollError);
      return NextResponse.json(
        { error: "Lỗi khi kiểm tra danh sách nhân viên có bảng lương" },
        { status: 500 },
      );
    }

    const { data: signedEmployees, error: signedError } = await supabase
      .from("signature_logs")
      .select("employee_id", { count: "exact" })
      .eq("salary_month", salary_month);

    if (signedError) {
      console.error("Error fetching signed employees:", signedError);
      return NextResponse.json(
        { error: "Lỗi khi kiểm tra nhân viên đã ký" },
        { status: 500 },
      );
    }

    // Tính toán dựa trên nhân viên có bảng lương
    const totalCount = employeesWithPayroll?.length || 0;
    const signedCount = signedEmployees?.length || 0;
    const is100PercentComplete = signedCount === totalCount && totalCount > 0;

    if (!is100PercentComplete) {
      return NextResponse.json(
        {
          error: "Chưa đủ 100% nhân viên có bảng lương ký tên",
          details: {
            total_employees_with_payroll: totalCount,
            signed_employees: signedCount,
            completion_percentage:
              totalCount > 0
                ? Math.round((signedCount / totalCount) * 100 * 100) / 100
                : 0,
            message: `Cần ${totalCount - signedCount} nhân viên có bảng lương ký thêm để đạt 100%`,
          },
        },
        { status: 400 },
      );
    }

    const { data: employee, error: empError } = await supabase
      .from("employees")
      .select("employee_id, full_name, department, chuc_vu")
      .eq("employee_id", auth.user.employee_id)
      .eq("is_active", true)
      .single();

    if (empError || !employee) {
      return NextResponse.json(
        { error: "Nhân viên không tồn tại hoặc đã bị khóa" },
        { status: 400 },
      );
    }

    if (employee.chuc_vu !== signature_type && auth.user.role !== "admin") {
      return NextResponse.json(
        { error: "Chức vụ nhân viên không khớp với loại chữ ký" },
        { status: 400 },
      );
    }

    try {
      const { data: existingSignature, error: existingError } = await supabase
        .from("management_signatures")
        .select("*")
        .eq("salary_month", salary_month)
        .eq("signature_type", signature_type)
        .eq("is_active", true)
        .single();

      if (!existingError && existingSignature) {
        return NextResponse.json(
          {
            error: "Đã có chữ ký cho loại này trong tháng",
            existing_signature: {
              signed_by_id: existingSignature.signed_by_id,
              signed_by_name: existingSignature.signed_by_name,
              signed_at: existingSignature.signed_at,
              department: existingSignature.department,
            },
          },
          { status: 400 },
        );
      }
    } catch (error) {
      console.log(
        "Management signatures table not available - will create mock signature",
      );
    }

    const clientIP =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // Tạo timestamp theo timezone Việt Nam
    const vietnamTime = getVietnamTimestamp();

    const signatureRecord = {
      id: crypto.randomUUID(),
      signature_type,
      salary_month,
      signed_by_id: employee.employee_id,
      signed_by_name: employee.full_name,
      department: employee.department,
      signed_at: vietnamTime,
      ip_address: clientIP,
      device_info: device_info || "Unknown",
      notes: notes || null,
      is_active: true,
    };

    try {
      const { data: insertedSignature, error: insertError } = await supabase
        .from("management_signatures")
        .insert(signatureRecord)
        .select()
        .single();

      if (insertError) {
        console.error("Error inserting signature:", insertError);
        return NextResponse.json(
          { error: "Lỗi khi lưu chữ ký" },
          { status: 500 },
        );
      }

      const statusResponse = await fetch(
        `${request.nextUrl.origin}/api/signature-status/${salary_month}`,
        {
          headers: {
            Authorization: request.headers.get("Authorization") || "",
          },
        },
      );

      let updatedStatus = null;
      if (statusResponse.ok) {
        updatedStatus = await statusResponse.json();
      }

      return NextResponse.json({
        success: true,
        message: "Ký xác nhận thành công",
        signature: insertedSignature,
        updated_status: updatedStatus,
        timestamp: vietnamTime,
      });
    } catch (error) {
      console.log(
        "Management signatures table not available - returning mock response",
      );

      return NextResponse.json({
        success: true,
        message: "Ký xác nhận thành công (Mock - Table chưa tồn tại)",
        signature: signatureRecord,
        updated_status: null,
        timestamp: vietnamTime,
        note: "Cần chạy migration script để tạo management_signatures table",
      });
    }
  } catch (error) {
    console.error("Management signature error:", error);
    return NextResponse.json(
      {
        error: "Có lỗi xảy ra khi ký xác nhận",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
