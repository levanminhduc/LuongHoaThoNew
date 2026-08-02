import {
  createQueryRecorder,
  withoutSelectWhitespace,
} from "@/lib/__fixtures__/query-recorder";
import type { ConfigurationSearchParams } from "@/lib/column-alias-config";
import * as legacy from "../__fixtures__/legacy-import-config-queries";
import {
  buildMappingConfigListQuery,
  deleteMappingConfig,
  findActiveConfigForTemplate,
  findActiveConfigHeaderMappings,
  findConfigByName,
  findConfigWithMappings,
  findLatestConfigUpdatedAt,
  insertConfigFieldMappings,
  insertMappingConfig,
  unsetDefaultConfigs,
  type ConfigFieldMappingRow,
  type SupabaseServiceClient,
} from "../mapping-config-repository";

function recorder() {
  const recorded = createQueryRecorder([{ data: [] }, { data: [] }]);
  return {
    calls: recorded.calls,
    client: recorded.client as unknown as SupabaseServiceClient,
  };
}

function selectColumns(select?: string) {
  return select?.replace(/\s+/g, "") ?? "";
}

const CONFIG_ID = 11;
const CONFIG_ID_PARAM = "11";

describe("truy vấn danh sách cấu hình mapping giữ nguyên sau khi rút", () => {
  const listCases: [string, ConfigurationSearchParams][] = [
    ["không lọc gì", {}],
    [
      "lọc đủ mọi tiêu chí",
      {
        config_name: "lương tháng",
        is_active: true,
        is_default: true,
        created_by: "admin01",
        page: 2,
        limit: 10,
      },
    ],
    [
      "lọc cấu hình đã tắt và không phải mặc định",
      { is_active: false, is_default: false },
    ],
  ];

  it.each(listCases)("%s", async (_label, params) => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyMappingConfigListQuery(before.client, params);
    await buildMappingConfigListQuery(after.client, params);

    expect(withoutSelectWhitespace(after.calls)).toEqual(
      withoutSelectWhitespace(before.calls),
    );
  });

  it("đếm chính xác để phân trang cấu hình", async () => {
    const after = recorder();

    await buildMappingConfigListQuery(after.client, {});

    expect(after.calls[0].selectOptions).toEqual({ count: "exact" });
    expect(after.calls[0].filters).toContainEqual({
      method: "range",
      args: [0, 19],
    });
  });
});

describe("ba dạng embed configuration_field_mappings giữ đúng cột của từng nơi dùng", () => {
  it("màn hình quản lý cấu hình lấy cả id và validation_passed", async () => {
    const after = recorder();

    await buildMappingConfigListQuery(after.client, {});

    const columns = selectColumns(after.calls[0].select);
    expect(columns).toContain("id,");
    expect(columns).toContain("validation_passed");
  });

  it("template xuất không lấy id và validation_passed", async () => {
    const after = recorder();

    await findActiveConfigForTemplate(after.client, CONFIG_ID_PARAM);

    const columns = selectColumns(after.calls[0].select);
    expect(columns).not.toContain("validation_passed");
    expect(columns).toContain("confidence_score");
    expect(columns).toContain("mapping_type");
  });

  it("nạp header lúc import chỉ lấy hai cột và không lấy cột của bảng cha", async () => {
    const after = recorder();

    await findActiveConfigHeaderMappings(after.client);

    const columns = selectColumns(after.calls[0].select);
    expect(columns).toBe(
      "configuration_field_mappings(database_field,excel_column_name)",
    );
  });

  it("hai route sinh template dùng chung một truy vấn — cột trùng khít", async () => {
    const exportTemplate = recorder();
    const generateTemplate = recorder();

    await legacy.legacyTemplateConfigQuery(
      exportTemplate.client,
      CONFIG_ID_PARAM,
    );
    await legacy.legacyGenerateTemplateConfigQuery(
      generateTemplate.client,
      CONFIG_ID_PARAM,
    );

    expect(withoutSelectWhitespace(generateTemplate.calls)).toEqual(
      withoutSelectWhitespace(exportTemplate.calls),
    );
  });
});

