import { createQueryRecorder } from "@/lib/__fixtures__/query-recorder";
import type { SupabaseServiceClient } from "../employee-admin-repository";
import {
  updateEmployee,
  type EmployeeUpdateInput,
} from "../employee-update-service";
import { removeEmployee } from "../employee-removal-service";

jest.mock("bcryptjs", () => ({
  __esModule: true,
  default: { hash: jest.fn(async (value: string) => `hashed:${value}`) },
}));

jest.mock("@/lib/audit-service", () => ({
  auditService: {
    logEmployeeUpdate: jest.fn(),
    logFailedOperation: jest.fn(),
    logEmployeeChange: jest.fn(),
  },
}));

jest.mock("@/lib/employee/cascade-update-employee", () => ({
  cascadeUpdateEmployeeId: jest.fn(),
}));

const ADMIN_AUDIT = { employee_id: "AD001", full_name: "Quản Trị Viên" };

const FORBIDDEN = { status: 403 };

function actorOf(role: string, employeeId = "ACTOR1") {
  return { role, employeeId };
}

function existingWithRole(chucVu: string) {
  return {
    full_name: "Nguyễn Văn A",
    chuc_vu: chucVu,
    department: "Tổ May 1",
    phone_number: "0905000000",
    is_active: true,
  };
}

function updateInput(overrides: Partial<EmployeeUpdateInput> = {}) {
  return {
    employee_id: "NV0001",
    full_name: "Nguyễn Văn A",
    chuc_vu: "nhan_vien",
    department: "Tổ May 1",
    phone_number: "0905000000",
    is_active: true,
    ...overrides,
  } as EmployeeUpdateInput;
}

function recorder(scripted: Parameters<typeof createQueryRecorder>[0]) {
  const recorded = createQueryRecorder(scripted);
  return {
    calls: recorded.calls,
    client: recorded.client as unknown as SupabaseServiceClient,
  };
}

function runUpdate(
  scripted: Parameters<typeof createQueryRecorder>[0],
  actor: { role: string; employeeId: string },
  input: EmployeeUpdateInput,
  currentId = "NV0001",
) {
  const recorded = recorder(scripted);
  const result = updateEmployee(
    recorded.client,
    currentId,
    input,
    ADMIN_AUDIT,
    actor,
  );
  return { recorded, result };
}

