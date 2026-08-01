import { formatCurrency, formatNumber } from "@/lib/utils/date-formatter";
import { LOOKUP_PAGE_STYLES } from "./lookup-html-styles";
import type { LookupPayrollResponse } from "./lookup-types";

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderLookupShell(content: string, employeeId = ""): string {
  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Tra cứu lương</title>
  <style>${LOOKUP_PAGE_STYLES}</style>
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
          <input id="employee_id" name="employee_id" value="${escapeHtml(employeeId)}" required minlength="3" maxlength="32" pattern="[A-Za-z0-9]+" title="Mã nhân viên chỉ gồm chữ và số" autocomplete="off" autocapitalize="characters">
        </div>
        <div class="field">
          <label for="cccd">Mật Khẩu / CCCD</label>
          <input id="cccd" name="cccd" type="password" required minlength="6" maxlength="64" autocomplete="off">
        </div>
        <button type="submit">Tra Cứu Lương</button>
      </form>
    </section>
  </main>
</body>
</html>`;
}

export function renderErrorHtml(error: string, employeeId = ""): string {
  return renderLookupShell(
    `<section class="alert">${escapeHtml(error)}</section>`,
    employeeId,
  );
}

function buildDetailRows(payroll: LookupPayrollResponse) {
  return [
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
}

export function renderLookupResultHtml(payroll: LookupPayrollResponse): string {
  const details = buildDetailRows(payroll)
    .map(
      ([label, value]) =>
        `<div class="row"><span class="label">${escapeHtml(label)}</span><span class="value">${escapeHtml(value)}</span></div>`,
    )
    .join("");
  const signedInfo =
    payroll.is_signed && payroll.signed_at_display
      ? `<section class="alert success">Đã ký nhận lúc ${escapeHtml(payroll.signed_at_display)}.</section>`
      : "";
  const netSalary = formatCurrency(
    Number(payroll.tien_luong_thuc_nhan_cuoi_ky || payroll.net_salary || 0),
  );

  return renderLookupShell(
    `<section class="card">${details}<div class="total"><span class="label">Lương Thực Nhận Cuối Kỳ</span><span class="value">${escapeHtml(netSalary)}</span></div></section>${signedInfo}<div class="actions"><a class="button secondary" href="/employee/lookup">Quay lại trang tra cứu</a></div>`,
    payroll.employee_id,
  );
}
