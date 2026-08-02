import { createQueryRecorder } from "@/lib/__fixtures__/query-recorder";
import * as legacy from "../__fixtures__/legacy-payroll-signature-queries";
import type { SupabaseServiceClient } from "../payroll-self-repository";
import {
  buildMonthPayrollCountBySignedQuery,
  buildMonthPayrollCountQuery,
  findPayrollSignatureCounts,
  findPayrollSignatureProgress,
  findPayrollSignatureStatus,
  findSignedEmployeeIds,
  findSignedPayrollsForDateUpdate,
  findUnsignedEmployeeIds,
  findUnsignedPayrollsForExport,
} from "../payroll-signature-repository";

function recorder() {
  const recorded = createQueryRecorder([{ data: [] }, { data: [] }]);
  return {
    calls: recorded.calls,
    client: recorded.client as unknown as SupabaseServiceClient,
  };
}

const MONTH = "2026-07";
const T13_MONTH = "2026-13";
const EMPLOYEE_IDS = ["NV0001", "NV0002"];
const T13_FILTER = { method: "eq", args: ["payroll_type", "t13"] };
const MONTHLY_FILTER = {
  method: "or",
  args: ["payroll_type.eq.monthly,payroll_type.is.null"],
};

const periodCases: [string, string, boolean][] = [
  ["kỳ thường", MONTH, false],
  ["kỳ T13", T13_MONTH, true],
];

describe("thống kê ký lương giữ nguyên sau khi rút", () => {
  it.each(periodCases)("đếm tổng bảng lương — %s", async (_l, month, isT13) => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyMonthCountQuery(before.client, month, isT13);
    await buildMonthPayrollCountQuery(after.client, month, isT13);

    expect(after.calls).toEqual(before.calls);
  });

  it.each([
    ["đã ký, kỳ thường", MONTH, false, true],
    ["chưa ký, kỳ thường", MONTH, false, false],
    ["đã ký, kỳ T13", T13_MONTH, true, true],
    ["chưa ký, kỳ T13", T13_MONTH, true, false],
  ])("đếm theo trạng thái ký — %s", async (_l, month, isT13, signed) => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyMonthCountBySignedQuery(
      before.client,
      month as string,
      isT13 as boolean,
      signed as boolean,
    );
    await buildMonthPayrollCountBySignedQuery(
      after.client,
      month as string,
      isT13 as boolean,
      signed as boolean,
    );

    expect(after.calls).toEqual(before.calls);
  });

  it("ba truy vấn đếm của màn thống kê đều dùng head true", async () => {
    const total = recorder();
    const signed = recorder();
    const unsigned = recorder();

    await buildMonthPayrollCountQuery(total.client, MONTH, false);
    await buildMonthPayrollCountBySignedQuery(
      signed.client,
      MONTH,
      false,
      true,
    );
    await buildMonthPayrollCountBySignedQuery(
      unsigned.client,
      MONTH,
      false,
      false,
    );

    for (const recorded of [total, signed, unsigned]) {
      expect(recorded.calls[0].selectOptions).toEqual({
        count: "exact",
        head: true,
      });
    }
  });

  it("đếm đã ký và chưa ký chỉ khác nhau ở cờ is_signed", async () => {
    const signed = recorder();
    const unsigned = recorder();

    await buildMonthPayrollCountBySignedQuery(
      signed.client,
      MONTH,
      false,
      true,
    );
    await buildMonthPayrollCountBySignedQuery(
      unsigned.client,
      MONTH,
      false,
      false,
    );

    expect(signed.calls[0].filters).toContainEqual({
      method: "eq",
      args: ["is_signed", true],
    });
    expect(unsigned.calls[0].filters).toContainEqual({
      method: "eq",
      args: ["is_signed", false],
    });
  });
});

