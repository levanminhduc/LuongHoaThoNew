import {
  createQueryRecorder,
  withoutSelectWhitespace,
} from "@/lib/__fixtures__/query-recorder";
import * as legacy from "../__fixtures__/legacy-payroll-admin-queries";
import {
  buildRecentPayrollsQuery,
  findAnyPayrollForEmployee,
  findDepartmentPayrollDetails,
  findDepartmentPayrollHistory,
  findDepartmentsPayrollSummary,
  findPayrollEmployeeIdsForMonth,
  findPayrollSignedFlagsForMonth,
  findPayrollSummaryForEmployees,
} from "../payroll-admin-repository";
import {
  buildPayrollExportFallbackQuery,
  buildPayrollExportQuery,
  buildTemplateDataQuery,
  findAvailableSalaryMonths,
  findPayrollsForBulkExport,
  findSamplePayrolls,
} from "../payroll-export-repository";
import {
  findPayrollIdForMonth,
  insertPayrollBatch,
  insertPayrollRecord,
  updatePayrollForMonth,
} from "../payroll-import-repository";
import {
  buildPayrollSearchQuery,
  buildPayrollTotalCountQuery,
  findAllSalaryMonths,
  findAnyPayrollId,
  findPayrollsByEmployeeIdLike,
} from "../payroll-search-repository";
import type { SupabaseServiceClient } from "../payroll-self-repository";

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
const MONTH = "2026-07";
const DEPARTMENT = "Tổ May 1";
const DEPARTMENTS = ["Tổ May 1", "Tổ May 2"];
const SAMPLE_COLUMNS = "employee_id, salary_month, tong_cong_tien_luong";

describe("ghi dữ liệu lương khi import giữ nguyên sau khi rút", () => {
  it("khoá chống trùng vẫn là cặp mã nhân viên và tháng lương", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyDuplicatePayrollQuery(before.client, EMPLOYEE_ID, MONTH);
    await findPayrollIdForMonth(after.client, EMPLOYEE_ID, MONTH);

    sameCalls(after, before);
    expect(after.calls[0].filters).toEqual([
      { method: "eq", args: ["employee_id", EMPLOYEE_ID] },
      { method: "eq", args: ["salary_month", MONTH] },
    ]);
  });

  it("cập nhật khi ghi đè chỉ chạm đúng cặp mã nhân viên và tháng", async () => {
    const before = recorder();
    const after = recorder();
    const updateData = { tong_cong_tien_luong: 1000 };

    await legacy.legacyUpdatePayrollQuery(
      before.client,
      EMPLOYEE_ID,
      MONTH,
      updateData,
    );
    await updatePayrollForMonth(after.client, EMPLOYEE_ID, MONTH, updateData);

    sameCalls(after, before);
    expect(after.calls[0].filters).toHaveLength(2);
  });

  it("thêm mới một bản ghi lương không trả dữ liệu về", async () => {
    const before = recorder();
    const after = recorder();
    const insertData = { employee_id: EMPLOYEE_ID, salary_month: MONTH };

    await legacy.legacyInsertPayrollQuery(before.client, insertData);
    await insertPayrollRecord(after.client, insertData);

    sameCalls(after, before);
    expect(after.calls[0].select).toBeUndefined();
  });

  it("thêm theo lô có trả dữ liệu về để đếm số dòng đã ghi", async () => {
    const before = recorder();
    const after = recorder();
    const rows = [{ employee_id: EMPLOYEE_ID, salary_month: MONTH }];

    await legacy.legacyInsertPayrollBatchQuery(before.client, rows);
    await insertPayrollBatch(after.client, rows);

    sameCalls(after, before);
    expect(after.calls[0].operation).toEqual({
      method: "insert",
      args: [rows],
    });
  });
});

