-- VERIFY EMPLOYEE DATA: Kiểm tra chi tiết dữ liệu employees
-- Script này sẽ giúp xác định employee_id nào đang được sử dụng và có hợp lệ không

-- ===== KIỂM TRA EMPLOYEES ĐƯỢC LOAD TRONG FRONTEND =====
SELECT 'EMPLOYEES AVAILABLE FOR PERMISSION ASSIGNMENT:' as info;
SELECT 
    employee_id, 
    full_name, 
    department, 
    chuc_vu, 
    is_active,
    CASE 
        WHEN chuc_vu IN ('truong_phong', 'to_truong') THEN 'ELIGIBLE'
        ELSE 'NOT ELIGIBLE'
    END as permission_eligibility
FROM employees 
WHERE is_active = true
ORDER BY 
    CASE chuc_vu 
        WHEN 'truong_phong' THEN 1 
        WHEN 'to_truong' THEN 2 
        ELSE 3 
    END,
    full_name;

-- ===== KIỂM TRA SPECIFIC EMPLOYEES TRONG MOCK DATA =====
SELECT 'CHECKING MOCK EMPLOYEES FROM FRONTEND:' as info;
SELECT 
    employee_id,
    full_name,
    department,
    chuc_vu,
    is_active,
    CASE 
        WHEN employee_id IS NULL THEN 'NOT FOUND'
        WHEN is_active = false THEN 'INACTIVE'
        ELSE 'VALID'
    END as status
FROM (
    VALUES 
        ('ADMIN001'),
        ('NV002'), 
        ('NV004'),
        ('NV007'),
        ('admin')
) AS mock(employee_id)
LEFT JOIN employees e ON mock.employee_id = e.employee_id;

-- ===== KIỂM TRA ADMIN USER CHO GRANTED_BY =====
SELECT 'ADMIN USER FOR GRANTED_BY FIELD:' as info;

-- Kiểm tra các khả năng cho admin user
SELECT 
    'Option 1: admin employee_id' as option,
    CASE 
        WHEN EXISTS (SELECT 1 FROM employees WHERE employee_id = 'admin') 
        THEN 'EXISTS' 
        ELSE 'NOT FOUND' 
    END as status;

SELECT 
    'Option 2: employees with admin role' as option,
    COUNT(*) as count,
    STRING_AGG(employee_id, ', ') as admin_employees
FROM employees 
WHERE chuc_vu = 'admin' OR employee_id LIKE '%admin%';

-- ===== KIỂM TRA DATA TYPES VÀ CONSTRAINTS =====
SELECT 'DATA TYPE COMPATIBILITY:' as info;

-- Kiểm tra độ dài employee_id
SELECT 
    'employee_id length check' as check_type,
    employee_id,
    LENGTH(employee_id) as id_length,
    CASE 
        WHEN LENGTH(employee_id) > 50 THEN 'TOO LONG'
        WHEN employee_id ~ '[^A-Za-z0-9_]' THEN 'INVALID CHARACTERS'
        ELSE 'OK'
    END as validation
FROM employees
WHERE LENGTH(employee_id) > 50 OR employee_id ~ '[^A-Za-z0-9_]';

-- ===== SIMULATE EXACT API CALL =====
SELECT 'SIMULATING API CALL WITH REAL DATA:' as info;

DO $$
DECLARE
    api_employee_id VARCHAR(50);
    api_department VARCHAR(100);
    api_granted_by VARCHAR(50);
    employee_exists BOOLEAN;
    granted_by_exists BOOLEAN;
