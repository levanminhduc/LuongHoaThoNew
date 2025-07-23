-- STEP 6: CREATE HELPER FUNCTIONS

-- Function lấy lương theo tháng
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
    p.signed_at
  FROM payrolls p
  JOIN employees e ON p.employee_id = e.employee_id
  WHERE p.employee_id = p_employee_id 
    AND p.salary_month = p_salary_month;
END;
$$ LANGUAGE plpgsql;

-- Function báo cáo ký lương theo tháng
CREATE OR REPLACE FUNCTION get_signature_report(
  p_salary_month VARCHAR(20)
) RETURNS TABLE(
  total_employees BIGINT,
  signed_count BIGINT,
  pending_count BIGINT,
  signed_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_employees,
    COUNT(CASE WHEN p.is_signed THEN 1 END) as signed_count,
    COUNT(CASE WHEN NOT p.is_signed THEN 1 END) as pending_count,
    ROUND(COUNT(CASE WHEN p.is_signed THEN 1 END) * 100.0 / COUNT(*), 2) as signed_percentage
  FROM payrolls p
  WHERE p.salary_month = p_salary_month;
END;
$$ LANGUAGE plpgsql;

-- Function lấy chi tiết lương đầy đủ cho nhân viên
CREATE OR REPLACE FUNCTION get_employee_salary_detail(
  p_employee_id VARCHAR(50),
  p_salary_month VARCHAR(20)
) RETURNS TABLE(
  -- Thông tin cơ bản
  employee_name VARCHAR(255),
  department VARCHAR(100),
  salary_month VARCHAR(20),
  
  -- Hệ số và thông số
  he_so_lam_viec DECIMAL(5,2),
  he_so_luong_co_ban DECIMAL(5,2),
  luong_toi_thieu_cty DECIMAL(15,2),
  
  -- Thời gian làm việc
  ngay_cong_trong_gio DECIMAL(5,2),
  gio_cong_tang_ca DECIMAL(5,2),
  tong_gio_lam_viec DECIMAL(5,2),
  
  -- Lương và thu nhập
  tong_luong_san_pham_cong_doan DECIMAL(15,2),
  tien_luong_san_pham_trong_gio DECIMAL(15,2),
  tien_luong_tang_ca DECIMAL(15,2),
  tong_cong_tien_luong DECIMAL(15,2),
  
  -- Khấu trừ
  bhxh_bhtn_bhyt_total DECIMAL(15,2),
  thue_tncn DECIMAL(15,2),
  tam_ung DECIMAL(15,2),
  
  -- Lương thực nhận
  tien_luong_thuc_nhan_cuoi_ky DECIMAL(15,2),
  
  -- Trạng thái ký
  is_signed BOOLEAN,
  signed_at TIMESTAMP,
  signed_by_name VARCHAR(255)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.full_name,
    e.department,
    p.salary_month,
    p.he_so_lam_viec,
    p.he_so_luong_co_ban,
    p.luong_toi_thieu_cty,
    p.ngay_cong_trong_gio,
    p.gio_cong_tang_ca,
    p.tong_gio_lam_viec,
    p.tong_luong_san_pham_cong_doan,
    p.tien_luong_san_pham_trong_gio,
    p.tien_luong_tang_ca,
    p.tong_cong_tien_luong,
    p.bhxh_bhtn_bhyt_total,
    p.thue_tncn,
    p.tam_ung,
    p.tien_luong_thuc_nhan_cuoi_ky,
    p.is_signed,
    p.signed_at,
    p.signed_by_name
  FROM payrolls p
  JOIN employees e ON p.employee_id = e.employee_id
  WHERE p.employee_id = p_employee_id 
    AND p.salary_month = p_salary_month;
END;
$$ LANGUAGE plpgsql;
