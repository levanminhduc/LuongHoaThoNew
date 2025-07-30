-- FIX AUDIT TRAIL RLS POLICIES FOR SERVICE CLIENT
-- Chạy script này để fix lỗi "Lỗi khi lấy lịch sử thay đổi"

-- ===== KIỂM TRA TABLE TỒN TẠI =====
-- Check if payroll_audit_logs table exists
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'payroll_audit_logs';

-- ===== TẠO TABLE NẾU CHƯA CÓ =====
-- Create audit table if it doesn't exist (from script 14)
CREATE TABLE IF NOT EXISTS payroll_audit_logs (
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

-- ===== TẠO INDEXES NẾU CHƯA CÓ =====
CREATE INDEX IF NOT EXISTS idx_payroll_audit_payroll_id ON payroll_audit_logs(payroll_id);
CREATE INDEX IF NOT EXISTS idx_payroll_audit_employee_id ON payroll_audit_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_audit_salary_month ON payroll_audit_logs(salary_month);
CREATE INDEX IF NOT EXISTS idx_payroll_audit_changed_at ON payroll_audit_logs(changed_at DESC);

-- ===== ENABLE RLS =====
ALTER TABLE payroll_audit_logs ENABLE ROW LEVEL SECURITY;

-- ===== XÓA POLICIES CŨ =====
DROP POLICY IF EXISTS "Admin can read all audit logs" ON payroll_audit_logs;
DROP POLICY IF EXISTS "Admin can insert audit logs" ON payroll_audit_logs;

-- ===== TẠO SERVICE CLIENT COMPATIBLE POLICIES =====

-- Policy: Service client có thể đọc tất cả audit logs
CREATE POLICY "audit_logs_service_client_access" ON payroll_audit_logs
  FOR ALL USING (
    -- Allow if using service client (no auth.jwt())
    auth.jwt() IS NULL OR
    -- Allow if admin role in JWT
    auth.jwt() ->> 'role' = 'admin'
  );

-- ===== THÊM SAMPLE DATA ĐỂ TEST =====
-- Insert sample audit data if table is empty
INSERT INTO payroll_audit_logs (
  payroll_id,
  employee_id,
  salary_month,
  changed_by,
  change_reason,
  field_name,
  old_value,
  new_value
)
SELECT 
  p.id,
  p.employee_id,
  p.salary_month,
  'admin',
  'Khởi tạo dữ liệu audit trail',
  'tien_luong_thuc_nhan_cuoi_ky',
  '0',
  p.tien_luong_thuc_nhan_cuoi_ky::text
FROM payrolls p
WHERE NOT EXISTS (SELECT 1 FROM payroll_audit_logs WHERE payroll_id = p.id)
LIMIT 5;

-- ===== VERIFY SETUP =====
-- Check RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'payroll_audit_logs';

-- Check policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'payroll_audit_logs'
ORDER BY policyname;

-- Check data count
SELECT 'payroll_audit_logs' as table_name, COUNT(*) as record_count 
FROM payroll_audit_logs;

-- Test query (should work with service client)
SELECT 
  id,
  payroll_id,
  employee_id,
  changed_by,
  changed_at,
  change_reason,
  field_name
FROM payroll_audit_logs 
ORDER BY changed_at DESC
LIMIT 3;

-- ===== COMMENTS =====
COMMENT ON POLICY "audit_logs_service_client_access" ON payroll_audit_logs IS 
'Allows service client (admin API) full access to audit logs while maintaining JWT-based access for regular users';

COMMENT ON TABLE payroll_audit_logs IS 'Audit trail for all payroll data changes - fixed for service client access';
