import { createQueryRecorder } from "@/lib/__fixtures__/query-recorder";
import type { SupabaseServiceClient } from "../employee-admin-repository";
import { removeEmployee } from "../employee-removal-service";
import { auditService } from "@/lib/audit-service";

jest.mock("@/lib/audit-service", () => ({
  auditService: {
    logEmployeeUpdate: jest.fn(),
    logFailedOperation: jest.fn(),
    logEmployeeChange: jest.fn(),
  },
}));

const mockedAudit = auditService as jest.Mocked<typeof auditService>;

const ADMIN = { employee_id: "AD001", full_name: "Quản Trị Viên" };
const EMPLOYEE = { employee_id: "NV0001", full_name: "Nguyễn Văn A" };

function recorder(scripted: Parameters<typeof createQueryRecorder>[0]) {
  const recorded = createQueryRecorder(scripted);
  return {
    calls: recorded.calls,
    client: recorded.client as unknown as SupabaseServiceClient,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("xoá nhân viên", () => {
  it("không tìm thấy thì dừng, không kiểm tra dữ liệu lương", async () => {
    const recorded = recorder([{ data: null }]);

    const result = await removeEmployee(recorded.client, "NV0001", ADMIN);

    expect(result).toEqual({ status: "not_found" });
    expect(recorded.calls).toHaveLength(1);
  });

  it("còn dữ liệu lương thì vô hiệu hoá chứ không xoá", async () => {
    const recorded = recorder([
      { data: EMPLOYEE },
      { data: [{ id: 1 }] },
      { data: null },
    ]);

    const result = await removeEmployee(recorded.client, "NV0001", ADMIN);

    expect(result).toEqual({ status: "deactivated" });
    expect(recorded.calls[2].operation?.method).toBe("update");
    expect(
      recorded.calls.some((call) => call.operation?.method === "delete"),
    ).toBe(false);
  });

  it("vô hiệu hoá ghi nhật ký đúng lý do còn dữ liệu lương", async () => {
    const recorded = recorder([
      { data: EMPLOYEE },
      { data: [{ id: 1 }] },
      { data: null },
    ]);

    await removeEmployee(recorded.client, "NV0001", ADMIN);

    expect(mockedAudit.logEmployeeChange).toHaveBeenCalledWith({
      adminUserId: "AD001",
      adminUserName: "Quản Trị Viên",
      employeeId: "NV0001",
      employeeName: "Nguyễn Văn A",
      actionType: "DEACTIVATE",
      fieldName: "is_active",
      oldValue: "true",
      newValue: "false",
      changeReason: "Employee deactivated due to existing payroll data",
    });
  });

  it("không có dữ liệu lương thì xoá hẳn", async () => {
    const recorded = recorder([
      { data: EMPLOYEE },
      { data: [] },
      { data: null },
    ]);

    const result = await removeEmployee(recorded.client, "NV0001", ADMIN);

    expect(result).toEqual({ status: "deleted" });
    expect(recorded.calls[2].operation?.method).toBe("delete");
    expect(mockedAudit.logEmployeeChange).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: "DELETE" }),
    );
  });

  it("lỗi vô hiệu hoá thì ghi nhật ký thất bại", async () => {
    const recorded = recorder([
      { data: EMPLOYEE },
      { data: [{ id: 1 }] },
      { error: { message: "row locked" } },
    ]);

    const result = await removeEmployee(recorded.client, "NV0001", ADMIN);

    expect(result).toEqual({ status: "deactivate_failed" });
    expect(mockedAudit.logFailedOperation).toHaveBeenCalledWith(
      "AD001",
      "Quản Trị Viên",
      "NV0001",
      "DEACTIVATE",
      "row locked",
    );
    expect(mockedAudit.logEmployeeChange).not.toHaveBeenCalled();
  });

  it("lỗi xoá thì ghi nhật ký thất bại", async () => {
    const recorded = recorder([
      { data: EMPLOYEE },
      { data: [] },
      { error: { message: "foreign key" } },
    ]);

    const result = await removeEmployee(recorded.client, "NV0001", ADMIN);

    expect(result).toEqual({ status: "delete_failed" });
    expect(mockedAudit.logFailedOperation).toHaveBeenCalledWith(
      "AD001",
      "Quản Trị Viên",
      "NV0001",
      "DELETE",
      "foreign key",
    );
  });

  it("nhật ký hỏng không làm hỏng việc xoá", async () => {
    mockedAudit.logEmployeeChange.mockRejectedValueOnce(
      new Error("audit table down"),
    );
    const recorded = recorder([
      { data: EMPLOYEE },
      { data: [] },
      { data: null },
    ]);

    const result = await removeEmployee(recorded.client, "NV0001", ADMIN);

    expect(result).toEqual({ status: "deleted" });
  });
});
