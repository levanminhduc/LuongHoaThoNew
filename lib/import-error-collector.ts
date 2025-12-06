export interface ImportErrorRecord {
  row: number;
  employee_id?: string;
  salary_month?: string;
  field?: string;
  error: string;
  errorType:
    | "validation"
    | "duplicate"
    | "employee_not_found"
    | "database"
    | "format";
  originalData?: Record<string, unknown>;
}

export interface ErrorReportRow {
  Dòng: number;
  "Mã NV": string;
  Tháng: string;
  Lỗi: string;
  "Loại Lỗi": string;
  [key: string]: unknown;
}

export interface ImportValidationResult {
  isValid: boolean;
  errors: ImportErrorRecord[];
  validRecords: Array<Record<string, unknown>>;
  skippedCount: number;
}

export function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  return false;
}

export function validateEmployeeId(
  value: unknown,
  row: number,
  originalData?: Record<string, unknown>,
): ImportErrorRecord | null {
  if (isEmptyValue(value)) {
    return {
      row,
      employee_id: undefined,
      error: "Thiếu Mã NV",
      errorType: "validation",
      field: "employee_id",
      originalData,
    };
  }

  const trimmedValue = String(value).trim();
  if (trimmedValue === "") {
    return {
      row,
      employee_id: undefined,
      error: "Mã NV rỗng",
      errorType: "validation",
      field: "employee_id",
      originalData,
    };
  }

  return null;
}

export function validateSalaryMonth(
  value: unknown,
  row: number,
  employeeId?: string,
  originalData?: Record<string, unknown>,
): ImportErrorRecord | null {
  if (isEmptyValue(value)) {
    return {
      row,
      employee_id: employeeId,
      error: "Thiếu Tháng",
      errorType: "validation",
      field: "salary_month",
      originalData,
    };
  }

  const trimmedValue = String(value).trim();
  const monthPattern = /^\d{4}-\d{2}$/;

  if (!monthPattern.test(trimmedValue)) {
    return {
      row,
      employee_id: employeeId,
      salary_month: trimmedValue,
      error: `Tháng không hợp lệ: "${trimmedValue}". Định dạng đúng: YYYY-MM (VD: 2024-01)`,
      errorType: "validation",
      field: "salary_month",
      originalData,
    };
  }

  const [year, month] = trimmedValue.split("-").map(Number);
  if (month < 1 || month > 12) {
    return {
      row,
      employee_id: employeeId,
      salary_month: trimmedValue,
      error: `Tháng không hợp lệ: "${trimmedValue}". Tháng phải từ 01 đến 12`,
      errorType: "validation",
      field: "salary_month",
      originalData,
    };
  }

  const currentYear = new Date().getFullYear();
  if (year < 2020 || year > currentYear + 1) {
    return {
      row,
      employee_id: employeeId,
      salary_month: trimmedValue,
      error: `Năm không hợp lệ: "${year}". Năm phải từ 2020 đến ${currentYear + 1}`,
      errorType: "validation",
      field: "salary_month",
      originalData,
    };
  }

  return null;
}

export function validateEmployeeExists(
  employeeId: string,
  validEmployeeIds: Set<string>,
  row: number,
  salaryMonth?: string,
  originalData?: Record<string, unknown>,
): ImportErrorRecord | null {
  if (!validEmployeeIds.has(employeeId)) {
    return {
      row,
      employee_id: employeeId,
      salary_month: salaryMonth,
      error: `Mã NV không tồn tại: "${employeeId}"`,
      errorType: "employee_not_found",
      field: "employee_id",
      originalData,
    };
  }
  return null;
}

export function createErrorReportData(
  errors: ImportErrorRecord[],
  headers: string[],
): ErrorReportRow[] {
  return errors.map((error) => {
    const row: ErrorReportRow = {
      Dòng: error.row,
      "Mã NV": error.employee_id || "N/A",
      Tháng: error.salary_month || "N/A",
      Lỗi: error.error,
      "Loại Lỗi": getErrorTypeLabel(error.errorType),
    };

    if (error.originalData) {
      headers.forEach((header) => {
        if (!["Dòng", "Mã NV", "Tháng", "Lỗi", "Loại Lỗi"].includes(header)) {
          row[header] = error.originalData?.[header] ?? "";
        }
      });
    }

    return row;
  });
}

function getErrorTypeLabel(errorType: string): string {
  const labels: Record<string, string> = {
    validation: "Lỗi dữ liệu",
    duplicate: "Trùng lặp",
    employee_not_found: "Không tìm thấy NV",
    database: "Lỗi database",
    format: "Lỗi định dạng",
  };
  return labels[errorType] || errorType;
}
