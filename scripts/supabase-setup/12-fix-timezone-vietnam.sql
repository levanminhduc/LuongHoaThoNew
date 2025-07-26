-- SCRIPT: FIX TIMEZONE TO VIETNAM (+7)
-- Cập nhật tất cả các function và trigger để sử dụng múi giờ Việt Nam

-- 1. Update table default values để sử dụng Vietnam timezone
-- Cập nhật các bảng hiện tại
ALTER TABLE employees 
  ALTER COLUMN created_at SET DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'),
  ALTER COLUMN updated_at SET DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh');

ALTER TABLE payrolls 
  ALTER COLUMN created_at SET DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'),
  ALTER COLUMN updated_at SET DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh');

ALTER TABLE signature_logs 
  ALTER COLUMN signed_at SET DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh');

-- 2. Tạo trigger function để auto-update updated_at với Vietnam timezone
CREATE OR REPLACE FUNCTION trigger_set_vietnam_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Áp dụng trigger cho các bảng
DROP TRIGGER IF EXISTS set_updated_at ON employees;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_vietnam_timestamp();

DROP TRIGGER IF EXISTS set_updated_at ON payrolls;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON payrolls
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_vietnam_timestamp();

-- 4. Update helper functions để sử dụng Vietnam timezone
-- Function lấy lương theo tháng đã updated
CREATE OR REPLACE FUNCTION get_salary_by_month(
  p_employee_id VARCHAR(50),
  p_salary_month VARCHAR(20)
) RETURNS TABLE(
  employee_name VARCHAR(255),
  department VARCHAR(100),
  total_salary DECIMAL(15,2),
  net_salary DECIMAL(15,2),
  is_signed BOOLEAN,
  signed_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.full_name,
    e.department,
    p.tong_cong_tien_luong,
    p.tien_luong_thuc_nhan_cuoi_ky,
    p.is_signed,
    -- Đảm bảo hiển thị theo múi giờ Vietnam
    (p.signed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::TIMESTAMP
  FROM payrolls p
  JOIN employees e ON p.employee_id = e.employee_id
  WHERE p.employee_id = p_employee_id 
    AND p.salary_month = p_salary_month;
END;
$$ LANGUAGE plpgsql;

-- 5. Function lấy chi tiết lương đầy đủ với Vietnam timezone
CREATE OR REPLACE FUNCTION get_employee_salary_detail(
  p_employee_id VARCHAR(50),
  p_salary_month VARCHAR(20)
) RETURNS TABLE(
  employee_id VARCHAR(50),
  full_name VARCHAR(255),
  department VARCHAR(100),
  salary_month VARCHAR(20),
  total_income DECIMAL(15,2),
  deductions DECIMAL(15,2),
  net_salary DECIMAL(15,2),
  is_signed BOOLEAN,
  signed_at TIMESTAMP,
  signed_by_name VARCHAR(255)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.employee_id,
    e.full_name,
    e.department,
    p.salary_month,
    p.tong_cong_tien_luong,
    (COALESCE(p.bhxh_bhtn_bhyt_total, 0) + COALESCE(p.thue_tncn, 0)),
    p.tien_luong_thuc_nhan_cuoi_ky,
    p.is_signed,
    -- Hiển thị theo múi giờ Vietnam
    (p.signed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::TIMESTAMP,
    p.signed_by_name
  FROM payrolls p
  JOIN employees e ON p.employee_id = e.employee_id
  WHERE p.employee_id = p_employee_id 
    AND p.salary_month = p_salary_month;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON FUNCTION trigger_set_vietnam_timestamp IS 'Trigger function để set timestamp theo múi giờ Việt Nam (+7)';
COMMENT ON FUNCTION get_salary_by_month IS 'Function lấy lương theo tháng - hiển thị theo múi giờ Việt Nam';
COMMENT ON FUNCTION get_employee_salary_detail IS 'Function lấy chi tiết lương - hiển thị theo múi giờ Việt Nam';

-- Verification query
SELECT 
  'Timezone fix completed' as status,
  (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh') as vietnam_time,
  CURRENT_TIMESTAMP as utc_time; 