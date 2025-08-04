-- SCRIPT: FIX DUPLICATE SIGNATURE ERROR
-- Cập nhật function để check duplicate trước khi ký

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
  -- Lấy thời gian hiện tại theo múi giờ Việt Nam (+7)
  v_current_time := (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh');
  
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
  
  -- ✅ KIỂM TRA ĐÃ KÝ CHƯA (CHECK DUPLICATE)
  SELECT EXISTS(
    SELECT 1 FROM signature_logs 
    WHERE employee_id = p_employee_id AND salary_month = p_salary_month
  ) INTO v_already_signed;
  
  IF v_already_signed THEN
    -- Lấy thông tin ký cũ để trả về
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
    -- Cập nhật payrolls với thông tin ký tự động
    UPDATE payrolls SET 
      is_signed = true,
      signed_at = v_current_time,
      signed_by_name = v_employee_name,
      signature_ip = p_ip_address,
      signature_device = p_device_info,
      import_status = 'signed',
      updated_at = v_current_time
    WHERE employee_id = p_employee_id AND salary_month = p_salary_month;
    
    -- Lưu log chi tiết (đã check duplicate ở trên)
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
      'salary_month', p_salary_month
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
COMMENT ON FUNCTION auto_sign_salary IS 'Function ký tên tự động - có check duplicate và Vietnam timezone (+7)';

-- Test query
SELECT 'Function updated successfully' as status;
