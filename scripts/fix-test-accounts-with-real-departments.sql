-- SCRIPT: Fix test accounts to use real departments from existing database
-- Run this after checking existing departments with check-existing-departments.sql

-- ===== STEP 1: IDENTIFY TOP DEPARTMENTS =====
-- This will help us choose which departments to use for test accounts

DO $$
DECLARE
    dept_record RECORD;
    dept1 TEXT;
    dept2 TEXT;
    dept3 TEXT;
    manager_dept TEXT;
    supervisor_dept TEXT;
    employee_dept TEXT;
BEGIN
    -- Get top 3 departments with most payroll data
    SELECT department INTO dept1
    FROM (
        SELECT e.department, COUNT(p.employee_id) as payroll_count
        FROM employees e
        JOIN payrolls p ON e.employee_id = p.employee_id
        WHERE e.department IS NOT NULL AND e.department != ''
        GROUP BY e.department
        ORDER BY payroll_count DESC
        LIMIT 1
    ) t;
    
    SELECT department INTO dept2
    FROM (
        SELECT e.department, COUNT(p.employee_id) as payroll_count
        FROM employees e
        JOIN payrolls p ON e.employee_id = p.employee_id
        WHERE e.department IS NOT NULL AND e.department != ''
          AND e.department != dept1
        GROUP BY e.department
        ORDER BY payroll_count DESC
        LIMIT 1
    ) t;
    
    SELECT department INTO dept3
    FROM (
        SELECT e.department, COUNT(p.employee_id) as payroll_count
        FROM employees e
        JOIN payrolls p ON e.employee_id = p.employee_id
        WHERE e.department IS NOT NULL AND e.department != ''
          AND e.department NOT IN (dept1, dept2)
        GROUP BY e.department
        ORDER BY payroll_count DESC
        LIMIT 1
    ) t;

    -- Set departments for test accounts
    manager_dept := COALESCE(dept1, 'DEFAULT_DEPT');
    supervisor_dept := COALESCE(dept1, 'DEFAULT_DEPT');
    employee_dept := COALESCE(dept1, 'DEFAULT_DEPT');

    RAISE NOTICE 'Top departments identified:';
    RAISE NOTICE 'Department 1 (most data): %', dept1;
    RAISE NOTICE 'Department 2: %', dept2;
    RAISE NOTICE 'Department 3: %', dept3;
    RAISE NOTICE '';
    RAISE NOTICE 'Test account assignments:';
    RAISE NOTICE 'TP001 (Manager) will manage: % and %', dept1, COALESCE(dept2, dept1);
    RAISE NOTICE 'TT001 (Supervisor) will supervise: %', dept1;
    RAISE NOTICE 'NV001 (Employee) will be in: %', dept1;

    -- Store in temporary table for next steps
    DROP TABLE IF EXISTS temp_dept_config;
    CREATE TEMP TABLE temp_dept_config (
        role TEXT,
        employee_id TEXT,
        primary_dept TEXT,
        secondary_dept TEXT
    );
    
    INSERT INTO temp_dept_config VALUES
    ('manager', 'TP001', dept1, dept2),
    ('supervisor', 'TT001', dept1, NULL),
    ('employee', 'NV001', dept1, NULL);
    
END $$;

-- ===== STEP 2: UPDATE OR CREATE TEST ACCOUNTS =====

-- Delete existing test accounts if they exist
DELETE FROM signature_logs WHERE employee_id IN ('TP001', 'TT001', 'NV001');
DELETE FROM payrolls WHERE employee_id IN ('TP001', 'TT001', 'NV001');
DELETE FROM department_permissions WHERE employee_id IN ('TP001', 'TT001', 'NV001');
DELETE FROM employees WHERE employee_id IN ('TP001', 'TT001', 'NV001');

-- Create test accounts with real departments
DO $$
DECLARE
    manager_dept1 TEXT;
    manager_dept2 TEXT;
    supervisor_dept TEXT;
    employee_dept TEXT;
    current_month TEXT := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
