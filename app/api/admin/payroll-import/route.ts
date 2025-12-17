import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import * as XLSX from "xlsx";
import jwt from "jsonwebtoken";
import { ApiErrorHandler, type ApiError } from "@/lib/api-error-handler";
import { DEFAULT_FIELD_HEADERS } from "@/lib/utils/header-mapping";
import { getVietnamTimestamp } from "@/lib/utils/vietnam-timezone";
import {
  type ImportErrorRecord,
  isEmptyValue,
  validateEmployeeId,
  validateSalaryMonth,
  validateEmployeeExists,
} from "@/lib/import-error-collector";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-this-in-production";

// Type definitions for mapping
interface ColumnAlias {
  alias_name: string;
  database_field: string;
}

interface FieldMapping {
  database_field: string;
  excel_column_name: string;
}

interface MappingConfig {
  configuration_field_mappings?: FieldMapping[];
}

// Verify admin token
function verifyAdminToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { role?: string };
    return decoded.role === "admin" ? decoded : null;
  } catch {
    return null;
  }
}

// Function to load aliases from database and create comprehensive header mapping
async function createHeaderToFieldMapping(
  supabase: ReturnType<typeof createServiceClient>,
): Promise<Record<string, string>> {
  const HEADER_TO_FIELD: Record<string, string> = {};

  // 1. Add DEFAULT_FIELD_HEADERS
  Object.entries(DEFAULT_FIELD_HEADERS).forEach(([field, header]) => {
    HEADER_TO_FIELD[header] = field;
  });

  // 2. Add legacy headers
  const LEGACY_HEADER_MAPPINGS: Record<string, string> = {
    "BHXH BHTN BHYT Total": "bhxh_bhtn_bhyt_total",
    "Tiền Khen Thưởng Chuyên Cần": "thuong_chuyen_can",
  };
  Object.assign(HEADER_TO_FIELD, LEGACY_HEADER_MAPPINGS);

  // 3. Load and add aliases from database
  try {
    const { data: aliases, error } = await supabase
      .from("column_aliases")
      .select("database_field, alias_name")
      .eq("is_active", true);

    if (!error && aliases) {
      (aliases as ColumnAlias[]).forEach((alias) => {
        HEADER_TO_FIELD[alias.alias_name] = alias.database_field;
      });
      console.log(`✅ Loaded ${aliases.length} column aliases`);
    }
  } catch (error) {
    console.warn("⚠️ Could not load aliases, using defaults only:", error);
  }

  // 4. Load and add mapping configurations
  try {
    const { data: configs, error } = await supabase
      .from("mapping_configurations")
      .select(
        `
        configuration_field_mappings (
          database_field,
          excel_column_name
        )
      `,
      )
      .eq("is_active", true);

    if (!error && configs) {
      (configs as MappingConfig[]).forEach((config) => {
        config.configuration_field_mappings?.forEach((mapping) => {
          HEADER_TO_FIELD[mapping.excel_column_name] = mapping.database_field;
        });
      });
      console.log(`✅ Loaded mapping configurations`);
    }
  } catch (error) {
    console.warn("⚠️ Could not load mapping configurations:", error);
  }

  return HEADER_TO_FIELD;
}

interface ImportResult {
  success: boolean;
  totalRecords: number;
  successCount: number;
  errorCount: number;
  overwriteCount: number;
  skippedCount: number;
  errors: ImportErrorRecord[];
  processingTime: string;
  originalHeaders: string[];
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const batchId = `IMPORT_${Date.now()}`;

  try {
    // Verify admin authentication
    const admin = verifyAdminToken(request);
    if (!admin) {
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

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      const error = ApiErrorHandler.createError(
        ApiErrorHandler.ErrorCodes.VALIDATION_ERROR,
        "Không có file nào được upload",
      );
      return NextResponse.json(ApiErrorHandler.createErrorResponse(error), {
        status: 400,
      });
    }

    // Validate file type
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
    ];

    if (!allowedTypes.includes(file.type)) {
      const error = ApiErrorHandler.createError(
        ApiErrorHandler.ErrorCodes.INVALID_FILE_FORMAT,
        "File không đúng định dạng. Chỉ chấp nhận file .xlsx hoặc .xls",
      );
      return NextResponse.json(ApiErrorHandler.createErrorResponse(error), {
        status: 400,
      });
    }

