-- CHECK EXISTING TABLES IN DATABASE
-- Run this first to identify which tables actually exist

-- ===== CHECK ALL TABLES IN PUBLIC SCHEMA =====
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- ===== CHECK FOREIGN KEY CONSTRAINTS =====
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.update_rule,
    rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND ccu.table_name = 'employees'
    AND ccu.column_name = 'employee_id'
ORDER BY tc.table_name;

-- ===== CHECK SPECIFIC TABLES THAT MIGHT REFERENCE EMPLOYEES =====
SELECT 
  'payrolls' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payrolls') 
       THEN 'EXISTS' ELSE 'NOT EXISTS' END as status
UNION ALL
SELECT 
  'signature_logs' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'signature_logs') 
       THEN 'EXISTS' ELSE 'NOT EXISTS' END as status
UNION ALL
SELECT 
  'department_permissions' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'department_permissions') 
       THEN 'EXISTS' ELSE 'NOT EXISTS' END as status
UNION ALL
SELECT 
  'management_signatures' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'management_signatures') 
       THEN 'EXISTS' ELSE 'NOT EXISTS' END as status
UNION ALL
SELECT 
  'access_logs' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'access_logs') 
       THEN 'EXISTS' ELSE 'NOT EXISTS' END as status
UNION ALL
SELECT 
  'payroll_audit_logs' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payroll_audit_logs') 
       THEN 'EXISTS' ELSE 'NOT EXISTS' END as status
UNION ALL
SELECT 
  'employee_audit_logs' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employee_audit_logs') 
       THEN 'EXISTS' ELSE 'NOT EXISTS' END as status;
