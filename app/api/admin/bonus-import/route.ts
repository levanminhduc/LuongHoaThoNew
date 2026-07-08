import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createServiceClient } from "@/utils/supabase/server";
import { csrfProtection } from "@/lib/security-middleware";
import { verifyAdminAccess } from "@/lib/auth-middleware";
import { ApiErrorHandler } from "@/lib/api-error-handler";
import { CACHE_HEADERS } from "@/lib/utils/cache-headers";
import { getVietnamTimestamp } from "@/lib/utils/vietnam-timezone";
import {
  parseSchema,
  createValidationErrorResponse,
} from "@/lib/validations/errors";
import {
  BonusImportMetaSchema,
  MAX_IMPORT_ERRORS_RETURNED,
} from "@/lib/validations/bonus";
import {
  findColumnIndex,
  parseBonusRows,
} from "@/lib/bonus/bonus-import-parser";
import type { BonusImportResult } from "@/lib/bonus/bonus-types";
import {
  type ImportErrorRecord,
  validateEmployeeId,
  validateEmployeeExists,
} from "@/lib/import-error-collector";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const ALLOWED_FILE_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];

function validationErrorResponse(message: string) {
  const error = ApiErrorHandler.createError(
    ApiErrorHandler.ErrorCodes.VALIDATION_ERROR,
    message,
  );
  return NextResponse.json(ApiErrorHandler.createErrorResponse(error), {
    status: 400,
  });
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const batchId = `bonus_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    const csrfResult = csrfProtection(request);
    if (csrfResult) return csrfResult;

    const auth = verifyAdminAccess(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return validationErrorResponse("Thiếu file Excel");
    }
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return validationErrorResponse(
        "File không đúng định dạng. Chỉ chấp nhận file .xlsx hoặc .xls",
      );
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return validationErrorResponse("File quá lớn, tối đa 10MB");
    }

    const metaResult = parseSchema(BonusImportMetaSchema, {
      bonus_type: formData.get("bonus_type"),
      bonus_period: formData.get("bonus_period"),
      bonus_title: formData.get("bonus_title"),
      employee_id_column: formData.get("employee_id_column"),
      amount_column: formData.get("amount_column"),
    });
    if (!metaResult.success) {
      return NextResponse.json(
        createValidationErrorResponse(metaResult.errors),
        { status: 400 },
      );
    }
    const meta = metaResult.data;

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const sheet = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
    }) as unknown[][];

    if (sheet.length < 2) {
      return validationErrorResponse("File không có dữ liệu");
    }

    const headers = (sheet[0] as unknown[]).map((header) =>
      String(header ?? "").trim(),
    );
    const dataRows = sheet.slice(1);

    const employeeIdColumnIndex = findColumnIndex(
      headers,
      meta.employee_id_column,
    );
    const amountColumnIndex = findColumnIndex(headers, meta.amount_column);
    if (employeeIdColumnIndex === -1 || amountColumnIndex === -1) {
      return validationErrorResponse(
        `Không tìm thấy cột được chọn trong file. Cột tìm thấy: [${headers.join(", ")}].`,
      );
    }

    const supabase = createServiceClient();
    const { data: employees, error: employeesError } = await supabase
      .from("employees")
      .select("employee_id");
    if (employeesError) {
      const error = ApiErrorHandler.createDatabaseError(
        "lấy danh sách nhân viên",
        employeesError.message,
      );
      return NextResponse.json(ApiErrorHandler.createErrorResponse(error), {
        status: 500,
      });
    }
    const validEmployeeIds = new Set(
      employees?.map((employee) => employee.employee_id) ?? [],
    );

    const parsedRows = parseBonusRows(
      headers,
      dataRows,
      employeeIdColumnIndex,
      amountColumnIndex,
    );

    const errors: ImportErrorRecord[] = [];
    let successCount = 0;
    let overwriteCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < parsedRows.length; i++) {
      const parsedRow = parsedRows[i];
      const rowNumber = i + 2;
      const originalData: Record<string, unknown> = {};
      headers.forEach((header, index) => {
        originalData[header] = dataRows[i][index] ?? "";
      });

      const employeeIdError = validateEmployeeId(
        parsedRow.employee_id,
        rowNumber,
        originalData,
      );
      if (employeeIdError) {
        errors.push(employeeIdError);
        skippedCount++;
        continue;
      }

      const employeeExistsError = validateEmployeeExists(
        parsedRow.employee_id,
        validEmployeeIds,
        rowNumber,
        undefined,
        originalData,
      );
      if (employeeExistsError) {
        errors.push(employeeExistsError);
        skippedCount++;
        continue;
      }

      if (parsedRow.amount === null) {
        errors.push({
          row: rowNumber,
          employee_id: parsedRow.employee_id,
          error: "Số tiền thưởng không hợp lệ",
          errorType: "validation",
          field: "amount",
          originalData,
        });
        skippedCount++;
        continue;
      }

      try {
        const { data: existingBonus, error: checkError } = await supabase
          .from("employee_bonuses")
          .select("id")
          .eq("employee_id", parsedRow.employee_id)
          .eq("bonus_type", meta.bonus_type)
          .eq("bonus_period", meta.bonus_period)
          .single();

        if (checkError && checkError.code !== "PGRST116") {
          errors.push({
            row: rowNumber,
            employee_id: parsedRow.employee_id,
            error: `Lỗi kiểm tra dữ liệu đã tồn tại: ${checkError.message}`,
            errorType: "database",
            originalData,
          });
          continue;
        }

        const bonusRecord = {
          employee_id: parsedRow.employee_id,
          bonus_type: meta.bonus_type,
          bonus_period: meta.bonus_period,
          bonus_title: meta.bonus_title,
          amount: parsedRow.amount,
          detail_data: parsedRow.detail_data,
          source_file: file.name,
          import_batch_id: batchId,
          updated_at: getVietnamTimestamp(),
        };

        if (existingBonus) {
          const { error: updateError } = await supabase
            .from("employee_bonuses")
            .update(bonusRecord)
            .eq("id", existingBonus.id);
          if (updateError) {
            errors.push({
              row: rowNumber,
              employee_id: parsedRow.employee_id,
              error: `Lỗi cập nhật: ${updateError.message}`,
              errorType: "database",
              originalData,
            });
          } else {
            overwriteCount++;
            successCount++;
          }
        } else {
          const { error: insertError } = await supabase
            .from("employee_bonuses")
            .insert({ ...bonusRecord, created_at: getVietnamTimestamp() });
          if (insertError) {
            errors.push({
              row: rowNumber,
              employee_id: parsedRow.employee_id,
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
          employee_id: parsedRow.employee_id,
          error: err instanceof Error ? err.message : "Lỗi không xác định",
          errorType: "format",
          originalData,
        });
      }
    }

    const result: BonusImportResult = {
      success: errors.length === 0,
      totalRecords: dataRows.length,
      successCount,
      errorCount: errors.length,
      overwriteCount,
      skippedCount,
      errors: errors.slice(0, MAX_IMPORT_ERRORS_RETURNED),
      batchId,
      processingTime: `${((Date.now() - startTime) / 1000).toFixed(2)}s`,
      originalHeaders: headers,
    };

    return NextResponse.json(result, { headers: CACHE_HEADERS.sensitive });
  } catch (error) {
    console.error("Bonus import error:", error);
    const apiError = ApiErrorHandler.fromError(
      error,
      ApiErrorHandler.ErrorCodes.INTERNAL_ERROR,
    );
    return NextResponse.json(ApiErrorHandler.createErrorResponse(apiError), {
      status: 500,
    });
  }
}
