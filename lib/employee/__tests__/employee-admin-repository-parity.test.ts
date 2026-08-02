import {
  createQueryRecorder,
  withoutSelectWhitespace,
} from "@/lib/__fixtures__/query-recorder";
import * as legacy from "../__fixtures__/legacy-employee-admin-queries";
import {
  buildAdminEmployeeListQuery,
  deactivateEmployee,
  deleteEmployee,
  findActiveDepartmentMembers,
  findActiveDepartmentNames,
  findActiveManagersByPosition,
  findAdminEmployeeRecord,
  findAllDepartmentNames,
  findDepartmentByName,
  findDepartmentsOfEmployees,
  findDistinctDepartments,
  findEmployeeForEdit,
  findEmployeeIdByCode,
  findEmployeeNameById,
  insertEmployee,
  insertImportedEmployee,
  updateEmployeeById,
  type AdminEmployeeFilters,
} from "../employee-admin-repository";
import {
  buildAllEmployeesCountQuery,
  buildAllEmployeesDepartmentStatsQuery,
  buildAllEmployeesListQuery,
  buildAttendanceEmployeesQuery,
  buildEmployeeTotalCountQuery,
  buildUnsignedEmployeesExportQuery,
  findAttendanceEmployeeDepartments,
  type EmployeeListFilters,
} from "../employee-list-repository";
import type { SupabaseServiceClient } from "../employee-repository";

function recorder() {
  const recorded = createQueryRecorder([{ data: [] }, { data: [] }]);
  return {
    calls: recorded.calls,
    client: recorded.client as unknown as SupabaseServiceClient,
  };
}

function sameCalls(
  after: ReturnType<typeof recorder>,
  before: ReturnType<typeof recorder>,
) {
  expect(withoutSelectWhitespace(after.calls)).toEqual(
    withoutSelectWhitespace(before.calls),
  );
}

const EMPLOYEE_ID = "NV0001";
const EMPLOYEE_IDS = ["NV0001", "NV0002"];
const DEPARTMENT = "Tổ May 1";
const DEPARTMENTS = ["Tổ May 1", "Tổ May 2"];
const ACTIVE_FILTER = { method: "eq", args: ["is_active", true] };

describe("danh sách nhân viên khu quản trị giữ nguyên sau khi rút", () => {
  const adminFilterCases: [string, AdminEmployeeFilters][] = [
    ["không lọc", { search: null, department: null, role: null }],
    [
      "lọc đủ tiêu chí",
      { search: "nguyen", department: DEPARTMENT, role: "to_truong" },
    ],
    [
      "từ khoá có ký tự đặc biệt của postgrest",
      { search: "a,b)c", department: null, role: null },
    ],
  ];

  it.each(adminFilterCases)("%s", async (_label, filters) => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyAdminEmployeeListQuery(before.client, filters, 20, 20);
    await buildAdminEmployeeListQuery(after.client, filters, 20, 20);

    sameCalls(after, before);
  });

  it("tìm kiếm khu quản trị lọc thêm cả số điện thoại", async () => {
    const after = recorder();

    await buildAdminEmployeeListQuery(
      after.client,
      { search: "0905", department: null, role: null },
      0,
      20,
    );

    const orFilter = after.calls[0].filters.find(
      (filter) => filter.method === "or",
    );
    expect(String(orFilter?.args[0])).toContain("phone_number.ilike");
  });

  it("danh sách khu quản trị vẫn đếm chính xác để phân trang", async () => {
    const after = recorder();

    await buildAdminEmployeeListQuery(
      after.client,
      { search: null, department: null, role: null },
      0,
      20,
    );

    expect(after.calls[0].selectOptions).toEqual({ count: "exact" });
    expect(after.calls[0].filters).toContainEqual({
      method: "range",
      args: [0, 19],
    });
  });
});

