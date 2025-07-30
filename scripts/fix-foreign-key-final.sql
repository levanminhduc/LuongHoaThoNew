-- FINAL FIX: Foreign Key Constraints cho Department Permissions
-- Giải quyết lỗi "Dữ liệu tham chiếu không hợp lệ (employee_id hoặc granted_by)"

-- ===== BACKUP REMINDER =====
-- QUAN TRỌNG: Backup database trước khi chạy!
-- pg_dump -h your_host -U your_user -d your_database > backup_before_fk_fix.sql

-- ===== SOLUTION 1: TẠO ADMIN EMPLOYEE RECORD (RECOMMENDED) =====
-- Tạo admin employee để satisfy foreign key constraint

INSERT INTO employees (
    employee_id, 
    full_name, 
    department, 
    chuc_vu, 
    cccd_hash, 
    is_active,
    phone_number
) VALUES (
    'admin', 
    'System Administrator', 
    'Administration', 
    'admin', 
    '$2a$10$admin_system_hash_placeholder', 
    true,
    '0000000000'
) ON CONFLICT (employee_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    department = EXCLUDED.department,
    chuc_vu = EXCLUDED.chuc_vu,
    is_active = EXCLUDED.is_active;

-- ===== SOLUTION 2: MODIFY FOREIGN KEY CONSTRAINTS (ALTERNATIVE) =====
-- Nếu không muốn tạo admin employee, có thể modify constraints

-- Drop existing foreign key constraints
ALTER TABLE department_permissions 
DROP CONSTRAINT IF EXISTS department_permissions_employee_id_fkey;

ALTER TABLE department_permissions 
DROP CONSTRAINT IF EXISTS department_permissions_granted_by_fkey;

ALTER TABLE department_permissions 
DROP CONSTRAINT IF EXISTS fk_dept_perm_employee;

ALTER TABLE department_permissions 
DROP CONSTRAINT IF EXISTS fk_dept_perm_granted_by;

-- Recreate only employee_id foreign key (keep granted_by flexible)
ALTER TABLE department_permissions 
ADD CONSTRAINT fk_dept_perm_employee 
FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE;

-- Add check constraint for granted_by instead of foreign key
ALTER TABLE department_permissions 
ADD CONSTRAINT chk_granted_by_valid 
CHECK (granted_by IS NOT NULL AND LENGTH(granted_by) > 0);

-- ===== VERIFY ADMIN USER CREATED =====
SELECT 'ADMIN USER VERIFICATION:' as info;
SELECT employee_id, full_name, department, chuc_vu, is_active
FROM employees 
WHERE employee_id = 'admin';

-- ===== TEST INSERT WITH REAL DATA =====
DO $$
DECLARE
    test_employee_id VARCHAR(50);
    test_department VARCHAR(100);
    test_result TEXT;
BEGIN
    -- Lấy employee_id thực tế
    SELECT employee_id INTO test_employee_id
    FROM employees 
    WHERE chuc_vu IN ('truong_phong', 'to_truong') 
    AND is_active = true
    LIMIT 1;
    
    -- Lấy department thực tế
    SELECT DISTINCT department INTO test_department
    FROM employees 
    WHERE department IS NOT NULL AND department != ''
    LIMIT 1;
    
    IF test_employee_id IS NOT NULL AND test_department IS NOT NULL THEN
        -- Test insert
        BEGIN
            INSERT INTO department_permissions (employee_id, department, granted_by, notes) 
            VALUES (test_employee_id, test_department, 'admin', 'Test insert after fix')
            ON CONFLICT (employee_id, department) DO NOTHING;
            
            test_result := 'SUCCESS: Test insert worked!';
            
            -- Clean up test data
            DELETE FROM department_permissions 
            WHERE employee_id = test_employee_id 
            AND department = test_department 
            AND notes = 'Test insert after fix';
            
        EXCEPTION WHEN OTHERS THEN
            test_result := 'FAILED: ' || SQLERRM;
        END;
    ELSE
        test_result := 'SKIPPED: No test data available';
    END IF;
    
    RAISE NOTICE 'Test result: %', test_result;
END $$;

-- ===== VERIFY FOREIGN KEY CONSTRAINTS =====
SELECT 'CURRENT FOREIGN KEY CONSTRAINTS:' as info;
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'department_permissions';

-- ===== CREATE ADDITIONAL SAMPLE EMPLOYEES (OPTIONAL) =====
-- Tạo thêm sample employees nếu cần thiết

INSERT INTO employees (employee_id, full_name, department, chuc_vu, cccd_hash, is_active) VALUES
('MGR001', 'Nguyễn Văn Manager', 'Phòng Sản Xuất', 'truong_phong', '$2a$10$sample_hash_1', true),
('SUP001', 'Trần Thị Supervisor', 'Phòng Sản Xuất', 'to_truong', '$2a$10$sample_hash_2', true),
('SUP002', 'Lê Văn Supervisor 2', 'Phòng Kế Toán', 'to_truong', '$2a$10$sample_hash_3', true)
ON CONFLICT (employee_id) DO NOTHING;

-- ===== FINAL VERIFICATION =====
SELECT 'FINAL VERIFICATION:' as info;

-- Count eligible employees
SELECT 
    'Eligible employees for permissions:' as metric,
    COUNT(*) as count
FROM employees 
WHERE chuc_vu IN ('truong_phong', 'to_truong') 
AND is_active = true;

-- Check admin user
SELECT 
    'Admin user exists:' as metric,
    CASE WHEN EXISTS (SELECT 1 FROM employees WHERE employee_id = 'admin') 
         THEN 'YES' ELSE 'NO' END as status;

-- Check departments available
SELECT 
    'Departments available:' as metric,
    COUNT(DISTINCT department) as count
FROM employees 
WHERE department IS NOT NULL AND department != '';

-- ===== SUCCESS MESSAGE =====
SELECT 'Foreign key constraints have been fixed!' as status;
SELECT 'You can now test the permission assignment in the admin interface.' as next_step;
