import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { JWTPayload } from "@/lib/auth";
import { getVietnamTimestamp } from "@/lib/utils/vietnam-timezone";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-this-in-production";

function verifyAdminToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded.role === "admin" ? decoded : null;
  } catch {
    return null;
  }
}

async function hashCCCD(cccd: string): Promise<string> {
  return await bcrypt.hash(cccd, 10);
}

export async function POST(request: NextRequest) {
  try {
    const adminUser = verifyAdminToken(request);
    if (!adminUser) {
      return NextResponse.json(
        { error: "Không có quyền truy cập. Vui lòng đăng nhập lại." },
        { status: 401 },
      );
    }

    const { employee_id, new_cccd } = await request.json();

    if (!employee_id || !new_cccd) {
      return NextResponse.json(
        { error: "Thiếu mã nhân viên hoặc số CCCD mới" },
        { status: 400 },
      );
    }

    if (new_cccd.length !== 12) {
      return NextResponse.json(
        { error: "Số CCCD phải có đúng 12 chữ số" },
        { status: 400 },
      );
    }

    if (!/^\d{12}$/.test(new_cccd)) {
      return NextResponse.json(
        { error: "Số CCCD chỉ được chứa các chữ số" },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();

    const { data: employee, error: findError } = await supabase
      .from("employees")
      .select("id, employee_id, full_name, cccd_hash")
      .eq("employee_id", employee_id.trim())
      .single();

    if (findError || !employee) {
      return NextResponse.json(
        { error: "Không tìm thấy nhân viên với mã nhân viên đã nhập" },
        { status: 404 },
      );
    }

    const newCccdHash = await hashCCCD(new_cccd.trim());

    const { error: updateError } = await supabase
      .from("employees")
      .update({
        cccd_hash: newCccdHash,
        updated_at: getVietnamTimestamp(),
      })
      .eq("employee_id", employee_id.trim());

    if (updateError) {
      console.error("Error updating CCCD:", updateError);
      return NextResponse.json(
        { error: "Lỗi khi cập nhật CCCD. Vui lòng thử lại." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Đã cập nhật CCCD thành công cho nhân viên ${employee.full_name} (${employee.employee_id})`,
      toast: {
        title: "Cập nhật CCCD thành công",
        description: `Số CCCD của nhân viên ${employee.full_name} (${employee.employee_id}) đã được cập nhật`,
        type: "success",
      },
      employee: {
        employee_id: employee.employee_id,
        full_name: employee.full_name,
      },
    });
  } catch (error) {
    console.error("Error in update-cccd API:", error);
    return NextResponse.json(
      { error: "Lỗi server. Vui lòng thử lại sau." },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const adminUser = verifyAdminToken(request);
    if (!adminUser) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: "Từ khóa tìm kiếm phải có ít nhất 2 ký tự" },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();

    const { data: employees, error } = await supabase
      .from("employees")
      .select("employee_id, full_name, department, chuc_vu, is_active")
      .or(`employee_id.ilike.%${query}%,full_name.ilike.%${query}%`)
      .eq("is_active", true)
      .order("full_name")
      .limit(20);

    if (error) {
      console.error("Error searching employees:", error);
      return NextResponse.json(
        { error: "Lỗi khi tìm kiếm nhân viên" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      employees: employees || [],
    });
  } catch (error) {
    console.error("Error in search employees API:", error);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
