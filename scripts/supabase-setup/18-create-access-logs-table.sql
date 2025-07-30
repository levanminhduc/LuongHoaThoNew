-- STEP 18: CREATE ACCESS LOGS TABLE
-- Bảng audit trail cho việc truy cập dữ liệu lương
-- Thực hiện: 2025-07-30

-- ===== BACKUP REMINDER =====
-- QUAN TRỌNG: Backup database trước khi chạy script này!
-- pg_dump -h your_host -U your_user -d your_database > backup_before_access_logs.sql

-- ===== TẠO BẢNG ACCESS_LOGS =====

CREATE TABLE access_logs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  user_role VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100) NOT NULL,
  department VARCHAR(100),
  employee_accessed VARCHAR(50),
  payroll_id INTEGER,
  ip_address VARCHAR(45),
  user_agent TEXT,
  request_method VARCHAR(10),
  request_url TEXT,
  response_status INTEGER,
  execution_time_ms INTEGER,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraints (optional, có thể NULL nếu employee bị xóa)
  FOREIGN KEY (employee_accessed) REFERENCES employees(employee_id) ON DELETE SET NULL,
  FOREIGN KEY (payroll_id) REFERENCES payrolls(id) ON DELETE SET NULL
);

-- ===== INDEXES FOR PERFORMANCE =====

-- Index chính cho queries thường dùng
CREATE INDEX idx_access_logs_user_timestamp ON access_logs(user_id, timestamp DESC);
CREATE INDEX idx_access_logs_department_timestamp ON access_logs(department, timestamp DESC);
CREATE INDEX idx_access_logs_action_timestamp ON access_logs(action, timestamp DESC);
CREATE INDEX idx_access_logs_employee_accessed ON access_logs(employee_accessed);
CREATE INDEX idx_access_logs_timestamp ON access_logs(timestamp DESC);

-- Composite index cho security monitoring
CREATE INDEX idx_access_logs_security ON access_logs(user_id, action, resource, timestamp DESC);

-- Index cho performance monitoring
CREATE INDEX idx_access_logs_performance ON access_logs(response_status, execution_time_ms, timestamp DESC);

-- ===== COMMENTS FOR DOCUMENTATION =====

COMMENT ON TABLE access_logs IS 'Bảng audit trail cho việc truy cập dữ liệu lương và security monitoring';
COMMENT ON COLUMN access_logs.user_id IS 'Mã nhân viên thực hiện action (employee_id hoặc admin)';
COMMENT ON COLUMN access_logs.user_role IS 'Role của user: admin, truong_phong, to_truong, nhan_vien';
COMMENT ON COLUMN access_logs.action IS 'Hành động: VIEW, EDIT, DELETE, EXPORT, IMPORT, LOGIN, LOGOUT';
COMMENT ON COLUMN access_logs.resource IS 'Resource được truy cập: payroll, employee, dashboard, report';
COMMENT ON COLUMN access_logs.department IS 'Department liên quan đến action';
COMMENT ON COLUMN access_logs.employee_accessed IS 'Mã nhân viên có dữ liệu được truy cập';
COMMENT ON COLUMN access_logs.payroll_id IS 'ID của payroll record được truy cập';
COMMENT ON COLUMN access_logs.ip_address IS 'IP address của user';
COMMENT ON COLUMN access_logs.user_agent IS 'Browser/device information';
COMMENT ON COLUMN access_logs.request_method IS 'HTTP method: GET, POST, PUT, DELETE';
COMMENT ON COLUMN access_logs.request_url IS 'Full request URL';
COMMENT ON COLUMN access_logs.response_status IS 'HTTP response status code';
COMMENT ON COLUMN access_logs.execution_time_ms IS 'Request execution time in milliseconds';

-- ===== SAMPLE DATA FOR TESTING =====

-- Sample access logs for different scenarios
INSERT INTO access_logs (user_id, user_role, action, resource, department, employee_accessed, ip_address, user_agent, request_method, request_url, response_status, execution_time_ms) VALUES
('admin', 'admin', 'VIEW', 'payroll', 'Hoàn Thành', 'NV001', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'GET', '/api/admin/payroll/search?q=NV001', 200, 150),
('TP001', 'truong_phong', 'VIEW', 'payroll', 'KCS', 'NV002', '192.168.1.101', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'GET', '/api/payroll/my-departments', 200, 200),
('TT001', 'to_truong', 'VIEW', 'payroll', 'Hoàn Thành', 'NV003', '192.168.1.102', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'GET', '/api/payroll/my-department', 200, 120);

-- ===== VERIFY TABLE CREATED =====

-- Kiểm tra bảng đã được tạo thành công
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'access_logs' 
ORDER BY ordinal_position;

-- Kiểm tra indexes
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'access_logs'
ORDER BY indexname;

-- Kiểm tra sample data
SELECT 
    user_id,
    user_role,
    action,
    resource,
    department,
    timestamp
FROM access_logs 
ORDER BY timestamp DESC 
LIMIT 5;

-- ===== UTILITY FUNCTIONS =====

-- Function để log access (sẽ được gọi từ application)
CREATE OR REPLACE FUNCTION log_access(
    p_user_id VARCHAR(50),
    p_user_role VARCHAR(50),
    p_action VARCHAR(100),
    p_resource VARCHAR(100),
    p_department VARCHAR(100) DEFAULT NULL,
    p_employee_accessed VARCHAR(50) DEFAULT NULL,
    p_payroll_id INTEGER DEFAULT NULL,
    p_ip_address VARCHAR(45) DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_request_method VARCHAR(10) DEFAULT NULL,
    p_request_url TEXT DEFAULT NULL,
    p_response_status INTEGER DEFAULT NULL,
    p_execution_time_ms INTEGER DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    log_id INTEGER;
BEGIN
    INSERT INTO access_logs (
        user_id, user_role, action, resource, department, 
        employee_accessed, payroll_id, ip_address, user_agent,
        request_method, request_url, response_status, execution_time_ms
    ) VALUES (
        p_user_id, p_user_role, p_action, p_resource, p_department,
        p_employee_accessed, p_payroll_id, p_ip_address, p_user_agent,
        p_request_method, p_request_url, p_response_status, p_execution_time_ms
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- ===== ROLLBACK SCRIPT (NẾU CẦN) =====
-- Để rollback thay đổi này, chạy:
-- DROP FUNCTION IF EXISTS log_access;
-- DROP TABLE IF EXISTS access_logs CASCADE;

-- ===== THÔNG TIN THÊM =====
-- Sau khi chạy script này, cần:
-- 1. Tạo API middleware để log tất cả requests
-- 2. Implement logging trong các API endpoints
-- 3. Tạo dashboard để monitor access logs
-- 4. Setup log rotation để manage storage
-- 5. Create alerts cho suspicious activities

PRINT 'Migration completed: Created access_logs table and utility functions successfully!';
