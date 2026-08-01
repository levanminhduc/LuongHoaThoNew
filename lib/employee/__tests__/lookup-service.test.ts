import bcrypt from "bcryptjs";
import { lookupEmployeePayroll } from "../lookup-service";
import { findEmployeeAuthRecord } from "../employee-repository";
import { createEmployeeSession } from "@/lib/employee-session";
import type { SupabaseServiceClient } from "../employee-repository";
import type { EmployeeAuthRecord } from "../employee-repository";

jest.mock("../employee-repository", () => ({
  findEmployeeAuthRecord: jest.fn(),
}));

jest.mock("@/lib/employee-session", () => ({
  createEmployeeSession: jest.fn(() => "session-token"),
}));

const findEmployeeMock = findEmployeeAuthRecord as jest.MockedFunction<
  typeof findEmployeeAuthRecord
>;
const createSessionMock = createEmployeeSession as jest.MockedFunction<
  typeof createEmployeeSession
>;

const CCCD = "012345678901";
const CCCD_HASH = bcrypt.hashSync(CCCD, 4);

function employee(overrides: Partial<EmployeeAuthRecord> = {}) {
  return {
    employee_id: "NV001",
    full_name: "Nguyễn Văn A",
    department: "Tổ May 1",
    chuc_vu: "nhan_vien",
    cccd_hash: CCCD_HASH,
    password_hash: null,
    last_password_change_at: null,
    ...overrides,
  } as EmployeeAuthRecord;
}

function makeSupabase(payroll: unknown, error: unknown = null) {
  const single = jest.fn().mockResolvedValue({ data: payroll, error });
  const limit = jest.fn(() => ({ single }));
  const order = jest.fn(() => ({ limit }));
  const or = jest.fn(() => ({ order }));
  const eq2 = jest.fn(() => ({ order }));
  const eq = jest.fn(() => ({ eq: eq2, or, order }));
  const select = jest.fn(() => ({ eq }));
  const from = jest.fn(() => ({ select }));

  return { from } as unknown as SupabaseServiceClient;
}

const monthlyPayroll = {
  salary_month: "2026-07",
  payroll_type: "monthly",
  source_file: "luong.xlsx",
  is_signed: false,
  signed_at: null,
  signed_by_name: null,
  tien_luong_thuc_nhan_cuoi_ky: 9_000_000,
  bhxh_bhtn_bhyt_total: 1_000_000,
  he_so_lam_viec: 1.2,
};

const t13Payroll = {
  salary_month: "2026-13",
  payroll_type: "t13",
  source_file: "t13.xlsx",
  is_signed: false,
  signed_at: null,
  signed_by_name: null,
  tong_luong_13: 5_000_000,
};

describe("lookupEmployeePayroll", () => {
  beforeEach(() => {
    findEmployeeMock.mockReset();
    createSessionMock.mockClear();
  });

  it("tra 404 khi khong tim thay nhan vien", async () => {
    findEmployeeMock.mockResolvedValue(null);

    const result = await lookupEmployeePayroll(makeSupabase(null), {
      employee_id: "NV404",
      cccd: CCCD,
      is_t13: false,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(404);
  });

  it("verify bang cccd_hash khi nhan vien chua doi mat khau", async () => {
    findEmployeeMock.mockResolvedValue(employee());

    const result = await lookupEmployeePayroll(makeSupabase(monthlyPayroll), {
      employee_id: "NV001",
      cccd: CCCD,
      is_t13: false,
    });

    expect(result.ok).toBe(true);
  });

  it("verify bang password_hash khi da doi mat khau", async () => {
    const newPassword = "matkhaumoi";
    findEmployeeMock.mockResolvedValue(
      employee({
        password_hash: bcrypt.hashSync(newPassword, 4),
        last_password_change_at: "2026-07-01 08:00:00",
      }),
    );

    const wrong = await lookupEmployeePayroll(makeSupabase(monthlyPayroll), {
      employee_id: "NV001",
      cccd: CCCD,
      is_t13: false,
    });
    const right = await lookupEmployeePayroll(makeSupabase(monthlyPayroll), {
      employee_id: "NV001",
      cccd: newPassword,
      is_t13: false,
    });

    expect(wrong.ok).toBe(false);
    expect(right.ok).toBe(true);
  });

  it("tra 401 khi sai mat khau", async () => {
    findEmployeeMock.mockResolvedValue(employee());

    const result = await lookupEmployeePayroll(makeSupabase(monthlyPayroll), {
      employee_id: "NV001",
      cccd: "sai-mat-khau",
      is_t13: false,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it("tra 401 khi ban ghi khong co hash nao", async () => {
    findEmployeeMock.mockResolvedValue(
      employee({ cccd_hash: null, password_hash: null }),
    );

    const result = await lookupEmployeePayroll(makeSupabase(monthlyPayroll), {
      employee_id: "NV001",
      cccd: CCCD,
      is_t13: false,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it("tra 404 khi khong co du lieu luong", async () => {
    findEmployeeMock.mockResolvedValue(employee());

    const result = await lookupEmployeePayroll(makeSupabase(null), {
      employee_id: "NV001",
      cccd: CCCD,
      is_t13: false,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(404);
  });

  it("map luong thang thuong dung cac field chinh", async () => {
    findEmployeeMock.mockResolvedValue(employee());

    const result = await lookupEmployeePayroll(makeSupabase(monthlyPayroll), {
      employee_id: "NV001",
      cccd: CCCD,
      is_t13: false,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payroll.net_salary).toBe(9_000_000);
      expect(result.payroll.deductions).toBe(1_000_000);
      expect(result.payroll.payroll_type).toBe("monthly");
      expect(result.payroll.must_change_password).toBe(true);
      expect(result.session_token).toBe("session-token");
    }
  });

  it("map luong T13 lay tong_luong_13 lam net_salary", async () => {
    findEmployeeMock.mockResolvedValue(employee());

    const result = await lookupEmployeePayroll(makeSupabase(t13Payroll), {
      employee_id: "NV001",
      cccd: CCCD,
      is_t13: true,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payroll.net_salary).toBe(5_000_000);
      expect(result.payroll.deductions).toBe(0);
      expect(result.payroll.salary_month_display).toContain("Tháng 13");
    }
  });

  it("tu choi khi thang T13 sai dinh dang", async () => {
    findEmployeeMock.mockResolvedValue(employee());

    const result = await lookupEmployeePayroll(
      makeSupabase({ ...t13Payroll, salary_month: "2026-07" }),
      { employee_id: "NV001", cccd: CCCD, is_t13: true },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });

  it("khong bao gio tra cccd trong ket qua", async () => {
    findEmployeeMock.mockResolvedValue(employee());

    const result = await lookupEmployeePayroll(makeSupabase(monthlyPayroll), {
      employee_id: "NV001",
      cccd: CCCD,
      is_t13: false,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.stringify(result.payroll)).not.toContain(CCCD);
    }
  });
});
