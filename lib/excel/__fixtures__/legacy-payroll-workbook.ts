import XLSX from "xlsx-js-style";
import {
  FIELD_HEADERS,
  VISIBLE_FIELDS,
  CELL_STYLES,
  getColumnWidths,
  formatSignedAtDate,
  formatSignedAtDateTime,
  applyWorksheetStyles,
  getSignatureColumns,
  getSignatureMergeRanges,
} from "@/lib/excel/payroll-excel-builder";
import type { PayrollExportContext } from "@/lib/excel/payroll-export-sheet";

export function buildLegacyPayrollWorkbook(
  context: PayrollExportContext,
): XLSX.WorkBook {
  const {
    payrollData,
    signatureLogsMap,
    managementSignatures,
    month,
    department,
    isT13,
  } = context;

  const workbook = XLSX.utils.book_new();

  const visibleFields = VISIBLE_FIELDS;

  // Prepare headers (visible fields + Ký Tên + Ngày Ký columns)
  const headers = [
    "STT",
    ...visibleFields.map((field) => FIELD_HEADERS[field] || field),
    "Ký Tên",
    "Ngày Ký",
  ];

  interface PayrollRecord {
    [key: string]: unknown;
    employee_id?: string;
    is_signed?: boolean;
    employees?: {
      full_name?: string;
    } | null;
  }

  const dataRows = payrollData.map((record: PayrollRecord, index: number) => {
    const row: unknown[] = [index + 1];

    visibleFields.forEach((field) => {
      if (field === "salary_month") {
        const name = record.employees?.full_name || "";
        row.push(
          name
            .toLowerCase()
            .replace(/(^|\s)\S/g, (c: string) => c.toUpperCase()),
        );
      } else if (field === "employee_id") {
        row.push(record[field] ?? "");
      } else {
        const rawVal = record[field];
        if (rawVal == null || rawVal === "") {
          row.push("");
        } else {
          const num = Number(rawVal);
          row.push(isNaN(num) ? "" : num);
        }
      }
    });

    const employeeId = record.employee_id as string;
    const signatureLog = signatureLogsMap.get(employeeId);

    if (signatureLog || record.is_signed) {
      row.push("Đã ký");
      row.push(signatureLog ? formatSignedAtDate(signatureLog.signed_at) : "");
    } else {
      row.push("");
      row.push("");
    }

    return row;
  });

  // Fetch management signatures for the month

  const formatMonthDisplay = (monthParam: string | null): string => {
    if (!monthParam || !monthParam.match(/^\d{4}-\d{2}$/)) {
      return "Tháng ... năm .....";
    }
    const [yearPart, monthPart] = monthParam.split("-");
    return `Tháng ${monthPart} năm ${yearPart}`;
  };

  // Create title rows (5 rows total)
  const totalColumns = headers.length; // 41 columns
  const titleRows = [];

  // Row 1: Empty
  titleRows.push(new Array(totalColumns).fill(""));

  // Row 2: Empty
  titleRows.push(new Array(totalColumns).fill(""));

  const row3 = new Array(totalColumns).fill("");
  row3[0] = "TỔNG CTY CP DỆT MAY HÒA THỌ";
  row3[15] = isT13
    ? "BẢNG THANH TOÁN LƯƠNG THÁNG 13"
    : "BẢNG THANH TOÁN TIỀN LƯƠNG";
  titleRows.push(row3);

  // Row 4: Company branch in A4, Month/Year in P4 (index 15)
  const row4 = new Array(totalColumns).fill("");
  row4[0] = "CTY MAY HÒA THỌ - ĐIỆN BÀN";
  row4[15] = formatMonthDisplay(month);
  titleRows.push(row4);

  // Row 5: Department info in P5 (index 15)
  const row5 = new Array(totalColumns).fill("");
  row5[15] = "";
  titleRows.push(row5);

  // Create worksheet data with title rows, headers, and data
  const nameColIdx = visibleFields.indexOf("salary_month");
  const totalRow: unknown[] = new Array(headers.length).fill("");
  totalRow[0] = "";
  if (nameColIdx >= 0) {
    totalRow[nameColIdx + 1] = department || "TẤT CẢ";
  }

  const textFields = new Set(["employee_id", "salary_month"]);
  visibleFields.forEach((field, idx) => {
    if (textFields.has(field)) return;
    let sum = 0;
    let hasValue = false;
    dataRows.forEach((row) => {
      const val = row[idx + 1];
      const numVal = typeof val === "number" ? val : parseFloat(String(val));
      if (!isNaN(numVal)) {
        sum += numVal;
        hasValue = true;
      }
    });
    if (hasValue) {
      totalRow[idx + 1] = sum;
    }
  });

  const allRows = [...dataRows, totalRow];

  const worksheetData = [...titleRows, headers, ...allRows];

  // Calculate signature column positions (must match merge start positions)
  const sigCols = getSignatureColumns(totalColumns);

  // Add signature section
  const signatureStartRow = worksheetData.length + 2;

  // Add signature headers
  worksheetData.push([]); // Empty row
  worksheetData.push([]); // Empty row

  // Signature headers row
  const signatureHeaderRow = new Array(totalColumns).fill("");
  signatureHeaderRow[sigCols.left] = "Giám Đốc";
  signatureHeaderRow[sigCols.center] = "Kế Toán";
  signatureHeaderRow[sigCols.right] = "Người Lập Biểu";
  worksheetData.push(signatureHeaderRow);

  // Add 4 empty rows for manual signature space
  worksheetData.push([]);
  worksheetData.push([]);
  worksheetData.push([]);
  worksheetData.push([]);

  // Signature date row
  const signatureDateRow = new Array(totalColumns).fill("");
  signatureDateRow[sigCols.left] = managementSignatures.giam_doc?.signed_at
    ? formatSignedAtDateTime(managementSignatures.giam_doc.signed_at)
    : "";
  signatureDateRow[sigCols.center] = managementSignatures.ke_toan?.signed_at
    ? formatSignedAtDateTime(managementSignatures.ke_toan.signed_at)
    : "";
  signatureDateRow[sigCols.right] = managementSignatures.nguoi_lap_bieu
    ?.signed_at
    ? formatSignedAtDateTime(managementSignatures.nguoi_lap_bieu.signed_at)
    : "";
  worksheetData.push(signatureDateRow);

  // Signature data row
  const signatureDataRow = new Array(totalColumns).fill("");
  signatureDataRow[sigCols.left] = managementSignatures.giam_doc
    ? managementSignatures.giam_doc.signed_by_name
    : "Chưa ký";
  signatureDataRow[sigCols.center] = managementSignatures.ke_toan
    ? managementSignatures.ke_toan.signed_by_name
    : "Chưa ký";
  signatureDataRow[sigCols.right] = managementSignatures.nguoi_lap_bieu
    ? managementSignatures.nguoi_lap_bieu.signed_by_name
    : "Chưa ký";
  worksheetData.push(signatureDataRow);

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  const headerRowIndex = 5;
  const nameColIndex = headers.indexOf("Họ Và Tên");
  const maxNameLength = dataRows.reduce((max, row) => {
    const name = String(row[nameColIndex] || "");
    return Math.max(max, name.length);
  }, 10);

  worksheet["!cols"] = getColumnWidths(headers, nameColIndex, maxNameLength);

  const rowHeights = [];
  for (let i = 0; i < headerRowIndex; i++) {
    rowHeights.push({ hpt: 20 });
  }
  rowHeights.push({ hpt: 80 });
  for (let i = 0; i < allRows.length; i++) {
    rowHeights.push({ hpt: 35 });
  }
  for (let i = 0; i < 2; i++) rowHeights.push({ hpt: 20 });
  rowHeights.push({ hpt: 35 });
  for (let i = 0; i < 4; i++) rowHeights.push({ hpt: 20 });
  rowHeights.push({ hpt: 35 });
  rowHeights.push({ hpt: 35 });
  worksheet["!rows"] = rowHeights;
  worksheet["!pageSetup"] = {
    orientation: "landscape",
    fitToWidth: 1,
    fitToHeight: 0,
  };
  worksheet["!sheetPr"] = {
    pageSetUpPr: { fitToPage: true },
  };

  applyWorksheetStyles(worksheet, headers, headerRowIndex, allRows.length);

  // Apply styling to signature section
  const signatureHeaderRowIndex = signatureStartRow;
  const signatureDateRowIndex = signatureStartRow + 5;
  const signatureDataRowIndex = signatureStartRow + 6;

  const signatureHeaderCells = [
    XLSX.utils.encode_cell({ r: signatureHeaderRowIndex, c: sigCols.left }),
    XLSX.utils.encode_cell({ r: signatureHeaderRowIndex, c: sigCols.center }),
    XLSX.utils.encode_cell({ r: signatureHeaderRowIndex, c: sigCols.right }),
  ];

  signatureHeaderCells.forEach((cellRef) => {
    if (!worksheet[cellRef]) worksheet[cellRef] = { t: "s", v: "" };
    worksheet[cellRef].s = CELL_STYLES.signatureHeader;
  });

  const signatureDataCells = [
    XLSX.utils.encode_cell({ r: signatureDataRowIndex, c: sigCols.left }),
    XLSX.utils.encode_cell({ r: signatureDataRowIndex, c: sigCols.center }),
    XLSX.utils.encode_cell({ r: signatureDataRowIndex, c: sigCols.right }),
  ];

  signatureDataCells.forEach((cellRef) => {
    if (!worksheet[cellRef]) worksheet[cellRef] = { t: "s", v: "" };
    worksheet[cellRef].s = CELL_STYLES.signatureData;
  });

  const signatureDateCells = [
    XLSX.utils.encode_cell({ r: signatureDateRowIndex, c: sigCols.left }),
    XLSX.utils.encode_cell({ r: signatureDateRowIndex, c: sigCols.center }),
    XLSX.utils.encode_cell({ r: signatureDateRowIndex, c: sigCols.right }),
  ];

  signatureDateCells.forEach((cellRef) => {
    if (!worksheet[cellRef]) worksheet[cellRef] = { t: "s", v: "" };
    worksheet[cellRef].s = CELL_STYLES.signatureDate;
  });

  worksheet["!merges"] = getSignatureMergeRanges(
    [signatureHeaderRowIndex, signatureDateRowIndex, signatureDataRowIndex],
    totalColumns,
  );

  // Add worksheet to workbook
  const departmentName = department || "TatCa";
  const monthName = month || "TatCa";

  // Create ASCII-safe sheet name (max 31 chars)
  const safeDeptName = departmentName
    .replace(/[^\w\s-]/g, "") // Remove special chars
    .replace(/\s+/g, "_"); // Replace spaces with underscores

  let sheetName = `${safeDeptName}_${monthName}`;
  if (sheetName.length > 31) {
    // Truncate department name if too long
    const maxDeptLength = 31 - monthName.length - 1; // -1 for underscore
    const shortDeptName = safeDeptName.substring(0, maxDeptLength);
    sheetName = `${shortDeptName}_${monthName}`;
  }

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Generate Excel buffer

  return workbook;
}