BEGIN
    -- Lấy employee_id đầu tiên từ danh sách eligible
    SELECT employee_id INTO api_employee_id
    FROM employees 
    WHERE chuc_vu IN ('truong_phong', 'to_truong') 
    AND is_active = true
    LIMIT 1;
    
    -- Lấy department từ employees
    SELECT DISTINCT department INTO api_department
    FROM employees 
    WHERE department IS NOT NULL AND department != ''
    LIMIT 1;
    
    -- Set granted_by như trong API
    api_granted_by := 'admin'; -- Fallback value từ API fix
    
    -- Kiểm tra employee_id
    SELECT EXISTS (
        SELECT 1 FROM employees 
        WHERE employee_id = api_employee_id
    ) INTO employee_exists;
    
    -- Kiểm tra granted_by
    SELECT EXISTS (
        SELECT 1 FROM employees 
        WHERE employee_id = api_granted_by
    ) INTO granted_by_exists;
    
    RAISE NOTICE '=== API SIMULATION RESULTS ===';
    RAISE NOTICE 'employee_id: % (exists: %)', api_employee_id, employee_exists;
    RAISE NOTICE 'department: %', api_department;
    RAISE NOTICE 'granted_by: % (exists: %)', api_granted_by, granted_by_exists;
    
    -- Xác định vấn đề
    IF NOT employee_exists THEN
        RAISE NOTICE 'PROBLEM: employee_id does not exist in employees table';
    END IF;
    
    IF NOT granted_by_exists THEN
        RAISE NOTICE 'PROBLEM: granted_by does not exist in employees table';
        RAISE NOTICE 'SOLUTION: Need to create admin employee or modify constraint';
    END IF;
    
    IF employee_exists AND granted_by_exists THEN
        RAISE NOTICE 'SUCCESS: Both references should work';
    END IF;
    
END $$;

-- ===== KIỂM TRA EXISTING PERMISSIONS =====
SELECT 'EXISTING PERMISSIONS ANALYSIS:' as info;
SELECT 
    dp.employee_id,
    dp.department,
    dp.granted_by,
    dp.is_active,
    e1.full_name as employee_name,
    e1.chuc_vu as employee_role,
    e2.full_name as granted_by_name,
    CASE 
        WHEN e1.employee_id IS NULL THEN 'INVALID employee_id'
        WHEN e2.employee_id IS NULL AND dp.granted_by IS NOT NULL THEN 'INVALID granted_by'
        ELSE 'VALID'
    END as validation_status
FROM department_permissions dp
LEFT JOIN employees e1 ON dp.employee_id = e1.employee_id
LEFT JOIN employees e2 ON dp.granted_by = e2.employee_id
ORDER BY dp.id;

-- ===== RECOMMENDATIONS =====
SELECT 'SPECIFIC RECOMMENDATIONS:' as info;

WITH analysis AS (
    SELECT 
        COUNT(*) as total_employees,
        COUNT(CASE WHEN chuc_vu IN ('truong_phong', 'to_truong') THEN 1 END) as eligible_employees,
        COUNT(CASE WHEN employee_id = 'admin' THEN 1 END) as admin_employee_exists,
        COUNT(CASE WHEN chuc_vu = 'admin' THEN 1 END) as admin_role_exists
    FROM employees
    WHERE is_active = true
)
SELECT 
    CASE 
        WHEN admin_employee_exists = 0 THEN 
            'CRITICAL: Create admin employee record with: INSERT INTO employees (employee_id, full_name, department, chuc_vu, cccd_hash, is_active) VALUES (''admin'', ''System Admin'', ''Administration'', ''admin'', ''admin_hash'', true);'
        WHEN eligible_employees = 0 THEN
            'WARNING: No eligible employees found for permission assignment'
        ELSE
            'INFO: Basic data structure is OK'
    END as recommendation
FROM analysis;

-- ===== QUICK FIX SCRIPT =====
SELECT 'QUICK FIX SCRIPT:' as info;
SELECT '-- Run this to fix the admin user issue:
INSERT INTO employees (employee_id, full_name, department, chuc_vu, cccd_hash, is_active) 
VALUES (''admin'', ''System Administrator'', ''Administration'', ''admin'', ''$2a$10$admin_hash'', true)
ON CONFLICT (employee_id) DO NOTHING;' as fix_script;
