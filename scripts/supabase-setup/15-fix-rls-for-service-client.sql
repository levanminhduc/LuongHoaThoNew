-- STEP 15: FIX RLS POLICIES FOR SERVICE CLIENT COMPATIBILITY
-- This script fixes RLS policy conflicts with service client authentication

-- ===== BACKUP EXISTING POLICIES =====
-- (Policies will be recreated with service client compatibility)

-- ===== DROP EXISTING PROBLEMATIC POLICIES =====
DROP POLICY IF EXISTS "payrolls_admin_access" ON payrolls;
DROP POLICY IF EXISTS "employees_admin_access" ON employees;
DROP POLICY IF EXISTS "signature_logs_admin_access" ON signature_logs;

-- ===== CREATE SERVICE CLIENT COMPATIBLE POLICIES =====

-- Policy for payrolls: Allow service client full access
CREATE POLICY "payrolls_service_client_access" ON payrolls
  FOR ALL USING (
    -- Allow if using service client (no auth.jwt())
    auth.jwt() IS NULL OR
    -- Allow if admin role in JWT
    auth.jwt() ->> 'role' = 'admin'
  );

-- Policy for employees: Allow service client full access  
CREATE POLICY "employees_service_client_access" ON employees
  FOR ALL USING (
    -- Allow if using service client (no auth.jwt())
    auth.jwt() IS NULL OR
    -- Allow if admin role in JWT
    auth.jwt() ->> 'role' = 'admin'
  );

-- Policy for signature_logs: Allow service client full access
CREATE POLICY "signature_logs_service_client_access" ON signature_logs
  FOR ALL USING (
    -- Allow if using service client (no auth.jwt())
    auth.jwt() IS NULL OR
    -- Allow if admin role in JWT
    auth.jwt() ->> 'role' = 'admin'
  );

-- ===== KEEP EXISTING USER POLICIES INTACT =====
-- (Employee and manager policies remain unchanged)

-- ===== VERIFY POLICIES =====
-- Check that policies are created correctly
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('payrolls', 'employees', 'signature_logs')
ORDER BY tablename, policyname;

-- ===== COMMENTS =====
COMMENT ON POLICY "payrolls_service_client_access" ON payrolls IS 
'Allows service client (admin API) full access to payrolls table while maintaining JWT-based access for regular users';

COMMENT ON POLICY "employees_service_client_access" ON employees IS 
'Allows service client (admin API) full access to employees table while maintaining JWT-based access for regular users';

COMMENT ON POLICY "signature_logs_service_client_access" ON signature_logs IS 
'Allows service client (admin API) full access to signature_logs table while maintaining JWT-based access for regular users';

-- ===== TESTING QUERIES =====
-- These queries should work with service client after applying this script:

-- Test 1: Basic payroll query
-- SELECT id, employee_id, salary_month FROM payrolls LIMIT 5;

-- Test 2: Join query (like in search API)
-- SELECT p.id, p.employee_id, e.full_name 
-- FROM payrolls p 
-- LEFT JOIN employees e ON p.employee_id = e.employee_id 
-- LIMIT 5;

-- Test 3: Employee search query
-- SELECT * FROM employees WHERE full_name ILIKE '%test%' LIMIT 5;