describe("thao tác nhân viên khu quản trị giữ nguyên sau khi rút", () => {
  it("kiểm tra trùng mã nhân viên", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyEmployeeIdByCodeQuery(before.client, EMPLOYEE_ID);
    await findEmployeeIdByCode(after.client, EMPLOYEE_ID);

    sameCalls(after, before);
  });

  it("thêm nhân viên trả về đúng bộ cột hiển thị", async () => {
    const before = recorder();
    const after = recorder();
    const record = { employee_id: EMPLOYEE_ID, full_name: "Nguyễn Văn A" };

    await legacy.legacyInsertEmployeeQuery(before.client, record);
    await insertEmployee(after.client, record);

    sameCalls(after, before);
    expect(after.calls[0].select).toContain("created_at");
  });

  it("thêm nhân viên khi import trả về toàn bộ cột", async () => {
    const before = recorder();
    const after = recorder();
    const record = { employee_id: EMPLOYEE_ID };

    await legacy.legacyInsertImportedEmployeeQuery(before.client, record);
    await insertImportedEmployee(after.client, record);

    sameCalls(after, before);
  });

  it("hồ sơ trước khi sửa không lấy mốc thời gian", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyEmployeeForEditQuery(before.client, EMPLOYEE_ID);
    await findEmployeeForEdit(after.client, EMPLOYEE_ID);

    sameCalls(after, before);
    expect(after.calls[0].select).not.toContain("created_at");
  });

  it("cập nhật nhân viên trả về bộ cột đầy đủ", async () => {
    const before = recorder();
    const after = recorder();
    const updateData = { full_name: "Nguyễn Văn B" };

    await legacy.legacyUpdateEmployeeQuery(
      before.client,
      EMPLOYEE_ID,
      updateData,
    );
    await updateEmployeeById(after.client, EMPLOYEE_ID, updateData);

    sameCalls(after, before);
  });

  it("hồ sơ trước khi xoá chỉ lấy mã và tên", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyEmployeeNameByIdQuery(before.client, EMPLOYEE_ID);
    await findEmployeeNameById(after.client, EMPLOYEE_ID);

    sameCalls(after, before);
  });

  it("khoá nhân viên là update, không phải delete", async () => {
    const before = recorder();
    const after = recorder();
    const updateData = { is_active: false, updated_at: "2026-08-02T00:00:00" };

    await legacy.legacyDeactivateEmployeeQuery(
      before.client,
      EMPLOYEE_ID,
      updateData,
    );
    await deactivateEmployee(after.client, EMPLOYEE_ID, updateData);

    sameCalls(after, before);
    expect(after.calls[0].operation?.method).toBe("update");
  });

  it("xoá nhân viên chỉ chạm đúng một mã", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyDeleteEmployeeQuery(before.client, EMPLOYEE_ID);
    await deleteEmployee(after.client, EMPLOYEE_ID);

    sameCalls(after, before);
    expect(after.calls[0].operation?.method).toBe("delete");
    expect(after.calls[0].filters).toEqual([
      { method: "eq", args: ["employee_id", EMPLOYEE_ID] },
    ]);
  });

  it("hồ sơ trả về sau khi sửa", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyAdminEmployeeRecordQuery(before.client, EMPLOYEE_ID);
    await findAdminEmployeeRecord(after.client, EMPLOYEE_ID);

    sameCalls(after, before);
  });
});

describe("thống kê phòng ban giữ nguyên sau khi rút", () => {
  it("danh sách phòng ban của khu quản trị nhân viên dùng not eq rỗng", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyDistinctDepartmentsQuery(before.client);
    await findDistinctDepartments(after.client);

    sameCalls(after, before);
    expect(after.calls[0].filters).toContainEqual({
      method: "not",
      args: ["department", "eq", ""],
    });
  });

  it("danh sách phòng ban của màn phòng ban dùng neq rỗng", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyAllDepartmentNamesQuery(before.client);
    await findAllDepartmentNames(after.client);

    sameCalls(after, before);
    expect(after.calls[0].filters).toContainEqual({
      method: "neq",
      args: ["department", ""],
    });
  });

  it("danh sách phòng ban đang hoạt động thêm bộ lọc trạng thái", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyActiveDepartmentNamesQuery(before.client);
    await findActiveDepartmentNames(after.client);

    sameCalls(after, before);
    expect(after.calls[0].filters).toContainEqual(ACTIVE_FILTER);
  });

  it("đếm nhân viên theo danh sách phòng ban", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyDepartmentsOfEmployeesQuery(before.client, DEPARTMENTS);
    await findDepartmentsOfEmployees(after.client, DEPARTMENTS);

    sameCalls(after, before);
  });

  it.each([
    ["trưởng phòng", "truong_phong"],
    ["tổ trưởng", "to_truong"],
  ])("người quản lý theo chức vụ — %s", async (_label, position) => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyManagersByPositionQuery(
      before.client,
      DEPARTMENTS,
      position,
    );
    await findActiveManagersByPosition(after.client, DEPARTMENTS, position);

    sameCalls(after, before);
  });

  it("tổng số nhân viên dùng head true", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyTotalEmployeeCountQuery(before.client);
    await buildEmployeeTotalCountQuery(after.client);

    sameCalls(after, before);
    expect(after.calls[0].selectOptions).toEqual({
      count: "exact",
      head: true,
    });
  });

  it("kiểm tra phòng ban đã tồn tại", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyDepartmentByNameQuery(before.client, DEPARTMENT);
    await findDepartmentByName(after.client, DEPARTMENT);

    sameCalls(after, before);
  });

  it("thành viên một phòng ban chỉ lấy người còn làm việc", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyDepartmentMembersQuery(before.client, DEPARTMENT);
    await findActiveDepartmentMembers(after.client, DEPARTMENT);

    sameCalls(after, before);
    expect(after.calls[0].filters).toContainEqual(ACTIVE_FILTER);
  });
});

