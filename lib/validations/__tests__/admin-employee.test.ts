import { UpdateCccdRequestSchema } from "@/lib/validations/admin-employee";

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
