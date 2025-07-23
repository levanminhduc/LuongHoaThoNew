-- ROLLBACK SCRIPT - Chạy nếu cần rollback
-- Chạy theo thứ tự ngược lại

-- Drop functions
DROP FUNCTION IF EXISTS auto_sign_salary;
DROP FUNCTION IF EXISTS get_salary_by_month;
DROP FUNCTION IF EXISTS get_signature_report;
DROP FUNCTION IF EXISTS get_employee_salary_detail;

-- Drop policies
DROP POLICY IF EXISTS "employees_own_data" ON employees;
DROP POLICY IF EXISTS "employees_admin_access" ON employees;
DROP POLICY IF EXISTS "payrolls_own_data" ON payrolls;
DROP POLICY IF EXISTS "payrolls_admin_access" ON payrolls;
DROP POLICY IF EXISTS "payrolls_manager_access" ON payrolls;
DROP POLICY IF EXISTS "signature_logs_own_data" ON signature_logs;
DROP POLICY IF EXISTS "signature_logs_admin_access" ON signature_logs;
DROP POLICY IF EXISTS "signature_logs_manager_access" ON signature_logs;

-- Drop indexes
DROP INDEX IF EXISTS idx_payrolls_employee_month;
DROP INDEX IF EXISTS idx_payrolls_signed_status;
DROP INDEX IF EXISTS idx_payrolls_import_batch;
DROP INDEX IF EXISTS idx_payrolls_salary_month;
DROP INDEX IF EXISTS idx_signature_logs_employee_month;
DROP INDEX IF EXISTS idx_signature_logs_signed_at;
DROP INDEX IF EXISTS idx_employees_active;
DROP INDEX IF EXISTS idx_employees_dept_role;
DROP INDEX IF EXISTS idx_employees_employee_id;

-- Drop tables (theo thứ tự dependency)
DROP TABLE IF EXISTS signature_logs;
DROP TABLE IF EXISTS payrolls;
DROP TABLE IF EXISTS employees;
