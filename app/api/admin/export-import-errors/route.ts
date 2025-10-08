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
  errorType: "validation" | "format" | "duplicate" | "database" | "system";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  suggestion?: string;
  expectedFormat?: string;
  currentValue?: string;
}

interface ErrorExportRequest {
  errors: ImportError[];
  originalData?: Record<string, unknown>[];
  fileName?: string;
  format: "excel" | "csv";
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
    const { errors, fileName = "import_errors", format = "excel" } = body;

    if (!errors || errors.length === 0) {
      return NextResponse.json(
        { error: "No errors to export" },
        { status: 400 },
      );
    }

    // Create error report data
    const errorReportData = errors.map((error, index) => ({
      "Error #": index + 1,
      Row: error.row,
      Column: error.column || "N/A",
      Field: error.field || "N/A",
      "Current Value": error.currentValue || "N/A",
      "Error Type": error.errorType,
      Severity: error.severity,
      "Error Message": error.message,
      "Expected Format": error.expectedFormat || "N/A",
      Suggestion: error.suggestion || "N/A",
      Status: "Needs Fix",
    }));

    // Create summary data
    const summaryData = [
      { Metric: "Total Errors", Count: errors.length },
      {
        Metric: "Validation Errors",
        Count: errors.filter((e) => e.errorType === "validation").length,
      },
      {
        Metric: "Format Errors",
        Count: errors.filter((e) => e.errorType === "format").length,
      },
      {
        Metric: "Duplicate Errors",
        Count: errors.filter((e) => e.errorType === "duplicate").length,
      },
      {
        Metric: "Database Errors",
        Count: errors.filter((e) => e.errorType === "database").length,
      },
      {
        Metric: "System Errors",
        Count: errors.filter((e) => e.errorType === "system").length,
      },
      {
        Metric: "High Severity",
        Count: errors.filter(
          (e) => e.severity === "high" || e.severity === "critical",
        ).length,
      },
      {
        Metric: "Medium Severity",
        Count: errors.filter((e) => e.severity === "medium").length,
      },
      {
        Metric: "Low Severity",
        Count: errors.filter((e) => e.severity === "low").length,
      },
    ];

    // Create fix template data
    const fixTemplateData = errors.map((error, index) => ({
      "Error #": index + 1,
      Row: error.row,
      Field: error.field || "N/A",
      "Current Value": error.currentValue || "",
      "Corrected Value": "", // Empty for user to fill
      Notes: error.suggestion || "",
      Status: "Pending",
    }));

    if (format === "excel") {
      // Create Excel workbook with multiple sheets
      const workbook = XLSX.utils.book_new();

      // Error Details sheet
      const errorSheet = XLSX.utils.json_to_sheet(errorReportData);
      XLSX.utils.book_append_sheet(workbook, errorSheet, "Error Details");

      // Summary sheet
      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

      // Fix Template sheet
      const fixSheet = XLSX.utils.json_to_sheet(fixTemplateData);
      XLSX.utils.book_append_sheet(workbook, fixSheet, "Fix Template");

      // Instructions sheet
      const instructions = [
        {
          Step: 1,
          Instruction:
            "Review the 'Error Details' sheet to understand all errors",
        },
        {
          Step: 2,
          Instruction: "Check the 'Summary' sheet for error statistics",
        },
        {
          Step: 3,
          Instruction: "Use the 'Fix Template' sheet to plan corrections",
        },
        {
          Step: 4,
          Instruction: "Fill in 'Corrected Value' column with proper values",
        },
        { Step: 5, Instruction: "Update 'Status' to 'Fixed' when completed" },
        { Step: 6, Instruction: "Re-import the corrected data file" },
      ];
      const instructionSheet = XLSX.utils.json_to_sheet(instructions);
      XLSX.utils.book_append_sheet(workbook, instructionSheet, "Instructions");

      // Generate Excel buffer
      const excelBuffer = XLSX.write(workbook, {
        type: "buffer",
        bookType: "xlsx",
      });

      // Return Excel file
      return new NextResponse(excelBuffer, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${fileName}_${new Date().toISOString().split("T")[0]}.xlsx"`,
        },
      });
    } else if (format === "csv") {
      // Create CSV content
      const csvContent = [
        // Header
        "Error #,Row,Column,Field,Current Value,Error Type,Severity,Error Message,Expected Format,Suggestion,Status",
        // Data rows
        ...errorReportData.map(
          (row) =>
            `${row["Error #"]},${row.Row},"${row.Column}","${row.Field}","${row["Current Value"]}","${row["Error Type"]}","${row.Severity}","${row["Error Message"]}","${row["Expected Format"]}","${row.Suggestion}","${row.Status}"`,
        ),
      ].join("\n");

      // Return CSV file
      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
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
        "Current Value": "Example: (empty)",
        "Error Type": "validation",
        Severity: "high",
        "Error Message": "Missing required field 'employee_id'",
        "Expected Format": "Non-empty text or number",
        Suggestion: "Ensure all required fields have valid values",
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
