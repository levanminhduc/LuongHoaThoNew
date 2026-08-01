export type ImportStatus =
  | "idle"
  | "processing"
  | "validating"
  | "importing"
  | "complete"
  | "error";

export interface ImportRowError {
  row: number;
  field?: string;
  employee_id?: string;
  salary_month?: string;
  errorType:
    | "validation"
    | "duplicate"
    | "employee_not_found"
    | "database"
    | "format";
  error: string;
  originalData?: Record<string, unknown>;
}

export interface ImportResult {
  success: boolean;
  totalRecords: number;
  successCount: number;
  errorCount: number;
  overwriteCount?: number;
  skippedCount?: number;
  errors?: ImportRowError[];
  processingTime: string;
  importBatchId?: string;
  originalHeaders?: string[];
}
