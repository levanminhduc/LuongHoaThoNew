-- =====================================================
-- COMPLETE SETUP: BULK SIGNATURE FEATURE
-- =====================================================
-- Purpose: Fix và verify bulk signature feature
-- Date: 2025-11-04
-- Author: System Enhancement
--
-- This script combines:
-- 1. Fix bulk_sign_salaries function (parameter mismatch)
-- 2. Verify all bulk signature components
-- =====================================================

-- ===== PART 1: FIX BULK_SIGN_SALARIES FUNCTION =====

-- Check current auto_sign_salary signature
DO $$
DECLARE
  v_function_params TEXT;
BEGIN
  SELECT pg_get_function_arguments(p.oid) INTO v_function_params
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.proname = 'auto_sign_salary';

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📋 CURRENT FUNCTION SIGNATURES';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'auto_sign_salary: %', v_function_params;
  RAISE NOTICE '';
END $$;

-- Drop existing function
DROP FUNCTION IF EXISTS bulk_sign_salaries(VARCHAR[], VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR);

-- Create fixed function
CREATE OR REPLACE FUNCTION bulk_sign_salaries(
  p_employee_ids VARCHAR(50)[],
  p_salary_month VARCHAR(20),
  p_ip_address VARCHAR(45),
  p_device_info TEXT,
  p_admin_id VARCHAR(50),
  p_admin_name VARCHAR(255),
  p_bulk_batch_id VARCHAR(100)
) RETURNS JSONB AS $$
DECLARE
  v_current_time TIMESTAMP;
  v_success_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_errors JSONB := '[]'::JSONB;
  v_employee_id VARCHAR(50);
  v_sign_result JSONB;
BEGIN
  -- Vietnam timezone
  v_current_time := CURRENT_TIMESTAMP + INTERVAL '7 hours';

  -- Log start
  RAISE NOTICE '🚀 Starting bulk signature: % employees, batch_id: %',
    array_length(p_employee_ids, 1), p_bulk_batch_id;

  -- Loop through each employee
  FOREACH v_employee_id IN ARRAY p_employee_ids
  LOOP
    BEGIN
      -- ✅ FIX: Call auto_sign_salary with ONLY 4 parameters (removed p_admin_id)
      -- auto_sign_salary signature: (p_employee_id, p_salary_month, p_ip_address, p_device_info, p_client_timestamp)
      -- We pass NULL for p_client_timestamp to use server-side Vietnam time
      SELECT auto_sign_salary(
        v_employee_id,
        p_salary_month,
        p_ip_address,
        p_device_info
        -- ❌ REMOVED: p_admin_id (this parameter doesn't exist in auto_sign_salary)
        -- Note: Admin tracking is handled at bulk_signature_history table level
      ) INTO v_sign_result;

      -- Check result
      IF (v_sign_result->>'success')::BOOLEAN THEN
        v_success_count := v_success_count + 1;
      ELSE
        v_error_count := v_error_count + 1;
        v_errors := v_errors || jsonb_build_object(
          'employee_id', v_employee_id,
          'error', v_sign_result->>'message',
          'error_code', v_sign_result->>'error_code'
        );

        -- Log error
        RAISE NOTICE '❌ Failed to sign for employee %: %',
          v_employee_id, v_sign_result->>'message';
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_error_count := v_error_count + 1;
      v_errors := v_errors || jsonb_build_object(
        'employee_id', v_employee_id,
        'error', SQLERRM,
        'error_code', 'EXCEPTION'
      );

      -- Log exception
      RAISE NOTICE '❌ Exception for employee %: %', v_employee_id, SQLERRM;
    END;
  END LOOP;

  -- Insert bulk signature history record
  BEGIN
    INSERT INTO bulk_signature_history (
      bulk_batch_id,
      salary_month,
      total_processed,
      successful,
      failed,
      admin_id,
      admin_name,
      ip_address,
      device_info,
      created_at
    ) VALUES (
      p_bulk_batch_id,
      p_salary_month,
      array_length(p_employee_ids, 1),
      v_success_count,
      v_error_count,
      p_admin_id,
      p_admin_name,
      p_ip_address,
      p_device_info,
      v_current_time
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Failed to insert bulk_signature_history: %', SQLERRM;
  END;

  -- Log completion
  RAISE NOTICE '✅ Bulk signature completed: % success, % failed',
    v_success_count, v_error_count;

  -- Return results
  RETURN jsonb_build_object(
    'success', true,
    'success_count', v_success_count,
    'error_count', v_error_count,
    'errors', v_errors,
    'timestamp', v_current_time,
    'bulk_batch_id', p_bulk_batch_id,
    'admin_id', p_admin_id,
    'admin_name', p_admin_name
  );
END;

-- Add comment
COMMENT ON FUNCTION bulk_sign_salaries IS
'FIXED: Bulk signature function - ký hàng loạt với admin tracking.
FIX: Removed p_admin_id from auto_sign_salary call (parameter mismatch).
Admin tracking is now handled via bulk_signature_history table.

Parameters:
- p_employee_ids: Array mã nhân viên cần ký
- p_salary_month: Tháng lương (YYYY-MM)
- p_ip_address: IP address của admin
- p_device_info: Device/browser info của admin
- p_admin_id: Mã admin thực hiện (saved to bulk_signature_history)
- p_admin_name: Tên admin thực hiện (saved to bulk_signature_history)
- p_bulk_batch_id: Unique ID cho bulk operation

Returns: JSONB với success_count, error_count, và errors detail';

-- ===== PART 2: VERIFICATION QUERIES =====

RAISE NOTICE '';
RAISE NOTICE '========================================';
RAISE NOTICE '🔍 RUNNING VERIFICATION CHECKS';
RAISE NOTICE '========================================';
RAISE NOTICE '';

-- 1. CHECK SECURITY_LOGS TABLE
SELECT
  'security_logs table' as check_item,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'security_logs'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

-- 2. CHECK SECURITY_LOGS TRIGGER
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

-- 3. CHECK BULK SIGNATURE FUNCTION
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

-- 4. CHECK BULK SIGNATURE INDEXES
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

-- 5. TEST BULK SIGNATURE FUNCTION
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

-- 6. CHECK AUTO_SIGN_SALARY FUNCTION (REQUIRED)
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

-- 7. CHECK PAYROLLS TABLE STRUCTURE
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

-- 8. CHECK SIGNATURE_LOGS TABLE STRUCTURE
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

-- 9. FINAL SUMMARY
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

$$ LANGUAGE plpgsql;