describe("danh sách nhân viên có lọc giữ nguyên sau khi rút", () => {
  const listFilterCases: [string, EmployeeListFilters, boolean][] = [
    ["không lọc, chỉ người đang làm việc", emptyFilters(), false],
    ["gồm cả người đã nghỉ", emptyFilters(), true],
    [
      "lọc tìm kiếm và phòng ban",
      { search: "nguyen", department: DEPARTMENT, restrictToIds: null },
      false,
    ],
    [
      "thu hẹp theo danh sách mã chưa ký",
      { search: null, department: null, restrictToIds: EMPLOYEE_IDS },
      false,
    ],
    [
      "phòng ban all không được coi là bộ lọc",
      { search: null, department: "all", restrictToIds: null },
      false,
    ],
    [
      "từ khoá một ký tự không đủ dài để lọc",
      { search: "a", department: null, restrictToIds: null },
      false,
    ],
  ];

  function emptyFilters(): EmployeeListFilters {
    return { search: null, department: null, restrictToIds: null };
  }

  it.each(listFilterCases)(
    "danh sách toàn bộ nhân viên — %s",
    async (_label, filters, includeInactive) => {
      const before = recorder();
      const after = recorder();

      await legacy.legacyAllEmployeesListQuery(
        before.client,
        filters,
        includeInactive,
      );
      await buildAllEmployeesListQuery(after.client, filters, includeInactive);

      sameCalls(after, before);
    },
  );

  it.each(listFilterCases)(
    "đếm toàn bộ nhân viên — %s",
    async (_label, filters, includeInactive) => {
      const before = recorder();
      const after = recorder();

      await legacy.legacyAllEmployeesCountQuery(
        before.client,
        filters,
        includeInactive,
      );
      await buildAllEmployeesCountQuery(after.client, filters, includeInactive);

      sameCalls(after, before);
    },
  );

  it.each(listFilterCases)(
    "thống kê phòng ban — %s",
    async (_label, filters, includeInactive) => {
      const before = recorder();
      const after = recorder();

      await legacy.legacyAllEmployeesDepartmentStatsQuery(
        before.client,
        filters,
        includeInactive,
      );
      await buildAllEmployeesDepartmentStatsQuery(
        after.client,
        filters,
        includeInactive,
      );

      sameCalls(after, before);
    },
  );

  it("đếm gửi is_active undefined khi lấy cả người đã nghỉ — giữ nguyên hành vi cũ", async () => {
    const listRecorder = recorder();
    const countRecorder = recorder();

    await buildAllEmployeesListQuery(listRecorder.client, emptyFilters(), true);
    await buildAllEmployeesCountQuery(
      countRecorder.client,
      emptyFilters(),
      true,
    );

    expect(listRecorder.calls[0].filters).not.toContainEqual(
      expect.objectContaining({ args: ["is_active", undefined] }),
    );
    expect(countRecorder.calls[0].filters).toContainEqual({
      method: "eq",
      args: ["is_active", undefined],
    });
  });

  it.each([
    ["không lọc", { search: null, department: null, restrictToIds: null }],
    [
      "lọc phòng ban và tìm kiếm",
      { search: "nguyen", department: DEPARTMENT, restrictToIds: null },
    ],
  ])("danh sách nhân viên chấm công — %s", async (_label, filters) => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyAttendanceEmployeesQuery(
      before.client,
      EMPLOYEE_IDS,
      filters as EmployeeListFilters,
    );
    await buildAttendanceEmployeesQuery(
      after.client,
      EMPLOYEE_IDS,
      filters as EmployeeListFilters,
    );

    sameCalls(after, before);
  });

  it("danh sách chấm công lọc phòng ban trước rồi mới tìm kiếm", async () => {
    const after = recorder();

    await buildAttendanceEmployeesQuery(after.client, EMPLOYEE_IDS, {
      search: "nguyen",
      department: DEPARTMENT,
      restrictToIds: null,
    });

    const methods = after.calls[0].filters.map((filter) => filter.method);
    expect(methods.indexOf("eq")).toBeLessThan(methods.indexOf("or"));
  });

  it("danh sách phòng ban của màn chấm công", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyAttendanceDepartmentsQuery(before.client, EMPLOYEE_IDS);
    await findAttendanceEmployeeDepartments(after.client, EMPLOYEE_IDS);

    sameCalls(after, before);
  });

  it.each([
    ["không lọc", { search: null, department: null, restrictToIds: null }],
    [
      "lọc tìm kiếm và phòng ban",
      { search: "nguyen", department: DEPARTMENT, restrictToIds: null },
    ],
  ])("xuất danh sách chưa ký — %s", async (_label, filters) => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyUnsignedEmployeesExportQuery(
      before.client,
      EMPLOYEE_IDS,
      filters as EmployeeListFilters,
    );
    await buildUnsignedEmployeesExportQuery(
      after.client,
      EMPLOYEE_IDS,
      filters as EmployeeListFilters,
    );

    sameCalls(after, before);
  });
});
