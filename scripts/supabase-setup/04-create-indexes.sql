-- STEP 4: CREATE PERFORMANCE INDEXES

-- Primary performance indexes
CREATE INDEX idx_payrolls_employee_month ON payrolls(employee_id, salary_month);
CREATE INDEX idx_payrolls_signed_status ON payrolls(is_signed, salary_month);
CREATE INDEX idx_payrolls_import_batch ON payrolls(import_batch_id);
CREATE INDEX idx_payrolls_salary_month ON payrolls(salary_month);

-- Signature tracking indexes
CREATE INDEX idx_signature_logs_employee_month ON signature_logs(employee_id, salary_month);
CREATE INDEX idx_signature_logs_signed_at ON signature_logs(signed_at);

-- Employee access indexes
CREATE INDEX idx_employees_active ON employees(is_active, employee_id);
CREATE INDEX idx_employees_dept_role ON employees(department, chuc_vu);
CREATE INDEX idx_employees_employee_id ON employees(employee_id);

-- Comments
COMMENT ON INDEX idx_payrolls_employee_month IS 'Tối ưu query lương theo nhân viên và tháng';
COMMENT ON INDEX idx_payrolls_signed_status IS 'Tối ưu báo cáo trạng thái ký theo tháng';