describe("các truy vấn cấu hình mapping còn lại giữ nguyên", () => {
  it("kiểm tra trùng tên cấu hình", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyConfigByNameQuery(before.client, "Lương tháng 7");
    await findConfigByName(after.client, "Lương tháng 7");

    expect(after.calls).toEqual(before.calls);
  });

  it("bỏ mặc định của các cấu hình cũ chỉ chạm bản ghi đang mặc định", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyUnsetDefaultConfigsQuery(before.client);
    await unsetDefaultConfigs(after.client);

    expect(after.calls).toEqual(before.calls);
    expect(after.calls[0].filters).toEqual([
      { method: "eq", args: ["is_default", true] },
    ]);
  });

  it("thêm cấu hình và trả bản ghi vừa tạo", async () => {
    const before = recorder();
    const after = recorder();
    const record = { config_name: "Lương tháng 7", is_default: false };

    await legacy.legacyInsertConfigQuery(before.client, record);
    await insertMappingConfig(after.client, record);

    expect(after.calls).toEqual(before.calls);
  });

  it("thêm field mappings theo lô", async () => {
    const before = recorder();
    const after = recorder();
    const rows: ConfigFieldMappingRow[] = [
      {
        config_id: CONFIG_ID,
        database_field: "he_so_lam_viec",
        excel_column_name: "Hệ Số Làm Việc",
        confidence_score: 80,
        mapping_type: "manual",
        validation_passed: true,
      },
    ];

    await legacy.legacyInsertFieldMappingsQuery(before.client, rows);
    await insertConfigFieldMappings(after.client, rows);

    expect(after.calls).toEqual(before.calls);
  });

  it("hoàn tác cấu hình khi thêm field mappings lỗi", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyRollbackConfigQuery(before.client, CONFIG_ID);
    await deleteMappingConfig(after.client, CONFIG_ID);

    expect(after.calls).toEqual(before.calls);
    expect(after.calls[0].filters).toEqual([
      { method: "eq", args: ["id", CONFIG_ID] },
    ]);
  });

  it("lấy lại cấu hình vừa tạo kèm mappings, không lọc is_active", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyCompleteConfigQuery(before.client, CONFIG_ID);
    await findConfigWithMappings(after.client, CONFIG_ID);

    expect(withoutSelectWhitespace(after.calls)).toEqual(
      withoutSelectWhitespace(before.calls),
    );
    expect(after.calls[0].filters).not.toContainEqual({
      method: "eq",
      args: ["is_active", true],
    });
  });

  it("lấy cấu hình cho template vẫn bắt buộc is_active", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyTemplateConfigQuery(before.client, CONFIG_ID_PARAM);
    await findActiveConfigForTemplate(after.client, CONFIG_ID_PARAM);

    expect(withoutSelectWhitespace(after.calls)).toEqual(
      withoutSelectWhitespace(before.calls),
    );
    expect(after.calls[0].filters).toContainEqual({
      method: "eq",
      args: ["is_active", true],
    });
  });

  it("mốc thời gian đồng bộ lấy bản ghi mới nhất", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyLatestConfigUpdatedAtQuery(before.client);
    await findLatestConfigUpdatedAt(after.client);

    expect(after.calls).toEqual(before.calls);
    expect(after.calls[0].filters).toEqual([
      { method: "order", args: ["updated_at", { ascending: false }] },
      { method: "limit", args: [1] },
    ]);
  });

  it("nạp header lúc import chỉ lấy cấu hình đang bật", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyActiveConfigMappingsQuery(before.client);
    await findActiveConfigHeaderMappings(after.client);

    expect(withoutSelectWhitespace(after.calls)).toEqual(
      withoutSelectWhitespace(before.calls),
    );
    expect(after.calls[0].filters).toEqual([
      { method: "eq", args: ["is_active", true] },
    ]);
  });
});
