-- =====================================================
-- STEP 24: UPDATE AUTO SIGN SALARY FUNCTION WITH ADMIN TRACKING
-- =====================================================
-- Purpose: Thêm parameter p_admin_id để track admin bulk signature
-- Date: 2025-11-04
-- Author: System Enhancement

-- ===== DROP EXISTING FUNCTION =====
DROP FUNCTION IF EXISTS auto_sign_salary(VARCHAR, VARCHAR, VARCHAR, TEXT);

-- ===== CREATE UPDATED FUNCTION =====
CREATE OR REPLACE FUNCTION auto_sign_salary(
  p_employee_id VARCHAR(50),
  p_salary_month VARCHAR(20),
  p_ip_address VARCHAR(45) DEFAULT NULL,
  p_device_info TEXT DEFAULT NULL,
  p_admin_id VARCHAR(50) DEFAULT NULL  -- ✅ NEW PARAMETER
) RETURNS JSONB AS $$
DECLARE
  v_employee_name VARCHAR(255);
  v_current_time TIMESTAMP;
  result JSONB;
BEGIN
  -- Lấy thời gian hiện tại theo múi giờ Việt Nam (+7)
  v_current_time := CURRENT_TIMESTAMP + INTERVAL '7 hours';
  
  -- Lấy tên nhân viên từ employees table
  SELECT full_name INTO v_employee_name 
  FROM employees 
  WHERE employee_id = p_employee_id AND is_active = true;
  
  -- Validation: Employee not found
  IF v_employee_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Không tìm thấy thông tin nhân viên',
      'error_code', 'EMPLOYEE_NOT_FOUND',
      'employee_id', p_employee_id
    );
  END IF;
  
  -- Validation: Already signed
  IF EXISTS(
    SELECT 1 FROM payrolls 
    WHERE employee_id = p_employee_id 
      AND salary_month = p_salary_month 
      AND is_signed = true
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Đã ký nhận lương tháng này rồi',
      'error_code', 'ALREADY_SIGNED',
      'employee_id', p_employee_id,
      'salary_month', p_salary_month
    );
  END IF;
  
  -- Validation: No payroll data
  IF NOT EXISTS(
    SELECT 1 FROM payrolls 
    WHERE employee_id = p_employee_id 
      AND salary_month = p_salary_month
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Không có dữ liệu lương tháng này',
      'error_code', 'NO_SALARY_DATA',
      'employee_id', p_employee_id,
      'salary_month', p_salary_month
    );
  END IF;
  
  -- Perform signature operations
  BEGIN
    -- Update payrolls table
    UPDATE payrolls SET 
      is_signed = true,
      signed_at = v_current_time,
      signed_by_name = v_employee_name,        -- ✅ TÊN NHÂN VIÊN (không phải admin)
      signed_by_admin_id = p_admin_id,         -- ✅ NEW: Track admin nếu có
      signature_ip = p_ip_address,
      signature_device = p_device_info,
      import_status = 'signed',
      updated_at = v_current_time
    WHERE employee_id = p_employee_id 
      AND salary_month = p_salary_month;
    
    -- Insert signature log
    INSERT INTO signature_logs (
      employee_id, 
      salary_month, 
      signed_by_name, 
      signed_at,
      signature_ip, 
      signature_device,
      signed_by_admin_id  -- ✅ NEW: Track admin nếu có
    ) VALUES (
      p_employee_id, 
      p_salary_month, 
      v_employee_name,    -- ✅ TÊN NHÂN VIÊN (không phải admin)
      v_current_time,
      p_ip_address, 
      p_device_info,
      p_admin_id          -- ✅ NEW: Track admin nếu có
    );
    
    -- Return success
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Ký nhận lương thành công',
      'signed_by', v_employee_name,
      'signed_at', v_current_time,
      'employee_id', p_employee_id,
      'salary_month', p_salary_month,
      'signed_by_admin', p_admin_id IS NOT NULL,  -- ✅ NEW: Flag admin signature
      'admin_id', p_admin_id                      -- ✅ NEW: Admin ID if applicable
    );
    
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Lỗi khi ký nhận: ' || SQLERRM,
      'error_code', 'SIGNATURE_ERROR',
      'employee_id', p_employee_id,
      'salary_month', p_salary_month
    );
  END;
END;
$$ LANGUAGE plpgsql;

-- ===== ADD COMMENT =====
COMMENT ON FUNCTION auto_sign_salary IS 
'Function ký tên tự động - hỗ trợ tracking admin signature. 
Parameters:
- p_employee_id: Mã nhân viên
- p_salary_month: Tháng lương (YYYY-MM)
- p_ip_address: IP address
- p_device_info: Device/browser info
- p_admin_id: Mã admin (NULL nếu employee tự ký)

Returns: JSONB với success status và thông tin ký';

-- ===== VERIFICATION =====
DO $$
DECLARE
  v_function_exists BOOLEAN;
  v_param_count INTEGER;
BEGIN
  -- Check if function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'auto_sign_salary'
  ) INTO v_function_exists;
  
  -- Count parameters
  SELECT pronargs INTO v_param_count
  FROM pg_proc 
  WHERE proname = 'auto_sign_salary'
  LIMIT 1;
  
  -- Report results
  IF v_function_exists THEN
    RAISE NOTICE '✅ SUCCESS: auto_sign_salary function updated successfully';
    RAISE NOTICE '   - Parameters: %', v_param_count;
    RAISE NOTICE '   - New parameter: p_admin_id (VARCHAR(50) DEFAULT NULL)';
  ELSE
    RAISE WARNING '⚠️ WARNING: Function update may have failed';
  END IF;
END $$;

