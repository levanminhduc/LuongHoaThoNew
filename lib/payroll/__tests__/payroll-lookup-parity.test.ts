import {
  createQueryRecorder,
  withoutSelectWhitespace,
} from "@/lib/__fixtures__/query-recorder";
import type { PayrollListFilters } from "@/lib/payroll/payroll-list-query";
import * as legacy from "../__fixtures__/legacy-payroll-lookup-queries";
import {
  buildAllowedDepartmentsPayrollCountQuery,
  buildAllowedDepartmentsPayrollListQuery,
  buildDepartmentPayrollCountQuery,
  buildDepartmentPayrollListQuery,
  findAllowedDepartmentsPayrollStats,
  findAllowedDepartmentsSalaryMonths,
  findDepartmentPayrollStats,
  findDepartmentSalaryMonths,
} from "../payroll-department-repository";
import {
  buildMyPayrollCountQuery,
  buildMyPayrollListQuery,
  findEmployeePayrollForMonth,
  findEmployeeSalaryMonths,
  findLatestEmployeePayroll,
  findMyYearlySummary,
  type SupabaseServiceClient,
} from "../payroll-self-repository";

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
const DEPARTMENT = "Tổ May 1";
const DEPARTMENTS = ["Tổ May 1", "Tổ May 2"];
const MONTH = "2026-07";
const T13_FILTER = { method: "eq", args: ["payroll_type", "t13"] };
const MONTHLY_FILTER = {
  method: "or",
  args: ["payroll_type.eq.monthly,payroll_type.is.null"],
};

describe("tra cứu lương của chính nhân viên giữ nguyên sau khi rút", () => {
  const filterCases: [string, PayrollListFilters][] = [
    ["kỳ thường, không lọc tháng", { payrollType: "monthly" }],
    ["kỳ thường, lọc tháng", { payrollType: "monthly", salaryMonth: MONTH }],
    ["kỳ T13", { payrollType: "t13", salaryMonth: "2026-13" }],
  ];

  it.each(filterCases)("danh sách lương — %s", async (_label, filters) => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyMyPayrollListQuery(
      before.client,
      EMPLOYEE_ID,
      filters,
      12,
      12,
    );
    await buildMyPayrollListQuery(after.client, EMPLOYEE_ID, filters, 12, 12);

    sameCalls(after, before);
  });

  it.each([
    ["kỳ thường", "monthly", false],
    ["kỳ T13", "t13", true],
  ])("đếm lương — %s", async (_label, payrollType, isT13) => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyMyPayrollCountQuery(
      before.client,
      EMPLOYEE_ID,
      payrollType as string,
    );
    await buildMyPayrollCountQuery(after.client, EMPLOYEE_ID, isT13 as boolean);

    sameCalls(after, before);
  });

  it("đếm lương dùng head true để không kéo dữ liệu về", async () => {
    const after = recorder();

    await buildMyPayrollCountQuery(after.client, EMPLOYEE_ID, false);

    expect(after.calls[0].select).toBe("*");
    expect(after.calls[0].selectOptions).toEqual({
      count: "exact",
      head: true,
    });
  });

  it("đếm lương cá nhân KHÔNG lọc theo tháng dù danh sách có lọc — giữ nguyên hành vi cũ", async () => {
    const listRecorder = recorder();
    const countRecorder = recorder();

    await buildMyPayrollListQuery(
      listRecorder.client,
      EMPLOYEE_ID,
      { payrollType: "monthly", salaryMonth: MONTH },
      0,
      12,
    );
    await buildMyPayrollCountQuery(countRecorder.client, EMPLOYEE_ID, false);

    const monthFilter = { method: "eq", args: ["salary_month", MONTH] };
    expect(listRecorder.calls[0].filters).toContainEqual(monthFilter);
    expect(countRecorder.calls[0].filters).not.toContainEqual(monthFilter);
  });

  it("tổng hợp lương theo năm lọc bằng like tiền tố năm", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyYearlySummaryQuery(before.client, EMPLOYEE_ID, 2026);
    await findMyYearlySummary(after.client, EMPLOYEE_ID, 2026);

    sameCalls(after, before);
    expect(after.calls[0].filters).toContainEqual({
      method: "like",
      args: ["salary_month", "2026-%"],
    });
  });

  it.each([
    ["kỳ T13", true],
    ["kỳ thường", false],
  ])("danh sách tháng lương của nhân viên — %s", async (_label, isT13) => {
    const before = recorder();
    const after = recorder();

    await legacy.legacySalaryMonthsQuery(before.client, EMPLOYEE_ID, isT13);
    await findEmployeeSalaryMonths(after.client, EMPLOYEE_ID, isT13);

    sameCalls(after, before);
  });

  it.each([
    ["kỳ T13", true],
    ["kỳ thường", false],
  ])("chi tiết lương một tháng — %s", async (_label, isT13) => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyPayrollForMonthQuery(
      before.client,
      EMPLOYEE_ID,
      MONTH,
      isT13,
    );
    await findEmployeePayrollForMonth(after.client, EMPLOYEE_ID, MONTH, isT13);

    sameCalls(after, before);
  });

  it.each([
    ["kỳ T13", true],
    ["kỳ thường", false],
  ])("bản lương mới nhất — %s", async (_label, isT13) => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyLatestPayrollQuery(before.client, EMPLOYEE_ID, isT13);
    await findLatestEmployeePayroll(after.client, EMPLOYEE_ID, isT13);

    sameCalls(after, before);
  });

  it("kỳ T13 và kỳ thường dùng chuỗi select khác nhau", async () => {
    const t13 = recorder();
    const monthly = recorder();

    await findLatestEmployeePayroll(t13.client, EMPLOYEE_ID, true);
    await findLatestEmployeePayroll(monthly.client, EMPLOYEE_ID, false);

    expect(t13.calls[0].select).not.toBe(monthly.calls[0].select);
    expect(t13.calls[0].filters).toContainEqual(T13_FILTER);
    expect(monthly.calls[0].filters).toContainEqual(MONTHLY_FILTER);
  });
});