describe("danh sách nhân viên theo trạng thái ký giữ nguyên sau khi rút", () => {
  it.each(periodCases)("mã nhân viên đã ký — %s", async (_l, month, isT13) => {
    const before = recorder();
    const after = recorder();

    await legacy.legacySignedEmployeeIdsQuery(before.client, month, isT13);
    await findSignedEmployeeIds(after.client, month, isT13);

    expect(after.calls).toEqual(before.calls);
  });

  it.each(periodCases)(
    "mã nhân viên chưa ký — %s",
    async (_l, month, isT13) => {
      const before = recorder();
      const after = recorder();

      await legacy.legacyUnsignedEmployeeIdsQuery(before.client, month, isT13);
      await findUnsignedEmployeeIds(after.client, month, isT13);

      expect(after.calls).toEqual(before.calls);
    },
  );

  it("danh sách ký hàng loạt vẫn sắp xếp theo mã nhân viên", async () => {
    const after = recorder();

    await findUnsignedEmployeeIds(after.client, MONTH, false);

    expect(after.calls[0].filters).toContainEqual({
      method: "order",
      args: ["employee_id"],
    });
  });

  it.each([
    ["đổi ngày ký cho toàn bộ tháng", "all", null],
    ["đổi ngày ký cho nhân viên đã chọn", "selected", EMPLOYEE_IDS],
  ])("%s", async (_label, scope, employeeIds) => {
    const before = recorder();
    const after = recorder();

    await legacy.legacySignedPayrollsForDateUpdateQuery(
      before.client,
      MONTH,
      false,
      scope as string,
      employeeIds as string[] | null,
    );
    await findSignedPayrollsForDateUpdate(
      after.client,
      MONTH,
      false,
      scope === "selected" ? (employeeIds as string[] | null) : null,
    );

    expect(after.calls).toEqual(before.calls);
  });

  it("đổi ngày ký toàn tháng không được thu hẹp bằng danh sách mã", async () => {
    const after = recorder();

    await findSignedPayrollsForDateUpdate(after.client, MONTH, false, null);

    expect(after.calls[0].filters).not.toContainEqual(
      expect.objectContaining({ method: "in" }),
    );
  });

  it.each(periodCases)(
    "xuất danh sách chưa ký — %s",
    async (_l, month, isT13) => {
      const before = recorder();
      const after = recorder();

      await legacy.legacyUnsignedExportQuery(before.client, month, isT13);
      await findUnsignedPayrollsForExport(after.client, month, isT13);

      expect(after.calls).toEqual(before.calls);
    },
  );

  it("xuất danh sách chưa ký không sắp xếp, đúng như bản cũ", async () => {
    const after = recorder();

    await findUnsignedPayrollsForExport(after.client, MONTH, false);

    expect(after.calls[0].filters).not.toContainEqual(
      expect.objectContaining({ method: "order" }),
    );
  });
});

describe("trạng thái và tiến độ ký giữ nguyên sau khi rút", () => {
  it.each(periodCases)("trạng thái ký — %s", async (_l, month, isT13) => {
    const before = recorder();
    const after = recorder();

    await legacy.legacySignatureStatusQuery(before.client, month, isT13);
    await findPayrollSignatureStatus(after.client, month, isT13);

    expect(after.calls).toEqual(before.calls);
  });

  it.each(periodCases)("tiến độ ký — %s", async (_l, month, isT13) => {
    const before = recorder();
    const after = recorder();

    await legacy.legacySignatureProgressQuery(before.client, month, isT13);
    await findPayrollSignatureProgress(after.client, month, isT13);

    expect(after.calls).toEqual(before.calls);
  });

  it.each(periodCases)("đếm cho chữ ký quản lý — %s", async (_l, m, isT13) => {
    const before = recorder();
    const after = recorder();

    await legacy.legacySignatureCountsQuery(before.client, m, isT13);
    await findPayrollSignatureCounts(after.client, m, isT13);

    expect(after.calls).toEqual(before.calls);
  });

  it("ba truy vấn này khác nhau ở cột lấy về và cách đếm", async () => {
    const status = recorder();
    const progress = recorder();
    const counts = recorder();

    await findPayrollSignatureStatus(status.client, MONTH, false);
    await findPayrollSignatureProgress(progress.client, MONTH, false);
    await findPayrollSignatureCounts(counts.client, MONTH, false);

    expect(status.calls[0].selectOptions).toBeUndefined();
    expect(progress.calls[0].select).toContain("signed_at");
    expect(progress.calls[0].selectOptions).toEqual({ count: "exact" });
    expect(counts.calls[0].select).not.toContain("signed_at");
    expect(counts.calls[0].selectOptions).toEqual({ count: "exact" });
  });

  it("kỳ T13 và kỳ thường không lẫn bộ lọc payroll_type", async () => {
    const t13 = recorder();
    const monthly = recorder();

    await findPayrollSignatureStatus(t13.client, T13_MONTH, true);
    await findPayrollSignatureStatus(monthly.client, MONTH, false);

    expect(t13.calls[0].filters).toContainEqual(T13_FILTER);
    expect(t13.calls[0].filters).not.toContainEqual(MONTHLY_FILTER);
    expect(monthly.calls[0].filters).toContainEqual(MONTHLY_FILTER);
    expect(monthly.calls[0].filters).not.toContainEqual(T13_FILTER);
  });
});
