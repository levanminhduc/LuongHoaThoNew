import {
  applyPayrollFilters,
  PAYROLL_WITH_EMPLOYEE_SELECT,
} from "../payroll-list-query";

interface RecordedCall {
  method: "eq" | "or";
  args: string[];
}

function makeQuery() {
  const calls: RecordedCall[] = [];
  const query = {
    calls,
    eq(column: string, value: string) {
      calls.push({ method: "eq", args: [column, value] });
      return query;
    },
    or(filter: string) {
      calls.push({ method: "or", args: [filter] });
      return query;
    },
  };
  return query;
}

describe("PAYROLL_WITH_EMPLOYEE_SELECT", () => {
  it("giu nguyen join employees ma ca ba route dang dung", () => {
    expect(PAYROLL_WITH_EMPLOYEE_SELECT).toContain(
      "employees!payrolls_employee_id_fkey!inner",
    );
    expect(PAYROLL_WITH_EMPLOYEE_SELECT).toContain("full_name");
    expect(PAYROLL_WITH_EMPLOYEE_SELECT).toContain("chuc_vu");
  });
});

describe("applyPayrollFilters", () => {
  it("khong goi gi khi khong co filter nao", () => {
    const query = makeQuery();

    applyPayrollFilters(query, {});

    expect(query.calls).toHaveLength(0);
  });

  it("loc theo thang luong", () => {
    const query = makeQuery();

    applyPayrollFilters(query, { salaryMonth: "2026-07" });

    expect(query.calls).toEqual([
      { method: "eq", args: ["salary_month", "2026-07"] },
    ]);
  });

  it("loc t13 bang eq", () => {
    const query = makeQuery();

    applyPayrollFilters(query, { payrollType: "t13" });

    expect(query.calls).toEqual([
      { method: "eq", args: ["payroll_type", "t13"] },
    ]);
  });

  it("loc thang thuong nhan ca ban ghi payroll_type null", () => {
    const query = makeQuery();

    applyPayrollFilters(query, { payrollType: "monthly" });

    expect(query.calls[0].method).toBe("or");
    expect(query.calls[0].args[0]).toContain("payroll_type.is.null");
  });

  it("tim kiem theo ma nhan vien va ho ten", () => {
    const query = makeQuery();

    applyPayrollFilters(query, { search: "NV001" });

    expect(query.calls[0].args[0]).toContain("employee_id.ilike.%NV001%");
    expect(query.calls[0].args[0]).toContain(
      "employees.full_name.ilike.%NV001%",
    );
  });

  it("sanitize tu khoa tim kiem truoc khi ghep vao filter", () => {
    const query = makeQuery();

    applyPayrollFilters(query, { search: "a,b.c()" });

    expect(query.calls[0].args[0]).not.toContain("(");
    expect(query.calls[0].args[0]).not.toContain(")");
  });

  it("ghep du ba filter theo dung thu tu", () => {
    const query = makeQuery();

    applyPayrollFilters(query, {
      salaryMonth: "2026-07",
      payrollType: "t13",
      search: "NV001",
    });

    expect(query.calls.map((c) => c.method)).toEqual(["eq", "eq", "or"]);
  });
});
