-- FIX TIMEZONE CHO BẢNG SECURITY_LOGS
-- Vấn đề: created_at đang chậm hơn 7 giờ so với giờ Việt Nam
-- Giải pháp: Cập nhật default value và tạo trigger để tự động set múi giờ Việt Nam

-- 1. XÓA default value cũ để trigger có thể hoạt động
ALTER TABLE security_logs
  ALTER COLUMN created_at DROP DEFAULT;

-- 2. Tạo trigger function để LUÔN LUÔN set Vietnam timezone cho created_at
CREATE OR REPLACE FUNCTION trigger_set_security_logs_vietnam_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- LUÔN LUÔN set created_at = giờ Việt Nam (UTC + 7 giờ)
  -- Không quan tâm client có gửi gì lên
  NEW.created_at = CURRENT_TIMESTAMP + INTERVAL '7 hours';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Áp dụng trigger cho bảng security_logs
DROP TRIGGER IF EXISTS set_vietnam_timestamp_security_logs ON security_logs;
CREATE TRIGGER set_vietnam_timestamp_security_logs
  BEFORE INSERT ON security_logs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_security_logs_vietnam_timestamp();

-- 4. (OPTIONAL) Cập nhật dữ liệu cũ - CHẠY NẾU CẦN
-- Uncomment dòng dưới nếu muốn cập nhật dữ liệu cũ thêm 7 giờ
-- UPDATE security_logs
-- SET created_at = created_at + INTERVAL '7 hours'
-- WHERE created_at < CURRENT_TIMESTAMP;

-- 5. Verify
SELECT
  'Timezone fix completed for security_logs' as status,
  CURRENT_TIMESTAMP + INTERVAL '7 hours' as vietnam_time,
  CURRENT_TIMESTAMP as utc_time;

-- 6. Test insert
INSERT INTO security_logs (employee_id, action, ip_address, details)
VALUES ('TEST', 'test_timezone', '127.0.0.1', 'Testing Vietnam timezone');

-- 7. Verify test insert - KIỂM TRA KỸ
SELECT
  id,
  employee_id,
  action,
  created_at,
  CURRENT_TIMESTAMP as server_utc,
  CURRENT_TIMESTAMP + INTERVAL '7 hours' as expected_vietnam_time,
  -- Kiểm tra chênh lệch (phải < 1 giây)
  EXTRACT(EPOCH FROM (created_at - (CURRENT_TIMESTAMP + INTERVAL '7 hours'))) as diff_seconds,
  -- Format để dễ đọc
  to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at_formatted,
  to_char(CURRENT_TIMESTAMP + INTERVAL '7 hours', 'YYYY-MM-DD HH24:MI:SS') as vietnam_now_formatted
FROM security_logs
WHERE action = 'test_timezone'
ORDER BY id DESC
LIMIT 1;

-- Giải thích kết quả:
-- - created_at: Giá trị đã lưu trong DB
-- - server_utc: Giờ UTC của server PostgreSQL
-- - expected_vietnam_time: Giờ Việt Nam mong đợi (UTC + 7)
-- - diff_seconds: Chênh lệch giây (phải gần 0, < 1 giây)
-- - Nếu diff_seconds gần 0 => THÀNH CÔNG
-- - Nếu diff_seconds âm khoảng -25200 (7 giờ) => VẪN ĐANG LƯU UTC

-- 8. Cleanup test data
DELETE FROM security_logs WHERE action = 'test_timezone';

-- 9. Test thêm một lần nữa để chắc chắn
-- Chờ 2 giây rồi insert lại
SELECT pg_sleep(2);

INSERT INTO security_logs (employee_id, action, ip_address, details)
VALUES ('TEST2', 'test_timezone_2', '127.0.0.1', 'Second test');

-- Verify lần 2
SELECT
  'TEST 2 - Verify timezone' as test_name,
  created_at,
  CURRENT_TIMESTAMP + INTERVAL '7 hours' as vietnam_now,
  EXTRACT(EPOCH FROM (created_at - (CURRENT_TIMESTAMP + INTERVAL '7 hours'))) as diff_seconds,
  CASE
    WHEN ABS(EXTRACT(EPOCH FROM (created_at - (CURRENT_TIMESTAMP + INTERVAL '7 hours')))) < 5 THEN '✅ PASS - Đúng múi giờ Việt Nam'
    ELSE '❌ FAIL - Vẫn đang dùng UTC'
  END as result
FROM security_logs
WHERE action = 'test_timezone_2'
ORDER BY id DESC
LIMIT 1;

-- Cleanup test 2
DELETE FROM security_logs WHERE action = 'test_timezone_2';

-- Comments
COMMENT ON FUNCTION trigger_set_security_logs_vietnam_timestamp IS 'Trigger function để set created_at theo múi giờ Việt Nam (+7) cho security_logs';

-- ===== KẾT LUẬN =====
SELECT
  '✅ HOÀN TẤT - security_logs đã được cấu hình múi giờ Việt Nam' as status,
  'Từ giờ trở đi, tất cả records mới sẽ tự động có created_at theo giờ VN (+7)' as note;

