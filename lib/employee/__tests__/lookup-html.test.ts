import {
  escapeHtml,
  renderErrorHtml,
  renderLookupResultHtml,
} from "../lookup-html";
import type { LookupPayrollResponse } from "../lookup-types";

const payroll: LookupPayrollResponse = {
  employee_id: "NV001",
  full_name: "Nguyễn Văn A",
  position: "nhan_vien",
  department: "Tổ May 1",
  salary_month: "2026-07",
  salary_month_display: "Tháng 07/2026",
  source_file: "luong.xlsx",
  payroll_type: "monthly",
  must_change_password: false,
  is_signed: true,
  signed_at: "2026-08-01 08:00:00",
  signed_at_display: "08:00 01/08/2026",
  signed_by_name: "Nguyễn Văn A",
  total_income: 10_000_000,
  deductions: 1_000_000,
  net_salary: 9_000_000,
};

describe("escapeHtml", () => {
  it("thoat ky tu co the chen the", () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
    );
  });

  it("bien null thanh chuoi rong", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });
});

describe("renderErrorHtml", () => {
  it("hien thong bao loi va giu lai ma nhan vien da nhap", () => {
    const html = renderErrorHtml("Mật khẩu không đúng", "NV001");

    expect(html).toContain("Mật khẩu không đúng");
    expect(html).toContain('value="NV001"');
  });

  it("khong cho ma nhan vien doc hai chen the", () => {
    const html = renderErrorHtml("Lỗi", '"><script>bad()</script>');

    expect(html).not.toContain("<script>bad()");
  });

  it("van la trang tra cuu day du", () => {
    const html = renderErrorHtml("Lỗi");

    expect(html).toContain("<!doctype html>");
    expect(html).toContain("Tra Cứu Lương");
    expect(html).toContain('action="/api/employee/lookup"');
  });
});

describe("renderLookupResultHtml", () => {
  it("hien thong tin nhan vien va thang luong", () => {
    const html = renderLookupResultHtml(payroll);

    expect(html).toContain("Nguyễn Văn A");
    expect(html).toContain("Tháng 07/2026");
    expect(html).toContain("Tổ May 1");
  });

  it("hien trang thai da ky kem thoi diem", () => {
    const html = renderLookupResultHtml(payroll);

    expect(html).toContain("Đã ký nhận lương");
    expect(html).toContain("08:00 01/08/2026");
  });

  it("hien chua ky khi is_signed false", () => {
    const html = renderLookupResultHtml({ ...payroll, is_signed: false });

    expect(html).toContain("Chưa ký nhận lương");
  });

  it("khong bao gio in ra mat khau hay cccd", () => {
    const html = renderLookupResultHtml({
      ...payroll,
      cccd: "012345678901",
    } as LookupPayrollResponse);

    expect(html).not.toContain("012345678901");
  });
});
