import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyToken } from "@/lib/auth-middleware";
import { csrfProtection } from "@/lib/security-middleware";
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

interface BulkExportRequestBody {
  departments: string[];
  salary_month: string;
  payroll_type: "monthly" | "t13";
}

interface PayrollRecord {
  [key: string]: unknown;
  employee_id?: string;
  is_signed?: boolean;
  employees?: { full_name?: string; department?: string } | null;
}

interface SignatureLog {
  employee_id: string;
  signed_by_name: string;
  signed_at: string;
}

interface ManagementSig {
  signed_by_name?: string;
  signed_at?: string;
}

const TITLE_ROW_COUNT = 5;
const HEADER_ROW_INDEX = TITLE_ROW_COUNT; // 0-based within a block
const SIG_GAP_BEFORE = 2; // empty rows before signature section
const SIG_EMPTY_LINES = 4; // signature space rows
const BLOCK_SEPARATOR = 3; // empty rows between departments

function blockRowCount(dataRowCount: number): number {
  // title(5) + header(1) + dataRows + total(1) + sigGap(2) + sigHeader(1) + sigEmpty(4) + sigDate(1) + sigData(1)
  return TITLE_ROW_COUNT + 1 + dataRowCount + 1 + SIG_GAP_BEFORE + 1 + SIG_EMPTY_LINES + 1 + 1;
}