BEGIN
    -- Get department assignments from temp table
    SELECT primary_dept, secondary_dept INTO manager_dept1, manager_dept2
    FROM temp_dept_config WHERE role = 'manager';
    
    SELECT primary_dept INTO supervisor_dept
    FROM temp_dept_config WHERE role = 'supervisor';
    
    SELECT primary_dept INTO employee_dept
    FROM temp_dept_config WHERE role = 'employee';

    -- Create test employees with real departments
    INSERT INTO employees (employee_id, full_name, department, chuc_vu, cccd, cccd_hash, is_active) VALUES
    ('TP001', 'Nguyễn Văn A (Test Manager)', manager_dept1, 'truong_phong', '123456789023', '$2a$10$example_hash_for_truongphong123', true),
    ('TT001', 'Trần Thị B (Test Supervisor)', supervisor_dept, 'to_truong', '123456789012', '$2a$10$example_hash_for_totruong123', true),
    ('NV001', 'Lê Văn C (Test Employee)', employee_dept, 'nhan_vien', '123456789013', '$2a$10$example_hash_for_nhanvien123', true);

    -- Create department permissions for manager
    INSERT INTO department_permissions (employee_id, department, granted_by, notes) VALUES
    ('TP001', manager_dept1, 'admin', 'Test manager - primary department'),
    ('TP001', COALESCE(manager_dept2, manager_dept1), 'admin', 'Test manager - secondary department');

    -- Create sample payroll data for test accounts
    INSERT INTO payrolls (
        employee_id, salary_month, 
        luong_co_ban, phu_cap_chuc_vu, phu_cap_khac, thuong_hieu_qua, 
        tong_cong_tien_luong, bhxh_bhtn_bhyt_total, thue_tncn, 
        tien_luong_thuc_nhan_cuoi_ky, is_signed, created_at
    ) VALUES
    ('TP001', current_month, 12000000, 2000000, 1000000, 500000, 15500000, 1550000, 800000, 13150000, true, CURRENT_TIMESTAMP),
    ('TT001', current_month, 8000000, 1000000, 500000, 300000, 9800000, 980000, 450000, 8370000, true, CURRENT_TIMESTAMP),
    ('NV001', current_month, 6000000, 0, 300000, 200000, 6500000, 650000, 200000, 5650000, false, CURRENT_TIMESTAMP);

    -- Create signature logs for signed payrolls
    INSERT INTO signature_logs (employee_id, payroll_month, signature_time, ip_address, user_agent) VALUES
    ('TP001', current_month, CURRENT_TIMESTAMP, '192.168.1.100', 'Mozilla/5.0 (Test Manager)'),
    ('TT001', current_month, CURRENT_TIMESTAMP, '192.168.1.101', 'Mozilla/5.0 (Test Supervisor)');

    RAISE NOTICE 'Test accounts created successfully!';
    RAISE NOTICE 'TP001 (Manager): Department %, can access % and %', manager_dept1, manager_dept1, COALESCE(manager_dept2, manager_dept1);
    RAISE NOTICE 'TT001 (Supervisor): Department %', supervisor_dept;
    RAISE NOTICE 'NV001 (Employee): Department %', employee_dept;

END $$;

-- ===== STEP 3: VERIFY TEST ACCOUNTS =====

SELECT 'TEST ACCOUNTS VERIFICATION:' as info;
SELECT e.employee_id, e.full_name, e.department, e.chuc_vu,
       CASE WHEN p.employee_id IS NOT NULL THEN 'Has Payroll' ELSE 'No Payroll' END as payroll_status,
       CASE WHEN dp.employee_id IS NOT NULL THEN 'Has Permissions' ELSE 'No Permissions' END as permission_status
FROM employees e
LEFT JOIN payrolls p ON e.employee_id = p.employee_id AND p.salary_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
LEFT JOIN department_permissions dp ON e.employee_id = dp.employee_id AND dp.is_active = true
WHERE e.employee_id IN ('TP001', 'TT001', 'NV001')
ORDER BY e.employee_id;

-- Show department permissions for manager
SELECT 'MANAGER DEPARTMENT PERMISSIONS:' as info;
SELECT dp.employee_id, dp.department, dp.granted_by, dp.granted_at, dp.notes
FROM department_permissions dp
WHERE dp.employee_id = 'TP001' AND dp.is_active = true;

-- Show what data the manager should see
SELECT 'DATA MANAGER SHOULD SEE:' as info;
SELECT e.department, COUNT(*) as employee_count,
       COUNT(p.employee_id) as payroll_count,
       SUM(p.tien_luong_thuc_nhan_cuoi_ky) as total_salary
FROM employees e
LEFT JOIN payrolls p ON e.employee_id = p.employee_id 
    AND p.salary_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
WHERE e.department IN (
    SELECT department FROM department_permissions 
    WHERE employee_id = 'TP001' AND is_active = true
)
GROUP BY e.department
ORDER BY e.department;

-- Clean up temp table
DROP TABLE IF EXISTS temp_dept_config;

-- ===== FINAL INSTRUCTIONS =====
SELECT 'NEXT STEPS:' as info;
SELECT 'Update lib/auth.ts test accounts with the departments shown above' as instruction
UNION ALL
SELECT 'Test login with TP001/truongphong123 to verify manager dashboard' as instruction
UNION ALL
SELECT 'Test login with TT001/totruong123 to verify supervisor dashboard' as instruction
UNION ALL
SELECT 'Test login with NV001/nhanvien123 to verify employee dashboard' as instruction;
