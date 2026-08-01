import XLSX from "xlsx-js-style";
import { buildPayrollExportSheet } from "../payroll-export-sheet";
import type {
  PayrollExportContext,
  PayrollExportRecord,
  PayrollSignatureLog,
} from "../payroll-export-sheet";
import { VISIBLE_FIELDS } from "../payroll-excel-builder";

function record(employeeId: string, fullName: string): PayrollExportRecord {
  const row: PayrollExportRecord = {
    employee_id: employeeId,
    is_signed: false,
    employees: { full_name: fullName },
  };
  const cells = row as Record<string, unknown>;
  for (const field of VISIBLE_FIELDS) {
    if (!(field in row)) cells[field] = 1;
  }
  return row;
}

function contextFor(
  rows: PayrollExportRecord[],
  overrides: Partial<PayrollExportContext> = {},
): PayrollExportContext {
  return {
    payrollData: rows,
    signatureLogsMap: new Map<string, PayrollSignatureLog>(),
    managementSignatures: {
      giam_doc: null,
      ke_toan: null,
      nguoi_lap_bieu: null,
    },
    month: "2026-08",
    department: "Tổ May 1",
    isT13: false,
    ...overrides,
  };
}

const rowsOf = (sheet: XLSX.WorkSheet) =>
  XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: true });

describe("buildPayrollExportSheet", () => {
  it("hàng tiêu đề có STT ở đầu, Ký Tên và Ngày Ký ở cuối", () => {
    const { worksheet } = buildPayrollExportSheet(
      contextFor([record("NV001", "Nguyễn Văn A")]),
    );
    const grid = rowsOf(worksheet);
    const headerRow = grid.find((r) => r[0] === "STT");

    expect(headerRow).toBeDefined();
    expect(headerRow!.length).toBe(VISIBLE_FIELDS.length + 3);
    expect(headerRow!.slice(-2)).toEqual(["Ký Tên", "Ngày Ký"]);
  });

  it("số dòng dữ liệu bằng số bản ghi, cộng đúng 1 dòng tổng", () => {
    const rows = [
      record("NV001", "A"),
      record("NV002", "B"),
      record("NV003", "C"),
    ];
    const grid = rowsOf(buildPayrollExportSheet(contextFor(rows)).worksheet);
    const headerIndex = grid.findIndex((r) => r[0] === "STT");
    const numbered = grid
      .slice(headerIndex + 1)
      .filter((r) => typeof r[0] === "number");

    expect(numbered).toHaveLength(3);
    const afterData = grid.slice(headerIndex + 1 + 3);
    expect(afterData.length).toBeGreaterThan(0);
  });

  it("chưa ký thì cột Ký Tên trống", () => {
    const grid = rowsOf(
      buildPayrollExportSheet(contextFor([record("NV001", "A")])).worksheet,
    );
    const dataRow = grid.find((r) => r[0] === 1)!;

    expect(dataRow[dataRow.length - 2]).toBe("");
  });

  it("đã ký thì cột Ký Tên ghi 'Đã ký' và Ngày Ký có ngày", () => {
    const context = contextFor([record("NV001", "A")]);
    context.signatureLogsMap.set("NV001", {
      employee_id: "NV001",
      salary_month: "2026-08",
      signed_by_name: "NGUYỄN VĂN A",
      signed_at: "2026-09-01 08:00:00",
    });

    const grid = rowsOf(buildPayrollExportSheet(context).worksheet);
    const dataRow = grid.find((r) => r[0] === 1)!;

    expect(dataRow[dataRow.length - 2]).toBe("Đã ký");
    expect(String(dataRow[dataRow.length - 1])).toMatch(
      /^\d{2}\/\d{2}\/\d{4}$/,
    );
  });

  it("tên sheet ghép từ phòng ban và tháng, không quá 31 ký tự", () => {
    const short = buildPayrollExportSheet(
      contextFor([record("NV001", "A")]),
    ).sheetName;
    const long = buildPayrollExportSheet(
      contextFor([record("NV001", "A")], {
        department: "Phòng Ban Có Tên Rất Dài Vượt Quá Giới Hạn Cho Phép",
      }),
    ).sheetName;

    expect(short).toBe("T_May_1_2026-08");
    expect(long.length).toBeLessThanOrEqual(31);
    expect(long.endsWith("2026-08")).toBe(true);
  });

  it("không có bản ghi nào thì vẫn dựng được sheet, không ném", () => {
    expect(() => buildPayrollExportSheet(contextFor([]))).not.toThrow();
  });

  it("workbook ghép được và ghi ra buffer", () => {
    const { worksheet, sheetName } = buildPayrollExportSheet(
      contextFor([record("NV001", "A")]),
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    expect(workbook.SheetNames).toEqual([sheetName]);
    expect(
      XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }),
    ).toBeTruthy();
  });
});
