import {
  UpdateCccdRequestSchema,
  EmployeeCreateRequestSchema,
  EmployeeUpdateRequestSchema,
} from "@/lib/validations/admin-employee";
import { EMPLOYEE_ROLES, EmployeeRoleSchema } from "@/lib/validations/common";

const validCreate = {
  employee_id: "NV001",
  full_name: "Nguyễn Văn A",
  cccd: "012345678901",
  chuc_vu: "nhan_vien",
};

const validUpdate = {
  employee_id: "NV001",
  full_name: "Nguyễn Văn A",
  chuc_vu: "nhan_vien",
};

describe("EmployeeRoleSchema", () => {
  it("EMPLOYEE_ROLES không chứa admin", () => {
    expect(EMPLOYEE_ROLES).not.toContain("admin");
    expect(EMPLOYEE_ROLES).toHaveLength(7);
  });

  it("tu choi admin", () => {
    expect(EmployeeRoleSchema.safeParse("admin").success).toBe(false);
  });

  it("chap nhan cac chuc vu con lai", () => {
    for (const role of EMPLOYEE_ROLES) {
      expect(EmployeeRoleSchema.safeParse(role).success).toBe(true);
    }
  });
});

describe("EmployeeCreateRequestSchema chuc_vu", () => {
  it("tu choi chuc_vu admin", () => {
    expect(
      EmployeeCreateRequestSchema.safeParse({
        ...validCreate,
        chuc_vu: "admin",
      }).success,
    ).toBe(false);
  });

  it("chap nhan chuc_vu to_truong", () => {
    expect(
      EmployeeCreateRequestSchema.safeParse({
        ...validCreate,
        chuc_vu: "to_truong",
      }).success,
    ).toBe(true);
  });
});

describe("EmployeeUpdateRequestSchema chuc_vu", () => {
  it("tu choi chuc_vu admin", () => {
    expect(
      EmployeeUpdateRequestSchema.safeParse({
        ...validUpdate,
        chuc_vu: "admin",
      }).success,
    ).toBe(false);
  });

  it("chap nhan chuc_vu giam_doc ve mat schema", () => {
    expect(
      EmployeeUpdateRequestSchema.safeParse({
        ...validUpdate,
        chuc_vu: "giam_doc",
      }).success,
    ).toBe(true);
  });
});

describe("UpdateCccdRequestSchema", () => {
  it("chap nhan employee_id va cccd 12 chu so", () => {
    const result = UpdateCccdRequestSchema.safeParse({
      employee_id: "NV001",
      new_cccd: "012345678901",
    });

    expect(result.success).toBe(true);
  });

  it("trim khoang trang quanh employee_id", () => {
    const result = UpdateCccdRequestSchema.safeParse({
      employee_id: "  NV001  ",
      new_cccd: "012345678901",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.employee_id).toBe("NV001");
    }
  });

  it("tu choi khi thieu new_cccd", () => {
    expect(
      UpdateCccdRequestSchema.safeParse({ employee_id: "NV001" }).success,
    ).toBe(false);
  });

  it("tu choi cccd khac 12 chu so", () => {
    expect(
      UpdateCccdRequestSchema.safeParse({
        employee_id: "NV001",
        new_cccd: "12345",
      }).success,
    ).toBe(false);
  });

  it("tu choi cccd co ky tu khong phai so", () => {
    expect(
      UpdateCccdRequestSchema.safeParse({
        employee_id: "NV001",
        new_cccd: "01234567890a",
      }).success,
    ).toBe(false);
  });

  it("tu choi employee_id rong", () => {
    expect(
      UpdateCccdRequestSchema.safeParse({
        employee_id: "   ",
        new_cccd: "012345678901",
      }).success,
    ).toBe(false);
  });
});