describe("xuất lương giữ nguyên sau khi rút", () => {
  const scopeCases: [string, string[] | null, string | null][] = [
    ["admin xem toàn bộ", null, null],
    ["admin lọc một phòng ban", null, DEPARTMENT],
    ["quản lý giới hạn theo phòng ban được cấp", DEPARTMENTS, null],
    ["quản lý chọn một phòng ban trong quyền", DEPARTMENTS, DEPARTMENT],
    ["tổ trưởng chỉ phòng ban của mình", null, DEPARTMENT],
  ];

  it.each(scopeCases)("%s", async (_label, allowed, department) => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyPayrollExportQuery(
      before.client,
      MONTH,
      false,
      allowed,
      department,
    );
    await buildPayrollExportQuery(after.client, MONTH, false, {
      allowedDepartments: allowed,
      department,
    });

    sameCalls(after, before);
  });

  it("hàng rào phòng ban được cấp đặt trước bộ lọc phòng ban đơn lẻ", async () => {
    const after = recorder();

    await buildPayrollExportQuery(after.client, MONTH, false, {
      allowedDepartments: DEPARTMENTS,
      department: DEPARTMENT,
    });

    const departmentFilters = after.calls[0].filters.filter((filter) =>
      String(filter.args[0]).startsWith("employees.department"),
    );
    expect(departmentFilters).toEqual([
      { method: "in", args: ["employees.department", DEPARTMENTS] },
      { method: "eq", args: ["employees.department", DEPARTMENT] },
    ]);
  });

  it.each([
    ["có lọc tháng", MONTH],
    ["không lọc tháng", null],
  ])("truy vấn dự phòng khi join rỗng — %s", async (_label, month) => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyPayrollExportFallbackQuery(before.client, month);
    await buildPayrollExportFallbackQuery(after.client, month);

    sameCalls(after, before);
  });

  it("danh sách tháng gợi ý giới hạn 10 bản ghi", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyAvailableMonthsQuery(before.client);
    await findAvailableSalaryMonths(after.client);

    sameCalls(after, before);
    expect(after.calls[0].filters).toContainEqual({
      method: "limit",
      args: [10],
    });
  });

  it.each([
    ["kỳ thường", false],
    ["kỳ T13", true],
  ])("xuất lương hàng loạt — %s", async (_label, isT13) => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyBulkExportPayrollsQuery(before.client, MONTH, isT13);
    await findPayrollsForBulkExport(after.client, MONTH, isT13);

    sameCalls(after, before);
  });

  it("dữ liệu mẫu cho template lấy đúng 3 dòng", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacySamplePayrollsQuery(before.client);
    await findSamplePayrolls(after.client);

    sameCalls(after, before);
    expect(after.calls[0].filters).toEqual([
      { method: "limit", args: [3] },
      { method: "order", args: ["created_at", { ascending: false }] },
    ]);
  });

  it.each([
    ["có chọn tháng thì lấy hết tháng đó", MONTH],
    ["không chọn tháng thì giới hạn 100 dòng", null],
  ])("dữ liệu template — %s", async (_label, salaryMonth) => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyTemplateDataQuery(
      before.client,
      SAMPLE_COLUMNS,
      salaryMonth,
    );
    await buildTemplateDataQuery(after.client, SAMPLE_COLUMNS, salaryMonth);

    sameCalls(after, before);
  });
});

describe("tìm kiếm lương của admin giữ nguyên sau khi rút", () => {
  it("đếm tổng bảng lương để kiểm tra kết nối", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyPayrollTotalCountQuery(before.client);
    await buildPayrollTotalCountQuery(after.client);

    sameCalls(after, before);
    expect(after.calls[0].selectOptions).toEqual({
      count: "exact",
      head: true,
    });
  });

  it("kiểm tra tồn tại khi đếm lỗi", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyAnyPayrollIdQuery(before.client);
    await findAnyPayrollId(after.client);

    sameCalls(after, before);
  });

  it.each([
    ["kỳ thường, không lọc tháng", "monthly", false, null],
    ["kỳ thường, lọc tháng", "monthly", false, MONTH],
    ["kỳ T13", "t13", true, "2026-13"],
  ])("tìm kiếm chính — %s", async (_l, payrollType, isT13, salaryMonth) => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyPayrollSearchQuery(
      before.client,
      "NV00",
      payrollType as string,
      salaryMonth as string | null,
      50,
    );
    await buildPayrollSearchQuery(
      after.client,
      "NV00",
      isT13 as boolean,
      salaryMonth as string | null,
      50,
    );

    sameCalls(after, before);
  });

  it("tìm kiếm chính vẫn loại nhân viên đã nghỉ bằng hai bộ lọc", async () => {
    const after = recorder();

    await buildPayrollSearchQuery(after.client, "NV00", false, null, 50);

    expect(after.calls[0].filters).toContainEqual({
      method: "not",
      args: ["employees.is_active", "is", null],
    });
    expect(after.calls[0].filters).toContainEqual({
      method: "eq",
      args: ["employees.is_active", true],
    });
  });

  it("truy vấn dự phòng không join vẫn lọc mã nhân viên an toàn", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacySimplePayrollSearchQuery(before.client, "NV00", 20);
    await findPayrollsByEmployeeIdLike(after.client, "NV00", 20);

    sameCalls(after, before);
  });

  it("danh sách toàn bộ tháng lương không giới hạn số dòng", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyAllSalaryMonthsQuery(before.client);
    await findAllSalaryMonths(after.client);

    sameCalls(after, before);
    expect(after.calls[0].filters).not.toContainEqual(
      expect.objectContaining({ method: "limit" }),
    );
  });
});

