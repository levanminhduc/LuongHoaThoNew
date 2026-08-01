import { NextResponse } from "next/server";
import { ApiErrorHandler } from "@/lib/api-error-handler";
import { isProduction } from "@/lib/config/runtime";

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, ApiErrorHandler.ErrorCodes.VALIDATION_ERROR, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string) {
    super(message, ApiErrorHandler.ErrorCodes.UNAUTHORIZED, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(message, ApiErrorHandler.ErrorCodes.ACCESS_DENIED, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, ApiErrorHandler.ErrorCodes.EMPLOYEE_NOT_FOUND, 404);
  }
}

export interface ErrorResponseOptions {
  fallbackMessage?: string;
  headers?: HeadersInit;
}

export function toErrorResponse(
  error: unknown,
  options: ErrorResponseOptions = {},
): NextResponse {
  const { fallbackMessage, headers } = options;

  if (error instanceof AppError) {
    const apiError = ApiErrorHandler.createError(error.code, error.message);
    return NextResponse.json(ApiErrorHandler.createErrorResponse(apiError), {
      status: error.status,
      headers,
    });
  }

  console.error("[API_ERROR]", error);

  const code = ApiErrorHandler.ErrorCodes.INTERNAL_ERROR;
  const details = isProduction()
    ? undefined
    : error instanceof Error
      ? error.stack
      : String(error);

  const apiError = ApiErrorHandler.createError(
    code,
    fallbackMessage ?? ApiErrorHandler.getUserFriendlyMessage(code),
    details,
  );

  return NextResponse.json(ApiErrorHandler.createErrorResponse(apiError), {
    status: 500,
    headers,
  });
}
