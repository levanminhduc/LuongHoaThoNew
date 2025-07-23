-- Tạo bảng payrolls để lưu trữ dữ liệu lương
CREATE TABLE IF NOT EXISTS payrolls (
  id SERIAL PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  cccd VARCHAR(20) NOT NULL,
  position VARCHAR(255),
  salary_month VARCHAR(20) NOT NULL,
  total_income DECIMAL(15,2) DEFAULT 0,
  deductions DECIMAL(15,2) DEFAULT 0,
  net_salary DECIMAL(15,2) DEFAULT 0,
  source_file VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tạo index để tối ưu hóa truy vấn
CREATE INDEX IF NOT EXISTS idx_payrolls_employee_cccd ON payrolls(employee_id, cccd);
CREATE INDEX IF NOT EXISTS idx_payrolls_salary_month ON payrolls(salary_month);

-- Tạo bảng admin_users để lưu thông tin admin (tùy chọn)
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Thêm admin mặc định (password: admin123)
INSERT INTO admin_users (username, password_hash) 
VALUES ('admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi')
ON CONFLICT (username) DO NOTHING;
