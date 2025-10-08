/**
 * Standardized API Error Handler for Dual File Upload System
 * Provides consistent error response format across all endpoints
 */

export interface ApiError {
  code: string;
  message: string;
  details?: string;
  field?: string;
  row?: number;
  employee_id?: string;
  salary_month?: string;
  file_type?: "file1" | "file2";
  timestamp: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  errors?: ApiError[];
  message?: string;
  metadata?: {
    totalRecords?: number;
    successCount?: number;
    errorCount?: number;
    warningCount?: number;
    processingTime?: string;
    duplicatesFound?: number;
    autoFixCount?: number;
  };
}

export class ApiErrorHandler {
  /**
   * Create standardized error response
   */
  static createError(
    code: string,
    message: string,
    details?: string,
    field?: string,
    row?: number,
    employee_id?: string,
    salary_month?: string,
    file_type?: "file1" | "file2",
  ): ApiError {
    return {
      code,
      message,
      details,
      field,
      row,
      employee_id,
      salary_month,
      file_type,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create success response
   */
  static createSuccess<T>(
    data: T,
    message?: string,
    metadata?: ApiResponse<T>["metadata"],
  ): ApiResponse<T> {
    return {
      success: true,
      data,
      message,
      metadata,
    };
  }

  /**
   * Create error response with single error
   */
  static createErrorResponse(error: ApiError, message?: string): ApiResponse {
    return {
      success: false,
      error,
      message: message || error.message,
    };
  }

  /**
   * Create error response with multiple errors
   */
  static createMultiErrorResponse(
    errors: ApiError[],
    message?: string,
    metadata?: ApiResponse["metadata"],
  ): ApiResponse {
    return {
      success: false,
      errors,
      message: message || `${errors.length} errors occurred`,
      metadata,
    };
  }

  /**
   * Convert generic error to ApiError
   */
  static fromError(
    error: Error | unknown,
    code: string = "INTERNAL_ERROR",
    field?: string,
    row?: number,
    employee_id?: string,
    salary_month?: string,
    file_type?: "file1" | "file2",
  ): ApiError {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    const details = error instanceof Error ? error.stack : String(error);

    return this.createError(
      code,
      message,
      details,
      field,
      row,
      employee_id,
      salary_month,
      file_type,
    );
  }

  /**
   * Common error codes and messages
   */
  static readonly ErrorCodes = {
    // Authentication & Authorization
    UNAUTHORIZED: "UNAUTHORIZED",
    INVALID_TOKEN: "INVALID_TOKEN",
    ACCESS_DENIED: "ACCESS_DENIED",

    // Validation Errors
    VALIDATION_ERROR: "VALIDATION_ERROR",
    MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",
    INVALID_DATA_TYPE: "INVALID_DATA_TYPE",
    INVALID_FILE_FORMAT: "INVALID_FILE_FORMAT",
    FILE_TOO_LARGE: "FILE_TOO_LARGE",
    EMPTY_FILE: "EMPTY_FILE",

    // Business Logic Errors
    DUPLICATE_RECORD: "DUPLICATE_RECORD",
    EMPLOYEE_NOT_FOUND: "EMPLOYEE_NOT_FOUND",
    INVALID_SALARY_MONTH: "INVALID_SALARY_MONTH",
    MAPPING_ERROR: "MAPPING_ERROR",

    // Database Errors
    DATABASE_ERROR: "DATABASE_ERROR",
    CONSTRAINT_VIOLATION: "CONSTRAINT_VIOLATION",
    CONNECTION_ERROR: "CONNECTION_ERROR",

    // Processing Errors
    PARSING_ERROR: "PARSING_ERROR",
    PROCESSING_ERROR: "PROCESSING_ERROR",
    TIMEOUT_ERROR: "TIMEOUT_ERROR",

    // System Errors
    INTERNAL_ERROR: "INTERNAL_ERROR",
    SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  } as const;

  /**
   * Get user-friendly message for error code
   */
  static getUserFriendlyMessage(code: string): string {
    const messages: Record<string, string> = {
      [this.ErrorCodes.UNAUTHORIZED]:
        "Bạn cần đăng nhập để thực hiện thao tác này",
      [this.ErrorCodes.INVALID_TOKEN]:
        "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại",
      [this.ErrorCodes.ACCESS_DENIED]:
        "Bạn không có quyền thực hiện thao tác này",

      [this.ErrorCodes.VALIDATION_ERROR]: "Dữ liệu không hợp lệ",
      [this.ErrorCodes.MISSING_REQUIRED_FIELD]: "Thiếu thông tin bắt buộc",
      [this.ErrorCodes.INVALID_DATA_TYPE]: "Định dạng dữ liệu không đúng",
      [this.ErrorCodes.INVALID_FILE_FORMAT]: "Định dạng file không được hỗ trợ",
      [this.ErrorCodes.FILE_TOO_LARGE]: "File quá lớn",
      [this.ErrorCodes.EMPTY_FILE]: "File rỗng hoặc không có dữ liệu",

      [this.ErrorCodes.DUPLICATE_RECORD]: "Dữ liệu đã tồn tại trong hệ thống",
      [this.ErrorCodes.EMPLOYEE_NOT_FOUND]:
        "Không tìm thấy thông tin nhân viên",
      [this.ErrorCodes.INVALID_SALARY_MONTH]: "Tháng lương không hợp lệ",
      [this.ErrorCodes.MAPPING_ERROR]: "Lỗi ánh xạ cột dữ liệu",

      [this.ErrorCodes.DATABASE_ERROR]: "Lỗi cơ sở dữ liệu",
      [this.ErrorCodes.CONSTRAINT_VIOLATION]: "Vi phạm ràng buộc dữ liệu",
      [this.ErrorCodes.CONNECTION_ERROR]: "Lỗi kết nối cơ sở dữ liệu",

      [this.ErrorCodes.PARSING_ERROR]: "Lỗi phân tích file",
      [this.ErrorCodes.PROCESSING_ERROR]: "Lỗi xử lý dữ liệu",
      [this.ErrorCodes.TIMEOUT_ERROR]: "Quá thời gian xử lý",

      [this.ErrorCodes.INTERNAL_ERROR]: "Lỗi hệ thống nội bộ",
      [this.ErrorCodes.SERVICE_UNAVAILABLE]: "Dịch vụ tạm thời không khả dụng",
    };

    return messages[code] || "Đã xảy ra lỗi không xác định";
  }

  /**
   * Create validation error
   */
  static createValidationError(
    field: string,
    message: string,
    row?: number,
    employee_id?: string,
    salary_month?: string,
    file_type?: "file1" | "file2",
  ): ApiError {
    return this.createError(
      this.ErrorCodes.VALIDATION_ERROR,
      message,
      `Validation failed for field: ${field}`,
      field,
      row,
      employee_id,
      salary_month,
      file_type,
    );
  }

  /**
   * Create duplicate error
   */
  static createDuplicateError(
    employee_id: string,
    salary_month: string,
    file_type?: "file1" | "file2",
  ): ApiError {
    return this.createError(
      this.ErrorCodes.DUPLICATE_RECORD,
      `Nhân viên ${employee_id} đã có dữ liệu lương tháng ${salary_month}`,
      "Duplicate employee_id and salary_month combination",
      "employee_id",
      undefined,
      employee_id,
      salary_month,
      file_type,
    );
  }

  /**
   * Create database error
   */
  static createDatabaseError(
    operation: string,
    details: string,
    employee_id?: string,
    salary_month?: string,
  ): ApiError {
    return this.createError(
      this.ErrorCodes.DATABASE_ERROR,
      `Lỗi cơ sở dữ liệu khi ${operation}`,
      details,
      undefined,
      undefined,
      employee_id,
      salary_month,
    );
  }
}
