-- VERIFICATION SCRIPT: Bulk Signature Feature Complete Setup
-- Kiểm tra tất cả migrations đã chạy thành công
-- Run this after completing all 4 migration files (22-25)

-- ===== 1. CHECK SECURITY_LOGS TABLE =====
SELECT 
  'security_logs table' as check_item,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'security_logs'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

-- ===== 2. CHECK SECURITY_LOGS TRIGGER =====
SELECT 
  'security_logs timezone trigger' as check_item,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.triggers 
      WHERE trigger_schema = 'public' 
        AND event_object_table = 'security_logs'
        AND trigger_name = 'set_vietnam_timestamp_security_logs'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

-- ===== 3. CHECK BULK SIGNATURE FUNCTION =====
SELECT 
  'bulk_sign_salaries function' as check_item,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_schema = 'public' 
        AND routine_name = 'bulk_sign_salaries'
        AND routine_type = 'FUNCTION'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

-- ===== 4. CHECK BULK SIGNATURE INDEXES =====
SELECT 
  'payrolls_bulk_signature_idx index' as check_item,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND tablename = 'payrolls'
        AND indexname = 'payrolls_bulk_signature_idx'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

SELECT 
  'signature_logs_bulk_idx index' as check_item,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND tablename = 'signature_logs'
        AND indexname = 'signature_logs_bulk_idx'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

-- ===== 5. TEST BULK SIGNATURE FUNCTION =====
-- Test với empty array (dry run)
SELECT
  'bulk_sign_salaries test' as check_item,
  CASE
    WHEN (
      SELECT (bulk_sign_salaries(
        ARRAY[]::VARCHAR[],  -- empty employee_ids array
        '2099-12',           -- salary_month (future month with no data)
        '127.0.0.1',         -- ip_address
        'test',              -- device_info
        'admin',             -- admin_id
        'Test Admin',        -- admin_name
        'TEST_BATCH_001'     -- bulk_batch_id
      )->>'success')::boolean
    ) = true THEN '✅ FUNCTION WORKS (empty array test passed)'
    ELSE '⚠️  UNEXPECTED RESULT'
  END as status;

-- ===== 6. CHECK AUTO_SIGN_SALARY FUNCTION (REQUIRED) =====
SELECT 
  'auto_sign_salary function' as check_item,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_schema = 'public' 
        AND routine_name = 'auto_sign_salary'
        AND routine_type = 'FUNCTION'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING (REQUIRED FOR BULK SIGNATURE)'
  END as status;

-- ===== 7. CHECK PAYROLLS TABLE STRUCTURE =====
SELECT 
  'payrolls.is_signed column' as check_item,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'payrolls'
        AND column_name = 'is_signed'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

-- ===== 8. CHECK SIGNATURE_LOGS TABLE STRUCTURE =====
SELECT 
  'signature_logs table structure' as check_item,
  CASE 
    WHEN (
      SELECT COUNT(*) FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'signature_logs'
    ) >= 8 THEN '✅ COMPLETE'
    ELSE '❌ INCOMPLETE'
  END as status;

-- ===== 9. FINAL SUMMARY =====
SELECT 
  '🎯 BULK SIGNATURE SETUP STATUS' as summary,
  CASE 
    WHEN (
      -- All critical components exist
      EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'bulk_sign_salaries')
      AND EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'auto_sign_salary')
      AND EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'payrolls_bulk_signature_idx')
      AND EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'signature_logs_bulk_idx')
      AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'security_logs')
    ) THEN '✅ COMPLETE - Ready for bulk signature operations'
    ELSE '❌ INCOMPLETE - Please run missing migrations'
  END as status;

-- ===== 10. COUNT UNSIGNED PAYROLLS (EXAMPLE) =====
SELECT 
  'Unsigned payrolls count' as info,
  COUNT(*) as count,
  'Run bulk_sign_salaries to sign these records' as action
FROM payrolls 
WHERE is_signed = false;

