import XLSX from "xlsx";
import { parseAdvancedExcelFiles } from "@/lib/advanced-excel-parser";
import { AdvancedUploadRequestSchema } from "@/lib/validations/payroll";

/** Điều kiện hợp lệ của bản trước refactor, chép nguyên văn từ advanced-upload/route.ts */
function legacyAccepts(body: { payrollData?: unknown }): boolean {
  const { payrollData } = body;
  return !(!payrollData || !Array.isArray(payrollData));
}

function currentAccepts(body: unknown): boolean {
  return AdvancedUploadRequestSchema.safeParse(body).success;
}

function xlsxBuffer(rows: Record<string, string | number>[]): Buffer {
  const sheet = XLSX.utils.json_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Sheet1");
  return XLSX.write(book, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

const MAPPING = [
  {
    "Mã NV": "employee_id",
    Tháng: "salary_month",
    "Thực nhận": "tien_luong_thuc_nhan_cuoi_ky",
  },
];

describe("zod thay if-check tay ở advanced-upload không chặn dữ liệu parser thật sinh ra", () => {
  const buffer = xlsxBuffer([
    { "Mã NV": "NV001", Tháng: "2026-08", "Thực nhận": 15000000 },
    { "Mã NV": "NV002", Tháng: "2026-08", "Thực nhận": 12500000 },
  ]);

  const parsed = parseAdvancedExcelFiles(
    [{ buffer, filename: "luong_08.xlsx" }],
    MAPPING,
  );

  it("parser đọc được file mẫu và sinh ra bản ghi", () => {
    expect(parsed.data.length).toBeGreaterThan(0);
  });

  it("payload client gửi đi qua được schema mới, y như qua được check cũ", () => {
    const body = {
      payrollData: parsed.data,
      columnMappings: parsed.columnMappings,
      summary: parsed.summary,
    };

    expect(legacyAccepts(body)).toBe(true);
    expect(currentAccepts(body)).toBe(true);
  });

  it("columnMappings và summary là tuỳ chọn, thiếu vẫn qua", () => {
    expect(currentAccepts({ payrollData: parsed.data })).toBe(true);
  });
});

describe("hai chỗ schema mới CHẶT HƠN check cũ", () => {
  it("mảng rỗng: cũ cho qua, mới chặn — nhưng client không bao giờ gửi vì có guard successCount > 0", () => {
    const body = { payrollData: [] };

    expect(legacyAccepts(body)).toBe(true);
    expect(currentAccepts(body)).toBe(false);
  });

  it("phần tử không phải object: cũ cho qua, mới chặn", () => {
    const body = { payrollData: [1, "x", null] };

    expect(legacyAccepts(body)).toBe(true);
    expect(currentAccepts(body)).toBe(false);
  });
});

describe("hai bản chặn giống nhau ở dữ liệu rác", () => {
  it.each([
    ["thiếu payrollData", {}],
    ["payrollData là null", { payrollData: null }],
    ["payrollData là object", { payrollData: { a: 1 } }],
    ["payrollData là chuỗi", { payrollData: "NV001" }],
  ])("%s", (_label, body) => {
    expect(legacyAccepts(body)).toBe(false);
    expect(currentAccepts(body)).toBe(false);
  });
});