function buildDeptBlock(
  dept: string,
  records: PayrollRecord[],
  headers: string[],
  visibleFields: string[],
  signatureLogsMap: Map<string, SignatureLog>,
  managementSigs: { giam_doc: ManagementSig | null; ke_toan: ManagementSig | null; nguoi_lap_bieu: ManagementSig | null },
  isT13: boolean,
  salaryMonth: string,
): unknown[][] {
  const totalColumns = headers.length;

  const formatMonthDisplay = (m: string): string => {
    if (isT13) {
      const year = m.split("-")[0];
      return `Tháng 13 năm ${year}`;
    }
    if (!m.match(/^\d{4}-\d{2}$/)) return "Tháng ... năm .....";
    const [yearPart, monthPart] = m.split("-");
    return `Tháng ${monthPart} năm ${yearPart}`;
  };

  const rows: unknown[][] = [];

  // Title rows (5 rows)
  rows.push(new Array(totalColumns).fill(""));
  rows.push(new Array(totalColumns).fill(""));

  const row3 = new Array(totalColumns).fill("");
  row3[0] = "TỔNG CTY CP DỆT MAY HÒA THỌ";
  row3[15] = isT13 ? "BẢNG THANH TOÁN LƯƠNG THÁNG 13" : "BẢNG THANH TOÁN TIỀN LƯƠNG";
  rows.push(row3);

  const row4 = new Array(totalColumns).fill("");
  row4[0] = "CTY MAY HÒA THỌ - ĐIỆN BÀN";
  row4[15] = formatMonthDisplay(salaryMonth);
  rows.push(row4);

  const row5 = new Array(totalColumns).fill("");
  row5[15] = "";
  rows.push(row5);

  // Header row
  rows.push(headers);

  // Data rows
  const nameColIdx = visibleFields.indexOf("salary_month");
  const textFields = new Set(["employee_id", "salary_month"]);

  let isEmpty = records.length === 0;
  const dataRows: unknown[][] = [];

  if (isEmpty) {
    const placeholder = new Array(totalColumns).fill("");
    placeholder[0] = 1;
    if (nameColIdx >= 0) placeholder[nameColIdx + 1] = "Không có dữ liệu";
    dataRows.push(placeholder);
    isEmpty = false; // treat as 1 row for layout
  } else {
    records.forEach((record, idx) => {
      const row: unknown[] = [idx + 1];
      visibleFields.forEach((field) => {
        if (field === "salary_month") {
          const name = record.employees?.full_name || "";
          row.push(name.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase()));
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
      const sigLog = signatureLogsMap.get(record.employee_id as string);
      row.push(sigLog || record.is_signed ? "Đã ký" : "");
      row.push(sigLog ? formatSignedAtDate(sigLog.signed_at) : "");
      dataRows.push(row);
    });
  }

  // Total row
  const totalRow: unknown[] = new Array(totalColumns).fill("");
  totalRow[0] = "";
  if (nameColIdx >= 0) totalRow[nameColIdx + 1] = dept;

  visibleFields.forEach((field, idx) => {
    if (textFields.has(field)) return;
    let sum = 0;
    let hasValue = false;
    dataRows.forEach((row) => {
      const val = (row as unknown[])[idx + 1];
      const numVal = typeof val === "number" ? val : parseFloat(String(val));
      if (!isNaN(numVal)) { sum += numVal; hasValue = true; }
    });
    if (hasValue) totalRow[idx + 1] = sum;
  });

  rows.push(...dataRows);
  rows.push(totalRow);

  // Signature section
  rows.push(new Array(totalColumns).fill(""));
  rows.push(new Array(totalColumns).fill(""));

  const sigCols = getSignatureColumns(totalColumns);

  const sigHeaderRow = new Array(totalColumns).fill("");
  sigHeaderRow[sigCols.left] = "Giám Đốc";
  sigHeaderRow[sigCols.center] = "Kế Toán";
  sigHeaderRow[sigCols.right] = "Người Lập Biểu";
  rows.push(sigHeaderRow);

  for (let i = 0; i < SIG_EMPTY_LINES; i++) rows.push(new Array(totalColumns).fill(""));

  const sigDateRow = new Array(totalColumns).fill("");
  sigDateRow[sigCols.left] = managementSigs.giam_doc?.signed_at
    ? formatSignedAtDateTime(managementSigs.giam_doc.signed_at)
    : "";
  sigDateRow[sigCols.center] = managementSigs.ke_toan?.signed_at
    ? formatSignedAtDateTime(managementSigs.ke_toan.signed_at)
    : "";
  sigDateRow[sigCols.right] = managementSigs.nguoi_lap_bieu?.signed_at
    ? formatSignedAtDateTime(managementSigs.nguoi_lap_bieu.signed_at)
    : "";
  rows.push(sigDateRow);

  const sigDataRow = new Array(totalColumns).fill("");
  sigDataRow[sigCols.left] = managementSigs.giam_doc?.signed_by_name ?? "Chưa ký";
  sigDataRow[sigCols.center] = managementSigs.ke_toan?.signed_by_name ?? "Chưa ký";
  sigDataRow[sigCols.right] = managementSigs.nguoi_lap_bieu?.signed_by_name ?? "Chưa ký";
  rows.push(sigDataRow);

  return rows;
}

export async function POST(request: NextRequest) {
  try {
    const csrfResult = csrfProtection(request);
    if (csrfResult) return csrfResult;
    const auth = verifyToken(request);
    if (!auth || auth.user.role !== "admin") {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 401 });
    }

    let body: BulkExportRequestBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Request body không hợp lệ" }, { status: 400 });
    }

    const { departments, salary_month, payroll_type } = body;

    if (!departments || !Array.isArray(departments) || departments.length === 0) {
      return NextResponse.json({ error: "Vui lòng chọn ít nhất một phòng ban" }, { status: 400 });
    }
    if (!salary_month || typeof salary_month !== "string") {
      return NextResponse.json({ error: "Tháng lương không hợp lệ" }, { status: 400 });
    }
    if (!payroll_type || !["monthly", "t13"].includes(payroll_type)) {
      return NextResponse.json({ error: "Loại lương không hợp lệ" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const isT13 = payroll_type === "t13";

    // Single DB query for all payrolls
    let payrollQuery = supabase
      .from("payrolls")
      .select(`*, employees!payrolls_employee_id_fkey!inner(full_name, department)`)
      .eq("salary_month", salary_month)
      .order("employee_id");

    if (isT13) {
      payrollQuery = payrollQuery.eq("payroll_type", "t13");
    } else {
      payrollQuery = payrollQuery.or("payroll_type.eq.monthly,payroll_type.is.null");
    }

    // Fetch payrolls, signature logs, and management signatures in parallel
    const [payrollResult, sigLogsResult, mgmtSigResult] = await Promise.all([
      payrollQuery,
      supabase
        .from("signature_logs")
        .select("employee_id, signed_by_name, signed_at")
        .eq("salary_month", salary_month),
      supabase
        .from("management_signatures")
        .select("*")
        .eq("salary_month", salary_month)
        .eq("is_active", true),
    ]);

    if (payrollResult.error) {
      return NextResponse.json(
        { error: "Lỗi khi lấy dữ liệu lương", details: payrollResult.error.message },
        { status: 500 },
      );
    }

    // Build signature logs map
    const signatureLogsMap = new Map<string, SignatureLog>();
    (sigLogsResult.data ?? []).forEach((log) => {
      signatureLogsMap.set(log.employee_id, log as SignatureLog);
    });

    // Build management signatures object
    const managementSigs: { giam_doc: ManagementSig | null; ke_toan: ManagementSig | null; nguoi_lap_bieu: ManagementSig | null } = {
      giam_doc: null, ke_toan: null, nguoi_lap_bieu: null,
    };
    (mgmtSigResult.data ?? []).forEach((sig) => {
      const key = sig.signature_type as keyof typeof managementSigs;
      if (key in managementSigs) managementSigs[key] = sig as ManagementSig;
    });

    // Group records by department
    const recordsByDept = new Map<string, PayrollRecord[]>();
    const sortedDepts = [...departments].sort((a, b) => a.localeCompare(b, "vi"));
    for (const dept of sortedDepts) recordsByDept.set(dept, []);

    for (const record of (payrollResult.data ?? []) as PayrollRecord[]) {
      const dept = record.employees?.department;
      if (dept && recordsByDept.has(dept)) {
        recordsByDept.get(dept)!.push(record);
      }
    }

    // Sort each dept's records by employee_id
    for (const rows of recordsByDept.values()) {
      rows.sort((a, b) => String(a.employee_id ?? "").localeCompare(String(b.employee_id ?? "")));
    }

    // Build headers (same as single-dept export)
    const visibleFields = VISIBLE_FIELDS;
    const headers = [
      "STT",
      ...visibleFields.map((f) => FIELD_HEADERS[f] || f),
      "Ký Tên",
      "Ngày Ký",
    ];
    const totalColumns = headers.length;
    const bulkSigCols = getSignatureColumns(totalColumns);

    // Compute max name length for column widths
    const maxNameLength = (payrollResult.data ?? []).reduce((max, r) => {
      const name = String((r as PayrollRecord).employees?.full_name ?? "");
      return Math.max(max, name.length);
    }, 10);
    const nameColIndex = headers.indexOf("Họ Và Tên");

    // Assemble full worksheet data by stacking blocks
    const allSheetRows: unknown[][] = [];
    const rowHeights: { hpt: number }[] = [];
    const sigStyleTargets: Array<{ headerRow: number; dateRow: number; dataRow: number }> = [];
    const pageBreaks: number[] = [];

    for (let deptIdx = 0; deptIdx < sortedDepts.length; deptIdx++) {
      const dept = sortedDepts[deptIdx];
      const records = recordsByDept.get(dept) ?? [];
      const blockStartRow = allSheetRows.length;

      if (deptIdx > 0) pageBreaks.push(blockStartRow);

      const block = buildDeptBlock(
        dept, records, headers, visibleFields,
        signatureLogsMap, managementSigs, isT13, salary_month,
      );

      // data rows in this block = records.length (min 1 for placeholder) + total row = records.length+1 but actually
      // records ≥ 1 always (placeholder if 0), total row is 1, so dataRowCount = max(records.length,1)
      const dataRowCount = Math.max(records.length, 1);

      applyWorksheetStyles(
        // We'll apply styles after building the full sheet below
        // Just track positions here
        {} as XLSX.WorkSheet,
        headers,
        HEADER_ROW_INDEX,
        dataRowCount,
        blockStartRow,
      );

      allSheetRows.push(...block);

      // Row heights for this block
      for (let i = 0; i < TITLE_ROW_COUNT; i++) rowHeights.push({ hpt: 20 });
      rowHeights.push({ hpt: 80 }); // header
      for (let i = 0; i < dataRowCount; i++) rowHeights.push({ hpt: 35 }); // data
      rowHeights.push({ hpt: 35 }); // total
      for (let i = 0; i < SIG_GAP_BEFORE; i++) rowHeights.push({ hpt: 20 });
      rowHeights.push({ hpt: 35 });
      for (let i = 0; i < SIG_EMPTY_LINES; i++) rowHeights.push({ hpt: 20 });
      rowHeights.push({ hpt: 35 });
      rowHeights.push({ hpt: 35 });

      const sigHeaderAbsRow = blockStartRow + TITLE_ROW_COUNT + 1 + dataRowCount + 1 + SIG_GAP_BEFORE;
      sigStyleTargets.push({
        headerRow: sigHeaderAbsRow,
        dateRow: sigHeaderAbsRow + SIG_EMPTY_LINES + 1,
        dataRow: sigHeaderAbsRow + SIG_EMPTY_LINES + 2,
      });

      // Separator rows
      if (deptIdx < sortedDepts.length - 1) {
        for (let i = 0; i < BLOCK_SEPARATOR; i++) {
          allSheetRows.push(new Array(totalColumns).fill(""));
          rowHeights.push({ hpt: 15 });
        }
      }
    }

    // Build worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(allSheetRows);
    worksheet["!cols"] = getColumnWidths(headers, nameColIndex, maxNameLength);
    worksheet["!rows"] = rowHeights;
    worksheet["!pageSetup"] = {
      orientation: "landscape",
      fitToWidth: 1,
      fitToHeight: 0,
    };
    worksheet["!sheetPr"] = {
      pageSetUpPr: { fitToPage: true },
    };

    // Apply per-block styles
    let currentRow = 0;
    for (let deptIdx = 0; deptIdx < sortedDepts.length; deptIdx++) {
      const dept = sortedDepts[deptIdx];
      const records = recordsByDept.get(dept) ?? [];
      const dataRowCount = Math.max(records.length, 1);

      applyWorksheetStyles(worksheet, headers, HEADER_ROW_INDEX, dataRowCount + 1, currentRow);

      currentRow += blockRowCount(dataRowCount);
      if (deptIdx < sortedDepts.length - 1) currentRow += BLOCK_SEPARATOR;
    }

    // Apply signature styles
    for (const { headerRow, dateRow, dataRow } of sigStyleTargets) {
      for (const col of [bulkSigCols.left, bulkSigCols.center, bulkSigCols.right]) {
        const hRef = XLSX.utils.encode_cell({ r: headerRow, c: col });
        const dtRef = XLSX.utils.encode_cell({ r: dateRow, c: col });
        const dRef = XLSX.utils.encode_cell({ r: dataRow, c: col });
        if (!worksheet[hRef]) worksheet[hRef] = { t: "s", v: "" };
        if (!worksheet[dtRef]) worksheet[dtRef] = { t: "s", v: "" };
        if (!worksheet[dRef]) worksheet[dRef] = { t: "s", v: "" };
        worksheet[hRef].s = CELL_STYLES.signatureHeader;
        worksheet[dtRef].s = CELL_STYLES.signatureDate;
        worksheet[dRef].s = CELL_STYLES.signatureData;
      }
    }

    // Signature merge ranges
    const allMerges: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }> = [];
    for (const { headerRow, dateRow, dataRow } of sigStyleTargets) {
      allMerges.push(...getSignatureMergeRanges([headerRow, dateRow, dataRow], totalColumns));
    }
    if (allMerges.length > 0) {
      worksheet["!merges"] = allMerges;
    }

    // Page breaks
    if (pageBreaks.length > 0) {
      worksheet["!rowbreaks"] = pageBreaks;
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Bảng Lương");

    const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const safeSalaryMonth = salary_month.replace(/[^0-9-]/g, "");
    const filename = isT13
      ? `Luong13_${safeSalaryMonth.split("-")[0]}_ToanBo.xlsx`
      : `Luong_${safeSalaryMonth}_ToanBo.xlsx`;

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": excelBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Bulk payroll export error:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra khi xuất dữ liệu lương", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
