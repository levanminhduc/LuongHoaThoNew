-- STEP 14: CREATE PAYROLL AUDIT TRAIL TABLE
-- Bảng audit để track tất cả changes trên payroll data

CREATE TABLE payroll_audit_logs (
  -- ===== METADATA =====
  id SERIAL PRIMARY KEY,
  payroll_id INTEGER NOT NULL,                    -- Reference to payrolls.id
  employee_id VARCHAR(50) NOT NULL,               -- For easy filtering
  salary_month VARCHAR(20) NOT NULL,              -- For easy filtering
  
  -- ===== AUDIT INFORMATION =====
  changed_by VARCHAR(255) NOT NULL,               -- Admin username
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- When change happened
  change_ip VARCHAR(45),                          -- IP address of admin
  change_reason TEXT NOT NULL,                    -- Mandatory reason for change
  
  -- ===== CHANGE DETAILS =====
  field_name VARCHAR(100) NOT NULL,               -- Which field was changed
  old_value TEXT,                                 -- Previous value (as string)
  new_value TEXT,                                 -- New value (as string)
  
  -- ===== CONSTRAINTS =====
  FOREIGN KEY (payroll_id) REFERENCES payrolls(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
);

-- ===== INDEXES FOR PERFORMANCE =====
CREATE INDEX idx_payroll_audit_payroll_id ON payroll_audit_logs(payroll_id);
CREATE INDEX idx_payroll_audit_employee_id ON payroll_audit_logs(employee_id);
CREATE INDEX idx_payroll_audit_salary_month ON payroll_audit_logs(salary_month);
CREATE INDEX idx_payroll_audit_changed_at ON payroll_audit_logs(changed_at DESC);

-- ===== RLS POLICIES =====
ALTER TABLE payroll_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admin có thể đọc tất cả audit logs
CREATE POLICY "Admin can read all audit logs" ON payroll_audit_logs
  FOR SELECT USING (true);

-- Policy: Admin có thể insert audit logs (through API only)
CREATE POLICY "Admin can insert audit logs" ON payroll_audit_logs
  FOR INSERT WITH CHECK (true);

-- ===== HELPER FUNCTION: GET AUDIT TRAIL =====
CREATE OR REPLACE FUNCTION get_payroll_audit_trail(
  p_payroll_id INTEGER
) RETURNS TABLE(
  id INTEGER,
  changed_by VARCHAR(255),
  changed_at TIMESTAMP,
  change_reason TEXT,
  field_name VARCHAR(100),
  old_value TEXT,
  new_value TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pal.id,
    pal.changed_by,
    pal.changed_at,
    pal.change_reason,
    pal.field_name,
    pal.old_value,
    pal.new_value
  FROM payroll_audit_logs pal
  WHERE pal.payroll_id = p_payroll_id
  ORDER BY pal.changed_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ===== HELPER FUNCTION: LOG PAYROLL CHANGE =====
CREATE OR REPLACE FUNCTION log_payroll_change(
  p_payroll_id INTEGER,
  p_employee_id VARCHAR(50),
  p_salary_month VARCHAR(20),
  p_changed_by VARCHAR(255),
  p_change_ip VARCHAR(45),
  p_change_reason TEXT,
  p_field_name VARCHAR(100),
  p_old_value TEXT,
  p_new_value TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO payroll_audit_logs (
    payroll_id,
    employee_id,
    salary_month,
    changed_by,
    change_ip,
    change_reason,
    field_name,
    old_value,
    new_value
  ) VALUES (
    p_payroll_id,
    p_employee_id,
    p_salary_month,
    p_changed_by,
    p_change_ip,
    p_change_reason,
    p_field_name,
    p_old_value,
    p_new_value
  );
  
  RETURN true;
  
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Comment
COMMENT ON TABLE payroll_audit_logs IS 'Audit trail for all payroll data changes';
COMMENT ON FUNCTION get_payroll_audit_trail IS 'Get audit trail for specific payroll record';
COMMENT ON FUNCTION log_payroll_change IS 'Log a single field change in payroll data';
