-- STEP 1: CREATE EMPLOYEES TABLE
-- Bảng thông tin nhân viên
CREATE TABLE employees (
  id SERIAL PRIMARY KEY,
  employee_id VARCHAR(50) UNIQUE NOT NULL,     -- Mã nhân viên (Business PK)
  full_name VARCHAR(255) NOT NULL,             -- Họ và tên (dùng cho ký tên)
  cccd_hash VARCHAR(255) NOT NULL,             -- CCCD đã hash
  department VARCHAR(100) NOT NULL,            -- Phòng ban
  chuc_vu VARCHAR(50) NOT NULL DEFAULT 'nhan_vien', -- nhan_vien/to_truong/truong_phong
  phone_number VARCHAR(15),                    -- SĐT
  is_active BOOLEAN DEFAULT true,              -- Trạng thái
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comments cho documentation
COMMENT ON TABLE employees IS 'Bảng thông tin nhân viên - quản lý danh sách và phân quyền';
COMMENT ON COLUMN employees.employee_id IS 'Mã nhân viên duy nhất - Business Primary Key';
COMMENT ON COLUMN employees.full_name IS 'Họ và tên đầy đủ - sử dụng cho ký tên tự động';
COMMENT ON COLUMN employees.cccd_hash IS 'CCCD đã được hash để bảo mật';
COMMENT ON COLUMN employees.chuc_vu IS 'Chức vụ: nhan_vien, to_truong, truong_phong - dùng cho phân quyền';
