-- SCRIPT: FORCE VIETNAM TIMEZONE IN SIGNATURE FUNCTION
-- Fix thời gian ký lương để đúng múi giờ Việt Nam (+7)

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
  result JSONB;
BEGIN
  -- ✅ FORCE VIETNAM TIMEZONE (+7) - CHẮC CHẮN ĐÚNG
  v_current_time := (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh');
  
  -- Debug: Log timezone để kiểm tra
  RAISE NOTICE 'UTC Time: %, Vietnam Time: %', CURRENT_TIMESTAMP, v_current_time;
  
  -- Lấy tên nhân viên
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
  
  -- Kiểm tra có dữ liệu lương không
  IF NOT EXISTS(SELECT 1 FROM payrolls WHERE employee_id = p_employee_id AND salary_month = p_salary_month) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Không có dữ liệu lương tháng này',
      'error_code', 'NO_SALARY_DATA'
    );
  END IF;
  
  -- Kiểm tra đã ký chưa
  SELECT EXISTS(
    SELECT 1 FROM signature_logs 
    WHERE employee_id = p_employee_id AND salary_month = p_salary_month
  ) INTO v_already_signed;
  
  IF v_already_signed THEN
    -- Lấy thông tin ký cũ
    SELECT signed_at, signed_by_name INTO v_current_time, v_employee_name
    FROM signature_logs 
    WHERE employee_id = p_employee_id AND salary_month = p_salary_month;
    
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Bạn đã ký nhận lương tháng này rồi',
      'error_code', 'ALREADY_SIGNED',
      'signed_by', v_employee_name,
      'signed_at', v_current_time,
      'employee_id', p_employee_id,
      'salary_month', p_salary_month
    );
  END IF;
  
  BEGIN
    -- ✅ SỬ DỤNG VIETNAM TIME CHO TẤT CẢ TIMESTAMPS
    UPDATE payrolls SET 
      is_signed = true,
      signed_at = v_current_time,  -- Vietnam time
      signed_by_name = v_employee_name,
      signature_ip = p_ip_address,
      signature_device = p_device_info,
      import_status = 'signed',
      updated_at = v_current_time  -- Vietnam time
    WHERE employee_id = p_employee_id AND salary_month = p_salary_month;
    
    -- ✅ INSERT VỚI VIETNAM TIME
    INSERT INTO signature_logs (
      employee_id, salary_month, signed_by_name, signed_at,
      signature_ip, signature_device
    ) VALUES (
      p_employee_id, p_salary_month, v_employee_name, v_current_time,  -- Vietnam time
      p_ip_address, p_device_info
    );
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Ký nhận lương thành công',
      'signed_by', v_employee_name,
      'signed_at', v_current_time,  -- Return Vietnam time
      'employee_id', p_employee_id,
      'salary_month', p_salary_month,
      'timezone_info', 'Vietnam (+7)'
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

-- Comment
COMMENT ON FUNCTION auto_sign_salary IS 'Function ký tên - FORCE Vietnam timezone (+7) - Fixed version';

-- Test timezone
SELECT 
  'Function updated with Vietnam timezone' as status,
  CURRENT_TIMESTAMP as utc_now,
  (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh') as vietnam_now;