describe("tra cứu lương theo phòng ban giữ nguyên sau khi rút", () => {
  const filterCases: [string, PayrollListFilters][] = [
    ["không lọc", {}],
    ["lọc tháng", { salaryMonth: MONTH }],
    ["lọc tháng và tìm kiếm", { salaryMonth: MONTH, search: "NV00" }],
  ];

  it.each(filterCases)("danh sách một phòng ban — %s", async (_l, filters) => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyDepartmentPayrollListQuery(
      before.client,
      DEPARTMENT,
      filters,
      20,
      20,
    );
    await buildDepartmentPayrollListQuery(
      after.client,
      DEPARTMENT,
      filters,
      20,
      20,
    );

    sameCalls(after, before);
  });

  it.each(filterCases)("đếm một phòng ban — %s", async (_l, filters) => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyDepartmentPayrollCountQuery(
      before.client,
      DEPARTMENT,
      filters,
    );
    await buildDepartmentPayrollCountQuery(after.client, DEPARTMENT, filters);

    sameCalls(after, before);
  });

  it("đếm và danh sách một phòng ban dùng đúng cùng bộ lọc", async () => {
    const listRecorder = recorder();
    const countRecorder = recorder();
    const filters: PayrollListFilters = {
      salaryMonth: MONTH,
      search: "NV00",
    };

    await buildDepartmentPayrollListQuery(
      listRecorder.client,
      DEPARTMENT,
      filters,
      0,
      20,
    );
    await buildDepartmentPayrollCountQuery(
      countRecorder.client,
      DEPARTMENT,
      filters,
    );

    const listFiltersWithoutPaging = listRecorder.calls[0].filters.filter(
      (filter) => filter.method !== "order" && filter.method !== "range",
    );

    expect(listFiltersWithoutPaging).toEqual(countRecorder.calls[0].filters);
  });

  it("thống kê một phòng ban giữ nguyên embed khoá ngoại tường minh", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyDepartmentStatsQuery(before.client, DEPARTMENT, MONTH);
    await findDepartmentPayrollStats(after.client, DEPARTMENT, MONTH);

    sameCalls(after, before);
    expect(after.calls[0].select).toContain(
      "employees!payrolls_employee_id_fkey!inner",
    );
  });

  it("danh sách tháng của một phòng ban", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyDepartmentMonthsQuery(before.client, DEPARTMENT);
    await findDepartmentSalaryMonths(after.client, DEPARTMENT);

    sameCalls(after, before);
  });
});

describe("tra cứu lương nhiều phòng ban được cấp quyền giữ nguyên sau khi rút", () => {
  const scopeCases: [string, string | null][] = [
    ["xem tất cả phòng ban được cấp", null],
    ["thu hẹp về một phòng ban", "Tổ May 2"],
  ];

  it.each(scopeCases)("danh sách — %s", async (_label, selected) => {
    const before = recorder();
    const after = recorder();
    const filters: PayrollListFilters = { salaryMonth: MONTH };

    await legacy.legacyAllowedDepartmentsListQuery(
      before.client,
      DEPARTMENTS,
      selected,
      filters,
      0,
      20,
    );
    await buildAllowedDepartmentsPayrollListQuery(
      after.client,
      DEPARTMENTS,
      selected,
      filters,
      0,
      20,
    );

    sameCalls(after, before);
  });

  it.each(scopeCases)("đếm — %s", async (_label, selected) => {
    const before = recorder();
    const after = recorder();
    const filters: PayrollListFilters = { salaryMonth: MONTH };

    await legacy.legacyAllowedDepartmentsCountQuery(
      before.client,
      DEPARTMENTS,
      selected,
      filters,
    );
    await buildAllowedDepartmentsPayrollCountQuery(
      after.client,
      DEPARTMENTS,
      selected,
      filters,
    );

    sameCalls(after, before);
  });

  it("thu hẹp phòng ban không bỏ hàng rào danh sách được cấp", async () => {
    const after = recorder();

    await buildAllowedDepartmentsPayrollListQuery(
      after.client,
      DEPARTMENTS,
      "Tổ May 2",
      {},
      0,
      20,
    );

    expect(after.calls[0].filters).toContainEqual({
      method: "in",
      args: ["employees.department", DEPARTMENTS],
    });
    expect(after.calls[0].filters).toContainEqual({
      method: "eq",
      args: ["employees.department", "Tổ May 2"],
    });
  });

  it("thống kê nhiều phòng ban", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyAllowedDepartmentsStatsQuery(
      before.client,
      DEPARTMENTS,
      MONTH,
    );
    await findAllowedDepartmentsPayrollStats(after.client, DEPARTMENTS, MONTH);

    sameCalls(after, before);
  });

  it("danh sách tháng của nhiều phòng ban", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyAllowedDepartmentsMonthsQuery(
      before.client,
      DEPARTMENTS,
    );
    await findAllowedDepartmentsSalaryMonths(after.client, DEPARTMENTS);

    sameCalls(after, before);
  });
});
