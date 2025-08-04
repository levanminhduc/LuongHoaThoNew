-- QUICK FIX: Tạo bảng department_permissions và sample data
-- Copy và paste vào Supabase SQL Editor

-- ===== TẠO BẢNG DEPARTMENT_PERMISSIONS =====
CREATE TABLE IF NOT EXISTS department_permissions (
  id SERIAL PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  department VARCHAR(100) NOT NULL,
  granted_by VARCHAR(50) NOT NULL,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  
  -- Foreign key constraints (có thể bỏ qua nếu employees table chưa có)
  -- FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
  -- FOREIGN KEY (granted_by) REFERENCES employees(employee_id) ON DELETE SET NULL,
  
  -- Unique constraint
  UNIQUE(employee_id, department)
);

-- ===== TẠO INDEXES =====
CREATE INDEX IF NOT EXISTS idx_department_permissions_employee ON department_permissions(employee_id);
CREATE INDEX IF NOT EXISTS idx_department_permissions_department ON department_permissions(department);
CREATE INDEX IF NOT EXISTS idx_department_permissions_active ON department_permissions(is_active);

-- ===== TẠO SAMPLE PERMISSIONS CHO TEST =====
-- Cấp quyền cho ADMIN001 (manager có sẵn trong sample data)
INSERT INTO department_permissions (employee_id, department, granted_by, notes) VALUES
('ADMIN001', 'Phòng Sản Xuất', 'admin', 'Test permission - Trưởng phòng quản lý sản xuất'),
('ADMIN001', 'Phòng Kế Toán', 'admin', 'Test permission - Trưởng phòng quản lý kế toán')
ON CONFLICT (employee_id, department) DO NOTHING;

-- Cấp quyền cho các tổ trưởng
INSERT INTO department_permissions (employee_id, department, granted_by, notes) VALUES
('NV002', 'Phòng Sản Xuất', 'admin', 'Test permission - Tổ trưởng sản xuất'),
('NV004', 'Phòng Kế Toán', 'admin', 'Test permission - Tổ trưởng kế toán'),
('NV007', 'Phòng QC', 'admin', 'Test permission - Tổ trưởng QC')
ON CONFLICT (employee_id, department) DO NOTHING;

-- ===== VERIFY DATA =====
SELECT 'Department permissions created:' as info;
SELECT employee_id, department, granted_by, is_active, granted_at 
FROM department_permissions 
ORDER BY employee_id, department;

-- ===== KIỂM TRA DEPARTMENTS CÓ SẴN =====
SELECT 'Available departments:' as info;
SELECT DISTINCT department, COUNT(*) as employee_count
FROM employees 
WHERE department IS NOT NULL 
GROUP BY department 
ORDER BY department;

-- ===== KIỂM TRA MANAGERS/SUPERVISORS =====
SELECT 'Available managers/supervisors:' as info;
SELECT employee_id, full_name, department, chuc_vu
FROM employees 
WHERE chuc_vu IN ('truong_phong', 'to_truong')
ORDER BY chuc_vu, employee_id;
