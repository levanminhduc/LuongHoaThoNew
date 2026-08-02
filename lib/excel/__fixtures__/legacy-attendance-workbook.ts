import XLSX from "xlsx-js-style";
import { formatAttendanceSigningDate } from "@/lib/utils/signing-date-generator";
import {
  normalizeDailyRecords,
  type DailyExportRecord,
} from "@/lib/attendance/daily-records";
import type {
  AttendanceEmployeeInfo,
  AttendanceMonthlyRow,
  AttendanceSignatureLog,
} from "@/lib/excel/attendance-sheet-types";

type SignatureLog = AttendanceSignatureLog;

export function buildLegacyAttendanceWorkbook(input: {
  monthlyData: AttendanceMonthlyRow[];
  employeeMap: Map<string, AttendanceEmployeeInfo>;
  signatureLogsMap: Map<string, SignatureLog>;
  salaryMonth: string;
  period_year: number;
  period_month: number;
  include_daily: boolean;
}): XLSX.WorkBook {
  const {
    monthlyData,
    employeeMap,
    signatureLogsMap,
    salaryMonth,
    period_year,
    period_month,
    include_daily,
  } = input;

  const getSignatureStatus = (
    signatureLog: SignatureLog | undefined,
  ): string => (signatureLog ? "Đã Ký" : "Chưa Ký");

  const workbook = XLSX.utils.book_new();

  const summaryHeaders = [
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
  ];

  const summaryRows = monthlyData.map((m, idx) => {
    const emp = employeeMap.get(m.employee_id);
    const signatureLog = signatureLogsMap.get(m.employee_id);

    return [
      idx + 1,
      m.employee_id,
      emp?.full_name || "",
      emp?.department || "",
      emp?.chuc_vu || "",
      m.total_hours,
      m.total_days,
      m.total_meal_ot_hours,
      m.total_ot_hours,
      m.sick_days,
      m.source_file || "",
      getSignatureStatus(signatureLog),
      formatAttendanceSigningDate(
        m.employee_id,
        salaryMonth,
        signatureLog?.signed_at || null,
      ),
    ];
  });

  const summarySheet = XLSX.utils.aoa_to_sheet([
    summaryHeaders,
    ...summaryRows,
  ]);
  summarySheet["!cols"] = [
    { wch: 5 },
    { wch: 12 },
    { wch: 25 },
    { wch: 20 },
    { wch: 15 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 30 },
    { wch: 20 },
    { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Tổng Hợp Tháng");

  if (include_daily) {
    const daysInMonth = new Date(period_year, period_month, 0).getDate();

    const dailyByEmployee = new Map<string, Map<number, DailyExportRecord>>();
    const fallbackEmployeeIds: string[] = [];

    for (const m of monthlyData) {
      const employeeDailyMap = new Map<number, DailyExportRecord>();
      const hasDailyRecordsJson =
        m.daily_records_json !== null && m.daily_records_json !== undefined;
      const normalizedRecords = normalizeDailyRecords(m.daily_records_json);

      if (!hasDailyRecordsJson) {
        fallbackEmployeeIds.push(m.employee_id);
      }

      for (const record of normalizedRecords) {
        employeeDailyMap.set(record.day, record);
      }

      dailyByEmployee.set(m.employee_id, employeeDailyMap);
    }

    const headerRow: (string | number)[] = ["STT", "Mã NV", "Tên Nhân Viên"];

    for (let d = 1; d <= daysInMonth; d++) {
      headerRow.push(d, "");
    }
    headerRow.push(
      "Tổng Ngày Công",
      "Tổng Giờ Công",
      "Tổng Giờ Ăn TC",
      "Tổng Giờ Tăng Ca",
      "Nghỉ Ốm",
      "Ký Tên",
      "Ngày Ký",
    );

    type EmployeeInfo = {
      employee_id: string;
      full_name: string;
      department: string;
      chuc_vu: string;
    };

    const employeesByDepartment = new Map<
      string,
      { employee: (typeof monthlyData)[0]; emp: EmployeeInfo | undefined }[]
    >();

    for (const m of monthlyData) {
      const emp = employeeMap.get(m.employee_id);
      const dept = emp?.department || "Không xác định";
      if (!employeesByDepartment.has(dept)) {
        employeesByDepartment.set(dept, []);
      }
      employeesByDepartment.get(dept)!.push({
        employee: m,
        emp,
      });
    }

    const dataRows: (string | number)[][] = [];
    const departmentRowIndices: number[] = [];
    let stt = 1;

    const naturalSortDepartments = (a: string, b: string): number => {
      const xtPattern = /^XT(\d+)$/i;
      const matchA = a.match(xtPattern);
      const matchB = b.match(xtPattern);

      if (matchA && matchB) {
        return parseInt(matchA[1], 10) - parseInt(matchB[1], 10);
      }

      if (matchA && !matchB) return -1;
      if (!matchA && matchB) return 1;

      return a.localeCompare(b, "vi", { sensitivity: "base" });
    };

    const sortedDepartments = Array.from(employeesByDepartment.entries()).sort(
      ([deptA], [deptB]) => naturalSortDepartments(deptA, deptB),
    );

    for (const [dept, empList] of sortedDepartments) {
      departmentRowIndices.push(dataRows.length + 1);

      const deptRow: (string | number)[] = [`Bộ phận ${dept}`];
      for (let i = 1; i < headerRow.length; i++) {
        deptRow.push("");
      }
      dataRows.push(deptRow);

      for (const { employee: m, emp } of empList) {
        const dailyMap = dailyByEmployee.get(m.employee_id) || new Map();

        const row1: (string | number)[] = [
          stt,
          m.employee_id,
          emp?.full_name || "",
        ];
        const row2: (string | number)[] = ["", "", ""];

        for (let d = 1; d <= daysInMonth; d++) {
          const dayData = dailyMap.get(d);
          row1.push(dayData?.checkIn || "", dayData?.checkOut || "");
          // Store as text strings to prevent Excel rounding in narrow columns
          row2.push(
            dayData ? String(dayData.working) : "",
            dayData ? String(dayData.ot) : "",
          );
        }

        const signatureLog = signatureLogsMap.get(m.employee_id);
        row1.push(
          String(m.total_days ?? ""),
          String(m.total_hours ?? ""),
          String(m.total_meal_ot_hours ?? ""),
          String(m.total_ot_hours ?? ""),
          String(m.sick_days ?? ""),
          getSignatureStatus(signatureLog),
          formatAttendanceSigningDate(
            m.employee_id,
            salaryMonth,
            signatureLog?.signed_at || null,
          ),
        );
        row2.push("", "", "", "", "", "", "");

        dataRows.push(row1, row2);
        stt++;
      }
    }

    const sheetData = [headerRow, ...dataRows];
    const dailySheet = XLSX.utils.aoa_to_sheet(sheetData);
    dailySheet["!rows"] = [{ hpt: 60 }];

    const MIN_COL_WIDTH = 2;
    const MAX_COL_WIDTH = 30;
    const PADDING = 0;
    const colMaxLens: number[] = [];

    for (let r = 0; r < sheetData.length; r++) {
      const row = sheetData[r];
      for (let c = 0; c < row.length; c++) {
        const cellVal = row[c];
        const len = cellVal == null ? 0 : String(cellVal).length;
        if (colMaxLens[c] === undefined || len > colMaxLens[c]) {
          colMaxLens[c] = len;
        }
      }
    }

    const colWidths = colMaxLens.map((len) => ({
      wch: Math.min(MAX_COL_WIDTH, Math.max(MIN_COL_WIDTH, len + PADDING)),
    }));
    dailySheet["!cols"] = colWidths;
    colWidths[0] = { wch: 4 };

    const merges: XLSX.Range[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const startCol = 3 + (d - 1) * 2;
      merges.push({
        s: { r: 0, c: startCol },
        e: { r: 0, c: startCol + 1 },
      });
    }

    const summaryStartCol = 3 + daysInMonth * 2;
    const totalCols = headerRow.length;
    const wrappedSummaryCols = [
      summaryStartCol,
      summaryStartCol + 1,
      summaryStartCol + 2,
      summaryStartCol + 3,
      summaryStartCol + 4,
      summaryStartCol + 5,
      summaryStartCol + 6,
    ];

    for (const col of wrappedSummaryCols) {
      dailySheet["!cols"]![col] = { wch: 5.5 };
    }

    // Determine which days have data across all employees
    const daysWithData = new Set<number>();
    for (const empDailyMap of Array.from(dailyByEmployee.values())) {
      for (const [day] of Array.from(empDailyMap)) {
        daysWithData.add(day);
      }
    }

    // Adjust day column widths: 70% for days with data, minimum for empty days
    const dayColStart = 3;
    const dayColEnd = summaryStartCol - 1;
    const EMPTY_DAY_COL_WIDTH = 1; // Minimal width for empty day columns
    for (let d = 1; d <= daysInMonth; d++) {
      const col1 = 3 + (d - 1) * 2;
      const col2 = col1 + 1;
      const hasData = daysWithData.has(d);

      for (const c of [col1, col2]) {
        const colDef = dailySheet["!cols"]?.[c];
        if (colDef && typeof colDef.wch === "number") {
          colDef.wch = hasData
            ? Math.max(MIN_COL_WIDTH, Math.round(colDef.wch * 0.7))
            : EMPTY_DAY_COL_WIDTH;
        }
      }
    }

    for (const deptRowIdx of departmentRowIndices) {
      merges.push({
        s: { r: deptRowIdx, c: 0 },
        e: { r: deptRowIdx, c: totalCols - 1 },
      });
    }

    let employeeRowIndex = 0;
    for (let r = 1; r < sheetData.length; r++) {
      if (departmentRowIndices.includes(r)) continue;

      if (employeeRowIndex % 2 === 0) {
        const startRow = r;
        merges.push({
          s: { r: startRow, c: 0 },
          e: { r: startRow + 1, c: 0 },
        });
        merges.push({
          s: { r: startRow, c: 1 },
          e: { r: startRow + 1, c: 1 },
        });
        merges.push({
          s: { r: startRow, c: 2 },
          e: { r: startRow + 1, c: 2 },
        });

        for (let col = 0; col < 7; col++) {
          merges.push({
            s: { r: startRow, c: summaryStartCol + col },
            e: { r: startRow + 1, c: summaryStartCol + col },
          });
        }
      }
      employeeRowIndex++;
    }
    dailySheet["!merges"] = merges;

    const totalRows = sheetData.length;
    const baseBorder = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };
    const cellStyle = {
      border: baseBorder,
      alignment: {
        horizontal: "center",
        vertical: "center",
      },
    };
    // Row1 (check-in/check-out times) in day columns: font size 7
    const cellStyleRow1Day = {
      border: baseBorder,
      font: { sz: 7 },
      alignment: {
        horizontal: "center",
        vertical: "center",
      },
    };
    // Row2 (working/OT units) in day columns: font size 14
    const cellStyleRow2Day = {
      border: baseBorder,
      font: { sz: 14 },
      alignment: {
        horizontal: "center",
        vertical: "center",
      },
    };
    const wrappedHeaderStyle = {
      ...cellStyle,
      alignment: {
        horizontal: "center",
        vertical: "center",
        wrapText: true,
      },
    };

    const deptRowStyle = {
      font: {
        bold: true,
        color: { rgb: "1F4E79" },
      },
      alignment: {
        horizontal: "left",
        vertical: "center",
      },
      border: baseBorder,
    };

    // Track row1 (times) and row2 (numbers) for employee data rows
    const row1Set = new Set<number>();
    const row2Set = new Set<number>();
    let empRowTrack = 0;
    for (let r = 1; r < sheetData.length; r++) {
      if (departmentRowIndices.includes(r)) continue;
      if (empRowTrack % 2 === 0) {
        row1Set.add(r);
      } else {
        row2Set.add(r);
      }
      empRowTrack++;
    }

    const cellStyleWrap = {
      border: baseBorder,
      alignment: {
        horizontal: "center",
        vertical: "center",
        wrapText: true,
      },
    };

    for (let r = 0; r < totalRows; r++) {
      const isDeptRow = departmentRowIndices.includes(r);
      const isRow1 = row1Set.has(r);
      const isRow2 = row2Set.has(r);

      for (let c = 0; c < totalCols; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        if (!dailySheet[cellRef]) {
          dailySheet[cellRef] = { v: "", t: "s" };
        }

        let style = cellStyle;
        if (isDeptRow) {
          style = deptRowStyle;
        } else if (c === 1 || c === 2 || c === summaryStartCol + 6) {
          style = cellStyleWrap;
        } else if (c >= dayColStart && c <= dayColEnd) {
          if (isRow1) style = cellStyleRow1Day;
          else if (isRow2) style = cellStyleRow2Day;
        }

        dailySheet[cellRef].s = style;
      }
    }

    for (const col of wrappedSummaryCols) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!dailySheet[cellRef]) {
        dailySheet[cellRef] = { v: "", t: "s" };
      }
      dailySheet[cellRef].s = wrappedHeaderStyle;
    }

    XLSX.utils.book_append_sheet(workbook, dailySheet, "Chi Tiết Ngày");
  }

  return workbook;
}
