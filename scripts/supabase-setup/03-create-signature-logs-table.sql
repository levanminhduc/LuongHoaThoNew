-- STEP 3: CREATE SIGNATURE_LOGS TABLE
-- Bảng log chi tiết ký tên
CREATE TABLE signature_logs (
  id SERIAL PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  salary_month VARCHAR(20) NOT NULL,
  signed_by_name VARCHAR(255) NOT NULL,        -- Tên người ký (auto)
  signed_at TIMESTAMP NOT NULL,                -- Thời gian ký (real-time)
  signature_ip VARCHAR(45),                    -- IP address
  signature_device TEXT,                       -- User agent
  signature_location VARCHAR(255),             -- Vị trí (nếu có)
  is_valid BOOLEAN DEFAULT true,               -- Signature hợp lệ
  
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
  UNIQUE(employee_id, salary_month)            -- Chỉ ký 1 lần/tháng
);

-- Comments
COMMENT ON TABLE signature_logs IS 'Log chi tiết quá trình ký tên - audit trail';
COMMENT ON COLUMN signature_logs.signed_at IS 'Timestamp chính xác khi user click ký nhận';
COMMENT ON COLUMN signature_logs.signature_ip IS 'IP address của user khi ký - security tracking';
