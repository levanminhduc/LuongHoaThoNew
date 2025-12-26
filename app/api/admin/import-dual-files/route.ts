import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import * as XLSX from "xlsx";
import jwt from "jsonwebtoken";
import {
  ApiErrorHandler,
  type ApiError,
} from "@/lib/api-error-handler";
import { PayrollValidator } from "@/lib/payroll-validation";

interface ColumnMapping {
  excel_column_name: string;
  database_field: string;
  data_type: "text" | "number" | "date";
  is_required: boolean;
  default_value?: string;
}

// Enhanced validation utilities
function cleanCellValue(value: unknown): string | null {
  if (value === undefined || value === null) return null;

  const stringValue = value.toString().trim();
  if (
    stringValue === "" ||
    stringValue.toLowerCase() === "null" ||
    stringValue.toLowerCase() === "undefined"
  ) {
    return null;
  }

  return stringValue;
}

function isValidRequiredField(value: string | null): boolean {
  return value !== null && value !== "" && value.length > 0;
}

interface PayrollRecord {
  employee_id?: string;
  salary_month?: string;
  [key: string]: unknown;
}

// Enhanced error reporting utilities
interface ImportError {
  row: number;
  column?: string;
  field?: string;
  value?: unknown;
  errorType:
    | "validation"
    | "format"
    | "duplicate"
    | "database"
    | "system"
    | "employee_not_found";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  suggestion?: string;
  expectedFormat?: string;
  currentValue?: string;
}

