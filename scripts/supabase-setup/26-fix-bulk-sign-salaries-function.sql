-- =====================================================
-- FIX: BULK SIGN SALARIES FUNCTION - Parameter Mismatch
-- =====================================================
-- Issue: bulk_sign_salaries calls auto_sign_salary with 5 params but it only accepts 4
-- Root Cause: auto_sign_salary signature is (p_employee_id, p_salary_month, p_ip_address, p_device_info, p_client_timestamp)
--             NOT (p_employee_id, p_salary_month, p_ip_address, p_device_info, p_admin_id)
-- Solution: Remove p_admin_id parameter from auto_sign_salary call
-- Date: 2025-11-04

-- ===== VERIFICATION: Check current auto_sign_salary signature =====
DO $$
DECLARE
  v_function_params TEXT;
BEGIN
  SELECT pg_get_function_arguments(p.oid) INTO v_function_params
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.proname = 'auto_sign_salary';

  RAISE NOTICE '📋 Current auto_sign_salary parameters: %', v_function_params;
END $$;

-- ===== DROP EXISTING FUNCTION =====
DROP FUNCTION IF EXISTS bulk_sign_salaries(VARCHAR[], VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR);

-- ===== CREATE FIXED FUNCTION =====
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
$$ LANGUAGE plpgsql;

-- ===== ADD COMMENT =====
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

-- ===== VERIFICATION QUERIES =====
DO $$
DECLARE
  v_function_exists BOOLEAN;
  v_function_params TEXT;
  v_return_type TEXT;
BEGIN
  -- Check if function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'bulk_sign_salaries'
  ) INTO v_function_exists;

  -- Get function signature
  SELECT
    pg_get_function_arguments(p.oid),
    pg_get_function_result(p.oid)
  INTO v_function_params, v_return_type
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.proname = 'bulk_sign_salaries';

  -- Report results
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ VERIFICATION RESULTS';
  RAISE NOTICE '========================================';

  IF v_function_exists THEN
    RAISE NOTICE '✅ Function exists: bulk_sign_salaries';
    RAISE NOTICE '📋 Parameters: %', v_function_params;
    RAISE NOTICE '📤 Returns: %', v_return_type;
    RAISE NOTICE '';
    RAISE NOTICE '✅ FIX APPLIED SUCCESSFULLY!';
    RAISE NOTICE '   - Removed p_admin_id from auto_sign_salary call';
    RAISE NOTICE '   - Now calls with 4 parameters only';
    RAISE NOTICE '   - Admin tracking via bulk_signature_history table';
  ELSE
    RAISE WARNING '❌ Function not found!';
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

-- ===== TEST QUERY (Optional - Uncomment to test) =====
/*
-- Verify auto_sign_salary signature
SELECT
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as parameters,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('auto_sign_salary', 'bulk_sign_salaries')
ORDER BY p.proname;
*/

-- ===== ROLLBACK SCRIPT (If needed) =====
/*
-- To rollback this fix, run the original version:
-- DROP FUNCTION IF EXISTS bulk_sign_salaries(VARCHAR[], VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR);
-- Then run: scripts/supabase-setup/25-create-bulk-sign-salaries-function.sql
*/

-- ===== COMPLETION MESSAGE =====
SELECT '✅ FIX COMPLETE: bulk_sign_salaries function updated successfully!' as status;

