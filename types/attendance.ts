export interface AttendanceDaily {
  id: number;
  employee_id: string;
  work_date: string;
  period_year: number;
  period_month: number;
  check_in_time: string | null;
  check_out_time: string | null;
  working_units: number;
  overtime_units: number;
  note: string | null;
  source_file: string | null;
  import_batch_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceMonthly {
  id: number;
  employee_id: string;
  period_year: number;
  period_month: number;
  total_hours: number;
  total_days: number;
  total_meal_ot_hours: number;
  total_ot_hours: number;
  sick_days: number;
  source_file: string | null;
  import_batch_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyRecord {
  day: number;
  checkIn: string | null;
  checkOut: string | null;
  workingUnits: number;
  overtimeUnits: number;
}

export interface AttendanceSummary {
  totalHours: number;
  totalDays: number;
  totalMealOtHours: number;
  totalOtHours: number;
  sickDays: number;
}

export interface ParsedAttendanceRecord {
  employeeId: string;
  periodYear: number;
  periodMonth: number;
  dailyRecords: DailyRecord[];
  summary: AttendanceSummary;
}

export interface AttendanceImportResult {
  success: boolean;
  totalRecords: number;
  insertedDaily: number;
  insertedMonthly: number;
  skippedRecords: number;
  errors: AttendanceImportError[];
}

export interface AttendanceImportError {
  row: number;
  employeeId: string;
  message: string;
}

export interface AttendanceValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