describe("thống kê quản trị giữ nguyên sau khi rút", () => {
  it.each([
    ["kỳ thường", "monthly", false],
    ["kỳ T13", "t13", true],
  ])("bảng lương mới nhất trên dashboard — %s", async (_l, type, isT13) => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyRecentPayrollsQuery(before.client, type as string);
    await buildRecentPayrollsQuery(after.client, isT13 as boolean);

    sameCalls(after, before);
  });

  it("tổng hợp lương theo danh sách phòng ban", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyDepartmentsSummaryQuery(
      before.client,
      DEPARTMENTS,
      MONTH,
    );
    await findDepartmentsPayrollSummary(after.client, DEPARTMENTS, MONTH);

    sameCalls(after, before);
  });

  it("chi tiết lương một phòng ban giữ nguyên toàn bộ danh sách cột", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyDepartmentDetailQuery(before.client, DEPARTMENT, MONTH);
    await findDepartmentPayrollDetails(after.client, DEPARTMENT, MONTH);

    sameCalls(after, before);
  });

  it("chi tiết lương một phòng ban vẫn lấy đủ 12 cột tháng của T13", async () => {
    const after = recorder();

    await findDepartmentPayrollDetails(after.client, DEPARTMENT, MONTH);

    const columns = after.calls[0].select ?? "";
    for (let month = 1; month <= 12; month++) {
      expect(columns).toContain(`t13_thang_${String(month).padStart(2, "0")}`);
    }
  });

  it.each([
    ["kỳ T13 lấy 5 năm gần nhất", "t13"],
    ["kỳ thường lấy 6 tháng gần nhất và loại bản ghi T13", "monthly"],
  ])("lịch sử lương phòng ban — %s", async (_label, payrollType) => {
    const before = recorder();
    const after = recorder();
    const t13Months = ["2026-13", "2025-13", "2024-13", "2023-13", "2022-13"];
    const startMonth = "2026-01";

    await legacy.legacyDepartmentHistoryQuery(
      before.client,
      DEPARTMENT,
      payrollType as string,
      t13Months,
      startMonth,
    );
    await findDepartmentPayrollHistory(
      after.client,
      DEPARTMENT,
      payrollType === "t13"
        ? { kind: "t13", months: t13Months }
        : { kind: "monthly", startMonth },
    );

    sameCalls(after, before);
  });

  it("lịch sử kỳ thường loại bản ghi T13 bằng not like", async () => {
    const after = recorder();

    await findDepartmentPayrollHistory(after.client, DEPARTMENT, {
      kind: "monthly",
      startMonth: "2026-01",
    });

    expect(after.calls[0].filters).toContainEqual({
      method: "not",
      args: ["salary_month", "like", "%-13"],
    });
  });

  it("đối chiếu dữ liệu chỉ lấy mã nhân viên có lương trong tháng", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyPayrollEmployeeIdsQuery(before.client, MONTH);
    await findPayrollEmployeeIdsForMonth(after.client, MONTH);

    sameCalls(after, before);
  });

  it("cờ đã ký của toàn bộ nhân viên không lọc payroll_type", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyPayrollSignedFlagsQuery(before.client, MONTH);
    await findPayrollSignedFlagsForMonth(after.client, MONTH);

    sameCalls(after, before);
    expect(after.calls[0].filters).toEqual([
      { method: "eq", args: ["salary_month", MONTH] },
    ]);
  });

  it("tóm tắt lương theo danh sách nhân viên", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyPayrollSummaryForEmployeesQuery(
      before.client,
      MONTH,
      EMPLOYEE_IDS,
    );
    await findPayrollSummaryForEmployees(after.client, MONTH, EMPLOYEE_IDS);

    sameCalls(after, before);
  });

  it("kiểm tra nhân viên còn dữ liệu lương trước khi xoá", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyAnyPayrollForEmployeeQuery(before.client, EMPLOYEE_ID);
    await findAnyPayrollForEmployee(after.client, EMPLOYEE_ID);

    sameCalls(after, before);
    expect(after.calls[0].filters).toContainEqual({
      method: "limit",
      args: [1],
    });
  });
});
