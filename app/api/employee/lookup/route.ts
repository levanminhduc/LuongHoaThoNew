import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import bcrypt from "bcryptjs";
import {
  formatCurrency,
  formatNumber,
  formatSalaryMonth,
  formatSignatureTime,
} from "@/lib/utils/date-formatter";
import {
  getPayrollSelectSummary,
  type PayrollRecord,
} from "@/lib/payroll-select";
import { createEmployeeSession } from "@/lib/employee-session";
import {
  EmployeeLookupRequestSchema,
  parseSchemaOrThrow,
} from "@/lib/validations";
import { CACHE_HEADERS } from "@/lib/utils/cache-headers";

type ResponseFormat = "json" | "html";

type LookupPayrollResponse = {
  [key: string]: string | number | boolean | null | undefined;
  employee_id: string;
  full_name: string;
  cccd: string;
  position: string;
  department: string;
  salary_month: string;
  salary_month_display: string;
  source_file: string;
  payroll_type: string;
  must_change_password: boolean;
  is_signed: boolean;
  signed_at: string | null;
  signed_at_display: string | null;
  signed_by_name: string | null;
  total_income: number;
  deductions: number;
  net_salary: number;
};

function getResponseFormat(request: NextRequest): ResponseFormat {
  const contentType = request.headers.get("content-type") || "";
  return contentType.includes("application/json") ? "json" : "html";
}

