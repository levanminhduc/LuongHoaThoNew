import XLSX from "xlsx-js-style";
import { buildLegacyPayrollWorkbook } from "../__fixtures__/legacy-payroll-workbook";
import { buildPayrollExportSheet } from "../payroll-export-sheet";
import type {
  PayrollExportContext,
  PayrollExportRecord,
  PayrollSignatureLog,
} from "../payroll-export-sheet";
import { VISIBLE_FIELDS } from "../payroll-excel-builder";

function record(
  employeeId: string,
  fullName: string,
  seed: number,
): PayrollExportRecord {
  const row: PayrollExportRecord = {
    employee_id: employeeId,
    is_signed: seed % 2 === 0,
    employees: { full_name: fullName },
  };
  const cells = row as Record<string, unknown>;
  VISIBLE_FIELDS.forEach((field, i) => {
    if (field in row) return;
    cells[field] = i % 4 === 0 ? null : (seed + i) * 1000 + i / 2;
  });
  return row;
}

const payrollData = [
  record("NV001", "nguyễn văn a", 1),
  record("NV002", "TRẦN THỊ B", 2),
  record("NV003", "Lê Văn C", 3),
];

const signatureLogsMap = new Map<string, PayrollSignatureLog>([
  [
    "NV001",
    {
      employee_id: "NV001",
      salary_month: "2026-08",
      signed_by_name: "NGUYỄN VĂN A",
      signed_at: "2026-09-01 08:15:00",
    },
  ],
]);

function contextFor(
  overrides: Partial<PayrollExportContext> = {},
): PayrollExportContext {
  return {
    payrollData,
    signatureLogsMap,
    managementSignatures: {
      giam_doc: { signed_by_name: "GIÁM ĐỐC X", signed_at: "2026-09-02 09:00" },
      ke_toan: null,
      nguoi_lap_bieu: {
        signed_by_name: "NGƯỜI LẬP BIỂU Y",
        signed_at: "2026-09-02 10:00",
      },
    },
    month: "2026-08",
    department: "Tổ May 1",
    isT13: false,
    ...overrides,
  };
}

function serializeSheet(sheet: XLSX.WorkSheet) {
  const cells: Record<string, unknown> = {};
  for (const [ref, cell] of Object.entries(sheet)) {
    if (ref.startsWith("!")) continue;
    const c = cell as XLSX.CellObject & { s?: unknown };
    cells[ref] = { v: c.v, t: c.t, s: c.s, z: c.z };
  }
  return {
    cells,
    ref: sheet["!ref"],
    merges: JSON.stringify(sheet["!merges"] ?? []),
    cols: JSON.stringify(sheet["!cols"] ?? []),
    rows: JSON.stringify(sheet["!rows"] ?? []),
  };
}

function currentWorkbook(context: PayrollExportContext) {
  const { worksheet, sheetName } = buildPayrollExportSheet(context);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return workbook;
}

describe("tách builder không đổi nội dung workbook lương", () => {
  const cases: [string, PayrollExportContext][] = [
    ["lương tháng, có phòng ban", contextFor()],
    ["lương tháng 13", contextFor({ isT13: true })],
    ["không lọc phòng ban", contextFor({ department: null })],
    ["không có tháng", contextFor({ month: null })],
    ["không có bản ghi nào", contextFor({ payrollData: [] })],
    [
      "chưa ai ký duyệt quản lý",
      contextFor({
        managementSignatures: {
          giam_doc: null,
          ke_toan: null,
          nguoi_lap_bieu: null,
        },
      }),
    ],
  ];

  it.each(cases)("%s — sheet giống hệt từng ô", (_label, context) => {
    const current = currentWorkbook(context);
    const legacy = buildLegacyPayrollWorkbook(context);

    expect(current.SheetNames).toEqual(legacy.SheetNames);
    const name = current.SheetNames[0];
    expect(serializeSheet(current.Sheets[name])).toEqual(
      serializeSheet(legacy.Sheets[name]),
    );
  });

  it.each(cases)("%s — buffer XLSX bằng nhau theo byte", (_label, context) => {
    const write = (wb: XLSX.WorkBook) =>
      XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

    expect(
      write(currentWorkbook(context)).equals(
        write(buildLegacyPayrollWorkbook(context)),
      ),
    ).toBe(true);
  });
});
