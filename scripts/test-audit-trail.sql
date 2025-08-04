-- TEST AUDIT TRAIL FUNCTIONALITY
-- Chạy script này để test audit trail sau khi fix

-- ===== 1. KIỂM TRA TABLE VÀ STRUCTURE =====
-- Check if audit table exists
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'payroll_audit_logs';

-- Check table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'payroll_audit_logs' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ===== 2. KIỂM TRA RLS VÀ POLICIES =====
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

-- ===== 3. KIỂM TRA DỮ LIỆU =====
-- Check data count
SELECT 'payroll_audit_logs' as table_name, COUNT(*) as record_count 
FROM payroll_audit_logs;

-- Sample audit data
SELECT 
  id,
  payroll_id,
  employee_id,
  salary_month,
  changed_by,
  changed_at,
  change_reason,
  field_name,
  old_value,
  new_value
FROM payroll_audit_logs 
ORDER BY changed_at DESC
LIMIT 5;

-- ===== 4. TEST QUERY GIỐNG API =====
-- Test query exactly like API does
SELECT *
FROM payroll_audit_logs
WHERE payroll_id = (SELECT id FROM payrolls LIMIT 1)
ORDER BY changed_at DESC;

-- ===== 5. TEST JOIN VỚI PAYROLLS =====
-- Test join with payrolls table
SELECT 
  pal.id,
  pal.payroll_id,
  pal.employee_id,
  pal.changed_by,
  pal.changed_at,
  pal.change_reason,
  pal.field_name,
  p.salary_month,
  e.full_name
FROM payroll_audit_logs pal
LEFT JOIN payrolls p ON pal.payroll_id = p.id
LEFT JOIN employees e ON pal.employee_id = e.employee_id
ORDER BY pal.changed_at DESC
LIMIT 5;

-- ===== 6. TẠO SAMPLE DATA NẾU CHƯA CÓ =====
-- Insert sample audit data for testing
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
  'Test audit trail functionality',
  'tien_luong_thuc_nhan_cuoi_ky',
  '0',
  COALESCE(p.tien_luong_thuc_nhan_cuoi_ky::text, '0')
FROM payrolls p
WHERE NOT EXISTS (
  SELECT 1 FROM payroll_audit_logs 
  WHERE payroll_id = p.id 
    AND change_reason = 'Test audit trail functionality'
)
LIMIT 3;

-- ===== 7. VERIFY SAMPLE DATA =====
-- Check if sample data was inserted
SELECT 
  COUNT(*) as sample_records
FROM payroll_audit_logs 
WHERE change_reason = 'Test audit trail functionality';

-- ===== 8. TEST SPECIFIC PAYROLL ID =====
-- Test with a specific payroll ID (replace with actual ID)
DO $$
DECLARE
  test_payroll_id INTEGER;
BEGIN
  -- Get first payroll ID
  SELECT id INTO test_payroll_id FROM payrolls LIMIT 1;
  
  IF test_payroll_id IS NOT NULL THEN
    RAISE NOTICE 'Testing with payroll ID: %', test_payroll_id;
    
    -- Show audit data for this payroll
    PERFORM * FROM payroll_audit_logs WHERE payroll_id = test_payroll_id;
    
    IF NOT FOUND THEN
      RAISE NOTICE 'No audit data found for payroll ID: %', test_payroll_id;
    ELSE
      RAISE NOTICE 'Audit data exists for payroll ID: %', test_payroll_id;
    END IF;
  ELSE
    RAISE NOTICE 'No payroll records found in database';
  END IF;
END $$;

-- ===== 9. FINAL VERIFICATION =====
-- Summary of audit trail setup
SELECT 
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payroll_audit_logs') 
    THEN 'ERROR: payroll_audit_logs table does not exist'
    WHEN (SELECT rowsecurity FROM pg_tables WHERE tablename = 'payroll_audit_logs') = false
    THEN 'WARNING: RLS is disabled on payroll_audit_logs'
    WHEN NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payroll_audit_logs' AND policyname LIKE '%service_client%')
    THEN 'ERROR: No service client policy found for payroll_audit_logs'
    WHEN (SELECT COUNT(*) FROM payroll_audit_logs) = 0 
    THEN 'WARNING: payroll_audit_logs table is empty'
    ELSE 'OK: Audit trail setup appears correct'
  END as audit_diagnostic_result;

-- Show final counts
SELECT 
  'payrolls' as table_name, 
  COUNT(*) as record_count 
FROM payrolls
UNION ALL
SELECT 
  'payroll_audit_logs' as table_name, 
  COUNT(*) as record_count 
FROM payroll_audit_logs;
