/**
 * Test file for date formatting utilities
 * Run with: npm test date-formatter.test.ts
 */

import {
  formatSalaryMonth,
  formatSalaryMonthShort,
  formatDateTime,
  formatSignatureTime,
  formatCurrency,
  formatNumber,
} from "../date-formatter";

describe("Date Formatter Utilities", () => {
  describe("formatSalaryMonth", () => {
    test("should format valid YYYY-MM to Vietnamese format", () => {
      expect(formatSalaryMonth("2024-07")).toBe("Tháng 7 - 2024");
      expect(formatSalaryMonth("2024-01")).toBe("Tháng 1 - 2024");
      expect(formatSalaryMonth("2024-12")).toBe("Tháng 12 - 2024");
    });

    test("should handle invalid formats gracefully", () => {
      expect(formatSalaryMonth("2024-13")).toBe("2024-13"); // Invalid month
      expect(formatSalaryMonth("2024-00")).toBe("2024-00"); // Invalid month
      expect(formatSalaryMonth("invalid")).toBe("invalid");
      expect(formatSalaryMonth("")).toBe("");
      expect(formatSalaryMonth(null as any)).toBe("");
      expect(formatSalaryMonth(undefined as any)).toBe("");
    });
  });

  describe("formatSalaryMonthShort", () => {
    test("should format valid YYYY-MM to MM/YYYY format", () => {
      expect(formatSalaryMonthShort("2024-07")).toBe("07/2024");
      expect(formatSalaryMonthShort("2024-01")).toBe("01/2024");
      expect(formatSalaryMonthShort("2024-12")).toBe("12/2024");
    });

    test("should handle invalid formats gracefully", () => {
      expect(formatSalaryMonthShort("invalid")).toBe("invalid");
      expect(formatSalaryMonthShort("")).toBe("");
    });
  });

  describe("formatDateTime", () => {
    test("should format valid date strings in HH:MM DD/MM/YYYY format", () => {
      const result = formatDateTime("2024-07-15T10:30:00Z");
      expect(result).toMatch(/\d{2}:\d{2} \d{2}\/\d{2}\/\d{4}/);
    });

    test("should handle invalid dates gracefully", () => {
      expect(formatDateTime("")).toBe("");
      expect(formatDateTime("invalid")).toBe("invalid");
    });
  });

  describe("formatSignatureTime", () => {
    test("should format signature time in HH:MM DD/MM/YYYY format", () => {
      const result = formatSignatureTime("2025-07-26T06:52:00Z");
      expect(result).toMatch(/\d{2}:\d{2} \d{2}\/\d{2}\/\d{4}/);
      // Should be "06:52 26/07/2025" format
    });

    test("should handle invalid dates gracefully", () => {
      expect(formatSignatureTime("")).toBe("");
      expect(formatSignatureTime("invalid")).toBe("invalid");
    });
  });

  describe("formatCurrency", () => {
    test("should format numbers as Vietnamese currency", () => {
      expect(formatCurrency(1000000)).toContain("₫");
      expect(formatCurrency(0)).toBe("0 ₫");
    });
  });

  describe("formatNumber", () => {
    test("should format numbers with 2 decimal places", () => {
      expect(formatNumber(123.456)).toBe("123.46");
      expect(formatNumber(100)).toBe("100.00");
    });
  });
});

// Manual test examples for development
console.log("=== MANUAL TEST EXAMPLES ===");
console.log('formatSalaryMonth("2024-07"):', formatSalaryMonth("2024-07"));
console.log('formatSalaryMonth("2024-01"):', formatSalaryMonth("2024-01"));
console.log('formatSalaryMonth("2024-12"):', formatSalaryMonth("2024-12"));
console.log(
  'formatSalaryMonthShort("2024-07"):',
  formatSalaryMonthShort("2024-07"),
);
console.log(
  'formatDateTime("2025-07-26T06:52:00Z"):',
  formatDateTime("2025-07-26T06:52:00Z"),
);
console.log(
  'formatSignatureTime("2025-07-26T06:52:00Z"):',
  formatSignatureTime("2025-07-26T06:52:00Z"),
);
console.log("formatCurrency(1500000):", formatCurrency(1500000));
console.log("formatNumber(123.456):", formatNumber(123.456));
