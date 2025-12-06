import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import jwt from "jsonwebtoken";

async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
    jwt.verify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

interface ImportError {
  row: number;
  column?: string;
  field?: string;
  value?: unknown;
  employee_id?: string;
  salary_month?: string;
  errorType:
    | "validation"
    | "format"
    | "duplicate"
    | "database"
    | "system"
    | "employee_not_found";
  severity?: "low" | "medium" | "high" | "critical";
  message?: string;
  error?: string;
  suggestion?: string;
  expectedFormat?: string;
  currentValue?: string;
  originalData?: Record<string, unknown>;
}

interface ErrorExportRequest {
  errors: ImportError[];
  originalData?: Record<string, unknown>[];
  fileName?: string;
  format: "excel" | "csv";
  includeOriginalData?: boolean;
  originalHeaders?: string[];
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const isValid = await verifyAdminToken(token);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const body: ErrorExportRequest = await request.json();
    const {
      errors,
      fileName = "import_errors",
      format = "excel",
      includeOriginalData = true,
      originalHeaders = [],
    } = body;

    if (!errors || errors.length === 0) {
      return NextResponse.json(
        { error: "No errors to export" },
        { status: 400 },
      );
    }

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

      return new NextResponse(excelBuffer, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${fileName}_${new Date().toISOString().split("T")[0]}.xlsx"`,
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

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${fileName}_${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
  } catch (error) {
    console.error("Export errors error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// GET endpoint to download error template
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const isValid = await verifyAdminToken(token);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
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

    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="error_template_${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Export template error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
