import {
  findColumnIndex,
  parseAmount,
  parseDetailValue,
  parseBonusRows,
} from "@/lib/bonus/bonus-import-parser";

const EIGHT_MONTH_HEADERS = [
  "Mã NV",
  "Tháng 01",
  "Tháng 02",
  "Tháng 03",
  "Tháng 04",
  "Tháng 05",
  "Tháng 06",
  "Trung Bình",
  "Số Tiền",
];

describe("parseBonusRows", () => {
  it("keeps every non-key column as ordered detail_data", () => {
    const employeeIdColumnIndex = findColumnIndex(EIGHT_MONTH_HEADERS, "Mã NV");
    const amountColumnIndex = findColumnIndex(EIGHT_MONTH_HEADERS, "Số Tiền");
    const row = [
      "NV001",
      8500000,
      8600000,
      8700000,
      8800000,
      8900000,
      9000000,
      8750000,
      5000000,
    ];

    const [parsed] = parseBonusRows(
      EIGHT_MONTH_HEADERS,
      [row],
      employeeIdColumnIndex,
      amountColumnIndex,
    );

    expect(parsed.employee_id).toBe("NV001");
    expect(parsed.amount).toBe(5000000);
    expect(parsed.detail_data).toHaveLength(7);
    expect(parsed.detail_data.map((item) => item.label)).toEqual([
      "Tháng 01",
      "Tháng 02",
      "Tháng 03",
      "Tháng 04",
      "Tháng 05",
      "Tháng 06",
      "Trung Bình",
    ]);
    expect(parsed.detail_data[0]).toEqual({
      label: "Tháng 01",
      value: 8500000,
    });
    expect(parsed.detail_data[6]).toEqual({
      label: "Trung Bình",
      value: 8750000,
    });
  });

  it("returns empty detail_data when only employee and amount columns exist", () => {
    const headers = ["Mã NV", "Số Tiền"];
    const [parsed] = parseBonusRows(headers, [["NV002", 3000000]], 0, 1);

    expect(parsed.employee_id).toBe("NV002");
    expect(parsed.amount).toBe(3000000);
    expect(parsed.detail_data).toEqual([]);
  });

  it("skips empty detail cells and preserves text notes as strings", () => {
    const headers = ["Mã NV", "Tháng 01", "Ghi Chú", "Số Tiền"];
    const [parsed] = parseBonusRows(
      headers,
      [["NV003", "", "Nghỉ phép", 1000000]],
      0,
      3,
    );

    expect(parsed.detail_data).toEqual([
      { label: "Ghi Chú", value: "Nghỉ phép" },
    ]);
  });

  it("treats the first occurrence of a duplicate header as the key column", () => {
    const headers = ["Mã NV", "Số Tiền", "Số Tiền"];
    const employeeIdColumnIndex = findColumnIndex(headers, "Mã NV");
    const amountColumnIndex = findColumnIndex(headers, "Số Tiền");

    expect(amountColumnIndex).toBe(1);

    const [parsed] = parseBonusRows(
      headers,
      [["NV004", 5000, 999]],
      employeeIdColumnIndex,
      amountColumnIndex,
    );

    expect(parsed.amount).toBe(5000);
    expect(parsed.detail_data).toEqual([{ label: "Số Tiền", value: 999 }]);
  });
});

describe("parseAmount", () => {
  it("returns null for non-numeric text", () => {
    expect(parseAmount("abc")).toBeNull();
  });

  it("parses plain numbers and decimal-dot strings", () => {
    expect(parseAmount(5000000)).toBe(5000000);
    expect(parseAmount("5000000")).toBe(5000000);
    expect(parseAmount("8500000.5")).toBe(8500000.5);
  });

  it("strips thousands separators like the salary import", () => {
    expect(parseAmount("8,500,000")).toBe(8500000);
    expect(parseAmount("1 000 000")).toBe(1000000);
    expect(parseAmount("5.000.000 ₫")).toBeNull();
  });

  it("returns null for empty cells", () => {
    expect(parseAmount("")).toBeNull();
    expect(parseAmount(null)).toBeNull();
    expect(parseAmount(undefined)).toBeNull();
  });
});

describe("parseDetailValue", () => {
  it("keeps numeric values as numbers", () => {
    expect(parseDetailValue(8500000)).toBe(8500000);
    expect(parseDetailValue("8500000")).toBe(8500000);
  });

  it("keeps non-numeric text as a string", () => {
    expect(parseDetailValue("Ghi chú")).toBe("Ghi chú");
  });
});
