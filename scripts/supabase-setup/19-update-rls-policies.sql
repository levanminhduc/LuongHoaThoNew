-- STEP 19: UPDATE RLS POLICIES FOR ROLE-BASED ACCESS
-- Cập nhật và thêm RLS policies cho hệ thống phân quyền
-- Thực hiện: 2025-07-30

-- ===== BACKUP REMINDER =====
-- QUAN TRỌNG: Backup database trước khi chạy script này!
-- pg_dump -h your_host -U your_user -d your_database > backup_before_rls_update.sql

-- ===== DROP EXISTING CONFLICTING POLICIES =====

-- Drop existing policies để tránh conflicts
DROP POLICY IF EXISTS "payrolls_manager_access" ON payrolls;
DROP POLICY IF EXISTS "signature_logs_manager_access" ON signature_logs;

-- ===== ENHANCED RLS POLICIES FOR PAYROLLS =====

-- Policy cho truong_phong: xem multiple departments based on permissions
CREATE POLICY "payrolls_truong_phong_access" ON payrolls
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'truong_phong' AND
    EXISTS (
      SELECT 1 FROM employees e 
      JOIN department_permissions dp ON e.department = dp.department
      WHERE e.employee_id = payrolls.employee_id 
        AND dp.employee_id = auth.jwt() ->> 'employee_id'
        AND dp.is_active = true
    )
  );

-- Policy cho to_truong: xem own department only (cập nhật từ existing)
CREATE POLICY "payrolls_to_truong_access" ON payrolls
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'to_truong' AND
    EXISTS (
      SELECT 1 FROM employees e 
      WHERE e.employee_id = payrolls.employee_id 
        AND e.department = auth.jwt() ->> 'department'
    )
  );

-- Policy cho nhan_vien: chỉ xem own data
CREATE POLICY "payrolls_nhan_vien_access" ON payrolls
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'nhan_vien' AND
    payrolls.employee_id = auth.jwt() ->> 'employee_id'
  );

-- ===== ENHANCED RLS POLICIES FOR EMPLOYEES =====

-- Policy cho truong_phong: xem employees trong departments được phân quyền
CREATE POLICY "employees_truong_phong_access" ON employees
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'truong_phong' AND
    EXISTS (
      SELECT 1 FROM department_permissions dp
      WHERE dp.employee_id = auth.jwt() ->> 'employee_id'
        AND dp.department = employees.department
        AND dp.is_active = true
    )
  );

-- Policy cho to_truong: xem employees trong own department
CREATE POLICY "employees_to_truong_access" ON employees
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'to_truong' AND
    employees.department = auth.jwt() ->> 'department'
  );

-- Policy cho nhan_vien: chỉ xem own data
CREATE POLICY "employees_nhan_vien_access" ON employees
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'nhan_vien' AND
    employees.employee_id = auth.jwt() ->> 'employee_id'
  );

-- ===== ENHANCED RLS POLICIES FOR SIGNATURE_LOGS =====

-- Policy cho truong_phong: xem signature logs của departments được phân quyền
CREATE POLICY "signature_logs_truong_phong_access" ON signature_logs
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'truong_phong' AND
    EXISTS (
      SELECT 1 FROM employees e 
      JOIN department_permissions dp ON e.department = dp.department
      WHERE e.employee_id = signature_logs.employee_id 
        AND dp.employee_id = auth.jwt() ->> 'employee_id'
        AND dp.is_active = true
    )
  );

-- Policy cho to_truong: xem signature logs của own department
CREATE POLICY "signature_logs_to_truong_access" ON signature_logs
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'to_truong' AND
    EXISTS (
      SELECT 1 FROM employees e 
      WHERE e.employee_id = signature_logs.employee_id 
        AND e.department = auth.jwt() ->> 'department'
    )
  );

-- Policy cho nhan_vien: chỉ xem own signature logs
CREATE POLICY "signature_logs_nhan_vien_access" ON signature_logs
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'nhan_vien' AND
    signature_logs.employee_id = auth.jwt() ->> 'employee_id'
  );

-- ===== RLS POLICIES FOR NEW TABLES =====

-- Enable RLS cho các bảng mới
ALTER TABLE department_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;

-- Policy cho department_permissions: chỉ admin và user có quyền mới xem được
CREATE POLICY "department_permissions_admin_access" ON department_permissions
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "department_permissions_own_access" ON department_permissions
  FOR SELECT USING (
    department_permissions.employee_id = auth.jwt() ->> 'employee_id'
  );

-- Policy cho access_logs: chỉ admin xem được tất cả, users khác chỉ xem own logs
CREATE POLICY "access_logs_admin_access" ON access_logs
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "access_logs_own_access" ON access_logs
  FOR SELECT USING (
    access_logs.user_id = auth.jwt() ->> 'employee_id'
  );

-- ===== VERIFY POLICIES =====

-- Kiểm tra tất cả policies đã được tạo
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('payrolls', 'employees', 'signature_logs', 'department_permissions', 'access_logs')
ORDER BY tablename, policyname;

-- Kiểm tra RLS đã được enable
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('payrolls', 'employees', 'signature_logs', 'department_permissions', 'access_logs')
ORDER BY tablename;

-- ===== TEST QUERIES (FOR VERIFICATION) =====

-- Test query cho truong_phong (cần có JWT context)
-- SELECT COUNT(*) FROM payrolls WHERE auth.jwt() ->> 'role' = 'truong_phong';

-- Test query cho to_truong (cần có JWT context)  
-- SELECT COUNT(*) FROM payrolls WHERE auth.jwt() ->> 'role' = 'to_truong';

-- ===== ROLLBACK SCRIPT (NẾU CẦN) =====
-- Để rollback policies, chạy:
/*
DROP POLICY IF EXISTS "payrolls_truong_phong_access" ON payrolls;
DROP POLICY IF EXISTS "payrolls_to_truong_access" ON payrolls;
DROP POLICY IF EXISTS "payrolls_nhan_vien_access" ON payrolls;
DROP POLICY IF EXISTS "employees_truong_phong_access" ON employees;
DROP POLICY IF EXISTS "employees_to_truong_access" ON employees;
DROP POLICY IF EXISTS "employees_nhan_vien_access" ON employees;
DROP POLICY IF EXISTS "signature_logs_truong_phong_access" ON signature_logs;
DROP POLICY IF EXISTS "signature_logs_to_truong_access" ON signature_logs;
DROP POLICY IF EXISTS "signature_logs_nhan_vien_access" ON signature_logs;
DROP POLICY IF EXISTS "department_permissions_admin_access" ON department_permissions;
DROP POLICY IF EXISTS "department_permissions_own_access" ON department_permissions;
DROP POLICY IF EXISTS "access_logs_admin_access" ON access_logs;
DROP POLICY IF EXISTS "access_logs_own_access" ON access_logs;
*/

-- ===== THÔNG TIN THÊM =====
-- Sau khi chạy script này, cần:
-- 1. Test policies với different JWT contexts
-- 2. Verify performance với complex queries
-- 3. Update application code để sử dụng proper JWT structure
-- 4. Test edge cases và security scenarios
-- 5. Monitor query performance với RLS enabled

PRINT 'Migration completed: Updated RLS policies for role-based access successfully!';
