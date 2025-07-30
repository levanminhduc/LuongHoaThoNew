-- DEBUG SCRIPT: Phân tích lỗi foreign key constraint chi tiết
-- Chạy script này để xác định nguyên nhân lỗi "Dữ liệu tham chiếu không hợp lệ"

-- ===== KIỂM TRA CẤU TRÚC BẢNG DEPARTMENT_PERMISSIONS =====
SELECT 'DEPARTMENT_PERMISSIONS TABLE STRUCTURE:' as info;
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'department_permissions' 
ORDER BY ordinal_position;

-- ===== KIỂM TRA CẤU TRÚC BẢNG EMPLOYEES =====
SELECT 'EMPLOYEES TABLE STRUCTURE:' as info;
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'employees' 
ORDER BY ordinal_position;

-- ===== KIỂM TRA FOREIGN KEY CONSTRAINTS =====
SELECT 'FOREIGN KEY CONSTRAINTS:' as info;
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_type
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'department_permissions';

-- ===== KIỂM TRA DỮ LIỆU EMPLOYEES HIỆN CÓ =====
SELECT 'AVAILABLE EMPLOYEES:' as info;
SELECT employee_id, full_name, department, chuc_vu, is_active
FROM employees 
ORDER BY chuc_vu, employee_id;

-- ===== KIỂM TRA EMPLOYEES CÓ CHỨC VỤ MANAGER/SUPERVISOR =====
SELECT 'MANAGERS AND SUPERVISORS:' as info;
SELECT employee_id, full_name, department, chuc_vu, is_active
FROM employees 
WHERE chuc_vu IN ('truong_phong', 'to_truong', 'admin')
ORDER BY chuc_vu, employee_id;

-- ===== KIỂM TRA ADMIN USER =====
SELECT 'ADMIN USERS:' as info;
SELECT employee_id, full_name, department, chuc_vu, is_active
FROM employees 
WHERE employee_id = 'admin' OR chuc_vu = 'admin' OR employee_id LIKE '%admin%'
ORDER BY employee_id;

-- ===== KIỂM TRA DỮ LIỆU DEPARTMENT_PERMISSIONS HIỆN CÓ =====
SELECT 'EXISTING DEPARTMENT PERMISSIONS:' as info;
SELECT dp.*, e.full_name as employee_name, e.chuc_vu
FROM department_permissions dp
LEFT JOIN employees e ON dp.employee_id = e.employee_id
ORDER BY dp.id;

-- ===== TEST FOREIGN KEY REFERENCES =====
SELECT 'TESTING FOREIGN KEY REFERENCES:' as info;

-- Test employee_id references
SELECT 'Employee IDs that would FAIL foreign key:' as test_type;
SELECT DISTINCT dp.employee_id
FROM department_permissions dp
LEFT JOIN employees e ON dp.employee_id = e.employee_id
WHERE e.employee_id IS NULL;

-- Test granted_by references  
SELECT 'Granted_by values that would FAIL foreign key:' as test_type;
SELECT DISTINCT dp.granted_by
FROM department_permissions dp
LEFT JOIN employees e ON dp.granted_by = e.employee_id
WHERE e.employee_id IS NULL AND dp.granted_by IS NOT NULL;

-- ===== KIỂM TRA DEPARTMENTS HIỆN CÓ =====
SELECT 'AVAILABLE DEPARTMENTS:' as info;
SELECT DISTINCT department, COUNT(*) as employee_count
FROM employees 
WHERE department IS NOT NULL AND department != ''
GROUP BY department
ORDER BY department;

-- ===== SIMULATE INSERT TEST =====
SELECT 'SIMULATING INSERT TEST:' as info;

-- Test với employee_id thực tế
DO $$
DECLARE
    test_employee_id VARCHAR(50);
    test_department VARCHAR(100);
    test_granted_by VARCHAR(50);
BEGIN
    -- Lấy employee_id đầu tiên có chức vụ phù hợp
    SELECT employee_id INTO test_employee_id
    FROM employees 
    WHERE chuc_vu IN ('truong_phong', 'to_truong') 
    AND is_active = true
    LIMIT 1;
    
    -- Lấy department đầu tiên
    SELECT DISTINCT department INTO test_department
    FROM employees 
    WHERE department IS NOT NULL 
    LIMIT 1;
    
    -- Set granted_by
    test_granted_by := 'admin';
    
    RAISE NOTICE 'Test values:';
    RAISE NOTICE 'employee_id: %', test_employee_id;
    RAISE NOTICE 'department: %', test_department;
    RAISE NOTICE 'granted_by: %', test_granted_by;
    
    -- Kiểm tra employee_id có tồn tại không
    IF EXISTS (SELECT 1 FROM employees WHERE employee_id = test_employee_id) THEN
        RAISE NOTICE 'employee_id EXISTS in employees table';
    ELSE
        RAISE NOTICE 'employee_id NOT FOUND in employees table';
    END IF;
    
    -- Kiểm tra granted_by có tồn tại không
    IF EXISTS (SELECT 1 FROM employees WHERE employee_id = test_granted_by) THEN
        RAISE NOTICE 'granted_by EXISTS in employees table';
    ELSE
        RAISE NOTICE 'granted_by NOT FOUND in employees table';
    END IF;
    
END $$;

-- ===== RECOMMENDATIONS =====
SELECT 'RECOMMENDATIONS BASED ON ANALYSIS:' as info;

-- Đếm số lượng records có thể gây vấn đề
WITH problem_analysis AS (
    SELECT 
        COUNT(*) as total_employees,
        COUNT(CASE WHEN chuc_vu IN ('truong_phong', 'to_truong') THEN 1 END) as managers_supervisors,
        COUNT(CASE WHEN employee_id = 'admin' OR chuc_vu = 'admin' THEN 1 END) as admin_users
    FROM employees
)
SELECT 
    total_employees,
    managers_supervisors,
    admin_users,
    CASE 
        WHEN admin_users = 0 THEN 'PROBLEM: No admin user found - need to create admin employee record'
        WHEN managers_supervisors = 0 THEN 'PROBLEM: No managers/supervisors found'
        ELSE 'OK: Basic data structure looks good'
    END as diagnosis
FROM problem_analysis;
