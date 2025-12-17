-- TEST SCRIPT: Verify Migration 29 Results
-- Chạy script này sau khi chạy migration 29 để verify kết quả

-- ===== TEST 1: VERIFY INDEX STRUCTURE =====
SELECT 
  '=== PAYROLLS TABLE INDEXES ===' as test_section;

SELECT 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename = 'payrolls' 
  AND indexname LIKE '%unique%'
ORDER BY indexname;

SELECT 
  '=== SIGNATURE_LOGS TABLE INDEXES ===' as test_section;

SELECT 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename = 'signature_logs' 
  AND indexname LIKE '%unique%'
ORDER BY indexname;

SELECT 
  '=== MANAGEMENT_SIGNATURES TABLE INDEXES ===' as test_section;

SELECT 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename = 'management_signatures' 
  AND indexname LIKE '%unique%'
ORDER BY indexname;

-- ===== TEST 2: CHECK FOR DUPLICATES =====
SELECT 
  '=== CHECKING PAYROLLS DUPLICATES ===' as test_section;

SELECT 
  employee_id, 
  salary_month, 
  COUNT(*) as duplicate_count,
  STRING_AGG(DISTINCT payroll_type, ', ') as payroll_types,
  STRING_AGG(id::text, ', ') as record_ids
FROM payrolls
GROUP BY employee_id, salary_month
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 10;

SELECT 
  '=== CHECKING SIGNATURE_LOGS DUPLICATES ===' as test_section;

SELECT 
  employee_id, 
  salary_month, 
  COUNT(*) as duplicate_count,
  STRING_AGG(DISTINCT payroll_type, ', ') as payroll_types
FROM signature_logs
GROUP BY employee_id, salary_month
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 10;

SELECT 
  '=== CHECKING MANAGEMENT_SIGNATURES DUPLICATES ===' as test_section;

SELECT 
  salary_month, 
  signature_type, 
  COUNT(*) as duplicate_count,
  STRING_AGG(DISTINCT payroll_type, ', ') as payroll_types,
  STRING_AGG(id::text, ', ') as record_ids
FROM management_signatures
WHERE is_active = true
GROUP BY salary_month, signature_type
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 10;

-- ===== TEST 3: VERIFY DATA INTEGRITY =====
SELECT 
  '=== PAYROLLS DATA INTEGRITY ===' as test_section;

SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT employee_id) as unique_employees,
  COUNT(DISTINCT salary_month) as unique_months,
  COUNT(DISTINCT payroll_type) as unique_payroll_types
FROM payrolls;

SELECT 
  '=== SIGNATURE_LOGS DATA INTEGRITY ===' as test_section;

SELECT 
  COUNT(*) as total_signatures,
  COUNT(DISTINCT employee_id) as unique_employees,
  COUNT(DISTINCT salary_month) as unique_months
FROM signature_logs;

SELECT 
  '=== MANAGEMENT_SIGNATURES DATA INTEGRITY ===' as test_section;

SELECT 
  COUNT(*) as total_signatures,
  COUNT(DISTINCT salary_month) as unique_months,
  COUNT(DISTINCT signature_type) as unique_signature_types,
  COUNT(*) FILTER (WHERE is_active = true) as active_signatures
FROM management_signatures;

-- ===== TEST 4: TEST INSERT WITH NEW CONSTRAINT =====
SELECT 
  '=== TESTING INSERT OPERATIONS ===' as test_section;

DO $$
DECLARE
  test_employee_id VARCHAR := 'TEST_EMP_001';
  test_salary_month VARCHAR := '2024-12';
BEGIN
  DELETE FROM payrolls WHERE employee_id = test_employee_id;
  
  INSERT INTO payrolls (employee_id, salary_month, payroll_type)
  VALUES (test_employee_id, test_salary_month, 'monthly');
  
  RAISE NOTICE 'Test 1: Insert monthly payroll - SUCCESS';
  
  BEGIN
    INSERT INTO payrolls (employee_id, salary_month, payroll_type)
    VALUES (test_employee_id, test_salary_month, 't13');
    RAISE NOTICE 'Test 2: Insert duplicate with different payroll_type - FAILED (should have raised error)';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'Test 2: Insert duplicate with different payroll_type - SUCCESS (correctly blocked)';
  END;
  
  DELETE FROM payrolls WHERE employee_id = test_employee_id;
  RAISE NOTICE 'Test cleanup completed';
END $$;

-- ===== SUMMARY =====
SELECT 
  '=== MIGRATION 29 VERIFICATION COMPLETE ===' as summary;

