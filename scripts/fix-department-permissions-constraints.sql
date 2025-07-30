-- FIX: Department Permissions Foreign Key Constraints
-- Giải quyết vấn đề foreign key constraint với granted_by field

-- ===== OPTION 1: DROP FOREIGN KEY CONSTRAINTS (RECOMMENDED) =====
-- Bỏ foreign key constraints để tránh lỗi khi admin không có employee_id

-- Drop existing foreign key constraints
ALTER TABLE department_permissions 
DROP CONSTRAINT IF EXISTS department_permissions_employee_id_fkey;

ALTER TABLE department_permissions 
DROP CONSTRAINT IF EXISTS department_permissions_granted_by_fkey;

ALTER TABLE department_permissions 
DROP CONSTRAINT IF EXISTS fk_dept_perm_employee;

ALTER TABLE department_permissions 
DROP CONSTRAINT IF EXISTS fk_dept_perm_granted_by;

-- Recreate only the employee_id foreign key (keep granted_by flexible)
ALTER TABLE department_permissions 
ADD CONSTRAINT fk_dept_perm_employee 
FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE;

-- ===== OPTION 2: CREATE ADMIN EMPLOYEE RECORD (ALTERNATIVE) =====
-- Tạo admin employee record để satisfy foreign key constraint

INSERT INTO employees (employee_id, full_name, department, chuc_vu, cccd_hash, is_active) 
VALUES ('admin', 'System Admin', 'Administration', 'admin', 'admin_hash', true)
ON CONFLICT (employee_id) DO NOTHING;

-- ===== VERIFY CHANGES =====

-- Check current constraints
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

-- Test insert with admin granted_by
INSERT INTO department_permissions (employee_id, department, granted_by, notes) 
VALUES ('ADMIN001', 'Test Department', 'admin', 'Test permission after fix')
ON CONFLICT (employee_id, department) DO NOTHING;

-- Verify the test insert worked
SELECT * FROM department_permissions WHERE granted_by = 'admin';

-- Clean up test data
DELETE FROM department_permissions WHERE department = 'Test Department';

-- ===== SUMMARY =====
SELECT 'Foreign key constraints fixed successfully!' as status;
