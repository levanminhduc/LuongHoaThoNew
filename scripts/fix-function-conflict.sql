-- FIX FUNCTION CONFLICT: auto_sign_salary
-- Problem: Multiple function signatures causing "Could not choose the best candidate function"

-- Drop all versions of auto_sign_salary function
DROP FUNCTION IF EXISTS auto_sign_salary(VARCHAR, VARCHAR, VARCHAR, TEXT);
DROP FUNCTION IF EXISTS auto_sign_salary(VARCHAR, VARCHAR, VARCHAR, TEXT, VARCHAR);
DROP FUNCTION IF EXISTS public.auto_sign_salary(VARCHAR, VARCHAR, VARCHAR, TEXT);
DROP FUNCTION IF EXISTS public.auto_sign_salary(VARCHAR, VARCHAR, VARCHAR, TEXT, VARCHAR);

-- Create single clean version
CREATE OR REPLACE FUNCTION auto_sign_salary(
  p_employee_id VARCHAR(50),
  p_salary_month VARCHAR(20),
  p_ip_address VARCHAR(45) DEFAULT NULL,
  p_device_info TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_employee_name VARCHAR(255);
  v_current_time TIMESTAMP;
  v_already_signed BOOLEAN;
BEGIN
  -- Use server UTC time, convert to Vietnam timezone
  v_current_time := (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh');
  
  -- Get employee name
  SELECT full_name INTO v_employee_name 
  FROM employees 
  WHERE employee_id = p_employee_id AND is_active = true;
  
  IF v_employee_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Không tìm thấy nhân viên hoặc nhân viên không còn hoạt động',
      'error_code', 'EMPLOYEE_NOT_FOUND'
    );
  END IF;
  
  -- Check if already signed
  SELECT is_signed INTO v_already_signed 
  FROM payrolls 
  WHERE employee_id = p_employee_id AND salary_month = p_salary_month;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Không tìm thấy bảng lương cho tháng này',
      'error_code', 'PAYROLL_NOT_FOUND'
    );
  END IF;
  
  IF v_already_signed THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Bảng lương đã được ký trước đó',
      'error_code', 'ALREADY_SIGNED'
    );
  END IF;
  
  -- Perform signature
  BEGIN
    -- Update payrolls
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
      'timezone_info', 'Fixed - Single function version'
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

-- Add comment
COMMENT ON FUNCTION auto_sign_salary IS 'FIXED - Single version function for salary signature';

-- Test the function
SELECT 'Function conflict fixed successfully' as status;
