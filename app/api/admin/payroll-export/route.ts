import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { verifyToken } from "@/lib/auth-middleware";
import XLSX from "xlsx-js-style";
import {
  FIELD_HEADERS,
  VISIBLE_FIELDS,
  CELL_STYLES,
  getColumnWidths,
  formatSignedAtDate,
  applyWorksheetStyles,
  getSignatureColumns,
  getSignatureMergeRanges,
} from "@/lib/excel/payroll-excel-builder";

export async function GET(request: NextRequest) {
  try {
    const auth = verifyToken(request);
    if (!auth) {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 401 },
      );
    }

    // Check role permissions
    if (
      ![
        "admin",
        "giam_doc",
        "ke_toan",
        "nguoi_lap_bieu",
        "truong_phong",
        "to_truong",
      ].includes(auth.user.role)
    ) {
      return NextResponse.json(
        { error: "Không có quyền xuất dữ liệu" },
        { status: 403 },
      );
    }

    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);

    const month = searchParams.get("month");
    const department = searchParams.get("department");
    const payrollType = searchParams.get("payroll_type") || "monthly";
    const isT13 = payrollType === "t13";

    let query = supabase
      .from("payrolls")
      .select(
        `
        *,
        employees!payrolls_employee_id_fkey!inner(
          full_name,
          department
        )
      `,
      )
      .order("employee_id");

    if (isT13) {
      query = query.eq("payroll_type", "t13");
    } else {
      query = query.or("payroll_type.eq.monthly,payroll_type.is.null");
    }

    if (month) {
      query = query.eq("salary_month", month);
    }

    // Apply role-based department filtering
    if (
      ["giam_doc", "ke_toan", "nguoi_lap_bieu", "truong_phong"].includes(
        auth.user.role,
      )
    ) {
      // Management roles can only access allowed departments
      const allowedDepartments = auth.user.allowed_departments || [];
      if (allowedDepartments.length === 0) {
        return NextResponse.json(
          {
            error: "Chưa được phân quyền truy cập department nào",
          },
          { status: 403 },
        );
      }
      query = query.in("employees.department", allowedDepartments);

      // If specific department requested, check permission
      if (department && !allowedDepartments.includes(department)) {
        return NextResponse.json(
          {
            error: "Không có quyền truy cập department này",
          },
          { status: 403 },
        );
      }

      if (department) {
        query = query.eq("employees.department", department);
      }
    } else if (auth.user.role === "to_truong") {
      // Supervisor can only access own department
      query = query.eq("employees.department", auth.user.department);
    } else if (auth.user.role === "admin") {
      // Admin can access all, apply department filter if specified
      if (department) {
        query = query.eq("employees.department", department);
      }
    }

    const queryResult = await query;
    let payrollData = queryResult.data;
    const error = queryResult.error;

    if (error) {
      console.error("Error fetching payroll data:", error);
      console.error("Query details:", {
        month,
        department,
        role: auth.user.role,
        allowed_departments: auth.user.allowed_departments,
        user_department: auth.user.department,
      });
      return NextResponse.json(
        {
          error: "Lỗi khi lấy dữ liệu lương",
          details: error.message,
          debug:
            process.env.NODE_ENV === "development"
              ? {
                  error,
                  queryParams: { month, department },
                }
              : undefined,
        },
        { status: 500 },
      );
    }

    if (!payrollData || payrollData.length === 0) {
      // Try fallback query without join
      let fallbackQuery = supabase
        .from("payrolls")
        .select("*")
        .order("employee_id");

      // Apply same filters
      if (month) {
        fallbackQuery = fallbackQuery.eq("salary_month", month);
      }

      // Skip role-based filtering in fallback for now

      const { data: fallbackData, error: fallbackError } = await fallbackQuery;

      if (fallbackError || !fallbackData || fallbackData.length === 0) {
        // Check what months are available
        const { data: availableMonths } = await supabase
          .from("payrolls")
          .select("salary_month")
          .order("salary_month", { ascending: false })
          .limit(10);

        const uniqueMonths = [
          ...new Set(availableMonths?.map((p) => p.salary_month) || []),
        ];

        return NextResponse.json(
          {
            error: "Không có dữ liệu lương để xuất",
            message: month
              ? `Không có dữ liệu lương cho tháng ${month}${department ? ` của department ${department}` : ""}`
              : "Không có dữ liệu lương trong hệ thống",
            availableMonths: uniqueMonths.slice(0, 5),
            suggestion:
              uniqueMonths.length > 0
                ? `Thử xuất dữ liệu cho tháng: ${uniqueMonths.slice(0, 3).join(", ")}`
                : "Vui lòng import dữ liệu lương trước khi xuất Excel",
            debug:
              process.env.NODE_ENV === "development"
                ? {
                    fallbackError,
                    originalError: error,
                    queryParams: { month, department },
                    availableMonths: uniqueMonths,
                  }
                : undefined,
          },
          { status: 404 },
        );
      }

      // Get employee data separately
      const { data: employeesData } = await supabase
        .from("employees")
        .select("employee_id, full_name, department");

      // Merge data manually
      const mergedData = fallbackData.map((payroll) => {
        const employee = employeesData?.find(
          (emp) => emp.employee_id === payroll.employee_id,
        );
        return {
          ...payroll,
          employees: employee
            ? {
                full_name: employee.full_name,
                department: employee.department,
              }
            : null,
        };
      });

      // Apply department filtering for role-based access
      let filteredData = mergedData;
      if (
        ["giam_doc", "ke_toan", "nguoi_lap_bieu", "truong_phong"].includes(
          auth.user.role,
        )
      ) {
        const allowedDepartments = auth.user.allowed_departments || [];
        filteredData = mergedData.filter(
          (record) =>
            record.employees &&
            allowedDepartments.includes(record.employees.department),
        );

        if (department) {
          filteredData = filteredData.filter(
            (record) =>
              record.employees && record.employees.department === department,
          );
        }
      } else if (auth.user.role === "to_truong") {
        filteredData = mergedData.filter(
          (record) =>
            record.employees &&
            record.employees.department === auth.user.department,
        );
      } else if (auth.user.role === "admin" && department) {
        filteredData = mergedData.filter(
          (record) =>
            record.employees && record.employees.department === department,
        );
      }

      if (filteredData.length === 0) {
        return NextResponse.json(
          { error: "Không có dữ liệu để xuất" },
          { status: 404 },
        );
      }

      // Use filtered data for export
      payrollData = filteredData;
    }

    // Create workbook
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

    interface SignatureLog {
      employee_id: string;
      salary_month: string;
      signed_by_name: string;
      signed_at: string;
    }

    interface ManagementSignature {
      full_name?: string;
      signature_image_url?: string;
      signed_by_name?: string;
    }

    const signatureLogsMap = new Map<string, SignatureLog>();
    if (month) {
      try {
        const { data: signatureLogs, error: sigLogsError } = await supabase
          .from("signature_logs")
          .select("employee_id, salary_month, signed_by_name, signed_at")
          .eq("salary_month", month);

        if (!sigLogsError && signatureLogs) {
          signatureLogs.forEach((log) => {
            signatureLogsMap.set(log.employee_id, log as SignatureLog);
          });
        }
      } catch (_e) {
        console.error("Failed to load signature logs:", _e);
      }
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
    const managementSignatures: {
      giam_doc: ManagementSignature | null;
      ke_toan: ManagementSignature | null;
      nguoi_lap_bieu: ManagementSignature | null;
    } = {
      giam_doc: null,
      ke_toan: null,
      nguoi_lap_bieu: null,
    };

    if (month) {
      try {
        const { data: signatures, error: sigError } = await supabase
          .from("management_signatures")
          .select("*")
          .eq("salary_month", month)
          .eq("is_active", true);

        if (!sigError && signatures) {
          signatures.forEach((sig) => {
            managementSignatures[
              sig.signature_type as keyof typeof managementSignatures
            ] = sig;
          });
        }
      } catch (_e) {
        console.error("Failed to load management signatures:", _e);
      }
    }

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
    worksheet["!rows"] = rowHeights;

    applyWorksheetStyles(worksheet, headers, headerRowIndex, allRows.length);

    // Apply styling to signature section
    const signatureHeaderRowIndex = signatureStartRow;
    const signatureDataRowIndex = signatureStartRow + 5;

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

    worksheet["!merges"] = getSignatureMergeRanges(signatureHeaderRowIndex, signatureDataRowIndex, totalColumns);

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
    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    // Create meaningful filename (safe for download)
    const timestamp = new Date().toISOString().slice(0, 10);

    const safeDepartmentName = departmentName
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, 20);

    const typePrefix = isT13 ? "Luong13" : "Luong";
    const filename = `${typePrefix}_${safeDepartmentName}_${monthName}_${timestamp}.xlsx`;

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": excelBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Payroll export error:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace",
    );
    return NextResponse.json(
      {
        error: "Có lỗi xảy ra khi xuất dữ liệu lương",
        details: error instanceof Error ? error.message : "Unknown error",
        debug: process.env.NODE_ENV === "development" ? error : undefined,
      },
      { status: 500 },
    );
  }
}
