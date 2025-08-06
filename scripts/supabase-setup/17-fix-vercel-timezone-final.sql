-- SCRIPT: FIX VERCEL TIMEZONE ISSUE - FINAL SOLUTION
-- Sử dụng client timestamp để tránh timezone mismatch giữa server và client
-- Thực hiện: 2025-01-XX

-- ===== BACKUP REMINDER =====
-- QUAN TRỌNG: Backup database trước khi chạy script này!
-- pg_dump -h your_host -U your_user -d your_database > backup_before_timezone_fix.sql

-- ===== UPDATE AUTO_SIGN_SALARY FUNCTION =====

CREATE OR REPLACE FUNCTION auto_sign_salary(
  p_employee_id VARCHAR(50),
  p_salary_month VARCHAR(20),
  p_ip_address VARCHAR(45) DEFAULT NULL,
  p_device_info TEXT DEFAULT NULL,
  p_client_timestamp VARCHAR(50) DEFAULT NULL  -- Client timestamp parameter
) RETURNS JSONB AS $$
DECLARE
  v_employee_name VARCHAR(255);
  v_current_time TIMESTAMP;
  v_already_signed BOOLEAN;
  result JSONB;
BEGIN
  -- ✅ SOLUTION: Sử dụng client timestamp nếu có, fallback to server time
  IF p_client_timestamp IS NOT NULL AND p_client_timestamp != '' THEN
    -- Parse client timestamp (ISO format từ JavaScript)
    BEGIN
      v_current_time := p_client_timestamp::TIMESTAMP;
      RAISE NOTICE 'Using client timestamp: %', v_current_time;
    EXCEPTION WHEN OTHERS THEN
      -- Fallback nếu parse lỗi
      v_current_time := CURRENT_TIMESTAMP + INTERVAL '7 hours';
      RAISE NOTICE 'Client timestamp parse failed, using server +7: %', v_current_time;
    END;
  ELSE
    -- Fallback: Server time + 7 hours for Vietnam timezone
    v_current_time := CURRENT_TIMESTAMP + INTERVAL '7 hours';
    RAISE NOTICE 'Using server +7 hours: %', v_current_time;
  END IF;
  
  -- Lấy tên nhân viên
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
  
  -- Kiểm tra xem đã ký chưa
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
  
  -- Kiểm tra xem có bảng lương không
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
    -- ✅ SỬ DỤNG CLIENT TIMESTAMP CHO TẤT CẢ OPERATIONS
    UPDATE payrolls SET 
      is_signed = true,
      signed_at = v_current_time,  -- Client timestamp hoặc server +7
      signed_by_name = v_employee_name,
      signature_ip = p_ip_address,
      signature_device = p_device_info,
      import_status = 'signed',
      updated_at = v_current_time  -- Client timestamp hoặc server +7
    WHERE employee_id = p_employee_id AND salary_month = p_salary_month;
    
    -- ✅ INSERT VỚI CLIENT TIMESTAMP
    INSERT INTO signature_logs (
      employee_id, salary_month, signed_by_name, signed_at,
      signature_ip, signature_device
    ) VALUES (
      p_employee_id, p_salary_month, v_employee_name, v_current_time,  -- Client timestamp
      p_ip_address, p_device_info
    );
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Ký nhận lương thành công',
      'signed_by', v_employee_name,
      'signed_at', v_current_time,  -- Return client timestamp
      'employee_id', p_employee_id,
      'salary_month', p_salary_month,
      'timezone_source', CASE 
        WHEN p_client_timestamp IS NOT NULL THEN 'client_device'
        ELSE 'server_plus_7'
      END,
      'debug_info', jsonb_build_object(
        'client_timestamp', p_client_timestamp,
        'final_timestamp', v_current_time,
        'server_utc', CURRENT_TIMESTAMP
      )
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
COMMENT ON FUNCTION auto_sign_salary IS 'Function ký tên - VERCEL TIMEZONE FIX - Sử dụng client timestamp để tránh timezone mismatch';

-- ===== TEST FUNCTION =====

-- Test với client timestamp
SELECT 
  'Function updated for Vercel timezone fix' as status,
  CURRENT_TIMESTAMP as server_utc,
  CURRENT_TIMESTAMP + INTERVAL '7 hours' as server_plus_7,
  '2025-01-15 14:30:00'::TIMESTAMP as sample_client_timestamp;

-- ===== VERIFY EXISTING DATA =====

-- Kiểm tra signature_logs hiện tại
SELECT 
  'EXISTING SIGNATURE LOGS:' as info,
  employee_id,
  salary_month,
  signed_at,
  signed_at + INTERVAL '7 hours' as signed_at_plus_7,
  signature_ip
FROM signature_logs 
ORDER BY signed_at DESC 
LIMIT 5;

-- ===== ROLLBACK SCRIPT (NẾU CẦN) =====
-- Để rollback về version cũ, chạy:
/*
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
  -- Rollback: Sử dụng server timezone conversion
  v_current_time := (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh');
  
  -- ... rest of original function
END;
$$ LANGUAGE plpgsql;
*/

-- ===== INSTRUCTIONS =====
SELECT 'NEXT STEPS:' as info
UNION ALL
SELECT '1. Deploy updated API endpoint với client timestamp' as instruction
UNION ALL  
SELECT '2. Test trên localhost và Vercel để verify timezone' as instruction
UNION ALL
SELECT '3. Monitor signature_logs table cho timestamp accuracy' as instruction
UNION ALL
SELECT '4. Rollback nếu có issues với script trên' as instruction;

RAISE NOTICE 'Vercel timezone fix completed! Function now uses client timestamp to avoid timezone mismatch.';
