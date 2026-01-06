import { z } from "zod";
import type { ApiError } from "@/lib/api-error-handler";
import { ApiErrorHandler } from "@/lib/api-error-handler";

export interface ValidationResult<T> {
  success: true;
  data: T;
}

export interface ValidationError {
  success: false;
  errors: ApiError[];
}

export type ParseResult<T> = ValidationResult<T> | ValidationError;

export function zodErrorToApiErrors(
  zodError: z.ZodError,
  context?: {
    row?: number;
    employee_id?: string;
    salary_month?: string;
    file_type?: "file1" | "file2";
  },
): ApiError[] {
  return zodError.issues.map((issue) => {
    const field = issue.path.join(".");
    return ApiErrorHandler.createValidationError(
      field || "unknown",
      issue.message,
      context?.row,
      context?.employee_id,
      context?.salary_month,
      context?.file_type,
    );
  });
}

export function parseSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context?: {
    row?: number;
    employee_id?: string;
    salary_month?: string;
    file_type?: "file1" | "file2";
  },
): ParseResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    errors: zodErrorToApiErrors(result.error, context),
  };
}

export function parseSchemaOrThrow<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): T {
  const result = schema.safeParse(data);

  if (result.success) {
    return result.data;
  }

  const firstError = result.error.issues[0];
  throw new Error(firstError?.message || "Dữ liệu không hợp lệ");
}

export function createValidationErrorResponse(errors: ApiError[]) {
  if (errors.length === 1) {
    return ApiErrorHandler.createErrorResponse(errors[0]);
  }
  return ApiErrorHandler.createMultiErrorResponse(
    errors,
    `${errors.length} lỗi xác thực`,
  );
}
