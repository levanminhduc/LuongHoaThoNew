import {
  UpdateManagementSignatureDateRequestSchema,
  SalaryHistoryActionRequestSchema,
  CheckPasswordStatusRequestSchema,
} from "@/lib/validations/employee";
import { DepartmentCreateRequestSchema } from "@/lib/validations/admin-employee";
import {
  PayrollUpdateRequestSchema,
  PayrollAuditFilterRequestSchema,
} from "@/lib/validations/payroll";
import { AttendanceEmployeesQuerySchema } from "@/lib/validations/attendance";

describe("UpdateManagementSignatureDateRequestSchema", () => {
  const valid = {
    salary_month: "2026-07",
    signature_type: "giam_doc",
    new_signed_at: "2026-08-01",
  };

  it("mac dinh action la update va is_t13 false", () => {
    const result = UpdateManagementSignatureDateRequestSchema.safeParse(valid);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.action).toBe("update");
      expect(result.data.is_t13).toBe(false);
    }
  });

  it("tu choi signature_type ngoai 3 loai", () => {
    expect(
      UpdateManagementSignatureDateRequestSchema.safeParse({
        ...valid,
        signature_type: "ke_toan_truong",
      }).success,
    ).toBe(false);
  });

  it("tu choi thang T13 khi is_t13 false", () => {
    expect(
      UpdateManagementSignatureDateRequestSchema.safeParse({
        ...valid,
        salary_month: "2026-13",
      }).success,
    ).toBe(false);
  });

  it("tu choi khi thieu new_signed_at", () => {
    expect(
      UpdateManagementSignatureDateRequestSchema.safeParse({
        salary_month: "2026-07",
        signature_type: "giam_doc",
      }).success,
    ).toBe(false);
  });
});

describe("SalaryHistoryActionRequestSchema", () => {
  it("chap nhan list_months khong can salary_month", () => {
    expect(
      SalaryHistoryActionRequestSchema.safeParse({ action: "list_months" })
        .success,
    ).toBe(true);
  });

  it("tu choi get_payroll khi thieu salary_month", () => {
    expect(
      SalaryHistoryActionRequestSchema.safeParse({ action: "get_payroll" })
        .success,
    ).toBe(false);
  });

  it("chap nhan get_payroll kem salary_month", () => {
    expect(
      SalaryHistoryActionRequestSchema.safeParse({
        action: "get_payroll",
        salary_month: "2026-07",
      }).success,
    ).toBe(true);
  });

  it("tu choi action la", () => {
    expect(
      SalaryHistoryActionRequestSchema.safeParse({ action: "delete_all" })
        .success,
    ).toBe(false);
  });
});

describe("CheckPasswordStatusRequestSchema", () => {
  it("trim employee_id", () => {
    const result = CheckPasswordStatusRequestSchema.safeParse({
      employee_id: "  NV001 ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.employee_id).toBe("NV001");
    }
  });

  it("tu choi employee_id rong", () => {
    expect(
      CheckPasswordStatusRequestSchema.safeParse({ employee_id: "" }).success,
    ).toBe(false);
  });
});

describe("DepartmentCreateRequestSchema", () => {
  it("chap nhan ten phong ban", () => {
    expect(
      DepartmentCreateRequestSchema.safeParse({ name: "Tổ May 1" }).success,
    ).toBe(true);
  });

  it("tu choi ten rong", () => {
    expect(
      DepartmentCreateRequestSchema.safeParse({ name: "   " }).success,
    ).toBe(false);
  });

  it("tu choi mo ta qua 500 ky tu", () => {
    expect(
      DepartmentCreateRequestSchema.safeParse({
        name: "Tổ May 1",
        description: "x".repeat(501),
      }).success,
    ).toBe(false);
  });
});

describe("PayrollUpdateRequestSchema", () => {
  it("tu choi updates rong", () => {
    expect(
      PayrollUpdateRequestSchema.safeParse({
        updates: {},
        changeReason: "sửa sai",
      }).success,
    ).toBe(false);
  });

  it("tu choi khi thieu changeReason", () => {
    expect(
      PayrollUpdateRequestSchema.safeParse({ updates: { tam_ung: 1000 } })
        .success,
    ).toBe(false);
  });

  it("chap nhan updates hop le", () => {
    expect(
      PayrollUpdateRequestSchema.safeParse({
        updates: { tam_ung: 1000 },
        changeReason: "sửa theo đề nghị phòng nhân sự",
      }).success,
    ).toBe(true);
  });
});

describe("PayrollAuditFilterRequestSchema", () => {
  it("chap nhan body rong vi moi filter deu optional", () => {
    expect(PayrollAuditFilterRequestSchema.safeParse({}).success).toBe(true);
  });

  it("tu choi employeeId rong", () => {
    expect(
      PayrollAuditFilterRequestSchema.safeParse({ employeeId: "  " }).success,
    ).toBe(false);
  });
});

describe("AttendanceEmployeesQuerySchema", () => {
  const validPeriod = { period_year: "2026", period_month: "7" };

  it("ep kieu chuoi query string thanh so", () => {
    const result = AttendanceEmployeesQuerySchema.safeParse(validPeriod);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.period_year).toBe(2026);
      expect(result.data.period_month).toBe(7);
      expect(result.data.limit).toBe(50);
    }
  });

  it("tu choi thang 13", () => {
    expect(
      AttendanceEmployeesQuerySchema.safeParse({
        ...validPeriod,
        period_month: "13",
      }).success,
    ).toBe(false);
  });

  it("tu choi khi thieu ky", () => {
    expect(AttendanceEmployeesQuerySchema.safeParse({}).success).toBe(false);
  });
});
