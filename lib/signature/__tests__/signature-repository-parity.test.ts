import { createQueryRecorder } from "@/lib/__fixtures__/query-recorder";
import * as legacy from "../__fixtures__/legacy-signature-queries";
import {
  buildSignatureHistoryCountQuery,
  buildSignatureHistoryListQuery,
  type SignatureHistoryFilters,
} from "../signature-history-repository";
import {
  findActiveSignatureId,
  findActiveSignatureSigner,
  findActiveSignaturesForMonth,
  findRecentSignaturesForMonth,
  findSignatureForEligibility,
  findSignatureProgressForMonth,
  findSignatureStatusForMonth,
  findSignatureSummaryForMonth,
  insertManagementSignature,
  updateSignatureSignedAt,
  type SupabaseServiceClient,
} from "../management-signature-repository";
import {
  buildBulkSignatureHistoryQuery,
  findSignatureLogs,
  findSignatureLogsWithMonth,
  insertBulkSignatureLog,
} from "../signature-log-repository";

function recorder() {
  const recorded = createQueryRecorder([{ data: [] }, { data: [] }]);
  return {
    calls: recorded.calls,
    client: recorded.client as unknown as SupabaseServiceClient,
  };
}

const MONTH = "2026-07";
const T13_FILTER = { method: "eq", args: ["payroll_type", "t13"] };
const MONTHLY_FILTER = {
  method: "or",
  args: ["payroll_type.eq.monthly,payroll_type.is.null"],
};

describe("bộ lọc T13 của chữ ký quản lý giữ nguyên sau khi rút", () => {
  it.each([
    ["kỳ T13", true],
    ["kỳ thường", false],
  ])("tìm id chữ ký đang hiệu lực — %s", async (_label, isT13) => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyFindActiveSignatureIdQuery(
      before.client,
      MONTH,
      "giam_doc",
      isT13,
    );
    await findActiveSignatureId(after.client, MONTH, "giam_doc", isT13);

    expect(after.calls).toEqual(before.calls);
  });

  it.each([
    ["kỳ T13", true],
    ["kỳ thường", false],
  ])("tìm người đã ký — %s", async (_label, isT13) => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyFindExistingSignatureQuery(
      before.client,
      MONTH,
      "ke_toan",
      isT13,
    );
    await findActiveSignatureSigner(after.client, MONTH, "ke_toan", isT13);

    expect(after.calls).toEqual(before.calls);
  });

  it.each([
    ["kỳ T13", true],
    ["kỳ thường", false],
  ])("trạng thái ký của tháng — %s", async (_label, isT13) => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyStatusSignatureQuery(before.client, MONTH, isT13);
    await findSignatureStatusForMonth(after.client, MONTH, isT13);

    expect(after.calls).toEqual(before.calls);
  });

  it("kỳ T13 lọc bằng eq, kỳ thường lọc bằng or — không lẫn nhau", async () => {
    const t13 = recorder();
    const monthly = recorder();

    await findSignatureStatusForMonth(t13.client, MONTH, true);
    await findSignatureStatusForMonth(monthly.client, MONTH, false);

    expect(t13.calls[0].filters).toContainEqual(T13_FILTER);
    expect(t13.calls[0].filters).not.toContainEqual(MONTHLY_FILTER);
    expect(monthly.calls[0].filters).toContainEqual(MONTHLY_FILTER);
    expect(monthly.calls[0].filters).not.toContainEqual(T13_FILTER);
  });

  it("nhánh kỳ thường vẫn nhận cả bản ghi payroll_type NULL", async () => {
    const after = recorder();

    await findSignatureStatusForMonth(after.client, MONTH, false);

    expect(after.calls[0].filters).toContainEqual({
      method: "or",
      args: ["payroll_type.eq.monthly,payroll_type.is.null"],
    });
  });
});

