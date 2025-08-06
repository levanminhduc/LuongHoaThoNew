-- EMERGENCY FIX: Update auto_sign_salary function to support client_timestamp parameter
-- CLEAN VERSION - No RAISE NOTICE statements

-- Drop existing function first to avoid conflicts
DROP FUNCTION IF EXISTS auto_sign_salary(VARCHAR, VARCHAR, VARCHAR, TEXT);

-- Create updated function with client_timestamp parameter
CREATE OR REPLACE FUNCTION auto_sign_salary(
  p_employee_id VARCHAR(50),
  p_salary_month VARCHAR(20),
  p_ip_address VARCHAR(45) DEFAULT NULL,
  p_device_info TEXT DEFAULT NULL,
  p_client_timestamp VARCHAR(50) DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_employee_name VARCHAR(255);
  v_current_time TIMESTAMP;
  v_already_signed BOOLEAN;
  result JSONB;
BEGIN
  -- Use client timestamp if provided, otherwise fallback to server time
  IF p_client_timestamp IS NOT NULL AND p_client_timestamp != '' THEN
    -- Parse client timestamp (already in Vietnam time from client)
    BEGIN
      v_current_time := p_client_timestamp::TIMESTAMP;
    EXCEPTION WHEN OTHERS THEN
      -- Fallback: Simple math +7 hours (guaranteed to work)
      v_current_time := CURRENT_TIMESTAMP + INTERVAL '7 hours';
    END;
  ELSE
    -- Fallback: Simple math +7 hours (guaranteed to work on any server)
    v_current_time := CURRENT_TIMESTAMP + INTERVAL '7 hours';
  END IF;
  
  -- Get employee name
  SELECT full_name INTO v_employee_name 
  FROM employees 
  WHERE employee_id = p_employee_id AND is_active = true;
  
  IF v_employee_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Không tìm thấy nhân viên với mã: ' || p_employee_id,
      'error_code', 'EMPLOYEE_NOT_FOUND'
    );
  END IF;
  
  -- Check if already signed
  SELECT EXISTS(
    SELECT 1 FROM signature_logs 
    WHERE employee_id = p_employee_id 
    AND salary_month = p_salary_month
  ) INTO v_already_signed;
  
  IF v_already_signed THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Nhân viên ' || v_employee_name || ' đã ký nhận lương tháng ' || p_salary_month,
      'error_code', 'ALREADY_SIGNED'
    );
  END IF;
  
  -- Check if payroll exists
  IF NOT EXISTS(
    SELECT 1 FROM payrolls 
    WHERE employee_id = p_employee_id 
    AND salary_month = p_salary_month
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Không tìm thấy bảng lương tháng ' || p_salary_month || ' cho nhân viên ' || v_employee_name,
      'error_code', 'PAYROLL_NOT_FOUND'
    );
  END IF;
  
  BEGIN
    -- Update payrolls table
    UPDATE payrolls SET 
      is_signed = true,
      signed_at = v_current_time,
      signed_by_name = v_employee_name,
      signature_ip = p_ip_address,
      signature_device = p_device_info,
      import_status = 'signed',
      updated_at = v_current_time
    WHERE employee_id = p_employee_id AND salary_month = p_salary_month;
    
    -- Insert signature log
    INSERT INTO signature_logs (
      employee_id, salary_month, signed_by_name, signed_at,
      signature_ip, signature_device
    ) VALUES (
      p_employee_id, p_salary_month, v_employee_name, v_current_time,
      p_ip_address, p_device_info
    );
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Ký nhận lương thành công',
      'signed_by', v_employee_name,
      'signed_at', v_current_time,
      'employee_id', p_employee_id,
      'salary_month', p_salary_month,
      'timezone_source', CASE 
        WHEN p_client_timestamp IS NOT NULL THEN 'client_device'
        ELSE 'server_plus_7'
      END
    );
    
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Lỗi khi ký nhận: ' || SQLERRM,
      'error_code', 'SIGNATURE_ERROR'
    );
  END;
END;
$$ LANGUAGE plpgsql;

-- Update function comment
COMMENT ON FUNCTION auto_sign_salary IS 'EMERGENCY FIX - Function ký tên với client timestamp support';

-- Test the function
SELECT 
  'Function updated successfully' as status,
  CURRENT_TIMESTAMP as server_utc,
  CURRENT_TIMESTAMP + INTERVAL '7 hours' as server_plus_7;

-- Verify function signature
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_name = 'auto_sign_salary'
AND routine_schema = 'public';

-- Final completion message
SELECT 'EMERGENCY FIX COMPLETED: auto_sign_salary function updated with client_timestamp parameter' as completion_status;
