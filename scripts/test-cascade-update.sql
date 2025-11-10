-- =====================================================
-- TEST SCRIPT: Cascade Update Employee ID
-- =====================================================
-- Purpose: Verify cascade update hoạt động đúng cho cả employee_id và signed_by_admin_id
-- Date: 2025-11-10
-- Author: System Enhancement

-- ===== TEST SETUP =====
BEGIN;

-- Create test employee
INSERT INTO employees (employee_id, full_name, chuc_vu, department, is_active)
VALUES ('TEST001', 'Test Employee 001', 'Công nhân', 'May', true)
ON CONFLICT (employee_id) DO NOTHING;

-- Create test admin employee
INSERT INTO employees (employee_id, full_name, chuc_vu, department, is_active)
VALUES ('ADMIN001', 'Test Admin 001', 'Quản lý', 'Văn phòng', true)
ON CONFLICT (employee_id) DO NOTHING;

-- Create test payroll record with employee_id
INSERT INTO payrolls (
  employee_id, 
  full_name, 
  salary_month, 
  is_signed, 
  signed_by_admin_id
)
VALUES (
  'TEST001', 
  'Test Employee 001', 
  '2025-11', 
  true, 
  'ADMIN001'
)
ON CONFLICT (employee_id, salary_month) DO UPDATE
SET signed_by_admin_id = 'ADMIN001';

-- Create test signature log with employee_id
INSERT INTO signature_logs (
  employee_id, 
  salary_month, 
  signed_by_name, 
  signed_at,
  signed_by_admin_id
)
VALUES (
  'TEST001', 
  '2025-11', 
  'Test Employee 001', 
  NOW(),
  'ADMIN001'
);

COMMIT;

-- ===== VERIFY BEFORE UPDATE =====
SELECT '===== BEFORE UPDATE =====' as info;

SELECT 'Payrolls with TEST001 as employee_id:' as info;
SELECT employee_id, full_name, salary_month, signed_by_admin_id
FROM payrolls
WHERE employee_id = 'TEST001';

SELECT 'Payrolls with ADMIN001 as signed_by_admin_id:' as info;
SELECT employee_id, full_name, salary_month, signed_by_admin_id
FROM payrolls
WHERE signed_by_admin_id = 'ADMIN001';

SELECT 'Signature logs with TEST001 as employee_id:' as info;
SELECT employee_id, salary_month, signed_by_name, signed_by_admin_id
FROM signature_logs
WHERE employee_id = 'TEST001';

SELECT 'Signature logs with ADMIN001 as signed_by_admin_id:' as info;
SELECT employee_id, salary_month, signed_by_name, signed_by_admin_id
FROM signature_logs
WHERE signed_by_admin_id = 'ADMIN001';

-- ===== TEST 1: UPDATE EMPLOYEE_ID (CASCADE TO EMPLOYEE_ID REFERENCES) =====
SELECT '===== TEST 1: UPDATE EMPLOYEE_ID =====' as info;

BEGIN;

UPDATE employees
SET employee_id = 'TEST002'
WHERE employee_id = 'TEST001';

-- Verify cascade update for employee_id
SELECT 'After updating TEST001 → TEST002:' as info;

SELECT 'Payrolls with TEST002 as employee_id (should have 1 record):' as info;
SELECT employee_id, full_name, salary_month, signed_by_admin_id
FROM payrolls
WHERE employee_id = 'TEST002';

SELECT 'Payrolls with TEST001 as employee_id (should have 0 records):' as info;
SELECT employee_id, full_name, salary_month, signed_by_admin_id
FROM payrolls
WHERE employee_id = 'TEST001';

SELECT 'Signature logs with TEST002 as employee_id (should have 1 record):' as info;
SELECT employee_id, salary_month, signed_by_name, signed_by_admin_id
FROM signature_logs
WHERE employee_id = 'TEST002';

SELECT 'Signature logs with TEST001 as employee_id (should have 0 records):' as info;
SELECT employee_id, salary_month, signed_by_name, signed_by_admin_id
FROM signature_logs
WHERE employee_id = 'TEST001';

COMMIT;

-- ===== TEST 2: UPDATE ADMIN EMPLOYEE_ID (CASCADE TO SIGNED_BY_ADMIN_ID) =====
SELECT '===== TEST 2: UPDATE ADMIN EMPLOYEE_ID =====' as info;

BEGIN;

UPDATE employees
SET employee_id = 'ADMIN002'
WHERE employee_id = 'ADMIN001';

-- Verify cascade update for signed_by_admin_id
SELECT 'After updating ADMIN001 → ADMIN002:' as info;

SELECT 'Payrolls with ADMIN002 as signed_by_admin_id (should have 1 record):' as info;
SELECT employee_id, full_name, salary_month, signed_by_admin_id
FROM payrolls
WHERE signed_by_admin_id = 'ADMIN002';

SELECT 'Payrolls with ADMIN001 as signed_by_admin_id (should have 0 records):' as info;
SELECT employee_id, full_name, salary_month, signed_by_admin_id
FROM payrolls
WHERE signed_by_admin_id = 'ADMIN001';

SELECT 'Signature logs with ADMIN002 as signed_by_admin_id (should have 1 record):' as info;
SELECT employee_id, salary_month, signed_by_name, signed_by_admin_id
FROM signature_logs
WHERE signed_by_admin_id = 'ADMIN002';

SELECT 'Signature logs with ADMIN001 as signed_by_admin_id (should have 0 records):' as info;
SELECT employee_id, salary_month, signed_by_name, signed_by_admin_id
FROM signature_logs
WHERE signed_by_admin_id = 'ADMIN001';

COMMIT;

-- ===== VERIFY CONSTRAINTS =====
SELECT '===== VERIFY CONSTRAINTS =====' as info;

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
    AND (
        (tc.table_name = 'payrolls' AND kcu.column_name IN ('employee_id', 'signed_by_admin_id'))
        OR (tc.table_name = 'signature_logs' AND kcu.column_name IN ('employee_id', 'signed_by_admin_id'))
    )
ORDER BY tc.table_name, kcu.column_name;

-- ===== CLEANUP =====
SELECT '===== CLEANUP =====' as info;

BEGIN;

DELETE FROM signature_logs WHERE employee_id = 'TEST002';
DELETE FROM payrolls WHERE employee_id = 'TEST002';
DELETE FROM employees WHERE employee_id IN ('TEST002', 'ADMIN002');

COMMIT;

SELECT '✅ TEST COMPLETED!' as status;

