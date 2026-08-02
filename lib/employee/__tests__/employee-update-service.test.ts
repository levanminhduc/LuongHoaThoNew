import { createQueryRecorder } from "@/lib/__fixtures__/query-recorder";
import type { SupabaseServiceClient } from "../employee-admin-repository";
import {
  updateEmployee,
  type EmployeeUpdateInput,
} from "../employee-update-service";
import { auditService } from "@/lib/audit-service";
import { cascadeUpdateEmployeeId } from "@/lib/employee/cascade-update-employee";

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

const mockedAudit = auditService as jest.Mocked<typeof auditService>;
const mockedCascade = cascadeUpdateEmployeeId as jest.MockedFunction<
  typeof cascadeUpdateEmployeeId
>;

const ADMIN = { employee_id: "AD001", full_name: "Quản Trị Viên" };

const EXISTING = {
  full_name: "Nguyễn Văn A",
  chuc_vu: "nhan_vien",
  department: "Tổ May 1",
  phone_number: "0905000000",
  is_active: true,
};

function baseInput(): EmployeeUpdateInput {
  return {
    employee_id: "NV0001",
    full_name: "Nguyễn Văn A",
    chuc_vu: "nhan_vien",
    department: "Tổ May 1",
    phone_number: "0905000000",
    is_active: true,
  };
}

function recorder(scripted: Parameters<typeof createQueryRecorder>[0]) {
  const recorded = createQueryRecorder(scripted);
  return {
    calls: recorded.calls,
    client: recorded.client as unknown as SupabaseServiceClient,
  };
}

