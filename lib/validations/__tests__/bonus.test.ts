import {
  BonusPeriodSchema,
  BonusTypeSchema,
  BonusImportMetaSchema,
} from "@/lib/validations/bonus";

describe("BonusPeriodSchema", () => {
  it("accepts valid YYYY-Ma periods", () => {
    expect(BonusPeriodSchema.safeParse("2026-Q2").success).toBe(true);
    expect(BonusPeriodSchema.safeParse("2026-0209").success).toBe(true);
    expect(BonusPeriodSchema.safeParse("2026-6T").success).toBe(true);
  });

  it("normalizes lowercase and surrounding spaces to uppercase", () => {
    const result = BonusPeriodSchema.safeParse("  2026-q2  ");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("2026-Q2");
    }
  });

  it("rejects a period without a code segment", () => {
    expect(BonusPeriodSchema.safeParse("2026").success).toBe(false);
  });

  it("rejects a period that does not start with a 4-digit year", () => {
    expect(BonusPeriodSchema.safeParse("Q2-2026").success).toBe(false);
  });

  it("rejects a code segment longer than 10 characters", () => {
    expect(BonusPeriodSchema.safeParse("2026-ABCDEFGHIJK").success).toBe(false);
  });

  it("rejects years outside the allowed range", () => {
    const aboveRange = `${new Date().getFullYear() + 5}-Q2`;
    expect(BonusPeriodSchema.safeParse("2019-Q2").success).toBe(false);
    expect(BonusPeriodSchema.safeParse(aboveRange).success).toBe(false);
  });
});

describe("BonusTypeSchema", () => {
  it("accepts the four supported bonus types", () => {
    expect(BonusTypeSchema.safeParse("thuong_le").success).toBe(true);
    expect(BonusTypeSchema.safeParse("thuong_quy").success).toBe(true);
    expect(BonusTypeSchema.safeParse("thuong_nong").success).toBe(true);
    expect(BonusTypeSchema.safeParse("khac").success).toBe(true);
  });

  it("rejects an unknown bonus type", () => {
    expect(BonusTypeSchema.safeParse("thuong_tet").success).toBe(false);
  });
});

describe("BonusImportMetaSchema", () => {
  const validMeta = {
    bonus_type: "thuong_quy",
    bonus_period: "2026-Q2",
    bonus_title: "Thưởng quý 2 năm 2026",
    employee_id_column: "Mã NV",
    amount_column: "Số Tiền",
  };

  it("accepts a complete meta payload", () => {
    expect(BonusImportMetaSchema.safeParse(validMeta).success).toBe(true);
  });

  it("fails when a required field is missing", () => {
    const withoutAmountColumn = {
      bonus_type: validMeta.bonus_type,
      bonus_period: validMeta.bonus_period,
      bonus_title: validMeta.bonus_title,
      employee_id_column: validMeta.employee_id_column,
    };
    expect(BonusImportMetaSchema.safeParse(withoutAmountColumn).success).toBe(
      false,
    );
  });

  it("fails when the title exceeds 150 characters", () => {
    const longTitle = "A".repeat(151);
    expect(
      BonusImportMetaSchema.safeParse({ ...validMeta, bonus_title: longTitle })
        .success,
    ).toBe(false);
  });
});
