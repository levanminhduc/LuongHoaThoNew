import * as XLSX from "xlsx";
import type {
  ParsedAttendanceRecord,
  DailyRecord,
  AttendanceSummary,
  AttendanceImportError,
} from "@/types/attendance";

export interface AttendanceParseResult {
  success: boolean;
  totalRecords: number;
  records: ParsedAttendanceRecord[];
  errors: AttendanceImportError[];
}

interface HeaderInfo {
  employeeIdCol: number;
  monthCol: number;
  dayStartCol: number;
  daysInMonth: number;
  summaryColumns: {
    totalHours: number;
    totalDays: number;
    totalMealOtHours: number;
    totalOtHours: number;
    sickDays: number;
  };
}

function getMergedCellValue(
  worksheet: XLSX.WorkSheet,
  row: number,
  col: number,
): string | undefined {
  const merges = worksheet["!merges"] || [];
  for (const merge of merges) {
    if (
      row >= merge.s.r &&
      row <= merge.e.r &&
      col >= merge.s.c &&
      col <= merge.e.c
    ) {
      const topLeftCell = XLSX.utils.encode_cell({
        r: merge.s.r,
        c: merge.s.c,
      });
      const cell = worksheet[topLeftCell];
      return cell ? String(cell.v) : undefined;
    }
  }
  const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
  const cell = worksheet[cellAddress];
  return cell ? String(cell.v) : undefined;
}

function getCellValue(
  worksheet: XLSX.WorkSheet,
  row: number,
  col: number,
): unknown {
  const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
  const cell = worksheet[cellAddress];
  return cell?.v;
}

function parseTimeValue(value: unknown): string | null {
  if (!value) return null;
  const strValue = String(value).trim();
  if (!strValue || strValue === "0" || strValue === "-") return null;

  if (typeof value === "number") {
    const totalMinutes = Math.round(value * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  }

  const timeMatch = strValue.match(/^(\d{1,2}):(\d{2})$/);
  if (timeMatch) {
    return `${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}`;
  }
  return null;
}

function parseNumberValue(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;

  if (typeof value === "number") {
    return isNaN(value) ? 0 : value;
  }

  let strValue = String(value).trim();
  if (!strValue) return 0;

  strValue = strValue.replace(/\s/g, "");

  const hasComma = strValue.includes(",");
  const hasDot = strValue.includes(".");

  if (hasComma && !hasDot) {
    strValue = strValue.replace(",", ".");
  } else if (hasComma && hasDot) {
    const commaIndex = strValue.lastIndexOf(",");
    const dotIndex = strValue.lastIndexOf(".");
    if (commaIndex > dotIndex) {
      strValue = strValue.replace(/\./g, "").replace(",", ".");
    } else {
      strValue = strValue.replace(/,/g, "");
    }
  }

  const num = parseFloat(strValue);
  return isNaN(num) ? 0 : num;
}

function parseMonthValue(
  value: string,
): { year: number; month: number } | null {
  if (!value) return null;
  const strValue = value.trim();

  let match = strValue.match(/^(\d{1,2})[-/](\d{4})$/);
  if (match) {
    return { year: parseInt(match[2]), month: parseInt(match[1]) };
  }

  match = strValue.match(/^(\d{4})[-/](\d{1,2})$/);
  if (match) {
    return { year: parseInt(match[1]), month: parseInt(match[2]) };
  }
  return null;
}

function detectHeaderInfo(worksheet: XLSX.WorkSheet): HeaderInfo | null {
  const headerRow = 0;
  const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");

  let employeeIdCol = -1;
  let monthCol = -1;
  let dayStartCol = -1;

  const summaryPatterns = {
    totalHours: ["tổng giờ công", "tong gio cong", "total hours"],
    totalDays: ["tổng ngày công", "tong ngay cong", "total days"],
    totalMealOtHours: ["tổng giờ ăn tc", "tong gio an tc", "meal ot"],
    totalOtHours: ["tổng giờ tăng ca", "tong gio tang ca", "total ot"],
    sickDays: ["nghỉ ốm", "nghi om", "sick"],
  };
  const summaryColumns = {
    totalHours: -1,
    totalDays: -1,
    totalMealOtHours: -1,
    totalOtHours: -1,
    sickDays: -1,
  };

  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellValue = getCellValue(worksheet, headerRow, col);
    if (!cellValue) continue;
    const headerText = String(cellValue).toLowerCase().trim();

    if (
      headerText.includes("mã") &&
      (headerText.includes("nv") || headerText.includes("nhân viên"))
    ) {
      employeeIdCol = col;
    } else if (headerText.includes("tháng") || headerText === "thang") {
      monthCol = col;
    } else if (headerText === "1" && dayStartCol === -1) {
      dayStartCol = col;
    }

    for (const [key, patterns] of Object.entries(summaryPatterns)) {
      if (patterns.some((p) => headerText.includes(p))) {
        summaryColumns[key as keyof typeof summaryColumns] = col;
      }
    }
  }

  if (employeeIdCol === -1 || monthCol === -1 || dayStartCol === -1)
    return null;

  let daysInMonth = 0;
  for (let col = dayStartCol; col <= range.e.c; col++) {
    const cellValue = getCellValue(worksheet, headerRow, col);
    if (!cellValue) continue;
    const dayNum = parseInt(String(cellValue));
    if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
      daysInMonth = Math.max(daysInMonth, dayNum);
    } else if (
      summaryColumns.totalHours === col ||
      summaryColumns.totalDays === col
    ) {
      break;
    }
  }

  return { employeeIdCol, monthCol, dayStartCol, daysInMonth, summaryColumns };
}