function updatedRow(fullName = "Nguyễn Văn A") {
  return { employee_id: "NV0001", full_name: fullName };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("cập nhật nhân viên khi giữ nguyên mã", () => {
  it("không tìm thấy nhân viên thì dừng, không chạy lệnh ghi nào", async () => {
    const recorded = recorder([{ data: null }]);

    const result = await updateEmployee(
      recorded.client,
      "NV0001",
      baseInput(),
      ADMIN,
    );

    expect(result).toEqual({ status: "not_found" });
    expect(recorded.calls).toHaveLength(1);
    expect(recorded.calls[0].operation).toBeUndefined();
  });

  it("cập nhật thành công trả về bản ghi mới", async () => {
    const recorded = recorder([
      { data: EXISTING },
      { data: updatedRow("Nguyễn Văn B") },
    ]);
    const input = { ...baseInput(), full_name: "Nguyễn Văn B" };

    const result = await updateEmployee(
      recorded.client,
      "NV0001",
      input,
      ADMIN,
    );

    expect(result).toEqual({
      status: "updated",
      employee: updatedRow("Nguyễn Văn B"),
      employeeIdChanged: false,
    });
  });

  it("chỉ ghi nhật ký đúng những trường thật sự đổi", async () => {
    const recorded = recorder([
      { data: EXISTING },
      { data: updatedRow("Nguyễn Văn B") },
    ]);

    await updateEmployee(
      recorded.client,
      "NV0001",
      { ...baseInput(), full_name: "Nguyễn Văn B" },
      ADMIN,
    );

    const changes = mockedAudit.logEmployeeUpdate.mock.calls[0][4];
    expect(changes).toEqual([
      {
        fieldName: "full_name",
        oldValue: "Nguyễn Văn A",
        newValue: "Nguyễn Văn B",
      },
    ]);
  });

  it("không có gì đổi thì không ghi nhật ký", async () => {
    const recorded = recorder([{ data: EXISTING }, { data: updatedRow() }]);

    await updateEmployee(recorded.client, "NV0001", baseInput(), ADMIN);

    expect(mockedAudit.logEmployeeUpdate).not.toHaveBeenCalled();
  });

  it("mật khẩu và CCCD được băm, không bao giờ ghi giá trị thật vào nhật ký", async () => {
    const recorded = recorder([{ data: EXISTING }, { data: updatedRow() }]);

    await updateEmployee(
      recorded.client,
      "NV0001",
      { ...baseInput(), password: "matkhau", cccd: "0123456789" },
      ADMIN,
    );

    const updateData = recorded.calls[1].operation?.args[0] as Record<
      string,
      unknown
    >;
    expect(updateData.password_hash).toBe("hashed:matkhau");
    expect(updateData.cccd_hash).toBe("hashed:0123456789");
    expect(updateData.last_password_change_at).toBeDefined();

    const changes = mockedAudit.logEmployeeUpdate.mock.calls[0][4];
    expect(changes).toEqual([
      { fieldName: "password", oldValue: "[HIDDEN]", newValue: "[CHANGED]" },
      { fieldName: "cccd", oldValue: "[HIDDEN]", newValue: "[CHANGED]" },
    ]);
  });

  it("không đổi mật khẩu thì không đụng last_password_change_at", async () => {
    const recorded = recorder([{ data: EXISTING }, { data: updatedRow() }]);

    await updateEmployee(recorded.client, "NV0001", baseInput(), ADMIN);

    const updateData = recorded.calls[1].operation?.args[0] as Record<
      string,
      unknown
    >;
    expect(updateData).not.toHaveProperty("last_password_change_at");
    expect(updateData).not.toHaveProperty("password_hash");
  });

  it("is_active không truyền thì mặc định bật", async () => {
    const recorded = recorder([{ data: EXISTING }, { data: updatedRow() }]);
    const input = baseInput();
    delete input.is_active;

    await updateEmployee(recorded.client, "NV0001", input, ADMIN);

    const updateData = recorded.calls[1].operation?.args[0] as Record<
      string,
      unknown
    >;
    expect(updateData.is_active).toBe(true);
  });

  it("lỗi cập nhật thì ghi nhật ký thất bại và báo lỗi", async () => {
    const recorded = recorder([
      { data: EXISTING },
      { error: { message: "duplicate key" } },
    ]);

    const result = await updateEmployee(
      recorded.client,
      "NV0001",
      baseInput(),
      ADMIN,
    );

    expect(result).toEqual({ status: "update_failed" });
    expect(mockedAudit.logFailedOperation).toHaveBeenCalledWith(
      "AD001",
      "Quản Trị Viên",
      "NV0001",
      "UPDATE",
      "duplicate key",
    );
    expect(mockedAudit.logEmployeeUpdate).not.toHaveBeenCalled();
  });

  it("nhật ký hỏng không làm hỏng việc cập nhật", async () => {
    mockedAudit.logEmployeeUpdate.mockRejectedValueOnce(
      new Error("audit table down"),
    );
    const recorded = recorder([
      { data: EXISTING },
      { data: updatedRow("Nguyễn Văn B") },
    ]);

    const result = await updateEmployee(
      recorded.client,
      "NV0001",
      { ...baseInput(), full_name: "Nguyễn Văn B" },
      ADMIN,
    );

    expect(result.status).toBe("updated");
  });
});

describe("cập nhật nhân viên khi đổi mã", () => {
  it("cascade hỏng thì không chạy lệnh cập nhật nào", async () => {
    mockedCascade.mockResolvedValueOnce({
      success: false,
      message: "Mã mới đã tồn tại",
      error: "duplicate",
    } as Awaited<ReturnType<typeof cascadeUpdateEmployeeId>>);
    const recorded = recorder([{ data: EXISTING }]);

    const result = await updateEmployee(
      recorded.client,
      "NV0001",
      { ...baseInput(), employee_id: "NV0002" },
      ADMIN,
    );

    expect(result).toEqual({
      status: "cascade_failed",
      message: "Mã mới đã tồn tại",
      details: "duplicate",
    });
    expect(recorded.calls).toHaveLength(1);
  });

  it("cascade xong thì cập nhật theo mã mới, không phải mã cũ", async () => {
    mockedCascade.mockResolvedValueOnce({
      success: true,
      message: "Đã cập nhật 5 bảng",
      affectedTables: { payrolls: 3 },
    } as Awaited<ReturnType<typeof cascadeUpdateEmployeeId>>);
    const recorded = recorder([{ data: EXISTING }, { data: updatedRow() }]);

    const result = await updateEmployee(
      recorded.client,
      "NV0001",
      { ...baseInput(), employee_id: "NV0002" },
      ADMIN,
    );

    expect(recorded.calls[1].filters).toContainEqual({
      method: "eq",
      args: ["employee_id", "NV0002"],
    });
    expect(result).toMatchObject({
      status: "cascade_updated",
      cascadeMessage: "Đã cập nhật 5 bảng",
      cascadeStats: { payrolls: 3 },
    });
  });

  it("đổi mã mà không đổi bí mật thì không ghi nhật ký trường", async () => {
    mockedCascade.mockResolvedValueOnce({
      success: true,
      message: "ok",
      affectedTables: {},
    } as Awaited<ReturnType<typeof cascadeUpdateEmployeeId>>);
    const recorded = recorder([{ data: EXISTING }, { data: updatedRow() }]);

    await updateEmployee(
      recorded.client,
      "NV0001",
      { ...baseInput(), employee_id: "NV0002" },
      ADMIN,
    );

    expect(mockedAudit.logEmployeeUpdate).not.toHaveBeenCalled();
  });

  it("đổi mã kèm đổi mật khẩu thì ghi nhật ký lý do cascade", async () => {
    mockedCascade.mockResolvedValueOnce({
      success: true,
      message: "ok",
      affectedTables: {},
    } as Awaited<ReturnType<typeof cascadeUpdateEmployeeId>>);
    const recorded = recorder([{ data: EXISTING }, { data: updatedRow() }]);

    await updateEmployee(
      recorded.client,
      "NV0001",
      { ...baseInput(), employee_id: "NV0002", password: "matkhau" },
      ADMIN,
    );

    expect(mockedAudit.logEmployeeUpdate).toHaveBeenCalledWith(
      "AD001",
      "Quản Trị Viên",
      "NV0002",
      "Nguyễn Văn A",
      [{ fieldName: "password", oldValue: "[HIDDEN]", newValue: "[CHANGED]" }],
      "Sensitive fields updated during cascade operation",
    );
  });
});
