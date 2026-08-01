import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { csrfProtection } from "@/lib/security-middleware";
import { getVietnamTimestamp } from "@/lib/utils/vietnam-timezone";
import { verifyAdminAccess } from "@/lib/auth-middleware";
import {
  parseSchema,
  createValidationErrorResponse,
  ImportErrorExportRequestSchema,
} from "@/lib/validations";
import { toErrorResponse } from "@/lib/errors/app-error";

export async function POST(request: NextRequest) {
  try {
    const csrfResult = csrfProtection(request);
    if (csrfResult) return csrfResult;
    const auth = verifyAdminAccess(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const parsed = parseSchema(
      ImportErrorExportRequestSchema,
      await request.json(),
    );
    if (!parsed.success) {
      return NextResponse.json(createValidationErrorResponse(parsed.errors), {
        status: 400,
      });
    }
    const { errors, fileName, format, includeOriginalData, originalHeaders } =
      parsed.data;

    const getErrorTypeLabel = (errorType: string): string => {
      const labels: Record<string, string> = {
        validation: "Lỗi dữ liệu",
        duplicate: "Trùng lặp",
        employee_not_found: "Không tìm thấy NV",
        database: "Lỗi database",
        format: "Lỗi định dạng",
        system: "Lỗi hệ thống",
      };
      return labels[errorType] || errorType;
    };

    const errorReportData = errors.map((error, index) => {
      const baseRow: Record<string, unknown> = {
        STT: index + 1,
        "Dòng Excel": error.row,
        "Mã NV": error.employee_id || "N/A",
        Tháng: error.salary_month || "N/A",
        Lỗi: error.message || error.error || "N/A",
        "Loại Lỗi": getErrorTypeLabel(error.errorType),
      };

      if (includeOriginalData && error.originalData) {
        originalHeaders.forEach((header) => {
          if (
            ![
              "STT",
              "Dòng Excel",
              "Mã NV",
              "Tháng",
              "Lỗi",
              "Loại Lỗi",
            ].includes(header)
          ) {
            baseRow[header] = error.originalData?.[header] ?? "";
          }
        });
      }

      return baseRow;
    });

    const summaryData = [
      { "Thống Kê": "Tổng số lỗi", "Số Lượng": errors.length },
      {
        "Thống Kê": "Lỗi dữ liệu",
        "Số Lượng": errors.filter((e) => e.errorType === "validation").length,
      },
      {
        "Thống Kê": "Lỗi định dạng",
        "Số Lượng": errors.filter((e) => e.errorType === "format").length,
      },
      {
        "Thống Kê": "Lỗi trùng lặp",
        "Số Lượng": errors.filter((e) => e.errorType === "duplicate").length,
      },
      {
        "Thống Kê": "Không tìm thấy NV",
        "Số Lượng": errors.filter((e) => e.errorType === "employee_not_found")
          .length,
      },
      {
        "Thống Kê": "Lỗi database",
        "Số Lượng": errors.filter((e) => e.errorType === "database").length,
      },
      {
        "Thống Kê": "Lỗi hệ thống",
        "Số Lượng": errors.filter((e) => e.errorType === "system").length,
      },
    ];

    if (format === "excel") {
      const workbook = XLSX.utils.book_new();

      const errorSheet = XLSX.utils.json_to_sheet(errorReportData);
      XLSX.utils.book_append_sheet(workbook, errorSheet, "Danh Sách Lỗi");

      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Thống Kê");

      const excelBuffer = XLSX.write(workbook, {
        type: "buffer",
        bookType: "xlsx",
      });

      const vietnamDate = getVietnamTimestamp().slice(0, 10);

      return new NextResponse(excelBuffer, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${fileName}_${vietnamDate}.xlsx"`,
        },
      });
    } else if (format === "csv") {
      const headers = Object.keys(errorReportData[0] || {});
      const csvContent = [
        headers.join(","),
        ...errorReportData.map((row) =>
          headers.map((h) => `"${row[h] ?? ""}"`).join(","),
        ),
      ].join("\n");

      const vietnamDateCsv = getVietnamTimestamp().slice(0, 10);

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${fileName}_${vietnamDateCsv}.csv"`,
        },
      });
    }

    return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
  } catch (error) {
    console.error("Export errors error:", error);
    return toErrorResponse(error, {
      fallbackMessage: "Internal server error",
    });
  }
}

// GET endpoint to download error template
export async function GET(request: NextRequest) {
  try {
    const auth = verifyAdminAccess(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // Create empty error template
    const templateData = [
      {
        "Error #": 1,
        Row: "Example: 23",
        Column: "Example: employee_id",
        Field: "Example: employee_id",
        "Current Value": "Example: EMP999",
        "Error Type": "employee_not_found",
        Severity: "high",
        "Error Message": "Employee ID 'EMP999' not found in system",
        "Expected Format": "Valid employee ID from system",
        Suggestion: "Verify employee ID exists in employee database",
        Status: "Needs Fix",
      },
    ];

    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(templateData);
    XLSX.utils.book_append_sheet(workbook, sheet, "Error Template");

    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    const vietnamDate = getVietnamTimestamp().slice(0, 10);

    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="error_template_${vietnamDate}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Export template error:", error);
    return toErrorResponse(error, {
      fallbackMessage: "Internal server error",
    });
  }
}
