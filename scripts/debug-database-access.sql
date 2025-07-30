-- DEBUG DATABASE ACCESS ISSUES
-- Run this in Supabase SQL Editor to diagnose data access problems

-- ===== 1. CHECK TABLE EXISTENCE =====
SELECT 
  table_name,
  table_type,
  table_schema
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('employees', 'payrolls', 'signature_logs')
ORDER BY table_name;

-- ===== 2. CHECK TABLE STRUCTURES =====
-- Check employees table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'employees' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check payrolls table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'payrolls' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ===== 3. CHECK RLS STATUS =====
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  hasrls
FROM pg_tables 
WHERE tablename IN ('employees', 'payrolls', 'signature_logs')
ORDER BY tablename;

-- ===== 4. CHECK ACTIVE RLS POLICIES =====
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('employees', 'payrolls', 'signature_logs')
ORDER BY tablename, policyname;

-- ===== 5. CHECK DATA COUNTS =====
-- Basic count queries
SELECT 'employees' as table_name, COUNT(*) as record_count FROM employees
UNION ALL
SELECT 'payrolls' as table_name, COUNT(*) as record_count FROM payrolls
UNION ALL
SELECT 'signature_logs' as table_name, COUNT(*) as record_count FROM signature_logs;

-- ===== 6. CHECK SAMPLE DATA =====
-- Sample employees data
SELECT 
  employee_id,
  full_name,
  department,
  chuc_vu,
  is_active,
  created_at
FROM employees 
ORDER BY created_at DESC
LIMIT 5;

-- Sample payrolls data
SELECT 
  id,
  employee_id,
  salary_month,
  tien_luong_thuc_nhan_cuoi_ky,
  source_file,
  created_at
FROM payrolls 
ORDER BY created_at DESC
LIMIT 5;

-- ===== 7. TEST JOIN QUERY =====
-- Test the exact join used in API
SELECT 
  p.id,
  p.employee_id,
  p.salary_month,
  p.tien_luong_thuc_nhan_cuoi_ky,
  e.full_name,
  e.department,
  e.chuc_vu,
  e.is_active
FROM payrolls p
LEFT JOIN employees e ON p.employee_id = e.employee_id
WHERE e.is_active = true
LIMIT 5;

-- ===== 8. TEST SEARCH QUERY =====
-- Test search for "Nguyễn Văn An"
SELECT 
  employee_id,
  full_name,
  department,
  is_active
FROM employees 
WHERE full_name ILIKE '%Nguyễn Văn An%'
   OR employee_id ILIKE '%Nguyễn Văn An%';

-- Test payroll search
SELECT 
  p.id,
  p.employee_id,
  p.salary_month,
  e.full_name
FROM payrolls p
LEFT JOIN employees e ON p.employee_id = e.employee_id
WHERE (p.employee_id ILIKE '%Nguyễn Văn An%' OR e.full_name ILIKE '%Nguyễn Văn An%')
  AND e.is_active = true;

-- ===== 9. CHECK SERVICE ROLE PERMISSIONS =====
-- Check current role and permissions
SELECT current_user, current_role;

-- Check if we can access tables directly
SELECT 'Can access employees' as test, COUNT(*) as count FROM employees;
SELECT 'Can access payrolls' as test, COUNT(*) as count FROM payrolls;

-- ===== 10. DIAGNOSTIC SUMMARY =====
-- Summary of potential issues
SELECT 
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees') 
    THEN 'ERROR: employees table does not exist'
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payrolls') 
    THEN 'ERROR: payrolls table does not exist'
    WHEN (SELECT COUNT(*) FROM employees) = 0 
    THEN 'WARNING: employees table is empty'
    WHEN (SELECT COUNT(*) FROM payrolls) = 0 
    THEN 'WARNING: payrolls table is empty'
    WHEN (SELECT rowsecurity FROM pg_tables WHERE tablename = 'employees') = true 
         AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employees' AND policyname LIKE '%service_client%')
    THEN 'ERROR: RLS enabled but no service client policy found'
    ELSE 'OK: Basic setup appears correct'
  END as diagnostic_result;