function parseEmployeePairRows(
  worksheet: XLSX.WorkSheet,
  row1: number,
  row2: number,
  headerInfo: HeaderInfo,
): {
  record: ParsedAttendanceRecord | null;
  error: AttendanceImportError | null;
} {
  const employeeId = getMergedCellValue(
    worksheet,
    row1,
    headerInfo.employeeIdCol,
  )?.trim();
  const monthValue = getMergedCellValue(worksheet, row1, headerInfo.monthCol);

  if (!employeeId) {
    return { record: null, error: null };
  }

  const parsedMonth = parseMonthValue(monthValue || "");
  if (!parsedMonth) {
    return {
      record: null,
      error: {
        row: row1 + 1,
        employeeId,
        message: `Tháng không hợp lệ: ${monthValue}`,
      },
    };
  }

  if (parsedMonth.month < 1 || parsedMonth.month > 12) {
    return {
      record: null,
      error: {
        row: row1 + 1,
        employeeId,
        message: `Tháng phải từ 1-12: ${parsedMonth.month}`,
      },
    };
  }

  const dailyRecords: DailyRecord[] = [];

  for (let day = 1; day <= headerInfo.daysInMonth; day++) {
    const dayColStart = headerInfo.dayStartCol + (day - 1) * 2;

    const checkIn = parseTimeValue(getCellValue(worksheet, row1, dayColStart));
    const checkOut = parseTimeValue(
      getCellValue(worksheet, row1, dayColStart + 1),
    );
    const workingUnits = parseNumberValue(
      getCellValue(worksheet, row2, dayColStart),
    );
    const overtimeUnits = parseNumberValue(
      getCellValue(worksheet, row2, dayColStart + 1),
    );

    dailyRecords.push({ day, checkIn, checkOut, workingUnits, overtimeUnits });
  }

  const summary: AttendanceSummary = {
    totalHours: parseNumberValue(
      getCellValue(worksheet, row1, headerInfo.summaryColumns.totalHours),
    ),
    totalDays: parseNumberValue(
      getCellValue(worksheet, row1, headerInfo.summaryColumns.totalDays),
    ),
    totalMealOtHours: parseNumberValue(
      getCellValue(worksheet, row1, headerInfo.summaryColumns.totalMealOtHours),
    ),
    totalOtHours: parseNumberValue(
      getCellValue(worksheet, row1, headerInfo.summaryColumns.totalOtHours),
    ),
    sickDays: parseNumberValue(
      getCellValue(worksheet, row1, headerInfo.summaryColumns.sickDays),
    ),
  };

  return {
    record: {
      employeeId,
      periodYear: parsedMonth.year,
      periodMonth: parsedMonth.month,
      dailyRecords,
      summary,
    },
    error: null,
  };
}

export function parseAttendanceExcel(buffer: Buffer): AttendanceParseResult {
  try {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const headerInfo = detectHeaderInfo(worksheet);
    if (!headerInfo) {
      return {
        success: false,
        totalRecords: 0,
        records: [],
        errors: [
          {
            row: 1,
            employeeId: "",
            message: "Không thể detect header columns",
          },
        ],
      };
    }

    const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
    const records: ParsedAttendanceRecord[] = [];
    const errors: AttendanceImportError[] = [];

    let row = 1;
    while (row <= range.e.r) {
      const firstCellValue = getMergedCellValue(
        worksheet,
        row,
        headerInfo.employeeIdCol,
      );

      if (!firstCellValue || firstCellValue.trim() === "") {
        row++;
        continue;
      }

      const { record, error } = parseEmployeePairRows(
        worksheet,
        row,
        row + 1,
        headerInfo,
      );

      if (error) {
        errors.push(error);
      } else if (record) {
        records.push(record);
      }

      row += 2;
    }

    return {
      success: errors.length === 0,
      totalRecords: records.length,
      records,
      errors,
    };
  } catch (error) {
    return {
      success: false,
      totalRecords: 0,
      records: [],
      errors: [
        {
          row: 0,
          employeeId: "",
          message: `Lỗi parse file: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
    };
  }
}
