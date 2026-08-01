import {
  YearlySummaryRequestSchema,
  DepartmentStatsRequestSchema,
} from "@/lib/validations/payroll";

describe("YearlySummaryRequestSchema", () => {
  it("nhan year dang so tu client", () => {
    const result = YearlySummaryRequestSchema.safeParse({ year: 2026 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.year).toBe(2026);
    }
  });

  it("cho phep bo trong de route tu lay nam hien tai", () => {
    const result = YearlySummaryRequestSchema.safeParse({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.year).toBeUndefined();
    }
  });

  it("ep chuoi so thanh so", () => {
    const result = YearlySummaryRequestSchema.safeParse({ year: "2026" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.year).toBe(2026);
    }
  });

  it("tu choi nam ngoai khoang 2020-2100", () => {
    expect(YearlySummaryRequestSchema.safeParse({ year: 1999 }).success).toBe(
      false,
    );
    expect(YearlySummaryRequestSchema.safeParse({ year: 3000 }).success).toBe(
      false,
    );
  });

  it("tu choi gia tri khong phai so", () => {
    expect(
      YearlySummaryRequestSchema.safeParse({ year: "hai nghin" }).success,
    ).toBe(false);
  });
});

describe("DepartmentStatsRequestSchema", () => {
  it("nhan thang thuong", () => {
    const result = DepartmentStatsRequestSchema.safeParse({ month: "2026-07" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.month).toBe("2026-07");
    }
  });

  it("nhan thang 13", () => {
    expect(
      DepartmentStatsRequestSchema.safeParse({ month: "2026-13" }).success,
    ).toBe(true);
  });

  it("cho phep bo trong de route tu lay thang hien tai", () => {
    const result = DepartmentStatsRequestSchema.safeParse({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.month).toBeUndefined();
    }
  });

  it("tu choi thang sai dinh dang", () => {
    expect(
      DepartmentStatsRequestSchema.safeParse({ month: "2026-7" }).success,
    ).toBe(false);
    expect(
      DepartmentStatsRequestSchema.safeParse({ month: "2026-99" }).success,
    ).toBe(false);
  });

  it("tu choi gia tri khong phai chuoi", () => {
    expect(
      DepartmentStatsRequestSchema.safeParse({ month: 202607 }).success,
    ).toBe(false);
  });
});
