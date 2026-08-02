import XLSX from "xlsx-js-style";
import { buildLegacyAttendanceWorkbook } from "../__fixtures__/legacy-attendance-workbook";
import { buildAttendanceSummarySheet } from "../attendance-summary-sheet";
import { buildAttendanceDailySheet } from "../attendance-daily-sheet";
import type {
  AttendanceEmployeeInfo,
  AttendanceMonthlyRow,
  AttendanceSignatureLog,
} from "../attendance-sheet-types";
import {
  normalizeDailyRecords,
  type DailyExportRecord,
} from "@/lib/attendance/daily-records";

const PERIOD_YEAR = 2026;
const PERIOD_MONTH = 8;
const SALARY_MONTH = "2026-08";
const DAYS_IN_MONTH = new Date(PERIOD_YEAR, PERIOD_MONTH, 0).getDate();

const dailyJson = (days: number[]) =>
  JSON.stringify(
    days.map((d) => ({
      day: d,
      checkIn: "7:0" + (d % 10),
      check_out_time: "17:30:00",
      workingUnits: 1,
      overtime_units: d % 3,
    })),
  );

const monthlyRows: AttendanceMonthlyRow[] = [
  {
    employee_id: "NV001",
    source_file: "ChamCong_08.xlsx",
    total_days: 22,
    total_hours: 176.5,
    total_ot_hours: 8,
    total_meal_ot_hours: 2,
    sick_days: 1,
    daily_records_json: dailyJson([1, 2, 15, 31]),
  },
  {
    employee_id: "NV002",
    source_file: "ChamCong_08.xlsx",
    total_days: 20,
    total_hours: 160,
    total_ot_hours: 0,
    total_meal_ot_hours: 0,
    sick_days: 0,
    daily_records_json: dailyJson([3, 4]),
  },
  {
    employee_id: "NV003",
    source_file: null,
    total_days: null,
    total_hours: null,
    total_ot_hours: null,
    total_meal_ot_hours: null,
    sick_days: null,
    daily_records_json: null,
  },
];

const employeeMap = new Map<string, AttendanceEmployeeInfo>([
  [
    "NV001",
    {
      employee_id: "NV001",
      full_name: "Nguyễn Văn A",
      department: "Tổ May 1",
      chuc_vu: "nhan_vien",
    },
  ],
  [
    "NV002",
    {
      employee_id: "NV002",
      full_name: "Trần Thị B",
      department: "Tổ May 2",
      chuc_vu: "to_truong",
    },
  ],
  [
    "NV003",
    {
      employee_id: "NV003",
      full_name: "Lê Văn C",
      department: "Tổ May 1",
      chuc_vu: "nhan_vien",
    },
  ],
]);

const signatureLogsMap = new Map<string, AttendanceSignatureLog>([
  [
    "NV001",
    {
      employee_id: "NV001",
      salary_month: SALARY_MONTH,
      signed_by_name: "NGUYỄN VĂN A",
      signed_at: "2026-09-01 08:15:00",
    },
  ],
]);

function dailyByEmployeeFrom(rows: AttendanceMonthlyRow[]) {
  const map = new Map<string, Map<number, DailyExportRecord>>();
  for (const row of rows) {
    const perDay = new Map<number, DailyExportRecord>();
    for (const record of normalizeDailyRecords(row.daily_records_json)) {
      perDay.set(record.day, record);
    }
    map.set(row.employee_id, perDay);
  }
  return map;
}

function serializeSheet(sheet: XLSX.WorkSheet) {
  const cells: Record<string, unknown> = {};
  for (const [ref, cell] of Object.entries(sheet)) {
    if (ref.startsWith("!")) continue;
    const c = cell as XLSX.CellObject & { s?: unknown };
    cells[ref] = { v: c.v, t: c.t, s: c.s };
  }
  return {
    cells,
    ref: sheet["!ref"],
    merges: JSON.stringify(sheet["!merges"] ?? []),
    cols: JSON.stringify(sheet["!cols"] ?? []),
    rows: JSON.stringify(sheet["!rows"] ?? []),
  };
}

describe("tách builder không đổi nội dung workbook chấm công", () => {
  const legacy = buildLegacyAttendanceWorkbook({
    monthlyData: monthlyRows,
    employeeMap,
    signatureLogsMap,
    salaryMonth: SALARY_MONTH,
    period_year: PERIOD_YEAR,
    period_month: PERIOD_MONTH,
    include_daily: true,
  });

  const sheetContext = {
    monthlyData: monthlyRows,
    employeeMap,
    signatureLogsMap,
    salaryMonth: SALARY_MONTH,
  };
  const current = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    current,
    buildAttendanceSummarySheet(sheetContext),
    "Tổng Hợp Tháng",
  );
  XLSX.utils.book_append_sheet(
    current,
    buildAttendanceDailySheet({
      ...sheetContext,
      dailyByEmployee: dailyByEmployeeFrom(monthlyRows),
      daysInMonth: DAYS_IN_MONTH,
    }),
    "Chi Tiết Ngày",
  );

  it("cùng danh sách sheet, cùng thứ tự", () => {
    expect(current.SheetNames).toEqual(legacy.SheetNames);
  });

  it("sheet Tổng Hợp Tháng giống hệt từng ô, kể cả style và merge", () => {
    expect(serializeSheet(current.Sheets["Tổng Hợp Tháng"])).toEqual(
      serializeSheet(legacy.Sheets["Tổng Hợp Tháng"]),
    );
  });

  it("sheet Chi Tiết Ngày giống hệt từng ô, kể cả style và merge", () => {
    expect(serializeSheet(current.Sheets["Chi Tiết Ngày"])).toEqual(
      serializeSheet(legacy.Sheets["Chi Tiết Ngày"]),
    );
  });

  it("buffer XLSX ghi ra bằng nhau theo byte", () => {
    const write = (wb: XLSX.WorkBook) =>
      XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    expect(write(current).equals(write(legacy))).toBe(true);
  });
});
