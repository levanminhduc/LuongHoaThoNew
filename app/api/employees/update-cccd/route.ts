import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import bcrypt from "bcryptjs";
import { BCRYPT_ROUNDS } from "@/lib/constants/security";
import { getVietnamTimestamp } from "@/lib/utils/vietnam-timezone";
import { csrfProtection } from "@/lib/security-middleware";
import { verifyAdminAccess } from "@/lib/auth-middleware";
import {
  parseSchema,
  createValidationErrorResponse,
  UpdateCccdRequestSchema,
} from "@/lib/validations";
import { toErrorResponse } from "@/lib/errors/app-error";
import {
  findEmployeeForCccdUpdate,
  searchActiveEmployees,
  updateEmployeeCredentials,
} from "@/lib/employee/employee-auth-repository";

async function hashCCCD(cccd: string): Promise<string> {
  return await bcrypt.hash(cccd, BCRYPT_ROUNDS);
}

export async function POST(request: NextRequest) {
  try {
    const csrfResult = csrfProtection(request);
    if (csrfResult) return csrfResult;
    const auth = verifyAdminAccess(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const parsed = parseSchema(UpdateCccdRequestSchema, await request.json());
    if (!parsed.success) {
      return NextResponse.json(createValidationErrorResponse(parsed.errors), {
        status: 400,
      });
    }
    const { employee_id, new_cccd } = parsed.data;

    const supabase = createServiceClient();

    const { data: employee, error: findError } =
      await findEmployeeForCccdUpdate(supabase, employee_id);

    if (findError || !employee) {
      return NextResponse.json(
        { error: "Không tìm thấy nhân viên với mã nhân viên đã nhập" },
        { status: 404 },
      );
    }

    const newCccdHash = await hashCCCD(new_cccd);

    const { error: updateError } = await updateEmployeeCredentials(
      supabase,
      employee_id,
      {
        cccd_hash: newCccdHash,
        updated_at: getVietnamTimestamp(),
      },
    );

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
    return toErrorResponse(error, {
      fallbackMessage: "Lỗi server. Vui lòng thử lại sau.",
    });
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = verifyAdminAccess(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
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

    const { data: employees, error } = await searchActiveEmployees(
      supabase,
      query,
    );

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
    return toErrorResponse(error, {
      fallbackMessage: "Lỗi server",
    });
  }
}
