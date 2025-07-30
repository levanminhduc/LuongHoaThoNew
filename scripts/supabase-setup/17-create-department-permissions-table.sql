-- STEP 17: CREATE DEPARTMENT PERMISSIONS TABLE
-- Bảng quản lý quyền truy cập departments cho truong_phong
-- Thực hiện: 2025-07-30

-- ===== BACKUP REMINDER =====
-- QUAN TRỌNG: Backup database trước khi chạy script này!
-- pg_dump -h your_host -U your_user -d your_database > backup_before_department_permissions.sql

-- ===== TẠO BẢNG DEPARTMENT_PERMISSIONS =====

CREATE TABLE department_permissions (
  id SERIAL PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  department VARCHAR(100) NOT NULL,
  granted_by VARCHAR(50) NOT NULL,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  
  -- Foreign key constraints
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES employees(employee_id) ON DELETE SET NULL,
  
  -- Unique constraint: một employee chỉ có một permission record per department
  UNIQUE(employee_id, department)
);

-- ===== INDEXES FOR PERFORMANCE =====

CREATE INDEX idx_department_permissions_employee ON department_permissions(employee_id);
CREATE INDEX idx_department_permissions_department ON department_permissions(department);
CREATE INDEX idx_department_permissions_active ON department_permissions(is_active);
CREATE INDEX idx_department_permissions_granted_at ON department_permissions(granted_at);

-- ===== COMMENTS FOR DOCUMENTATION =====

COMMENT ON TABLE department_permissions IS 'Bảng quản lý quyền truy cập departments cho truong_phong';
COMMENT ON COLUMN department_permissions.employee_id IS 'Mã nhân viên được cấp quyền (thường là truong_phong)';
COMMENT ON COLUMN department_permissions.department IS 'Tên department được phép truy cập';
COMMENT ON COLUMN department_permissions.granted_by IS 'Mã nhân viên cấp quyền (thường là admin)';
COMMENT ON COLUMN department_permissions.granted_at IS 'Thời gian cấp quyền';
COMMENT ON COLUMN department_permissions.is_active IS 'Trạng thái active của quyền truy cập';
COMMENT ON COLUMN department_permissions.notes IS 'Ghi chú về lý do cấp quyền';

-- ===== SAMPLE DATA FOR TESTING =====

-- Giả sử có một truong_phong được phép xem 2 departments
INSERT INTO department_permissions (employee_id, department, granted_by, notes) VALUES
('TP001', 'Hoàn Thành', 'admin', 'Trưởng phòng quản lý department Hoàn Thành'),
('TP001', 'KCS', 'admin', 'Trưởng phòng quản lý department KCS');

-- ===== VERIFY TABLE CREATED =====

-- Kiểm tra bảng đã được tạo thành công
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'department_permissions' 
ORDER BY ordinal_position;

-- Kiểm tra indexes
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'department_permissions';

-- Kiểm tra foreign keys
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'department_permissions';

-- ===== ROLLBACK SCRIPT (NẾU CẦN) =====
-- Để rollback thay đổi này, chạy:
-- DROP TABLE IF EXISTS department_permissions CASCADE;

-- ===== THÔNG TIN THÊM =====
-- Sau khi chạy script này, cần:
-- 1. Cập nhật RLS policies để sử dụng bảng này
-- 2. Tạo APIs để quản lý department permissions
-- 3. Tạo UI để admin assign permissions
-- 4. Test thoroughly với different permission scenarios

PRINT 'Migration completed: Created department_permissions table successfully!';
