export interface AttendanceSignatureLog {
  employee_id: string;
  salary_month: string;
  signed_by_name: string;
  signed_at: string;
}

export interface AttendanceEmployeeInfo {
  employee_id: string;
  full_name: string;
  department: string;
  chuc_vu: string;
}

export interface AttendanceMonthlyRow {
  employee_id: string;
  source_file: string | null;
  total_days: number | null;
  total_hours: number | null;
  total_ot_hours: number | null;
  total_meal_ot_hours: number | null;
  sick_days: number | null;
  daily_records_json: unknown;
}

export interface AttendanceSheetContext {
  monthlyData: AttendanceMonthlyRow[];
  employeeMap: Map<string, AttendanceEmployeeInfo>;
  signatureLogsMap: Map<string, AttendanceSignatureLog>;
  salaryMonth: string;
}

export function getSignatureStatus(
  signatureLog: AttendanceSignatureLog | undefined,
): string {
  return signatureLog ? "Đã Ký" : "Chưa Ký";
}
