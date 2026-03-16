import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyToken } from "@/lib/auth-middleware";

const VALID_SIGNATURE_TYPES = ["giam_doc", "ke_toan", "nguoi_lap_bieu"];

const SIGNATURE_TYPE_LABELS: Record<string, string> = {
  giam_doc: "Giám Đốc",
  ke_toan: "Kế Toán",
  nguoi_lap_bieu: "Người Lập Biểu",
};

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
      signature_type,
      new_signed_at,
      action = "update",
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

    if (!signature_type || !VALID_SIGNATURE_TYPES.includes(signature_type)) {
      return NextResponse.json(
        { error: "Loại chữ ký không hợp lệ" },
        { status: 400 },
      );
    }

    if (!new_signed_at) {
      return NextResponse.json(
        { error: "Chưa nhập ngày ký mới" },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();
    const payrollType = is_t13 ? "t13" : "monthly";

    if (action === "update") {
      let query = supabase
        .from("management_signatures")
        .select("*")
        .eq("salary_month", salary_month)
        .eq("signature_type", signature_type)
        .eq("is_active", true);

      if (is_t13) {
        query = query.eq("payroll_type", "t13");
      } else {
        query = query.or("payroll_type.eq.monthly,payroll_type.is.null");
      }

      const { data: existing, error: findError } = await query.single();

      if (findError || !existing) {
        return NextResponse.json(
          { success: false, error: "Không tìm thấy chữ ký quản lý" },
          { status: 404 },
        );
      }

      const { error: updateError } = await supabase
        .from("management_signatures")
        .update({ signed_at: new_signed_at })
        .eq("id", existing.id);

      if (updateError) {
        return NextResponse.json(
          { error: "Lỗi khi cập nhật ngày ký", details: updateError.message },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: `Đã cập nhật ngày ký ${SIGNATURE_TYPE_LABELS[signature_type]}`,
        signature_id: existing.id,
      });
    }

    if (action === "create") {
      let existCheck = supabase
        .from("management_signatures")
        .select("id")
        .eq("salary_month", salary_month)
        .eq("signature_type", signature_type)
        .eq("is_active", true);

      if (is_t13) {
        existCheck = existCheck.eq("payroll_type", "t13");
      } else {
        existCheck = existCheck.or("payroll_type.eq.monthly,payroll_type.is.null");
      }

      const { data: existingSig } = await existCheck.single();

      if (existingSig) {
        return NextResponse.json(
          {
            success: false,
            error: "Chữ ký đã tồn tại, sử dụng chức năng sửa ngày",
          },
          { status: 409 },
        );
      }

      const { data: signer, error: signerError } = await supabase
        .from("employees")
        .select("employee_id, full_name, department")
        .eq("chuc_vu", signature_type)
        .eq("is_active", true)
        .order("employee_id", { ascending: true })
        .limit(1)
        .single();

      if (signerError || !signer) {
        return NextResponse.json(
          {
            success: false,
            error: `Không tìm thấy người có chức vụ ${SIGNATURE_TYPE_LABELS[signature_type]}`,
          },
          { status: 404 },
        );
      }

      const { data: inserted, error: insertError } = await supabase
        .from("management_signatures")
        .insert({
          signature_type,
          salary_month,
          payroll_type: payrollType,
          signed_by_id: signer.employee_id,
          signed_by_name: signer.full_name,
          department: signer.department,
          signed_at: new_signed_at,
          ip_address: "admin-override",
          device_info: "Admin Update Signature Date",
          notes: `Admin tạo chữ ký thay cho ${signer.full_name}`,
          is_active: true,
        })
        .select()
        .single();

      if (insertError) {
        return NextResponse.json(
          { error: "Lỗi khi tạo chữ ký", details: insertError.message },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: `Đã tạo chữ ký ${SIGNATURE_TYPE_LABELS[signature_type]} cho ${signer.full_name}`,
        signature: inserted,
      });
    }

    return NextResponse.json(
      { error: "Action không hợp lệ (update/create)" },
      { status: 400 },
    );
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
