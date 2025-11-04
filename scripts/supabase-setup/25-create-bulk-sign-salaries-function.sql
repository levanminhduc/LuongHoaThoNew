-- =====================================================
-- STEP 25: CREATE BULK SIGN SALARIES FUNCTION
-- =====================================================
-- Purpose: Ký hàng loạt chữ ký với admin tracking
-- Date: 2025-11-04
-- Author: System Enhancement

-- ===== DROP EXISTING FUNCTION =====
DROP FUNCTION IF EXISTS bulk_sign_salaries(VARCHAR[], VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR);

-- ===== CREATE FUNCTION =====
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
      -- Call auto_sign_salary with admin tracking
      SELECT auto_sign_salary(
        v_employee_id,
        p_salary_month,
        p_ip_address,
        p_device_info,
        p_admin_id  -- ✅ Pass admin_id for tracking
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
'Bulk signature function - ký hàng loạt với admin tracking.
Parameters:
- p_employee_ids: Array mã nhân viên cần ký
- p_salary_month: Tháng lương (YYYY-MM)
- p_ip_address: IP address của admin
- p_device_info: Device/browser info của admin
- p_admin_id: Mã admin thực hiện
- p_admin_name: Tên admin thực hiện
- p_bulk_batch_id: Unique ID cho bulk operation

Returns: JSONB với success_count, error_count, và errors detail';

-- ===== VERIFICATION =====
DO $$
DECLARE
  v_function_exists BOOLEAN;
BEGIN
  -- Check if function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'bulk_sign_salaries'
  ) INTO v_function_exists;
  
  -- Report results
  IF v_function_exists THEN
    RAISE NOTICE '✅ SUCCESS: bulk_sign_salaries function created successfully';
    RAISE NOTICE '   - Function accepts 7 parameters';
    RAISE NOTICE '   - Returns JSONB with success/error counts';
  ELSE
    RAISE WARNING '⚠️ WARNING: Function creation may have failed';
  END IF;
END $$;

-- ===== SAMPLE USAGE (FOR TESTING) =====
-- Uncomment to test

/*
-- Test with 2 employees
SELECT bulk_sign_salaries(
  ARRAY['NV001', 'NV002'],  -- employee_ids
  '2024-11',                 -- salary_month
  '10.0.0.1',               -- ip_address
  'Test Browser',           -- device_info
  'ADMIN001',               -- admin_id
  'Admin Test',             -- admin_name
  'BULK_TEST_123'           -- bulk_batch_id
);
*/