    // Parse Excel file
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
    }) as unknown[][];

    if (jsonData.length < 2) {
      const error = ApiErrorHandler.createError(
        ApiErrorHandler.ErrorCodes.EMPTY_FILE,
        "File không có dữ liệu hoặc thiếu header",
      );
      return NextResponse.json(ApiErrorHandler.createErrorResponse(error), {
        status: 400,
      });
    }

    const headers = jsonData[0] as string[];
    const rows = jsonData.slice(1);

    // ✅ Initialize Supabase client first
    const supabase = createServiceClient();

    // ✅ Create comprehensive header mapping with aliases and configurations
    const HEADER_TO_FIELD = await createHeaderToFieldMapping(supabase);

    // Map headers to database fields
    const fieldMapping: Record<number, string> = {};
    const unmappedHeaders: string[] = [];

    headers.forEach((header, index) => {
      const trimmedHeader = header.trim();
      const field = HEADER_TO_FIELD[trimmedHeader];
      if (field) {
        fieldMapping[index] = field;
      } else {
        unmappedHeaders.push(trimmedHeader);
      }
    });

    // Debug logging for headers
    console.log("📋 Excel Headers Found:", headers);
    console.log("✅ Mapped Fields:", Object.values(fieldMapping));
    console.log("❌ Unmapped Headers:", unmappedHeaders);
    console.log(
      "🔍 Available Mappings:",
      Object.keys(HEADER_TO_FIELD).slice(0, 10),
      "... (total:",
      Object.keys(HEADER_TO_FIELD).length,
      ")",
    );

    // Validate required fields
    const requiredFields = ["employee_id", "salary_month"];
    const missingFields = requiredFields.filter(
      (field) => !Object.values(fieldMapping).includes(field),
    );

    if (missingFields.length > 0) {
      const error = ApiErrorHandler.createError(
        ApiErrorHandler.ErrorCodes.VALIDATION_ERROR,
        `Thiếu các cột bắt buộc: ${missingFields.join(", ")}.
        Headers tìm thấy: [${headers.join(", ")}].
        Headers không map được: [${unmappedHeaders.join(", ")}].
        Vui lòng kiểm tra tên cột trong file Excel có khớp với template không.`,
      );
      return NextResponse.json(ApiErrorHandler.createErrorResponse(error), {
        status: 400,
      });
    }
    const errors: ImportErrorRecord[] = [];
    let successCount = 0;
    let overwriteCount = 0;
    let skippedCount = 0;

    const { data: employees, error: employeesError } = await supabase
      .from("employees")
      .select("employee_id");

    if (employeesError) {
      console.error("❌ Database error loading employees:", employeesError);
      const error = ApiErrorHandler.createDatabaseError(
        "lấy danh sách nhân viên",
        employeesError.message,
      );
      return NextResponse.json(ApiErrorHandler.createErrorResponse(error), {
        status: 500,
      });
    }

    const validEmployeeIds = new Set(
      employees?.map((emp) => emp.employee_id) || [],
    );

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2;

      const originalData: Record<string, unknown> = {};
      headers.forEach((header, idx) => {
        originalData[header] = row[idx] ?? "";
      });

      const employeeIdColIndex = Object.entries(fieldMapping).find(
        ([, field]) => field === "employee_id",
      )?.[0];
      const salaryMonthColIndex = Object.entries(fieldMapping).find(
        ([, field]) => field === "salary_month",
      )?.[0];

      const rawEmployeeId = employeeIdColIndex
        ? row[parseInt(employeeIdColIndex)]
        : undefined;
      const rawSalaryMonth = salaryMonthColIndex
        ? row[parseInt(salaryMonthColIndex)]
        : undefined;

      const employeeIdError = validateEmployeeId(
        rawEmployeeId,
        rowNumber,
        originalData,
      );
      if (employeeIdError) {
        errors.push(employeeIdError);
        skippedCount++;
        continue;
      }

      const employeeId = String(rawEmployeeId).trim();

      const salaryMonthError = validateSalaryMonth(
        rawSalaryMonth,
        rowNumber,
        employeeId,
        originalData,
      );
      if (salaryMonthError) {
        errors.push(salaryMonthError);
        skippedCount++;
        continue;
      }

      const salaryMonth = String(rawSalaryMonth).trim();

      const employeeExistsError = validateEmployeeExists(
        employeeId,
        validEmployeeIds,
        rowNumber,
        salaryMonth,
        originalData,
      );
      if (employeeExistsError) {
        errors.push(employeeExistsError);
        skippedCount++;
        continue;
      }

      try {
        const isT13Month = /^\d{4}-(13|T13)$/i.test(salaryMonth);
        const payrollType = isT13Month ? "t13" : "monthly";

        const recordData: Record<string, unknown> = {
          employee_id: employeeId,
          salary_month: salaryMonth,
          payroll_type: payrollType,
          source_file: file.name,
          import_batch_id: batchId,
          import_status: "imported",
        };

        Object.entries(fieldMapping).forEach(([colIndex, field]) => {
          if (field === "employee_id" || field === "salary_month") return;
          const value = row[parseInt(colIndex)];
          if (!isEmptyValue(value)) {
            const numValue = Number(String(value).trim());
            recordData[field] = isNaN(numValue) ? 0 : numValue;
          } else {
            recordData[field] = 0;
          }
        });

        const { data: existingRecord, error: checkError } = await supabase
          .from("payrolls")
          .select("id")
          .eq("employee_id", recordData.employee_id as string)
          .eq("salary_month", recordData.salary_month as string)
          .single();

        if (checkError && checkError.code !== "PGRST116") {
          errors.push({
            row: rowNumber,
            employee_id: employeeId,
            salary_month: salaryMonth,
            error: `Lỗi kiểm tra duplicate: ${checkError.message}`,
            errorType: "database",
            originalData,
          });
          continue;
        }

        if (existingRecord) {
          const updateData = {
            ...recordData,
            updated_at: getVietnamTimestamp(),
          };
          const { error: updateError } = await supabase
            .from("payrolls")
            .update(updateData)
            .eq("employee_id", employeeId)
            .eq("salary_month", salaryMonth);

          if (updateError) {
            errors.push({
              row: rowNumber,
              employee_id: employeeId,
              salary_month: salaryMonth,
              error: `Lỗi cập nhật: ${updateError.message}`,
              errorType: "database",
              originalData,
            });
          } else {
            overwriteCount++;
            successCount++;
          }
        } else {
          const insertData = {
            ...recordData,
            created_at: getVietnamTimestamp(),
            updated_at: getVietnamTimestamp(),
          };
          const { error: insertError } = await supabase
            .from("payrolls")
            .insert(insertData);

          if (insertError) {
            errors.push({
              row: rowNumber,
              employee_id: employeeId,
              salary_month: salaryMonth,
              error: `Lỗi thêm mới: ${insertError.message}`,
              errorType: "database",
              originalData,
            });
          } else {
            successCount++;
          }
        }
      } catch (err) {
        errors.push({
          row: rowNumber,
          error: err instanceof Error ? err.message : "Lỗi không xác định",
          errorType: "format",
          originalData,
        });
      }
    }

    const processingTime = `${((Date.now() - startTime) / 1000).toFixed(2)}s`;

    const result: ImportResult = {
      success: errors.length === 0,
      totalRecords: rows.length,
      successCount,
      errorCount: errors.length,
      overwriteCount,
      skippedCount,
      errors: errors.slice(0, 100),
      processingTime,
      originalHeaders: headers,
    };

    const message = `Import hoàn tất: ${successCount} thành công, ${errors.length} lỗi${skippedCount > 0 ? `, ${skippedCount} bỏ qua` : ""}${overwriteCount > 0 ? `, ${overwriteCount} ghi đè` : ""}`;

    if (errors.length > 0) {
      const standardizedErrors: ApiError[] = errors
        .slice(0, 20)
        .map((err) =>
          ApiErrorHandler.createError(
            err.errorType === "validation"
              ? ApiErrorHandler.ErrorCodes.VALIDATION_ERROR
              : err.errorType === "employee_not_found"
                ? ApiErrorHandler.ErrorCodes.EMPLOYEE_NOT_FOUND
                : err.errorType === "duplicate"
                  ? ApiErrorHandler.ErrorCodes.DUPLICATE_RECORD
                  : ApiErrorHandler.ErrorCodes.DATABASE_ERROR,
            err.error,
            `Row ${err.row}`,
            err.field,
            err.row,
            err.employee_id,
            err.salary_month,
          ),
        );

      return NextResponse.json({
        success: successCount > 0,
        data: result,
        errors: standardizedErrors,
        importErrors: errors,
        message,
        metadata: {
          totalRecords: rows.length,
          successCount,
          errorCount: errors.length,
          skippedCount,
          processingTime,
          autoFixCount: 0,
        },
        originalHeaders: headers,
        importBatchId: batchId,
      });
    }

    return NextResponse.json({
      success: true,
      data: result,
      message,
      metadata: {
        totalRecords: rows.length,
        successCount,
        errorCount: 0,
        skippedCount: 0,
        processingTime,
        autoFixCount: 0,
      },
      originalHeaders: headers,
      importBatchId: batchId,
    });
  } catch (error) {
    console.error("Payroll import error:", error);
    const apiError = ApiErrorHandler.fromError(
      error,
      ApiErrorHandler.ErrorCodes.INTERNAL_ERROR,
    );
    return NextResponse.json(ApiErrorHandler.createErrorResponse(apiError), {
      status: 500,
    });
  }
}