describe("lịch sử ký quản lý giữ nguyên sau khi rút", () => {
  const filterCases: [string, SignatureHistoryFilters][] = [
    [
      "admin xem tất cả, kỳ thường",
      {
        isT13: false,
        months: [],
        signatureType: null,
        restrictToSignerId: null,
      },
    ],
    [
      "lọc theo tháng và loại chữ ký",
      {
        isT13: false,
        months: ["2026-06", "2026-07"],
        signatureType: "giam_doc",
        restrictToSignerId: null,
      },
    ],
    [
      "người không phải admin chỉ thấy chữ ký của mình",
      {
        isT13: false,
        months: [],
        signatureType: null,
        restrictToSignerId: "GD001",
      },
    ],
    [
      "kỳ T13 kèm mọi bộ lọc",
      {
        isT13: true,
        months: ["2026-13"],
        signatureType: "ke_toan",
        restrictToSignerId: "KT001",
      },
    ],
  ];

  it.each(filterCases)("truy vấn đếm — %s", async (_label, filters) => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyHistoryCountQuery(before.client, filters);
    await buildSignatureHistoryCountQuery(after.client, filters);

    expect(after.calls).toEqual(before.calls);
  });

  it.each(filterCases)("truy vấn danh sách — %s", async (_label, filters) => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyHistoryListQuery(before.client, filters, 20, 10);
    await buildSignatureHistoryListQuery(after.client, filters, 20, 10);

    expect(after.calls).toEqual(before.calls);
  });

  it("đếm và danh sách dùng đúng cùng bộ lọc", async () => {
    const countRecorder = recorder();
    const listRecorder = recorder();
    const filters: SignatureHistoryFilters = {
      isT13: true,
      months: ["2026-13"],
      signatureType: "giam_doc",
      restrictToSignerId: "GD001",
    };

    await buildSignatureHistoryCountQuery(countRecorder.client, filters);
    await buildSignatureHistoryListQuery(listRecorder.client, filters, 0, 10);

    const listFiltersWithoutPaging = listRecorder.calls[0].filters.filter(
      (filter) => filter.method !== "order" && filter.method !== "range",
    );

    expect(listFiltersWithoutPaging).toEqual(countRecorder.calls[0].filters);
  });

  it("truy vấn đếm giữ nguyên cặp count exact", async () => {
    const after = recorder();

    await buildSignatureHistoryCountQuery(after.client, {
      isT13: false,
      months: [],
      signatureType: null,
      restrictToSignerId: null,
    });

    expect(after.calls[0].select).toBe("*");
    expect(after.calls[0].selectOptions).toEqual({ count: "exact" });
  });

  it("danh sách phân trang bằng range đúng công thức cũ", async () => {
    const after = recorder();

    await buildSignatureHistoryListQuery(
      after.client,
      {
        isT13: false,
        months: [],
        signatureType: null,
        restrictToSignerId: null,
      },
      20,
      10,
    );

    expect(after.calls[0].filters).toContainEqual({
      method: "range",
      args: [20, 29],
    });
  });
});

