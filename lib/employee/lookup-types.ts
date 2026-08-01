export type LookupResponseFormat = "json" | "html";

export type LookupPayrollResponse = {
  [key: string]: string | number | boolean | null | undefined;
  employee_id: string;
  full_name: string;
  position: string;
  department: string;
  salary_month: string;
  salary_month_display: string;
  source_file: string;
  payroll_type: string;
  must_change_password: boolean;
  is_signed: boolean;
  signed_at: string | null;
  signed_at_display: string | null;
  signed_by_name: string | null;
  total_income: number;
  deductions: number;
  net_salary: number;
};