async function getLookupInput(request: NextRequest) {
  const responseFormat = getResponseFormat(request);
  const rawInput =
    responseFormat === "json"
      ? await request.json()
      : Object.fromEntries(await request.formData());
  const parsed = parseSchemaOrThrow(EmployeeLookupRequestSchema, rawInput);
  return {
    responseFormat,
    employee_id: parsed.employee_id.trim().toUpperCase(),
    cccd: parsed.cccd.trim(),
    is_t13: parsed.is_t13,
  };
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function createHtmlResponse(body: string, status = 200) {
  return new NextResponse(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function renderLookupShell(content: string, employeeId = ""): string {
  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Tra cứu lương</title>
  <style>
    body{margin:0;background:#f9fafb;color:#111827;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}
    main{width:min(720px,calc(100% - 32px));margin:0 auto;padding:32px 0}
    h1{margin:0 0 8px;font-size:28px;line-height:1.2;text-align:center}
    h2{margin:0 0 24px;font-size:20px;line-height:1.3;color:#1e3a8a;text-align:center}
    .card{background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:24px;margin:16px 0;box-shadow:0 1px 2px rgba(0,0,0,.04)}
    label{display:block;margin:0 0 8px;font-weight:600}
    input{box-sizing:border-box;width:100%;height:44px;border:1px solid #d1d5db;border-radius:6px;padding:8px 12px;font-size:16px}
    .field{margin-bottom:16px}
    button,.button{display:inline-flex;align-items:center;justify-content:center;min-height:44px;border:0;border-radius:6px;background:#2563eb;color:#fff;font-weight:700;text-decoration:none;padding:0 16px;font-size:16px}
    .button.secondary{background:#f3f4f6;color:#111827}
    .actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}
    .alert{border:1px solid #fecaca;background:#fef2f2;color:#991b1b;border-radius:8px;padding:14px;margin:16px 0}
    .success{border-color:#bbf7d0;background:#f0fdf4;color:#166534}
    .row{display:flex;justify-content:space-between;gap:16px;padding:12px 0;border-bottom:1px solid #f3f4f6}
    .row:last-child{border-bottom:0}
    .label{color:#4b5563}
    .value{font-weight:700;text-align:right}
    .total{background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:18px;text-align:center;margin-top:18px}
    .total .value{display:block;color:#047857;font-size:28px;text-align:center;margin-top:6px}
  </style>
</head>
<body>
  <main>
    <h1>Tra Cứu Lương & Ký Xác Nhận Lương</h1>
    <h2>CÔNG TY MAY HÒA THỌ ĐIỆN BÀN</h2>
    ${content}
    <section class="card">
      <form method="post" action="/api/employee/lookup">
        <div class="field">
          <label for="employee_id">Mã Nhân Viên</label>
          <input id="employee_id" name="employee_id" value="${escapeHtml(employeeId)}" required autocomplete="off" autocapitalize="characters">
        </div>
        <div class="field">
          <label for="cccd">Mật Khẩu / CCCD</label>
          <input id="cccd" name="cccd" type="password" required autocomplete="off">
        </div>
        <button type="submit">Tra Cứu Lương</button>
      </form>
    </section>
  </main>
</body>
</html>`;
}

function renderErrorHtml(error: string, employeeId = ""): string {
  return renderLookupShell(
    `<section class="alert">${escapeHtml(error)}</section>`,
    employeeId,
  );
}

function renderLookupResultHtml(payroll: LookupPayrollResponse): string {
  const rows = [
    ["Mã nhân viên", payroll.employee_id],
    ["Họ tên", payroll.full_name],
    ["Bộ phận", payroll.department],
    ["Chức vụ", payroll.position || "Không xác định"],
    ["Tháng lương", payroll.salary_month_display],
    [
      "Ngày công trong giờ",
      formatNumber(Number(payroll.ngay_cong_trong_gio || 0)),
    ],
    ["Hệ số làm việc", formatNumber(Number(payroll.he_so_lam_viec || 0))],
    [
      "Tiền khen thưởng chuyên cần",
      formatCurrency(Number(payroll.tien_khen_thuong_chuyen_can || 0)),
    ],
    [
      "BHXH BHTN BHYT",
      formatCurrency(Number(payroll.bhxh_bhtn_bhyt_total || 0)),
    ],
    [
      "Trạng thái ký nhận",
      payroll.is_signed ? "Đã ký nhận lương" : "Chưa ký nhận lương",
    ],
  ];
  const details = rows
    .map(
      ([label, value]) =>
        `<div class="row"><span class="label">${escapeHtml(label)}</span><span class="value">${escapeHtml(value)}</span></div>`,
    )
    .join("");
  const signedInfo =
    payroll.is_signed && payroll.signed_at_display
      ? `<section class="alert success">Đã ký nhận lúc ${escapeHtml(payroll.signed_at_display)}.</section>`
      : "";
  return renderLookupShell(
    `<section class="card">${details}<div class="total"><span class="label">Lương Thực Nhận Cuối Kỳ</span><span class="value">${escapeHtml(formatCurrency(Number(payroll.tien_luong_thuc_nhan_cuoi_ky || payroll.net_salary || 0)))}</span></div></section>${signedInfo}<div class="actions"><a class="button secondary" href="/employee/lookup">Quay lại trang tra cứu</a></div>`,
    payroll.employee_id,
  );
}

function createLookupErrorResponse(
  error: string,
  status: number,
  responseFormat: ResponseFormat,
  employeeId = "",
) {
  if (responseFormat === "html") {
    return createHtmlResponse(renderErrorHtml(error, employeeId), status);
  }
  return NextResponse.json({ error }, { status, headers: CACHE_HEADERS.sensitive });
}

function createLookupSuccessResponse(
  payroll: LookupPayrollResponse,
  session_token: string,
  responseFormat: ResponseFormat,
) {
  if (responseFormat === "html") {
    return createHtmlResponse(renderLookupResultHtml(payroll));
  }
  return NextResponse.json(
    { success: true, payroll, session_token },
    { headers: CACHE_HEADERS.sensitive },
  );
}

function validateMonthlyFormat(salaryMonth: string): boolean {
  const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
  return monthPattern.test(salaryMonth);
}

function validateT13Format(salaryMonth: string): boolean {
  const t13Pattern = /^\d{4}-(13|T13)$/i;
  return t13Pattern.test(salaryMonth);
}

/**
 * @swagger
 * /employee/lookup:
 *   post:
 *     tags:
 *       - Employee
 *     summary: Tra cứu thông tin lương
 *     description: Nhân viên tra cứu thông tin lương bằng mã NV và mật khẩu/CCCD
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employee_id
 *               - cccd
 *             properties:
 *               employee_id:
 *                 type: string
 *                 description: Mã nhân viên
 *               cccd:
 *                 type: string
 *                 description: Mật khẩu hoặc số CCCD
 *               is_t13:
 *                 type: boolean
 *                 default: false
 *                 description: Tra cứu lương tháng 13
 *     responses:
 *       200:
 *         description: Thông tin lương
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 payroll:
 *                   $ref: '#/components/schemas/Payroll'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
export async function POST(request: NextRequest) {
  const responseFormat = getResponseFormat(request);
  let employee_id = "";
  let cccd = "";
  let is_t13 = false;

  try {
    const input = await getLookupInput(request);
    employee_id = input.employee_id;
    cccd = input.cccd;
    is_t13 = input.is_t13;
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Dữ liệu không hợp lệ";
    return createLookupErrorResponse(message, 400, responseFormat, employee_id);
  }

  try {
    const supabase = createServiceClient();

    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select(
        "employee_id, full_name, department, chuc_vu, cccd_hash, password_hash, last_password_change_at",
      )
      .eq("employee_id", employee_id)
      .single();

    if (employeeError || !employee) {
      return createLookupErrorResponse(
        "Không tìm thấy nhân viên với mã nhân viên đã nhập",
        404,
        responseFormat,
        employee_id,
      );
    }

    const hasChangedPassword = employee.last_password_change_at !== null;
    const hashToVerify = hasChangedPassword
      ? employee.password_hash
      : employee.cccd_hash;
    const isValidPassword = await bcrypt.compare(cccd, hashToVerify);

    if (!isValidPassword) {
      return createLookupErrorResponse(
        "Mật khẩu không đúng",
        401,
        responseFormat,
        employee_id,
      );
    }

    const session_token = createEmployeeSession(employee_id);

    let query = supabase
      .from("payrolls")
      .select(getPayrollSelectSummary(is_t13))
      .eq("employee_id", employee_id);

    if (is_t13) {
      query = query.eq("payroll_type", "t13");
    } else {
      query = query.or("payroll_type.eq.monthly,payroll_type.is.null");
    }

    const { data: payrollData, error: payrollError } = await query
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const payroll = payrollData as PayrollRecord | null;

    if (payrollError || !payroll) {
      console.error("Payroll query error:", {
        employee_id,
        is_t13,
        error: payrollError,
        message: payrollError?.message,
        details: payrollError?.details,
        hint: payrollError?.hint,
      });

      const errorMsg = is_t13
        ? "Không tìm thấy thông tin lương tháng 13 cho nhân viên này"
        : "Không tìm thấy thông tin lương cho nhân viên này";
      return createLookupErrorResponse(
        errorMsg,
        404,
        responseFormat,
        employee_id,
      );
    }

    if (is_t13) {
      const salaryMonth = payroll.salary_month;
      if (!validateT13Format(salaryMonth)) {
        return createLookupErrorResponse(
          `Tháng lương "${salaryMonth}" không hợp lệ cho lương tháng 13. Định dạng đúng: YYYY-13`,
          400,
          responseFormat,
          employee_id,
        );
      }
    } else {
      const salaryMonth = payroll.salary_month;
      if (salaryMonth && !validateMonthlyFormat(salaryMonth)) {
        console.warn(
          `Non-standard salary_month format for employee ${employee_id}: ${salaryMonth}`,
        );
      }
    }

    const baseResponse = {
      employee_id: employee.employee_id,
      full_name: employee.full_name,
      cccd,
      position: employee.chuc_vu,
      department: employee.department,
      salary_month: payroll.salary_month,
      salary_month_display: is_t13
        ? `Lương Tháng 13 - ${payroll.salary_month.split("-")[0]}`
        : formatSalaryMonth(payroll.salary_month),
      source_file: payroll.source_file || "Unknown",
      payroll_type: payroll.payroll_type || "monthly",
      must_change_password: employee.last_password_change_at === null,
      is_signed: payroll.is_signed || false,
      signed_at: payroll.signed_at || null,
      signed_at_display: payroll.signed_at
        ? formatSignatureTime(payroll.signed_at)
        : null,
      signed_by_name: payroll.signed_by_name || null,
    };

    if (is_t13) {
      const t13Response: LookupPayrollResponse = {
        ...baseResponse,
        chi_dot_1_13: payroll.chi_dot_1_13 || 0,
        chi_dot_2_13: payroll.chi_dot_2_13 || 0,
        tong_luong_13: payroll.tong_luong_13 || 0,
        so_thang_chia_13: payroll.so_thang_chia_13 || 0,
        tong_sp_12_thang: payroll.tong_sp_12_thang || 0,
        t13_thang_01: payroll.t13_thang_01 || 0,
        t13_thang_02: payroll.t13_thang_02 || 0,
        t13_thang_03: payroll.t13_thang_03 || 0,
        t13_thang_04: payroll.t13_thang_04 || 0,
        t13_thang_05: payroll.t13_thang_05 || 0,
        t13_thang_06: payroll.t13_thang_06 || 0,
        t13_thang_07: payroll.t13_thang_07 || 0,
        t13_thang_08: payroll.t13_thang_08 || 0,
        t13_thang_09: payroll.t13_thang_09 || 0,
        t13_thang_10: payroll.t13_thang_10 || 0,
        t13_thang_11: payroll.t13_thang_11 || 0,
        t13_thang_12: payroll.t13_thang_12 || 0,
        total_income: payroll.tong_luong_13 || 0,
        deductions: 0,
        net_salary: payroll.tong_luong_13 || 0,
        tien_luong_thuc_nhan_cuoi_ky: payroll.tong_luong_13 || 0,
      };
      return createLookupSuccessResponse(
        t13Response,
        session_token,
        responseFormat,
      );
    }

    const monthlyResponse: LookupPayrollResponse = {
      ...baseResponse,
      total_income: payroll.tien_luong_thuc_nhan_cuoi_ky || 0,
      deductions: payroll.bhxh_bhtn_bhyt_total || 0,
      net_salary: payroll.tien_luong_thuc_nhan_cuoi_ky || 0,
      he_so_lam_viec: payroll.he_so_lam_viec || 0,
      he_so_phu_cap_ket_qua: payroll.he_so_phu_cap_ket_qua || 0,
      ngay_cong_trong_gio: payroll.ngay_cong_trong_gio ?? null,
      tien_khen_thuong_chuyen_can: payroll.tien_khen_thuong_chuyen_can || 0,
      tien_tang_ca_vuot: payroll.tien_tang_ca_vuot || 0,
      luong_cnkcp_vuot: payroll.luong_cnkcp_vuot || 0,
      luong_hoc_viec_pc_luong: payroll.luong_hoc_viec_pc_luong || 0,
      bhxh_bhtn_bhyt_total: payroll.bhxh_bhtn_bhyt_total || 0,
      tien_luong_thuc_nhan_cuoi_ky: payroll.tien_luong_thuc_nhan_cuoi_ky || 0,
    };

    return createLookupSuccessResponse(
      monthlyResponse,
      session_token,
      responseFormat,
    );
  } catch (error) {
    console.error("Employee lookup error:", error);
    return createLookupErrorResponse(
      "Có lỗi xảy ra khi tra cứu thông tin",
      500,
      responseFormat,
      employee_id,
    );
  }
}
