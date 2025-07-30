-- VERIFY ROLE-BASED ACCESS: Kiểm tra permissions hoạt động trong dashboards
-- Script này verify data access theo permissions đã cấp

-- ===== KIỂM TRA PERMISSIONS ĐÃ CẤP =====
SELECT 'CURRENT ACTIVE PERMISSIONS:' as info;
SELECT 
    dp.employee_id,
    e.full_name,
    e.chuc_vu,
    dp.department,
    dp.granted_by,
    dp.granted_at,
    dp.notes
FROM department_permissions dp
JOIN employees e ON dp.employee_id = e.employee_id
WHERE dp.is_active = true
ORDER BY dp.employee_id, dp.department;

-- ===== SIMULATE MANAGER DASHBOARD QUERY =====
SELECT 'MANAGER DASHBOARD SIMULATION:' as info;

-- Giả lập query cho manager có permissions
DO $$
DECLARE
    manager_id VARCHAR(50);
    allowed_depts TEXT[];
    dept TEXT;
BEGIN
    -- Lấy manager đầu tiên có permissions
    SELECT dp.employee_id INTO manager_id
    FROM department_permissions dp
    JOIN employees e ON dp.employee_id = e.employee_id
    WHERE dp.is_active = true 
    AND e.chuc_vu = 'truong_phong'
    LIMIT 1;
    
    IF manager_id IS NOT NULL THEN
        -- Lấy danh sách departments được phép truy cập
        SELECT ARRAY_AGG(department) INTO allowed_depts
        FROM department_permissions
        WHERE employee_id = manager_id AND is_active = true;
        
        RAISE NOTICE 'Manager: % can access departments: %', manager_id, allowed_depts;
        
        -- Simulate payroll query cho manager
        RAISE NOTICE 'Payroll data accessible to manager:';
        FOR dept IN SELECT UNNEST(allowed_depts) LOOP
            RAISE NOTICE 'Department: % - Employees: %', 
                dept, 
                (SELECT COUNT(*) FROM employees WHERE department = dept AND is_active = true);
        END LOOP;
    ELSE
        RAISE NOTICE 'No manager with permissions found';
    END IF;
END $$;

-- ===== SIMULATE SUPERVISOR DASHBOARD QUERY =====
SELECT 'SUPERVISOR DASHBOARD SIMULATION:' as info;

DO $$
DECLARE
    supervisor_id VARCHAR(50);
    supervisor_dept VARCHAR(100);
BEGIN
    -- Lấy supervisor đầu tiên
    SELECT employee_id, department INTO supervisor_id, supervisor_dept
    FROM employees
    WHERE chuc_vu = 'to_truong' AND is_active = true
    LIMIT 1;
    
    IF supervisor_id IS NOT NULL THEN
        RAISE NOTICE 'Supervisor: % manages department: %', supervisor_id, supervisor_dept;
        RAISE NOTICE 'Team members: %', 
            (SELECT COUNT(*) FROM employees WHERE department = supervisor_dept AND is_active = true);
    ELSE
        RAISE NOTICE 'No supervisor found';
    END IF;
END $$;

-- ===== VERIFY PAYROLL DATA ACCESS =====
SELECT 'PAYROLL DATA ACCESS VERIFICATION:' as info;

-- Kiểm tra data mà managers có thể truy cập
WITH manager_access AS (
    SELECT 
        dp.employee_id as manager_id,
        e.full_name as manager_name,
        dp.department,
        COUNT(emp.employee_id) as employees_in_dept,
        COUNT(p.employee_id) as payroll_records
    FROM department_permissions dp
    JOIN employees e ON dp.employee_id = e.employee_id
    LEFT JOIN employees emp ON dp.department = emp.department AND emp.is_active = true
    LEFT JOIN payrolls p ON emp.employee_id = p.employee_id 
        AND p.salary_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
    WHERE dp.is_active = true
    GROUP BY dp.employee_id, e.full_name, dp.department
)
SELECT 
    manager_id,
    manager_name,
    department,
    employees_in_dept,
    payroll_records,
    CASE 
        WHEN payroll_records > 0 THEN 'HAS DATA'
        WHEN employees_in_dept > 0 THEN 'HAS EMPLOYEES, NO PAYROLL'
        ELSE 'NO DATA'
    END as data_status
FROM manager_access
ORDER BY manager_id, department;

-- ===== SIMULATE API RESPONSES =====
SELECT 'API RESPONSE SIMULATION:' as info;

