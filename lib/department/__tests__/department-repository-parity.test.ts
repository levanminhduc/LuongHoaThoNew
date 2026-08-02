import { createQueryRecorder } from "@/lib/__fixtures__/query-recorder";
import * as legacy from "../__fixtures__/legacy-department-permission-queries";
import {
  buildDepartmentPermissionListQuery,
  findActiveDepartmentPermissions,
  findDepartmentPermission,
  insertDepartmentPermission,
  reactivateDepartmentPermission,
  revokeDepartmentPermissionByEmployeeDepartment,
  revokeDepartmentPermissionById,
  type SupabaseServiceClient,
} from "../department-repository";

function recorder() {
  const recorded = createQueryRecorder([{ data: [] }, { data: [] }]);
  return {
    calls: recorded.calls,
    client: recorded.client as unknown as SupabaseServiceClient,
  };
}

describe("truy vấn danh sách phân quyền giữ nguyên sau khi rút", () => {
  const cases: [string, string | null, string | null, string | null][] = [
    ["không lọc gì", null, null, null],
    ["lọc theo nhân viên", "NV001", null, null],
    ["lọc theo phòng ban", null, "Tổ May 1", null],
    ["lọc is_active true", null, null, "true"],
    ["lọc is_active false", null, null, "false"],
    ["lọc cả ba", "NV001", "Tổ May 1", "true"],
  ];

  it.each(cases)(
    "%s — chuỗi gọi giống hệt",
    async (_label, employeeId, department, isActive) => {
      const before = recorder();
      const after = recorder();

      await legacy.legacyListQuery(
        before.client,
        employeeId,
        department,
        isActive,
      );
      await buildDepartmentPermissionListQuery(after.client, {
        employeeId,
        department,
        isActive,
      });

      expect(after.calls).toEqual(before.calls);
    },
  );

  it("giữ nguyên hai embed và tên constraint trong chuỗi select", async () => {
    const after = recorder();

    await buildDepartmentPermissionListQuery(after.client, {
      employeeId: null,
      department: null,
      isActive: null,
    });

    expect(after.calls[0].select).toContain("employees!fk_dept_perm_employee");
    expect(after.calls[0].select).toContain(
      "granted_by_employee:employees!department_permissions_granted_by_fkey",
    );
  });

  it("is_active chuyển từ chuỗi sang boolean đúng như bản cũ", async () => {
    const after = recorder();

    await buildDepartmentPermissionListQuery(after.client, {
      employeeId: null,
      department: null,
      isActive: "false",
    });

    expect(after.calls[0].filters).toContainEqual({
      method: "eq",
      args: ["is_active", false],
    });
  });
});

describe("các truy vấn ghi giữ nguyên sau khi rút", () => {
  it("tìm quyền đã tồn tại", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyFindExistingQuery(before.client, "NV001", "Tổ May 1");
    await findDepartmentPermission(after.client, "NV001", "Tổ May 1");

    expect(after.calls).toEqual(before.calls);
  });

  it("cấp quyền mới", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyInsertQuery(
      before.client,
      "NV001",
      "Tổ May 1",
      "ADMIN01",
      "ghi chú",
    );
    await insertDepartmentPermission(after.client, {
      employeeId: "NV001",
      department: "Tổ May 1",
      grantedBy: "ADMIN01",
      notes: "ghi chú",
    });

    expect(after.calls).toEqual(before.calls);
  });

  it.each([
    ["notes là chuỗi", "ghi chú"],
    ["notes null", null],
    ["notes undefined — nhánh zod trả về khi client bỏ trống", undefined],
  ])("cấp quyền mới với %s", async (_label, notes) => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyInsertQuery(
      before.client,
      "NV001",
      "Tổ May 1",
      "ADMIN01",
      notes,
    );
    await insertDepartmentPermission(after.client, {
      employeeId: "NV001",
      department: "Tổ May 1",
      grantedBy: "ADMIN01",
      notes,
    });

    expect(after.calls).toEqual(before.calls);
    expect(
      (after.calls[0].operation?.args[0] as Record<string, unknown>).notes,
    ).toBe(notes);
  });

  it("thu hồi theo id — vẫn ép kiểu số như bản cũ", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyRevokeByIdQuery(before.client, "42");
    await revokeDepartmentPermissionById(after.client, "42");

    expect(after.calls).toEqual(before.calls);
    expect(after.calls[0].filters).toContainEqual({
      method: "eq",
      args: ["id", 42],
    });
  });

  it("thu hồi theo nhân viên và phòng ban", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyRevokeByEmployeeDepartmentQuery(
      before.client,
      "NV001",
      "Tổ May 1",
    );
    await revokeDepartmentPermissionByEmployeeDepartment(
      after.client,
      "NV001",
      "Tổ May 1",
    );

    expect(after.calls).toEqual(before.calls);
  });

  it("kích hoạt lại: mọi thứ trừ granted_at giống hệt bản cũ", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyReactivateQuery(
      before.client,
      7,
      "ADMIN01",
      "BẤT KỲ",
      "ghi chú",
    );
    await reactivateDepartmentPermission(after.client, 7, "ADMIN01", "ghi chú");

    const withoutGrantedAt = (payload: unknown) => {
      const rest = { ...(payload as Record<string, unknown>) };
      delete rest.granted_at;
      return rest;
    };

    expect(withoutGrantedAt(after.calls[0].operation?.args[0])).toEqual(
      withoutGrantedAt(before.calls[0].operation?.args[0]),
    );
    expect(after.calls[0].filters).toEqual(before.calls[0].filters);
    expect(after.calls[0].terminal).toBe(before.calls[0].terminal);
  });

  it("kích hoạt lại vẫn đóng dấu thời gian giờ Việt Nam", async () => {
    const after = recorder();

    await reactivateDepartmentPermission(after.client, 7, "ADMIN01", null);

    const payload = after.calls[0].operation?.args[0] as Record<
      string,
      unknown
    >;

    expect(payload.granted_at).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });
});

describe("truy vấn tổng kết phân quyền giữ nguyên sau khi rút", () => {
  it("chuỗi gọi giống hệt, chỉ có một embed", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacySummaryQuery(before.client);
    await findActiveDepartmentPermissions(after.client);

    expect(after.calls).toEqual(before.calls);
    expect(after.calls[0].select).not.toContain("granted_by_employee");
  });
});
