import {
  ColumnAliasCreateRequestSchema,
  ColumnAliasBulkRequestSchema,
  ColumnAliasUpdateRequestSchema,
  ColumnAliasListQuerySchema,
  MappingConfigurationCreateRequestSchema,
  MappingConfigurationSaveRequestSchema,
  MappingConfigurationListQuerySchema,
  AdvancedUploadRequestSchema,
  ImportErrorExportRequestSchema,
} from "@/lib/validations/payroll";

describe("ColumnAliasCreateRequestSchema", () => {
  const valid = { database_field: "tong_luong", alias_name: "Tổng lương" };

  it("mac dinh confidence_score la 80", () => {
    const result = ColumnAliasCreateRequestSchema.safeParse(valid);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.confidence_score).toBe(80);
    }
  });

  it("tu choi khi thieu database_field", () => {
    expect(
      ColumnAliasCreateRequestSchema.safeParse({ alias_name: "x" }).success,
    ).toBe(false);
  });

  it("tu choi khi alias_name rong sau khi trim", () => {
    expect(
      ColumnAliasCreateRequestSchema.safeParse({ ...valid, alias_name: "  " })
        .success,
    ).toBe(false);
  });

  it("tu choi confidence_score ngoai 0-100", () => {
    expect(
      ColumnAliasCreateRequestSchema.safeParse({
        ...valid,
        confidence_score: 101,
      }).success,
    ).toBe(false);
  });

  it("chap nhan config_id dang chuoi so", () => {
    const result = ColumnAliasCreateRequestSchema.safeParse({
      ...valid,
      config_id: "7",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.config_id).toBe(7);
    }
  });
});

describe("ColumnAliasBulkRequestSchema", () => {
  it("tu choi mang rong", () => {
    expect(
      ColumnAliasBulkRequestSchema.safeParse({ aliases: [] }).success,
    ).toBe(false);
  });

  it("tu choi khi mot phan tu sai", () => {
    expect(
      ColumnAliasBulkRequestSchema.safeParse({
        aliases: [
          { database_field: "a", alias_name: "b" },
          { alias_name: "c" },
        ],
      }).success,
    ).toBe(false);
  });
});

describe("ColumnAliasUpdateRequestSchema", () => {
  it("chi bat buoc alias_name", () => {
    expect(
      ColumnAliasUpdateRequestSchema.safeParse({ alias_name: "x" }).success,
    ).toBe(true);
  });

  it("tu choi is_active khong phai boolean", () => {
    expect(
      ColumnAliasUpdateRequestSchema.safeParse({
        alias_name: "x",
        is_active: "true",
      }).success,
    ).toBe(false);
  });
});

describe("ColumnAliasListQuerySchema", () => {
  it("dat mac dinh sort va phan trang", () => {
    const result = ColumnAliasListQuerySchema.safeParse({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(50);
      expect(result.data.sort_by).toBe("alias_name");
      expect(result.data.sort_order).toBe("asc");
    }
  });

  it("doc is_active dang chuoi query string", () => {
    const active = ColumnAliasListQuerySchema.safeParse({ is_active: "false" });

    expect(active.success).toBe(true);
    if (active.success) {
      expect(active.data.is_active).toBe(false);
    }
  });

  it("tu choi sort_by khong hop le", () => {
    expect(
      ColumnAliasListQuerySchema.safeParse({ sort_by: "drop_table" }).success,
    ).toBe(false);
  });
});

describe("MappingConfigurationCreateRequestSchema", () => {
  it("mac dinh field_mappings rong va is_default false", () => {
    const result = MappingConfigurationCreateRequestSchema.safeParse({
      config_name: "Cấu hình 1",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.field_mappings).toEqual([]);
      expect(result.data.is_default).toBe(false);
    }
  });

  it("tu choi mapping_type ngoai danh sach", () => {
    expect(
      MappingConfigurationCreateRequestSchema.safeParse({
        config_name: "x",
        field_mappings: [
          {
            database_field: "a",
            excel_column_name: "b",
            mapping_type: "magic",
          },
        ],
      }).success,
    ).toBe(false);
  });
});

describe("MappingConfigurationSaveRequestSchema", () => {
  it("tu choi mapping rong", () => {
    expect(
      MappingConfigurationSaveRequestSchema.safeParse({ mapping: {} }).success,
    ).toBe(false);
  });

  it("mac dinh auto_generate_name la true", () => {
    const result = MappingConfigurationSaveRequestSchema.safeParse({
      mapping: { a: "b" },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.auto_generate_name).toBe(true);
    }
  });
});

describe("MappingConfigurationListQuerySchema", () => {
  it("mac dinh limit 20", () => {
    const result = MappingConfigurationListQuerySchema.safeParse({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(20);
    }
  });
});

describe("AdvancedUploadRequestSchema", () => {
  it("tu choi payrollData rong", () => {
    expect(
      AdvancedUploadRequestSchema.safeParse({ payrollData: [] }).success,
    ).toBe(false);
  });

  it("tu choi payrollData khong phai mang", () => {
    expect(
      AdvancedUploadRequestSchema.safeParse({ payrollData: "abc" }).success,
    ).toBe(false);
  });
});

describe("ImportErrorExportRequestSchema", () => {
  const oneError = {
    errors: [{ row: 2, errorType: "validation" }],
  };

  it("dat mac dinh fileName va format", () => {
    const result = ImportErrorExportRequestSchema.safeParse(oneError);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fileName).toBe("import_errors");
      expect(result.data.format).toBe("excel");
      expect(result.data.includeOriginalData).toBe(true);
    }
  });

  it("tu choi khi khong co loi nao", () => {
    expect(
      ImportErrorExportRequestSchema.safeParse({ errors: [] }).success,
    ).toBe(false);
  });

  it("tu choi errorType ngoai danh sach", () => {
    expect(
      ImportErrorExportRequestSchema.safeParse({
        errors: [{ row: 1, errorType: "unknown_kind" }],
      }).success,
    ).toBe(false);
  });

  it("tu choi format ngoai excel/csv", () => {
    expect(
      ImportErrorExportRequestSchema.safeParse({ ...oneError, format: "pdf" })
        .success,
    ).toBe(false);
  });
});
