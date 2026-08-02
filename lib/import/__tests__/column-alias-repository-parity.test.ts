import { createQueryRecorder } from "@/lib/__fixtures__/query-recorder";
import type { AliasSearchParams } from "@/lib/column-alias-config";
import * as legacy from "../__fixtures__/legacy-import-config-queries";
import {
  buildColumnAliasListQuery,
  deleteColumnAlias,
  findActiveAliases,
  findAliasByDuplicateKey,
  findAliasByFieldAndName,
  findAliasByFieldAndNameExcluding,
  findAliasDatabaseField,
  findAliasName,
  findColumnAliasById,
  insertColumnAlias,
  insertColumnAliasWithoutReturn,
  updateColumnAlias,
  type SupabaseServiceClient,
} from "../column-alias-repository";

function recorder() {
  const recorded = createQueryRecorder([{ data: [] }, { data: [] }]);
  return {
    calls: recorded.calls,
    client: recorded.client as unknown as SupabaseServiceClient,
  };
}

const ALIAS_ID = 42;

describe("truy vấn danh sách alias giữ nguyên sau khi rút", () => {
  const listCases: [string, AliasSearchParams][] = [
    ["không lọc gì, chỉ sắp xếp mặc định", { sort_by: "created_at" }],
    [
      "lọc đủ mọi tiêu chí",
      {
        database_field: "he_so_lam_viec",
        alias_name: "hệ số",
        is_active: true,
        created_by: "admin01",
        confidence_min: 50,
        confidence_max: 90,
        page: 3,
        limit: 25,
        sort_by: "confidence_score",
        sort_order: "asc",
      },
    ],
    [
      "lọc alias đã tắt — is_active false vẫn phải được áp",
      { is_active: false, sort_by: "alias_name", sort_order: "desc" },
    ],
  ];

  it.each(listCases)("%s", async (_label, params) => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyColumnAliasListQuery(before.client, params);
    await buildColumnAliasListQuery(after.client, params);

    expect(after.calls).toEqual(before.calls);
  });

  it("đếm chính xác để trả tổng số alias", async () => {
    const after = recorder();

    await buildColumnAliasListQuery(after.client, { sort_by: "created_at" });

    expect(after.calls[0].selectOptions).toEqual({ count: "exact" });
  });

  it("phân trang giữ nguyên công thức range của trang mặc định", async () => {
    const after = recorder();

    await buildColumnAliasListQuery(after.client, { sort_by: "created_at" });

    expect(after.calls[0].filters).toContainEqual({
      method: "range",
      args: [0, 49],
    });
  });
});

describe("kiểm tra trùng alias giữ nguyên sau khi rút", () => {
  it.each([
    ["alias thuộc một cấu hình", 7],
    ["alias dùng chung toàn hệ thống", null],
  ])("%s", async (_label, configId) => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyDuplicateAliasQuery(
      before.client,
      "he_so_lam_viec",
      "Hệ Số Làm Việc",
      configId,
    );
    await findAliasByDuplicateKey(after.client, {
      database_field: "he_so_lam_viec",
      alias_name: "Hệ Số Làm Việc",
      config_id: configId,
    });

    expect(after.calls).toEqual(before.calls);
  });

  it("alias dùng chung lọc bằng is null, không phải eq config_id", async () => {
    const globalScope = recorder();
    const configScope = recorder();

    await findAliasByDuplicateKey(globalScope.client, {
      database_field: "he_so_lam_viec",
      alias_name: "Hệ Số Làm Việc",
      config_id: null,
    });
    await findAliasByDuplicateKey(configScope.client, {
      database_field: "he_so_lam_viec",
      alias_name: "Hệ Số Làm Việc",
      config_id: 7,
    });

    expect(globalScope.calls[0].filters).toContainEqual({
      method: "is",
      args: ["config_id", null],
    });
    expect(configScope.calls[0].filters).toContainEqual({
      method: "eq",
      args: ["config_id", 7],
    });
  });

  it("kiểm tra trùng khi tạo hàng loạt không xét config_id", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyBulkDuplicateAliasQuery(
      before.client,
      "he_so_lam_viec",
      "Hệ Số",
    );
    await findAliasByFieldAndName(after.client, "he_so_lam_viec", "Hệ Số");

    expect(after.calls).toEqual(before.calls);
    expect(after.calls[0].filters).not.toContainEqual(
      expect.objectContaining({ method: "is" }),
    );
  });

  it("kiểm tra trùng khi sửa vẫn loại trừ chính bản ghi đang sửa", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyDuplicateAliasExcludingQuery(
      before.client,
      "he_so_lam_viec",
      "Hệ Số",
      ALIAS_ID,
    );
    await findAliasByFieldAndNameExcluding(
      after.client,
      "he_so_lam_viec",
      "Hệ Số",
      ALIAS_ID,
    );

    expect(after.calls).toEqual(before.calls);
    expect(after.calls[0].filters).toContainEqual({
      method: "neq",
      args: ["id", ALIAS_ID],
    });
  });
});

describe("các truy vấn alias còn lại giữ nguyên", () => {
  it("thêm alias và trả bản ghi vừa tạo", async () => {
    const before = recorder();
    const after = recorder();
    const aliasData = { database_field: "he_so_lam_viec", alias_name: "Hệ Số" };

    await legacy.legacyInsertAliasQuery(before.client, aliasData);
    await insertColumnAlias(after.client, aliasData);

    expect(after.calls).toEqual(before.calls);
  });

  it("thêm alias hàng loạt không trả bản ghi", async () => {
    const before = recorder();
    const after = recorder();
    const aliasData = { database_field: "he_so_lam_viec", alias_name: "Hệ Số" };

    await legacy.legacyBulkInsertAliasQuery(before.client, aliasData);
    await insertColumnAliasWithoutReturn(after.client, aliasData);

    expect(after.calls).toEqual(before.calls);
    expect(after.calls[0].select).toBeUndefined();
  });

  it("lấy alias theo id với đủ cột hiển thị", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyAliasByIdQuery(before.client, ALIAS_ID);
    await findColumnAliasById(after.client, ALIAS_ID);

    expect(after.calls).toEqual(before.calls);
  });

  it("lấy database_field để kiểm tra alias tồn tại", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyAliasDatabaseFieldQuery(before.client, ALIAS_ID);
    await findAliasDatabaseField(after.client, ALIAS_ID);

    expect(after.calls).toEqual(before.calls);
  });

  it("lấy tên alias để báo khi xóa", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyAliasNameQuery(before.client, ALIAS_ID);
    await findAliasName(after.client, ALIAS_ID);

    expect(after.calls).toEqual(before.calls);
  });

  it("cập nhật alias theo id", async () => {
    const before = recorder();
    const after = recorder();
    const updateData = { alias_name: "Hệ Số Mới" };

    await legacy.legacyUpdateAliasQuery(before.client, ALIAS_ID, updateData);
    await updateColumnAlias(after.client, ALIAS_ID, updateData);

    expect(after.calls).toEqual(before.calls);
  });

  it("xóa alias theo id", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyDeleteAliasQuery(before.client, ALIAS_ID);
    await deleteColumnAlias(after.client, ALIAS_ID);

    expect(after.calls).toEqual(before.calls);
  });

  it("nạp alias cho import chỉ lấy alias đang bật", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyActiveAliasesQuery(before.client);
    await findActiveAliases(after.client);

    expect(after.calls).toEqual(before.calls);
    expect(after.calls[0].filters).toEqual([
      { method: "eq", args: ["is_active", true] },
    ]);
  });
});
