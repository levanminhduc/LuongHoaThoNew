import { createQueryRecorder } from "@/lib/__fixtures__/query-recorder";
import type { AuthContext } from "@/lib/auth-middleware";
import { updatePayrollRecord } from "@/lib/payroll/payroll-update-service";

let mockActiveClient: unknown;

jest.mock("@/utils/supabase/server", () => ({
  createServiceClient: () => mockActiveClient,
}));

const AUDIT_META = { clientIp: "10.0.0.1" };

function authFor(role: string, allowedDepartments: string[]): AuthContext {
  return {
    user: {
      username: "truongphong1",
      employee_id: "TP001",
      role,
      department: allowedDepartments[0],
      permissions: [],
      allowed_departments: allowedDepartments,
    },
    hasPermission: () => true,
    canAccessDepartment: (department: string) =>
      role === "admin" || allowedDepartments.includes(department),
    isRole: (expected: string) => role === expected,
  } as unknown as AuthContext;
}

function payrollRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
    employee_id: "NV0001",
    salary_month: "2026-07",
    is_signed: false,
    tam_ung: 100,
    employees: { department: "Tổ May 1" },
    ...overrides,
  };
}

function setup(scripted: Parameters<typeof createQueryRecorder>[0]) {
  const recorded = createQueryRecorder(scripted);
  mockActiveClient = recorded.client;
  return recorded;
}

const INPUT = { updates: { tam_ung: 500 }, changeReason: "sửa theo đề nghị" };

describe("sửa phiếu lương", () => {
  it("trả 404 khi không tìm thấy phiếu", async () => {
    const recorded = setup([{ data: null, error: { message: "not found" } }]);

    await expect(
      updatePayrollRecord(authFor("admin", []), 7, INPUT, AUDIT_META),
    ).rejects.toMatchObject({ status: 404 });
    expect(recorded.calls.some((call) => call.operation)).toBe(false);
  });

  it("trả 403 khi truong_phong sửa lương nhân viên phòng khác", async () => {
    const recorded = setup([
      { data: payrollRow({ employees: { department: "Tổ May 2" } }) },
    ]);

    await expect(
      updatePayrollRecord(
        authFor("truong_phong", ["Tổ May 1"]),
        7,
        INPUT,
        AUDIT_META,
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(recorded.calls.some((call) => call.operation)).toBe(false);
  });

  it.each(["admin", "truong_phong"])(
    "trả 409 khi phiếu đã ký (%s)",
    async (role) => {
      const recorded = setup([{ data: payrollRow({ is_signed: true }) }]);

      await expect(
        updatePayrollRecord(authFor(role, ["Tổ May 1"]), 7, INPUT, AUDIT_META),
      ).rejects.toMatchObject({
        status: 409,
        message: "Phiếu lương đã ký, không sửa được",
      });
      expect(recorded.calls.some((call) => call.operation)).toBe(false);
    },
  );

  it("phiếu chưa ký, phòng hợp lệ thì cập nhật và ghi payroll_audit_logs", async () => {
    const recorded = setup([
      { data: payrollRow() },
      { data: payrollRow({ tam_ung: 500 }) },
      { error: null },
    ]);

    const result = await updatePayrollRecord(
      authFor("truong_phong", ["Tổ May 1"]),
      7,
      INPUT,
      AUDIT_META,
    );

    expect(result).toBeDefined();

    const updateCall = recorded.calls.find(
      (call) =>
        call.table === "payrolls" && call.operation?.method === "update",
    );
    expect(updateCall).toBeDefined();
    expect(updateCall?.operation?.args[0]).toMatchObject({ tam_ung: 500 });

    const auditCall = recorded.calls.find(
      (call) =>
        call.table === "payroll_audit_logs" &&
        call.operation?.method === "insert",
    );
    expect(auditCall).toBeDefined();
    const logs = auditCall?.operation?.args[0] as Record<string, unknown>[];
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      payroll_id: 7,
      employee_id: "NV0001",
      field_name: "tam_ung",
      changed_by: "truongphong1",
      change_reason: "sửa theo đề nghị",
    });
  });

  it("lỗi ghi audit không làm hỏng việc cập nhật", async () => {
    setup([
      { data: payrollRow() },
      { data: payrollRow({ tam_ung: 500 }) },
      { error: { message: "audit down" } },
    ]);

    await expect(
      updatePayrollRecord(authFor("admin", []), 7, INPUT, AUDIT_META),
    ).resolves.toBeDefined();
  });
});