describe("các truy vấn chữ ký quản lý còn lại giữ nguyên", () => {
  it("tổng hợp chữ ký cho file xuất", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyExportSignatureSummaryQuery(before.client, MONTH);
    await findSignatureSummaryForMonth(after.client, MONTH);

    expect(after.calls).toEqual(before.calls);
  });

  it("cập nhật ngày ký theo id", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyUpdateSignedAtQuery(
      before.client,
      "sig-1",
      "2026-07-31T17:00:00",
    );
    await updateSignatureSignedAt(after.client, "sig-1", "2026-07-31T17:00:00");

    expect(after.calls).toEqual(before.calls);
  });

  it("thêm chữ ký mới", async () => {
    const before = recorder();
    const after = recorder();
    const record = { signature_type: "giam_doc", salary_month: MONTH };

    await legacy.legacyInsertSignatureQuery(before.client, record);
    await insertManagementSignature(after.client, record);

    expect(after.calls).toEqual(before.calls);
  });

  it("tiến độ ký của tháng", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyProgressSignatureQuery(before.client, MONTH);
    await findSignatureProgressForMonth(after.client, MONTH);

    expect(after.calls).toEqual(before.calls);
  });

  it("ba chữ ký gần nhất — giữ nguyên limit 3", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyRecentSignatureQuery(before.client, MONTH);
    await findRecentSignaturesForMonth(after.client, MONTH);

    expect(after.calls).toEqual(before.calls);
    expect(after.calls[0].filters).toContainEqual({
      method: "limit",
      args: [3],
    });
  });

  it("kiểm tra điều kiện ký", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyEligibilitySignatureQuery(
      before.client,
      MONTH,
      "giam_doc",
    );
    await findSignatureForEligibility(after.client, MONTH, "giam_doc");

    expect(after.calls).toEqual(before.calls);
  });

  it("chữ ký còn hiệu lực của tháng", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyMonthStatusSignatureQuery(before.client, MONTH);
    await findActiveSignaturesForMonth(after.client, MONTH);

    expect(after.calls).toEqual(before.calls);
  });

  it("hai truy vấn của utils không lọc payroll_type — đúng như bản cũ", async () => {
    const eligibility = recorder();
    const monthStatus = recorder();

    await findSignatureForEligibility(eligibility.client, MONTH, "giam_doc");
    await findActiveSignaturesForMonth(monthStatus.client, MONTH);

    for (const recorded of [eligibility, monthStatus]) {
      expect(recorded.calls[0].filters).not.toContainEqual(T13_FILTER);
      expect(recorded.calls[0].filters).not.toContainEqual(MONTHLY_FILTER);
    }
  });
});

describe("nhật ký ký giữ nguyên sau khi rút", () => {
  it("nhật ký ký kèm cột salary_month cho xuất chấm công", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyAttendanceSignatureLogQuery(before.client, MONTH);
    await findSignatureLogsWithMonth(after.client, MONTH);

    expect(after.calls).toEqual(before.calls);
    expect(after.calls[0].select).toContain("salary_month");
  });

  it("nhật ký ký cho xuất lương hàng loạt — không có cột salary_month", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyBulkExportSignatureLogQuery(before.client, MONTH);
    await findSignatureLogs(after.client, MONTH);

    expect(after.calls).toEqual(before.calls);
    expect(after.calls[0].select).not.toContain("salary_month,");
  });

  it("ghi nhật ký ký hàng loạt", async () => {
    const before = recorder();
    const after = recorder();
    const record = { bulk_batch_id: "batch-1", admin_id: "ADMIN01" };

    await legacy.legacyInsertBulkLogQuery(before.client, record);
    await insertBulkSignatureLog(after.client, record);

    expect(after.calls).toEqual(before.calls);
  });

  const bulkHistoryCases: [string, string | null, string][] = [
    ["không lọc tháng, kỳ thường", null, "monthly"],
    ["lọc tháng, kỳ thường", MONTH, "monthly"],
    ["lọc tháng, kỳ T13", "2026-13", "t13"],
  ];

  it.each(bulkHistoryCases)(
    "lịch sử ký hàng loạt — %s",
    async (_label, month, payrollType) => {
      const before = recorder();
      const after = recorder();

      await legacy.legacyBulkHistoryQuery(
        before.client,
        month,
        payrollType,
        0,
        20,
      );
      await buildBulkSignatureHistoryQuery(
        after.client,
        month,
        payrollType,
        0,
        20,
      );

      expect(after.calls).toEqual(before.calls);
    },
  );

  it("lịch sử ký hàng loạt vẫn đếm chính xác để phân trang", async () => {
    const after = recorder();

    await buildBulkSignatureHistoryQuery(after.client, null, "monthly", 0, 20);

    expect(after.calls[0].selectOptions).toEqual({ count: "exact" });
  });
});