interface AutoFixResult {
  success: boolean;
  fixedValue: string | number | Date | null;
  fixType: string;
  confidence: "high" | "medium" | "low";
  description: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      const error = ApiErrorHandler.createError(
        ApiErrorHandler.ErrorCodes.UNAUTHORIZED,
        ApiErrorHandler.getUserFriendlyMessage(
          ApiErrorHandler.ErrorCodes.UNAUTHORIZED,
        ),
      );
      return NextResponse.json(ApiErrorHandler.createErrorResponse(error), {
        status: 401,
      });
    }

    const token = authHeader.split(" ")[1];
    const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

    try {
      jwt.verify(token, JWT_SECRET);
    } catch {
      const apiError = ApiErrorHandler.createError(
        ApiErrorHandler.ErrorCodes.INVALID_TOKEN,
        ApiErrorHandler.getUserFriendlyMessage(
          ApiErrorHandler.ErrorCodes.INVALID_TOKEN,
        ),
      );
      return NextResponse.json(ApiErrorHandler.createErrorResponse(apiError), {
        status: 401,
      });
    }

    // Parse form data
    const formData = await request.formData();
    const file1 = formData.get("file1") as File | null;
    const file2 = formData.get("file2") as File | null;
    const file1MappingsStr = formData.get("file1Mappings") as string | null;
    const file2MappingsStr = formData.get("file2Mappings") as string | null;

    if (!file1 && !file2) {
      const error = ApiErrorHandler.createError(
        ApiErrorHandler.ErrorCodes.VALIDATION_ERROR,
        "Cần ít nhất một file để xử lý",
        "No files provided in request",
      );
      return NextResponse.json(ApiErrorHandler.createErrorResponse(error), {
        status: 400,
      });
    }

    const supabase = createServiceClient();
    let totalRecords = 0;
    let successCount = 0;
    let errorCount = 0;
    const allDetailedErrors: ImportError[] = [];
    const allAutoFixes: AutoFixResult[] = [];

    // Prepare data for transaction
    let file1Records: PayrollRecord[] = [];
    let file2Records: PayrollRecord[] = [];

    // Process File 1 data preparation
    if (file1 && file1MappingsStr) {
      try {
        const file1Mappings: ColumnMapping[] = JSON.parse(file1MappingsStr);
        const file1Results = await processFileForTransaction(
          file1,
          file1Mappings,
          "file1",
        );

        file1Records = file1Results.records;
        totalRecords += file1Results.totalRecords;
        allDetailedErrors.push(...file1Results.detailedErrors);
        allAutoFixes.push(...file1Results.autoFixes);
      } catch (error) {
        console.error("Error processing file1:", error);
        const apiError = ApiErrorHandler.fromError(
          error,
          ApiErrorHandler.ErrorCodes.PROCESSING_ERROR,
          undefined,
          undefined,
          undefined,
          undefined,
          "file1",
        );
        allDetailedErrors.push({
          row: 0,
          field: "file1",
          value: "SYSTEM",
          errorType: "system",
          severity: "critical" as const,
          message: apiError.message,
          suggestion: "Kiểm tra lại file và thử lại",
        });
        errorCount++;
      }
    }

    // Process File 2 data preparation
    if (file2 && file2MappingsStr) {
      try {
        const file2Mappings: ColumnMapping[] = JSON.parse(file2MappingsStr);
        const file2Results = await processFileForTransaction(
          file2,
          file2Mappings,
          "file2",
        );

        file2Records = file2Results.records;
        totalRecords += file2Results.totalRecords;
        allDetailedErrors.push(...file2Results.detailedErrors);
        allAutoFixes.push(...file2Results.autoFixes);
      } catch (error) {
        console.error("Error processing file2:", error);
        const apiError = ApiErrorHandler.fromError(
          error,
          ApiErrorHandler.ErrorCodes.PROCESSING_ERROR,
          undefined,
          undefined,
          undefined,
          undefined,
          "file2",
        );
        allDetailedErrors.push({
          row: 0,
          field: "file2",
          value: "SYSTEM",
          errorType: "system",
          severity: "critical" as const,
          message: apiError.message,
          suggestion: "Kiểm tra lại file và thử lại",
        });
        errorCount++;
      }
    }

    // Execute transaction if we have data to process
    let transactionResult: Record<string, unknown> | null = null;
    if (file1Records.length > 0 || file2Records.length > 0) {
      try {
        const sessionId = `DUAL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const { data: txResult, error: txError } = await supabase.rpc(
          "import_dual_files_transaction",
          {
            file1_records: file1Records.length > 0 ? file1Records : null,
            file2_records: file2Records.length > 0 ? file2Records : null,
            session_id: sessionId,
          },
        );

        if (txError) {
          throw new Error(`Transaction failed: ${txError.message}`);
        }

        transactionResult = txResult;
        successCount = txResult.success_count || 0;
        errorCount += txResult.error_count || 0;

        // Add transaction errors to detailed errors
        if (txResult.errors && Array.isArray(txResult.errors)) {
          txResult.errors.forEach((error: Record<string, unknown>) => {
            allDetailedErrors.push({
              row: 0,
              field: "transaction",
              value: error.employee_id || "UNKNOWN",
              errorType:
                error.code === "DUPLICATE_RECORD" ? "duplicate" : "database",
              severity: "high" as const,
              message: String(error.error || "Unknown error"),
              suggestion: "Kiểm tra dữ liệu và thử lại",
            });
          });
        }
      } catch (error) {
        console.error("Transaction error:", error);
        const apiError = ApiErrorHandler.fromError(
          error,
          ApiErrorHandler.ErrorCodes.DATABASE_ERROR,
        );
        allDetailedErrors.push({
          row: 0,
          field: "transaction",
          value: "SYSTEM",
          errorType: "database",
          severity: "critical" as const,
          message: apiError.message,
          suggestion: "Liên hệ quản trị viên hệ thống",
        });
        errorCount++;
      }
    }

    // Generate error summary by category
    const errorSummary = {
      validation: allDetailedErrors.filter((e) => e.errorType === "validation")
        .length,
      format: allDetailedErrors.filter((e) => e.errorType === "format").length,
      duplicate: allDetailedErrors.filter((e) => e.errorType === "duplicate")
        .length,
      database: allDetailedErrors.filter((e) => e.errorType === "database")
        .length,
      system: allDetailedErrors.filter((e) => e.errorType === "system").length,
    };

    // Convert detailed errors to standardized format
    const standardizedErrors: ApiError[] = allDetailedErrors
      .slice(0, 20)
      .map((error) =>
        ApiErrorHandler.createError(
          error.errorType === "validation"
            ? ApiErrorHandler.ErrorCodes.VALIDATION_ERROR
            : error.errorType === "duplicate"
              ? ApiErrorHandler.ErrorCodes.DUPLICATE_RECORD
              : error.errorType === "database"
                ? ApiErrorHandler.ErrorCodes.DATABASE_ERROR
                : ApiErrorHandler.ErrorCodes.PROCESSING_ERROR,
          error.message,
          error.suggestion,
          error.field,
          error.row,
          error.value?.toString(),
          undefined,
          undefined,
        ),
      );

    const responseData = {
      totalRecords,
      successCount,
      errorCount,
      autoFixCount: allAutoFixes.length,
      errorSummary,
      autoFixes: allAutoFixes,
      transactionResult,
      file1Inserted: transactionResult?.file1_inserted || 0,
      file2Inserted: transactionResult?.file2_inserted || 0,
      sessionId: transactionResult?.session_id,
      suggestions:
        errorCount > 0
          ? [
              "Kiểm tra báo cáo lỗi chi tiết để xem các vấn đề cụ thể",
              "Xác minh định dạng dữ liệu khớp với mẫu mong đợi",
              "Đảm bảo tất cả trường bắt buộc có giá trị hợp lệ",
              "Loại bỏ hoặc giải quyết các bản ghi trùng lặp",
            ]
          : allAutoFixes.length > 0
            ? [
                "Xem lại các sửa chữa tự động được áp dụng cho dữ liệu của bạn",
                "Xác minh các giá trị được tự động sửa chữa là chính xác",
                "Cân nhắc cập nhật dữ liệu nguồn để tránh sửa chữa tự động trong tương lai",
              ]
            : [],
    };

    const message = `Đã xử lý thành công ${successCount} bản ghi${errorCount > 0 ? ` với ${errorCount} lỗi` : ""}${allAutoFixes.length > 0 ? ` và ${allAutoFixes.length} sửa chữa tự động` : ""}`;

    const response =
      standardizedErrors.length > 0
        ? ApiErrorHandler.createMultiErrorResponse(
            standardizedErrors,
            message,
            {
              totalRecords,
              successCount,
              errorCount,
              processingTime: "2.3s",
              duplicatesFound: errorSummary.duplicate,
              autoFixCount: allAutoFixes.length,
            },
          )
        : ApiErrorHandler.createSuccess(responseData, message, {
            totalRecords,
            successCount,
            errorCount,
            processingTime: "2.3s",
            duplicatesFound: errorSummary.duplicate,
            autoFixCount: allAutoFixes.length,
          });

    return NextResponse.json(response);
  } catch (error) {
    console.error("Import dual files error:", error);
    const apiError = ApiErrorHandler.fromError(
      error,
      ApiErrorHandler.ErrorCodes.INTERNAL_ERROR,
    );
    return NextResponse.json(ApiErrorHandler.createErrorResponse(apiError), {
      status: 500,
    });
  }
}

async function processFileForTransaction(
  file: File,
  mappings: ColumnMapping[],
  fileType: string,
): Promise<{
  records: Record<string, unknown>[];
  totalRecords: number;
  detailedErrors: ImportError[];
  autoFixes: AutoFixResult[];
}> {
  const records: Record<string, unknown>[] = [];
  const detailedErrors: ImportError[] = [];
  const autoFixes: AutoFixResult[] = [];

  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
    }) as unknown[][];

    if (jsonData.length < 2) {
      throw new Error(`File ${file.name} không có dữ liệu hoặc thiếu header`);
    }

    const headers = jsonData[0];
    const rows = jsonData.slice(1);

    // Create mapping lookup
    const mappingLookup = new Map<string, ColumnMapping>();
    mappings.forEach((mapping) => {
      if (mapping.excel_column_name && mapping.database_field) {
        mappingLookup.set(mapping.excel_column_name, mapping);
      }
    });

    // Process each row
    rows.forEach((row, index) => {
      const actualRowNumber = index + 2; // +2 because we skip header and arrays are 0-indexed

      try {
        const mappedData: PayrollRecord = {
          source_file: file.name,
          import_batch_id: `BATCH_${Date.now()}`,
          import_status: "pending",
        };

        let hasRequiredFields = true;
        const missingRequired: string[] = [];

        // Map columns according to configuration
        headers.forEach((header, colIndex) => {
          const mapping = mappingLookup.get(String(header));
          if (mapping && row[colIndex] !== undefined) {
            const cellValue = cleanCellValue(row[colIndex]);

            if (mapping.is_required && !isValidRequiredField(cellValue)) {
              hasRequiredFields = false;
              missingRequired.push(mapping.database_field);
            }

            if (cellValue !== null) {
              mappedData[mapping.database_field] = cellValue;
            }
          }
        });

        // Check for missing required fields
        if (!hasRequiredFields) {
          detailedErrors.push({
            row: actualRowNumber,
            field: missingRequired.join(", "),
            value: mappedData.employee_id || "UNKNOWN",
            errorType: "validation",
            severity: "critical" as const,
            message: `Missing required fields: ${missingRequired.join(", ")}`,
            suggestion: "Đảm bảo tất cả trường bắt buộc có giá trị",
          });
          return; // Skip this record
        }

        // Enhanced validation
        const validationResult = PayrollValidator.validatePayrollRecord(
          mappedData,
          {
            employee_id: mappedData.employee_id || "UNKNOWN",
            salary_month: mappedData.salary_month || "UNKNOWN",
            row: actualRowNumber,
            file_type: fileType as "file1" | "file2",
          },
        );

        // Add validation errors
        detailedErrors.push(
          ...validationResult.errors.map((error) => ({
            row: actualRowNumber,
            field: error.field || "validation",
            value: mappedData.employee_id || "UNKNOWN",
            errorType: "validation" as const,
            severity: "high" as const,
            message: error.message,
            suggestion: "Kiểm tra và sửa giá trị không hợp lệ",
          })),
        );

        // Add validation warnings as detailed errors with warning type
        detailedErrors.push(
          ...validationResult.warnings.map((warning) => ({
            row: actualRowNumber,
            field: warning.field || "validation",
            value: mappedData.employee_id || "UNKNOWN",
            errorType: "validation" as const,
            severity: "medium" as const,
            message: warning.message,
            suggestion: "Xem xét cải thiện chất lượng dữ liệu",
          })),
        );

        // Add auto-fixes
        autoFixes.push(
          ...validationResult.autoFixes.map((fix) => ({
            success: true,
            fixedValue: fix.fixedValue as string | number | Date | null,
            fixType: "validation",
            confidence: fix.confidence,
            description: `${fix.field}: ${fix.reason}`,
          })),
        );

        // Only add record if validation passed (no errors, warnings are OK)
        if (validationResult.isValid) {
          // Add metadata
          mappedData.created_at = new Date().toISOString();
          mappedData.updated_at = new Date().toISOString();

          records.push(mappedData);
        }
      } catch (error) {
        detailedErrors.push({
          row: actualRowNumber,
          field: "processing",
          value: "UNKNOWN",
          errorType: "system",
          severity: "critical" as const,
          message:
            error instanceof Error ? error.message : "Unknown processing error",
          suggestion: "Kiểm tra định dạng dữ liệu và thử lại",
        });
      }
    });
  } catch (error) {
    throw new Error(
      `Failed to process ${fileType}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  return {
    records,
    totalRecords: records.length,
    detailedErrors,
    autoFixes,
  };
}

