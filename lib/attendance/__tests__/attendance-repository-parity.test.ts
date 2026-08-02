import { createQueryRecorder } from "@/lib/__fixtures__/query-recorder";
import type { DailyRecord } from "@/types/attendance";
import * as legacy from "../__fixtures__/legacy-attendance-queries";
import {
  buildMonthlyAttendanceExportQuery,
  findAttendancePeriods,
  findDailyAttendanceForExport,
  findDailyCheckOutTimes,
  findMonthlyAttendanceSummaries,
  findMonthlyDailyRecords,
  upsertMonthlyAttendance,
  type SupabaseServiceClient,
} from "../attendance-repository";

function recorder() {
  const recorded = createQueryRecorder([{ data: [] }, { data: [] }]);
  return {
    calls: recorded.calls,
    client: recorded.client as unknown as SupabaseServiceClient,
  };
}

const PERIOD = { periodYear: 2026, periodMonth: 7 };

describe("truy vấn attendance_monthly giữ nguyên sau khi rút", () => {
  it("danh sách kỳ chấm công — hai order giữ đúng thứ tự", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyPeriodListQuery(before.client);
    await findAttendancePeriods(after.client);

    expect(after.calls).toEqual(before.calls);
    expect(after.calls[0].filters).toEqual([
      { method: "order", args: ["period_year", { ascending: false }] },
      { method: "order", args: ["period_month", { ascending: false }] },
    ]);
  });

  it("tổng hợp tháng cho màn hình danh sách nhân viên", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyMonthlySummaryQuery(before.client, 2026, 7);
    await findMonthlyAttendanceSummaries(after.client, PERIOD);

    expect(after.calls).toEqual(before.calls);
    expect(after.calls[0].select).toContain("created_at");
  });

  it("dữ liệu tính tăng ca chỉ lấy đúng hai cột", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyOvertimeMonthlyQuery(before.client, 2026, 7);
    await findMonthlyDailyRecords(after.client, PERIOD);

    expect(after.calls).toEqual(before.calls);
    expect(after.calls[0].select).toBe("employee_id, daily_records_json");
  });
});

describe("truy vấn xuất Excel chấm công giữ nguyên sau khi rút", () => {
  const cases: [string, string, string[] | null | undefined][] = [
    ["xuất tất cả", "all", ["NV001"]],
    ["xuất chọn lọc có danh sách", "selected", ["NV001", "NV002"]],
    ["xuất chọn lọc nhưng danh sách rỗng", "selected", []],
    ["xuất chọn lọc nhưng danh sách null", "selected", null],
    ["xuất chọn lọc nhưng danh sách undefined", "selected", undefined],
  ];

  it.each(cases)("%s — chuỗi gọi giống hệt", async (_label, type, ids) => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyExportMonthlyQuery(before.client, 2026, 7, type, ids);
    await buildMonthlyAttendanceExportQuery(after.client, {
      ...PERIOD,
      exportType: type,
      employeeIds: ids,
    });

    expect(after.calls).toEqual(before.calls);
  });

  it("chỉ xuất chọn lọc mới thêm bộ lọc in", async () => {
    const selected = recorder();
    const all = recorder();

    await buildMonthlyAttendanceExportQuery(selected.client, {
      ...PERIOD,
      exportType: "selected",
      employeeIds: ["NV001"],
    });
    await buildMonthlyAttendanceExportQuery(all.client, {
      ...PERIOD,
      exportType: "all",
      employeeIds: ["NV001"],
    });

    expect(selected.calls[0].filters).toContainEqual({
      method: "in",
      args: ["employee_id", ["NV001"]],
    });
    expect(all.calls[0].filters).not.toContainEqual(
      expect.objectContaining({ method: "in" }),
    );
  });

  it("select tháng cho export vẫn kèm daily_records_json", async () => {
    const after = recorder();

    await buildMonthlyAttendanceExportQuery(after.client, {
      ...PERIOD,
      exportType: "all",
      employeeIds: null,
    });

    expect(after.calls[0].select).toContain("daily_records_json");
    expect(after.calls[0].select).toContain("source_file");
  });

  it("dự phòng chấm công ngày — giữ cả hai order", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyExportDailyFallbackQuery(before.client, 2026, 7, [
      "NV001",
    ]);
    await findDailyAttendanceForExport(after.client, {
      ...PERIOD,
      employeeIds: ["NV001"],
    });

    expect(after.calls).toEqual(before.calls);
    expect(after.calls[0].filters.slice(-2)).toEqual([
      { method: "order", args: ["employee_id"] },
      { method: "order", args: ["work_date"] },
    ]);
  });

  it("dự phòng giờ ra cho tăng ca — không sắp xếp, đúng như bản cũ", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyOvertimeDailyFallbackQuery(before.client, 2026, 7, [
      "NV001",
    ]);
    await findDailyCheckOutTimes(after.client, {
      ...PERIOD,
      employeeIds: ["NV001"],
    });

    expect(after.calls).toEqual(before.calls);
    expect(after.calls[0].filters).not.toContainEqual(
      expect.objectContaining({ method: "order" }),
    );
  });
});

describe("ghi chấm công tháng giữ nguyên sau khi rút", () => {
  const dailyRecords: DailyRecord[] = [
    {
      day: 1,
      checkIn: "07:30",
      checkOut: "17:00",
      workingUnits: 1,
      overtimeUnits: 0,
    },
  ];
  const summary = {
    totalHours: 208,
    totalDays: 26,
    totalMealOtHours: 4,
    totalOtHours: 12,
    sickDays: 0,
  };

  it("upsert giữ nguyên payload và onConflict", async () => {
    const before = recorder();
    const after = recorder();

    await legacy.legacyMonthlyUpsertQuery(
      before.client,
      {
        employeeId: "NV001",
        periodYear: 2026,
        periodMonth: 7,
        summary,
      },
      dailyRecords,
      "chamcong.xlsx",
      "batch-1",
    );
    await upsertMonthlyAttendance(after.client, {
      ...PERIOD,
      employeeId: "NV001",
      summary,
      dailyRecords,
      sourceFile: "chamcong.xlsx",
      importBatchId: "batch-1",
    });

    expect(after.calls).toEqual(before.calls);
  });

  it("khoá chống trùng vẫn là ba cột nhân viên + kỳ", async () => {
    const after = recorder();

    await upsertMonthlyAttendance(after.client, {
      ...PERIOD,
      employeeId: "NV001",
      summary,
      dailyRecords,
      sourceFile: "chamcong.xlsx",
      importBatchId: "batch-1",
    });

    expect(after.calls[0].operation?.args[1]).toEqual({
      onConflict: "employee_id,period_year,period_month",
    });
  });

  it("bản ghi ngày được ghi thẳng vào daily_records_json", async () => {
    const after = recorder();

    await upsertMonthlyAttendance(after.client, {
      ...PERIOD,
      employeeId: "NV001",
      summary,
      dailyRecords,
      sourceFile: "chamcong.xlsx",
      importBatchId: "batch-1",
    });

    const payload = after.calls[0].operation?.args[0] as Record<
      string,
      unknown
    >;

    expect(payload.daily_records_json).toEqual(dailyRecords);
    expect(payload.import_batch_id).toBe("batch-1");
  });
});
