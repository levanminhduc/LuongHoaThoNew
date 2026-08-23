-- SCRIPT 34: FIX LỆCH NGÀY Ở THỜI GIAN KÝ NHẬN THƯỞNG
-- Bug: sign_bonus dùng (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh').
--   AT TIME ZONE 'UTC'              : timestamptz -> timestamp (giờ tường UTC)
--   AT TIME ZONE 'Asia/Ho_Chi_Minh' : timestamp   -> timestamptz (hiểu giờ UTC đó LÀ giờ VN)
-- Hai bước đi ngược chiều nhau nên giá trị lưu vào employee_bonuses.signed_at bị lùi so với
-- giờ Việt Nam thực tế -> nhân viên ký sáng ngày 23 hiển thị ngày 22.
-- Độ lệch phụ thuộc tham số TimeZone của database: 7 giờ nếu TimeZone = Asia/Ho_Chi_Minh,
-- 14 giờ nếu TimeZone = UTC.
--
-- Đúng: (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh') - một bước duy nhất, cho ra
-- giờ tường Việt Nam bất kể TimeZone của database. KHÔNG dùng CURRENT_TIMESTAMP + INTERVAL
-- '7 hours' ở đây: dạng đó chỉ đúng khi TimeZone = UTC.
-- Idempotent: CREATE OR REPLACE, chạy lại an toàn.

CREATE OR REPLACE FUNCTION sign_bonus(
  p_employee_id VARCHAR(50),
  p_bonus_type VARCHAR(30),
  p_bonus_period VARCHAR(20),
  p_ip_address VARCHAR(45) DEFAULT NULL,
  p_device_info TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_bonus employee_bonuses%ROWTYPE;
  v_employee_name VARCHAR(255);
  v_current_time TIMESTAMP;
BEGIN
  v_current_time := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh');

  SELECT * INTO v_bonus
  FROM employee_bonuses
  WHERE employee_id = p_employee_id
    AND bonus_type = p_bonus_type
    AND bonus_period = p_bonus_period
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'BONUS_NOT_FOUND');
  END IF;

  IF v_bonus.is_signed = true THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'ALREADY_SIGNED',
      'signed_at', v_bonus.signed_at,
      'signed_by_name', v_bonus.signed_by_name
    );
  END IF;

  SELECT full_name INTO v_employee_name
  FROM employees
  WHERE employee_id = p_employee_id;

  UPDATE employee_bonuses SET
    is_signed = true,
    signed_at = v_current_time,
    signed_by_name = v_employee_name,
    signature_ip = p_ip_address,
    signature_device = p_device_info,
    updated_at = v_current_time
  WHERE employee_id = p_employee_id
    AND bonus_type = p_bonus_type
    AND bonus_period = p_bonus_period;

  RETURN jsonb_build_object(
    'success', true,
    'signed_at', v_current_time,
    'signed_by_name', v_employee_name
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sign_bonus IS 'Nhân viên ký nhận 1 đợt thưởng (atomic FOR UPDATE, giờ Việt Nam). 3 nhánh: BONUS_NOT_FOUND / ALREADY_SIGNED / success.';

-- Kiểm tra nhanh sau khi chạy: cột vietnam_now phải bằng giờ Việt Nam hiện tại,
-- do_lech_can_cong là khoảng thời gian mà các dòng ký trước fix đang bị lùi (script 35 dùng lại).
SELECT
  current_setting('TimeZone') AS db_timezone,
  (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh') AS vietnam_now,
  (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')::timestamp AS gia_tri_function_loi,
  (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')
    - (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')::timestamp AS do_lech_can_cong;