-- Simulate /api/payroll/my-departments response
WITH api_simulation AS (
    SELECT 
        dp.employee_id,
        dp.department,
        COUNT(p.employee_id) as payroll_count,
        SUM(p.tien_luong_thuc_nhan_cuoi_ky) as total_salary,
        COUNT(CASE WHEN p.is_signed THEN 1 END) as signed_count
    FROM department_permissions dp
    LEFT JOIN employees e ON dp.department = e.department AND e.is_active = true
    LEFT JOIN payrolls p ON e.employee_id = p.employee_id 
        AND p.salary_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
    WHERE dp.is_active = true
    GROUP BY dp.employee_id, dp.department
)
SELECT 
    employee_id as manager_id,
    department,
    payroll_count,
    COALESCE(total_salary, 0) as total_salary,
    signed_count,
    CASE 
        WHEN payroll_count > 0 THEN 'SUCCESS: Data available'
        ELSE 'WARNING: No payroll data for this month'
    END as api_status
FROM api_simulation
ORDER BY employee_id, department;

-- ===== CHECK AUTHENTICATION SETUP =====
SELECT 'AUTHENTICATION SETUP CHECK:' as info;

-- Verify employees có thể login
SELECT 
    employee_id,
    full_name,
    chuc_vu,
    department,
    is_active,
    CASE 
        WHEN employee_id IN (SELECT employee_id FROM department_permissions WHERE is_active = true) 
        THEN 'HAS PERMISSIONS'
        ELSE 'NO PERMISSIONS'
    END as permission_status,
    CASE 
        WHEN chuc_vu = 'truong_phong' THEN 'Should access /manager/dashboard'
        WHEN chuc_vu = 'to_truong' THEN 'Should access /supervisor/dashboard'
        WHEN chuc_vu = 'nhan_vien' THEN 'Should access /employee/dashboard'
        ELSE 'Admin access'
    END as expected_dashboard
FROM employees
WHERE is_active = true
AND chuc_vu IN ('truong_phong', 'to_truong', 'nhan_vien')
ORDER BY chuc_vu, employee_id;

-- ===== GENERATE TEST CREDENTIALS =====
SELECT 'TEST CREDENTIALS:' as info;

-- Tạo danh sách credentials để test
WITH test_accounts AS (
    SELECT 
        e.employee_id,
        e.full_name,
        e.chuc_vu,
        e.department,
        CASE 
            WHEN e.chuc_vu = 'truong_phong' THEN 'truongphong123'
            WHEN e.chuc_vu = 'to_truong' THEN 'totruong123'
            WHEN e.chuc_vu = 'nhan_vien' THEN 'nhanvien123'
            ELSE 'admin123'
        END as suggested_password,
        CASE 
            WHEN dp.employee_id IS NOT NULL THEN 'YES'
            ELSE 'NO'
        END as has_permissions
    FROM employees e
    LEFT JOIN department_permissions dp ON e.employee_id = dp.employee_id AND dp.is_active = true
    WHERE e.is_active = true
    AND e.chuc_vu IN ('truong_phong', 'to_truong', 'nhan_vien')
)
SELECT 
    employee_id,
    full_name,
    chuc_vu,
    department,
    suggested_password,
    has_permissions,
    CASE 
        WHEN chuc_vu = 'truong_phong' AND has_permissions = 'YES' 
        THEN 'READY FOR MANAGER DASHBOARD TEST'
        WHEN chuc_vu = 'to_truong' 
        THEN 'READY FOR SUPERVISOR DASHBOARD TEST'
        WHEN chuc_vu = 'nhan_vien' 
        THEN 'READY FOR EMPLOYEE DASHBOARD TEST'
        ELSE 'NEEDS PERMISSION SETUP'
    END as test_status
FROM test_accounts
ORDER BY chuc_vu, employee_id;

-- ===== FINAL RECOMMENDATIONS =====
SELECT 'FINAL RECOMMENDATIONS:' as info;

WITH summary AS (
    SELECT 
        COUNT(DISTINCT dp.employee_id) as managers_with_permissions,
        COUNT(DISTINCT dp.department) as departments_with_permissions,
        COUNT(*) as total_permissions
    FROM department_permissions dp
    WHERE dp.is_active = true
)
SELECT 
    managers_with_permissions,
    departments_with_permissions,
    total_permissions,
    CASE 
        WHEN managers_with_permissions = 0 THEN 'CRITICAL: No managers have permissions - assign permissions first'
        WHEN departments_with_permissions = 0 THEN 'WARNING: No departments assigned'
        ELSE 'READY: Can test role-based dashboards'
    END as status,
    CASE 
        WHEN managers_with_permissions > 0 THEN 'Test login with manager credentials and verify dashboard access'
        ELSE 'Run permission assignment first'
    END as next_action
FROM summary;