function hasWriteCall(calls: ReturnType<typeof recorder>["calls"]) {
  return calls.some((call) => call.operation !== undefined);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("cập nhật nhân viên có kiểm quyền người gọi", () => {
  it("van_phong tự sửa chính mình bị chặn 403 dù không đổi chức vụ", async () => {
    const { recorded, result } = runUpdate(
      [{ data: existingWithRole("van_phong") }, { data: {} }],
      actorOf("van_phong", "NV0001"),
      updateInput({ chuc_vu: "van_phong" }),
    );

    await expect(result).rejects.toMatchObject(FORBIDDEN);
    expect(hasWriteCall(recorded.calls)).toBe(false);
  });

  it.each(["truong_phong", "van_phong"])(
    "nguoi_lap_bieu đổi mật khẩu nhân viên đang là %s bị chặn 403",
    async (targetRole) => {
      const { recorded, result } = runUpdate(
        [{ data: existingWithRole(targetRole) }, { data: {} }],
        actorOf("nguoi_lap_bieu"),
        updateInput({ chuc_vu: targetRole, password: "matkhaumoi" }),
      );

      await expect(result).rejects.toMatchObject(FORBIDDEN);
      expect(hasWriteCall(recorded.calls)).toBe(false);
    },
  );

  it("nguoi_lap_bieu hạ to_truong xuống nhan_vien thì thành công", async () => {
    const { result } = runUpdate(
      [
        { data: existingWithRole("to_truong") },
        { data: { employee_id: "NV0001", full_name: "Nguyễn Văn A" } },
      ],
      actorOf("nguoi_lap_bieu"),
      updateInput({ chuc_vu: "nhan_vien" }),
    );

    await expect(result).resolves.toMatchObject({ status: "updated" });
  });

  it("van_phong nâng nhan_vien lên giam_doc bị chặn 403", async () => {
    const { recorded, result } = runUpdate(
      [{ data: existingWithRole("nhan_vien") }, { data: {} }],
      actorOf("van_phong"),
      updateInput({ chuc_vu: "giam_doc" }),
    );

    await expect(result).rejects.toMatchObject(FORBIDDEN);
    expect(hasWriteCall(recorded.calls)).toBe(false);
  });

  it("van_phong sửa nhân viên đang là ke_toan bị chặn 403", async () => {
    const { result } = runUpdate(
      [{ data: existingWithRole("ke_toan") }, { data: {} }],
      actorOf("van_phong"),
      updateInput({ chuc_vu: "ke_toan" }),
    );

    await expect(result).rejects.toMatchObject(FORBIDDEN);
  });

  it("van_phong sửa thông tin nhan_vien giữ nguyên chức vụ thì thành công", async () => {
    const { result } = runUpdate(
      [
        { data: existingWithRole("nhan_vien") },
        { data: { employee_id: "NV0001", full_name: "Nguyễn Văn B" } },
      ],
      actorOf("van_phong"),
      updateInput({ full_name: "Nguyễn Văn B" }),
    );

    await expect(result).resolves.toMatchObject({ status: "updated" });
  });

  it("admin hạ quyền nhân viên đang mang chuc_vu admin thì thành công", async () => {
    const { result } = runUpdate(
      [
        { data: existingWithRole("admin") },
        { data: { employee_id: "NV0001", full_name: "Nguyễn Văn A" } },
      ],
      actorOf("admin", "AD001"),
      updateInput({ chuc_vu: "nhan_vien" }),
    );

    await expect(result).resolves.toMatchObject({ status: "updated" });
  });

  it("nhân viên không tồn tại vẫn trả not_found", async () => {
    const { result } = runUpdate(
      [{ data: null }],
      actorOf("van_phong"),
      updateInput(),
    );

    await expect(result).resolves.toEqual({ status: "not_found" });
  });
});

describe("xoá nhân viên có kiểm quyền người gọi", () => {
  function runRemove(
    scripted: Parameters<typeof createQueryRecorder>[0],
    actor: { role: string; employeeId: string },
  ) {
    const recorded = recorder(scripted);
    const result = removeEmployee(
      recorded.client,
      "NV0001",
      ADMIN_AUDIT,
      actor,
    );
    return { recorded, result };
  }

  const targetRow = (chucVu: string) => ({
    full_name: "Nguyễn Văn A",
    chuc_vu: chucVu,
  });

  it("van_phong xoá nhân viên ke_toan bị chặn 403", async () => {
    const { recorded, result } = runRemove(
      [{ data: targetRow("ke_toan") }, { data: [] }, { error: null }],
      actorOf("van_phong"),
    );

    await expect(result).rejects.toMatchObject(FORBIDDEN);
    expect(hasWriteCall(recorded.calls)).toBe(false);
  });

  it("van_phong xoá nhan_vien chưa có lương thì xoá hẳn", async () => {
    const { result } = runRemove(
      [{ data: targetRow("nhan_vien") }, { data: [] }, { error: null }],
      actorOf("van_phong"),
    );

    await expect(result).resolves.toEqual({ status: "deleted" });
  });

  it("nguoi_lap_bieu xoá bất kỳ ai bị chặn 403", async () => {
    const { recorded, result } = runRemove(
      [{ data: targetRow("nhan_vien") }, { data: [] }, { error: null }],
      actorOf("nguoi_lap_bieu"),
    );

    await expect(result).rejects.toMatchObject(FORBIDDEN);
    expect(hasWriteCall(recorded.calls)).toBe(false);
  });

  it("van_phong không tự xoá chính mình", async () => {
    const { result } = runRemove(
      [{ data: targetRow("nhan_vien") }, { data: [] }, { error: null }],
      actorOf("van_phong", "NV0001"),
    );

    await expect(result).rejects.toMatchObject(FORBIDDEN);
  });

  it("admin xoá được nhân viên đang mang chuc_vu admin", async () => {
    const { result } = runRemove(
      [{ data: targetRow("admin") }, { data: [] }, { error: null }],
      actorOf("admin", "AD001"),
    );

    await expect(result).resolves.toEqual({ status: "deleted" });
  });

  it("nhân viên không tồn tại vẫn trả not_found", async () => {
    const { result } = runRemove([{ data: null }], actorOf("van_phong"));

    await expect(result).resolves.toEqual({ status: "not_found" });
  });
});
