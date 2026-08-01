import XLSX from "xlsx-js-style";
import { buildAttendanceSummarySheet } from "../attendance-summary-sheet";
import { buildAttendanceDailySheet } from "../attendance-daily-sheet";
import type {
  AttendanceEmployeeInfo,
  AttendanceMonthlyRow,
  AttendanceSignatureLog,
} from "../attendance-sheet-types";
import type { DailyExportRecord } from "@/lib/attendance/daily-records";

function monthlyRow(
  employeeId: string,
  overrides: Partial<AttendanceMonthlyRow> = {},
): AttendanceMonthlyRow {
  return {
    employee_id: employeeId,
    source_file: "ChamCong_08.xlsx",
    total_days: 22,
    total_hours: 176,
    total_ot_hours: 8,
    total_meal_ot_hours: 2,
    sick_days: 0,
    daily_records_json: null,
    ...overrides,
  };
}

function employee(
  employeeId: string,
  department: string,
): AttendanceEmployeeInfo {
  return {
    employee_id: employeeId,
    full_name: `Nhân Viên ${employeeId}`,
    department,
    chuc_vu: "nhan_vien",
  };
}

const SALARY_MONTH = "2026-08";

function contextFor(rows: AttendanceMonthlyRow[], departments: string[]) {
  const employeeMap = new Map<string, AttendanceEmployeeInfo>(
    rows.map((r, i) => [
      r.employee_id,
      employee(r.employee_id, departments[i % departments.length]),
    ]),
  );
  return {
    monthlyData: rows,
    employeeMap,
    signatureLogsMap: new Map<string, AttendanceSignatureLog>(),
    salaryMonth: SALARY_MONTH,
  };
}

const rowsOf = (sheet: XLSX.WorkSheet) =>
  XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: true });

describe("buildAttendanceSummarySheet", () => {
  it("số dòng dữ liệu bằng số bản ghi đầu vào", () => {
    const rows = [
      monthlyRow("NV001"),
      monthlyRow("NV002"),
      monthlyRow("NV003"),
    ];
    const sheet = buildAttendanceSummarySheet(contextFor(rows, ["Tổ May 1"]));
    const grid = rowsOf(sheet);

    const dataRows = grid.filter(
      (r) => typeof r[1] === "string" && String(r[1]).startsWith("NV"),
    );
    expect(dataRows).toHaveLength(3);
  });

  it("hàng tiêu đề đủ 13 cột, đúng thứ tự", () => {
    const sheet = buildAttendanceSummarySheet(
      contextFor([monthlyRow("NV001")], ["Tổ May 1"]),
    );

    expect(rowsOf(sheet)[0]).toEqual([
      "STT",
      "Mã NV",
      "Họ Tên",
      "Phòng Ban",
      "Chức Vụ",
      "Tổng Giờ Công",
      "Tổng Ngày Công",
      "Giờ Ăn TC",
      "Giờ Tăng Ca",
      "Nghỉ Ốm",
      "File Nguồn",
      "Ký Tên",
      "Ngày Ký",
    ]);
  });

  it("chưa ký thì cột trạng thái ghi 'Chưa Ký'", () => {
    const sheet = buildAttendanceSummarySheet(
      contextFor([monthlyRow("NV001")], ["Tổ May 1"]),
    );
    const flat = rowsOf(sheet).flat().map(String);

    expect(flat).toContain("Chưa Ký");
    expect(flat).not.toContain("Đã Ký");
  });

  it("đã ký thì cột Ký Tên là 'Đã Ký' và cột Ngày Ký có ngày", () => {
    const context = contextFor([monthlyRow("NV001")], ["Tổ May 1"]);
    context.signatureLogsMap.set("NV001", {
      employee_id: "NV001",
      salary_month: SALARY_MONTH,
      signed_by_name: "NGUYỄN VĂN A",
      signed_at: "2026-09-01 08:00:00",
    });

    const dataRow = rowsOf(buildAttendanceSummarySheet(context))[1];

    expect(dataRow[11]).toBe("Đã Ký");
    expect(String(dataRow[12])).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it("không có bản ghi nào thì vẫn dựng được sheet, không ném", () => {
    expect(() =>
      buildAttendanceSummarySheet(contextFor([], ["Tổ May 1"])),
    ).not.toThrow();
  });
});

describe("buildAttendanceDailySheet", () => {
  const daily = (day: number): DailyExportRecord => ({
    day,
    checkIn: "07:30",
    checkOut: "17:00",
    working: 1,
    ot: 0.5,
  });

  function dailyContext(rows: AttendanceMonthlyRow[], daysInMonth: number) {
    const base = contextFor(rows, ["Tổ May 1", "Tổ May 2"]);
    const dailyByEmployee = new Map<string, Map<number, DailyExportRecord>>(
      rows.map((r) => [
        r.employee_id,
        new Map([
          [1, daily(1)],
          [2, daily(2)],
        ]),
      ]),
    );
    return { ...base, dailyByEmployee, daysInMonth };
  }

  it("mỗi ngày trong tháng chiếm 2 cột nên header dài theo daysInMonth", () => {
    const grid28 = rowsOf(
      buildAttendanceDailySheet(dailyContext([monthlyRow("NV001")], 28)),
    );
    const grid31 = rowsOf(
      buildAttendanceDailySheet(dailyContext([monthlyRow("NV001")], 31)),
    );

    const width = (grid: unknown[][]) => Math.max(...grid.map((r) => r.length));
    expect(width(grid31) - width(grid28)).toBe((31 - 28) * 2);
  });

  it("hàng tiêu đề có STT, Mã NV, Tên Nhân Viên", () => {
    const grid = rowsOf(
      buildAttendanceDailySheet(dailyContext([monthlyRow("NV001")], 30)),
    );

    expect(grid[0].slice(0, 3)).toEqual(["STT", "Mã NV", "Tên Nhân Viên"]);
  });

  it("nhân viên được nhóm theo phòng ban", () => {
    const rows = [
      monthlyRow("NV001"),
      monthlyRow("NV002"),
      monthlyRow("NV003"),
      monthlyRow("NV004"),
    ];
    const flat = rowsOf(buildAttendanceDailySheet(dailyContext(rows, 30)))
      .flat()
      .filter(Boolean)
      .map(String);

    expect(flat).toEqual(
      expect.arrayContaining(["Bộ phận Tổ May 1", "Bộ phận Tổ May 2"]),
    );
    expect(flat.filter((c) => /^NV\d{3}$/.test(c))).toHaveLength(4);
  });

  it("không có dữ liệu ngày nào thì vẫn dựng được sheet, không ném", () => {
    const base = contextFor([monthlyRow("NV001")], ["Tổ May 1"]);
    expect(() =>
      buildAttendanceDailySheet({
        ...base,
        dailyByEmployee: new Map(),
        daysInMonth: 31,
      }),
    ).not.toThrow();
  });
});

describe("workbook ghép từ 2 sheet", () => {
  it("include_daily bật thì workbook có đúng 2 sheet, đúng tên", () => {
    const rows = [monthlyRow("NV001")];
    const base = contextFor(rows, ["Tổ May 1"]);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      buildAttendanceSummarySheet(base),
      "Tổng Hợp Tháng",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      buildAttendanceDailySheet({
        ...base,
        dailyByEmployee: new Map(),
        daysInMonth: 31,
      }),
      "Chi Tiết Ngày",
    );

    expect(workbook.SheetNames).toEqual(["Tổng Hợp Tháng", "Chi Tiết Ngày"]);
    expect(
      XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }),
    ).toBeTruthy();
  });
});
