-- STEP 7: SETUP ROW LEVEL SECURITY (RLS)

-- Enable RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payrolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_logs ENABLE ROW LEVEL SECURITY;

-- Policy cho employees: chỉ xem thông tin của mình
CREATE POLICY "employees_own_data" ON employees
  FOR ALL USING (auth.jwt() ->> 'employee_id' = employee_id);

-- Policy cho admin: xem tất cả employees
CREATE POLICY "employees_admin_access" ON employees
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Policy cho payrolls: nhân viên chỉ xem lương của mình
CREATE POLICY "payrolls_own_data" ON payrolls
  FOR ALL USING (auth.jwt() ->> 'employee_id' = employee_id);

-- Policy cho admin: xem tất cả payrolls
CREATE POLICY "payrolls_admin_access" ON payrolls
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Policy cho tổ trưởng: xem lương phòng ban
CREATE POLICY "payrolls_manager_access" ON payrolls
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'to_truong' AND
    EXISTS (
      SELECT 1 FROM employees e 
      WHERE e.employee_id = payrolls.employee_id 
        AND e.department = auth.jwt() ->> 'department'
    )
  );

-- Policy cho signature_logs: tương tự payrolls
CREATE POLICY "signature_logs_own_data" ON signature_logs
  FOR ALL USING (auth.jwt() ->> 'employee_id' = employee_id);

CREATE POLICY "signature_logs_admin_access" ON signature_logs
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Policy cho tổ trưởng xem signature logs phòng ban
CREATE POLICY "signature_logs_manager_access" ON signature_logs
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'to_truong' AND
    EXISTS (
      SELECT 1 FROM employees e 
      WHERE e.employee_id = signature_logs.employee_id 
        AND e.department = auth.jwt() ->> 'department'
    )
  );
