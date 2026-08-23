-- SCRIPT 35: VÁ DỮ LIỆU signed_at BỊ LÙI DO BUG Ở sign_bonus (xem script 34)
-- Phạm vi: đợt thưởng thuong_le / 2026-2T9 (Thưởng lễ 2/9 đợt 2, upload 23/08/2026).
--
-- ĐIỀU KIỆN: đã chạy script 34 TRƯỚC, và chạy 35 ngay sau đó.
--
-- Độ lệch KHÔNG hardcode: mọi câu lệnh dưới đây tự đo bằng chính biểu thức sai của function cũ
--   do_lech = giờ_VN_đúng - giá_trị_function_cũ_sinh_ra
-- nên đúng cho cả TimeZone = UTC (14 giờ) lẫn Asia/Ho_Chi_Minh (7 giờ).
--
-- Guard chống chạy lại: chỉ đụng dòng "già" hơn nửa độ lệch. Dòng ký bằng function đã sửa
-- luôn nằm trong vài phút gần đây nên không bao giờ khớp. Sau khi vá, các dòng đã sửa
-- cũng thoát khỏi guard trong khoảng nửa độ lệch (~3.5 giờ) -> chạy lại trong khung đó là
-- vô hại, nhưng chạy lại vào ngày hôm sau SẼ cộng dồn sai. Luôn xem BƯỚC 2 trước.

-- ===== BƯỚC 1: xác nhận độ lệch mà database này đang có =====
SELECT
  current_setting('TimeZone') AS db_timezone,
  (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh') AS gio_vn_hien_tai,
  (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')
    - (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')::timestamp
    AS do_lech_can_cong;

-- ===== BƯỚC 2: xem trước danh sách sẽ sửa =====
WITH lech AS (
  SELECT
    (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')
      - (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')::timestamp AS delta,
    (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh') AS gio_vn
)
SELECT
  b.employee_id,
  b.signed_by_name,
  b.signed_at             AS dang_luu_sai,
  b.signed_at + l.delta   AS sau_khi_sua
FROM employee_bonuses b
CROSS JOIN lech l
WHERE b.is_signed = true
  AND b.signed_at IS NOT NULL
  AND b.bonus_type   = 'thuong_le'
  AND b.bonus_period = '2026-2T9'
  AND b.signed_at < l.gio_vn - (l.delta / 2)
ORDER BY b.signed_at;

-- ===== BƯỚC 3: cập nhật (chỉ chạy khi BƯỚC 2 ra đúng danh sách mong muốn) =====
BEGIN;

WITH lech AS (
  SELECT
    (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')
      - (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')::timestamp AS delta,
    (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh') AS gio_vn
)
UPDATE employee_bonuses b
SET signed_at  = b.signed_at + l.delta,
    updated_at = b.updated_at + l.delta
FROM lech l
WHERE b.is_signed = true
  AND b.signed_at IS NOT NULL
  AND b.bonus_type   = 'thuong_le'
  AND b.bonus_period = '2026-2T9'
  AND b.signed_at < l.gio_vn - (l.delta / 2);

COMMIT;

-- ===== BƯỚC 4: kiểm tra lại =====
SELECT
  MIN(signed_at) AS ky_som_nhat,
  MAX(signed_at) AS ky_muon_nhat,
  COUNT(*)       AS so_nguoi_da_ky,
  (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh') AS gio_vn_hien_tai
FROM employee_bonuses
WHERE is_signed = true
  AND bonus_type   = 'thuong_le'
  AND bonus_period = '2026-2T9';
