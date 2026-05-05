import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { CACHE_HEADERS } from "@/lib/utils/cache-headers";

export async function POST(request: NextRequest) {
  try {
    const { employee_id } = await request.json();

    if (!employee_id) {
      return NextResponse.json(
        { error: "Thiếu mã nhân viên" },
        { status: 400, headers: CACHE_HEADERS.sensitive },
      );
    }

    const supabase = createServiceClient();

    // Kiểm tra nhân viên và trạng thái password
    const { data: employee, error } = await supabase
      .from("employees")
      .select("employee_id, password_hash, cccd_hash, last_password_change_at")
      .eq("employee_id", employee_id.trim())
      .single();

    if (error || !employee) {
      return NextResponse.json(
        { error: "Không tìm thấy nhân viên" },
        { status: 404, headers: CACHE_HEADERS.sensitive },
      );
    }

    const hasChangedPassword = employee.last_password_change_at !== null;
    const mustChangePassword = !hasChangedPassword;

    return NextResponse.json(
      {
        success: true,
        hasPassword: hasChangedPassword,
        mustChangePassword,
        authField: {
          label: hasChangedPassword ? "Mật khẩu" : "Số CCCD",
          placeholder: hasChangedPassword
            ? "Nhập mật khẩu của bạn"
            : "Nhập số CCCD",
          type: hasChangedPassword ? "password" : "text",
        },
      },
      { headers: CACHE_HEADERS.sensitive },
    );
  } catch (error) {
    console.error("Check password status error:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi kiểm tra trạng thái" },
      { status: 500, headers: CACHE_HEADERS.sensitive },
    );
  }
}
