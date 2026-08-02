import { createQueryRecorder } from "@/lib/__fixtures__/query-recorder";
import * as legacy from "../__fixtures__/legacy-bonus-queries";
import {
  buildBonusDeleteQuery,
  buildBonusListQuery,
  buildBonusPeriodListQuery,
  findBonusByEmployeeAndPeriod,
  findBonusPeriodByImportBatch,
  findEmployeeBonuses,
  insertBonus,
  updateBonusById,
  type SupabaseServiceClient,
} from "../bonus-repository";
import { findActiveSignatureIdsForPeriod } from "../bonus-signature-repository";

function recorder() {
  const recorded = createQueryRecorder([{ data: [] }, { data: [] }]);
  return {
    calls: recorded.calls,
    client: recorded.client as unknown as SupabaseServiceClient,
  };
}

const KEY = { bonusType: "thuong_le", bonusPeriod: "2026-01" };
const DEPARTMENTS = ["Tổ May 1", "Tổ May 2"];

describe("truy vấn import thưởng giữ nguyên sau khi rút", () => {
  it("tìm bản ghi đã tồn tại theo nhân viên và đợt", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyFindExistingBonusQuery(
      before.client,
      "NV001",
      "thuong_le",
      "2026-01",
    );
    await findBonusByEmployeeAndPeriod(after.client, "NV001", KEY);

    expect(after.calls).toEqual(before.calls);
  });

  it("cập nhật theo id", async () => {
    const before = recorder();
    const after = recorder();
    const record = { amount: 5000000, bonus_title: "Thưởng Tết" };

    await legacy.legacyUpdateBonusQuery(before.client, record, 42);
    await updateBonusById(after.client, 42, record);

    expect(after.calls).toEqual(before.calls);
  });

  it("thêm mới vẫn gắn created_at vào cùng payload", async () => {
    const before = recorder();
    const after = recorder();
    const record = { amount: 5000000, updated_at: "2026-01-05T10:00:00" };

    await legacy.legacyInsertBonusQuery(
      before.client,
      record,
      "2026-01-05T10:00:00",
    );
    await insertBonus(after.client, record, "2026-01-05T10:00:00");

    expect(after.calls).toEqual(before.calls);
    expect(after.calls[0].operation?.args[0]).toEqual({
      ...record,
      created_at: "2026-01-05T10:00:00",
    });
  });
});

describe("truy vấn xóa đợt thưởng giữ nguyên sau khi rút", () => {
  it("kiểm tra chữ ký còn hiệu lực của đợt", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyActiveSignatureQuery(
      before.client,
      "thuong_le",
      "2026-01",
    );
    await findActiveSignatureIdsForPeriod(after.client, {
      bonus_type: "thuong_le",
      bonus_period: "2026-01",
    });

    expect(after.calls).toEqual(before.calls);
  });

  it("tra đợt thưởng từ mã lần import", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyFindBatchPeriodQuery(before.client, "batch-9");
    await findBonusPeriodByImportBatch(after.client, "batch-9");

    expect(after.calls).toEqual(before.calls);
  });

  it("xóa theo mã lần import — chỉ lọc import_batch_id", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyDeleteBonusesQuery(
      before.client,
      "batch-9",
      "thuong_le",
      "2026-01",
    );
    await buildBonusDeleteQuery(after.client, {
      ...KEY,
      importBatchId: "batch-9",
    });

    expect(after.calls).toEqual(before.calls);
    expect(after.calls[0].filters).toEqual([
      { method: "eq", args: ["import_batch_id", "batch-9"] },
    ]);
  });

  it("xóa theo loại và đợt khi không có mã lần import", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyDeleteBonusesQuery(
      before.client,
      null,
      "thuong_le",
      "2026-01",
    );
    await buildBonusDeleteQuery(after.client, { ...KEY, importBatchId: null });

    expect(after.calls).toEqual(before.calls);
    expect(after.calls[0].filters).toEqual([
      { method: "eq", args: ["bonus_type", "thuong_le"] },
      { method: "eq", args: ["bonus_period", "2026-01"] },
    ]);
  });

  it("xóa vẫn yêu cầu đếm chính xác để trả deletedCount", async () => {
    const after = recorder();

    await buildBonusDeleteQuery(after.client, { ...KEY, importBatchId: null });

    expect(after.calls[0].operation).toEqual({
      method: "delete",
      args: [{ count: "exact" }],
    });
  });
});

describe("truy vấn tra cứu thưởng giữ nguyên sau khi rút", () => {
  const departmentCases: [string, string[] | null][] = [
    ["giới hạn theo phòng ban được cấp", DEPARTMENTS],
    ["không giới hạn phòng ban", null],
    ["danh sách phòng ban rỗng vẫn phải lọc", []],
  ];

  it.each(departmentCases)(
    "danh sách đợt thưởng — %s",
    async (_label, departments) => {
      const before = recorder();
      const after = recorder();

      await legacy.legacyPeriodListQuery(before.client, departments);
      await buildBonusPeriodListQuery(after.client, departments);

      expect(after.calls).toEqual(before.calls);
    },
  );

  it.each(departmentCases)(
    "danh sách thưởng theo đợt — %s",
    async (_label, departments) => {
      const before = recorder();
      const after = recorder();

      await legacy.legacyBonusListQuery(
        before.client,
        "thuong_le",
        "2026-01",
        departments,
      );
      await buildBonusListQuery(after.client, KEY, departments);

      expect(after.calls).toEqual(before.calls);
    },
  );

  it("cả hai truy vấn tra cứu vẫn dùng embed !inner", async () => {
    const periods = recorder();
    const list = recorder();

    await buildBonusPeriodListQuery(periods.client, DEPARTMENTS);
    await buildBonusListQuery(list.client, KEY, DEPARTMENTS);

    expect(periods.calls[0].select).toContain("employees!inner(department)");
    expect(list.calls[0].select).toContain("employees!inner(");
  });

  it("bộ lọc phòng ban đặt trên bảng nhúng, không phải bảng thưởng", async () => {
    const after = recorder();

    await buildBonusListQuery(after.client, KEY, DEPARTMENTS);

    expect(after.calls[0].filters).toContainEqual({
      method: "in",
      args: ["employees.department", DEPARTMENTS],
    });
  });

  it("không giới hạn phòng ban thì không có bộ lọc in nào", async () => {
    const after = recorder();

    await buildBonusListQuery(after.client, KEY, null);

    expect(after.calls[0].filters).not.toContainEqual(
      expect.objectContaining({ method: "in" }),
    );
  });

  it("thưởng của một nhân viên — chỉ lọc theo chính họ", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyEmployeeBonusesQuery(before.client, "NV001");
    await findEmployeeBonuses(after.client, "NV001");

    expect(after.calls).toEqual(before.calls);
    expect(after.calls[0].filters).toContainEqual({
      method: "eq",
      args: ["employee_id", "NV001"],
    });
    expect(after.calls[0].select).not.toContain("employees");
  });
});
