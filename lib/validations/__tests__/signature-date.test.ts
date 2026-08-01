import { UpdateSignatureDateRequestSchema } from "@/lib/validations/employee";

const validBase = {
  salary_month: "2026-07",
  base_date: "2026-08-01",
  scope: "all" as const,
};

describe("UpdateSignatureDateRequestSchema", () => {
  it("chap nhan thang thuong khi is_t13 mac dinh false", () => {
    const result = UpdateSignatureDateRequestSchema.safeParse(validBase);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_t13).toBe(false);
      expect(result.data.random_range_days).toBe(0);
    }
  });

  it("tu choi thang T13 khi is_t13 la false", () => {
    const result = UpdateSignatureDateRequestSchema.safeParse({
      ...validBase,
      salary_month: "2026-13",
    });

    expect(result.success).toBe(false);
  });

  it("chap nhan thang T13 khi is_t13 la true", () => {
    const result = UpdateSignatureDateRequestSchema.safeParse({
      ...validBase,
      salary_month: "2026-13",
      is_t13: true,
    });

    expect(result.success).toBe(true);
  });

  it("tu choi thang thuong khi is_t13 la true", () => {
    const result = UpdateSignatureDateRequestSchema.safeParse({
      ...validBase,
      is_t13: true,
    });

    expect(result.success).toBe(false);
  });

  it("tu choi base_date sai dinh dang", () => {
    expect(
      UpdateSignatureDateRequestSchema.safeParse({
        ...validBase,
        base_date: "01/08/2026",
      }).success,
    ).toBe(false);
  });

  it("tu choi scope selected ma khong co employee_ids", () => {
    const result = UpdateSignatureDateRequestSchema.safeParse({
      ...validBase,
      scope: "selected",
    });

    expect(result.success).toBe(false);
  });

  it("tu choi scope selected voi employee_ids rong", () => {
    expect(
      UpdateSignatureDateRequestSchema.safeParse({
        ...validBase,
        scope: "selected",
        employee_ids: [],
      }).success,
    ).toBe(false);
  });

  it("chap nhan scope selected voi employee_ids co phan tu", () => {
    expect(
      UpdateSignatureDateRequestSchema.safeParse({
        ...validBase,
        scope: "selected",
        employee_ids: ["NV001"],
      }).success,
    ).toBe(true);
  });

  it("tu choi random_range_days ngoai khoang 0-30", () => {
    expect(
      UpdateSignatureDateRequestSchema.safeParse({
        ...validBase,
        random_range_days: 31,
      }).success,
    ).toBe(false);
  });
});
