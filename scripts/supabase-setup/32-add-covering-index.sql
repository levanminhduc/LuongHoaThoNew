CREATE INDEX IF NOT EXISTS idx_payrolls_employee_month_type
  ON payrolls(employee_id, salary_month, payroll_type);

DROP INDEX IF EXISTS idx_payrolls_employee_month;
