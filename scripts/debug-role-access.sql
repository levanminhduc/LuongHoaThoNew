-- DEBUG SCRIPT: Kiểm tra role-based access và data
-- Chạy script này để debug vấn đề không hiển thị data

-- ===== KIỂM TRA EMPLOYEES DATA =====
SELECT 'EMPLOYEES BY DEPARTMENT:' as check_type;
SELECT department, chuc_vu, COUNT(*) as count, STRING_AGG(employee_id, ', ') as employee_ids
FROM employees 
WHERE is_active = true
GROUP BY department, chuc_vu
ORDER BY department, chuc_vu;

-- ===== KIỂM TRA PAYROLLS DATA =====
SELECT 'PAYROLLS BY DEPARTMENT:' as check_type;
SELECT e.department, p.salary_month, COUNT(*) as count, 
       SUM(p.tien_luong_thuc_nhan_cuoi_ky) as total_salary,
       STRING_AGG(p.employee_id, ', ') as employee_ids
FROM payrolls p
JOIN employees e ON p.employee_id = e.employee_id
WHERE e.is_active = true
GROUP BY e.department, p.salary_month
ORDER BY e.department, p.salary_month DESC;

-- ===== KIỂM TRA DEPARTMENT PERMISSIONS =====
SELECT 'DEPARTMENT PERMISSIONS:' as check_type;
SELECT dp.*, e.full_name, e.chuc_vu
FROM department_permissions dp
JOIN employees e ON dp.employee_id = e.employee_id
WHERE dp.is_active = true;

-- ===== KIỂM TRA TEST ACCOUNTS =====
SELECT 'TEST ACCOUNTS:' as check_type;
SELECT employee_id, full_name, department, chuc_vu, is_active
FROM employees 
WHERE employee_id IN ('TP001', 'TT001', 'NV001')
ORDER BY employee_id;

-- ===== KIỂM TRA PAYROLL CHO TEST ACCOUNTS =====
SELECT 'PAYROLL FOR TEST ACCOUNTS:' as check_type;
SELECT p.employee_id, e.full_name, e.department, e.chuc_vu, 
       p.salary_month, p.tien_luong_thuc_nhan_cuoi_ky, p.is_signed
FROM payrolls p
JOIN employees e ON p.employee_id = e.employee_id
WHERE p.employee_id IN ('TP001', 'TT001', 'NV001')
ORDER BY p.employee_id, p.salary_month DESC;

-- ===== SIMULATE MANAGER QUERY (TP001) =====
SELECT 'MANAGER QUERY SIMULATION (TP001):' as check_type;
-- Giả lập query mà API /api/payroll/my-departments sẽ chạy
SELECT p.*, e.employee_id, e.full_name, e.department, e.chuc_vu
FROM payrolls p
INNER JOIN employees e ON p.employee_id = e.employee_id
WHERE e.department IN ('Hoàn Thành', 'KCS')  -- allowed_departments cho TP001
  AND p.salary_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')  -- tháng hiện tại
ORDER BY e.department, e.full_name;

-- ===== SIMULATE SUPERVISOR QUERY (TT001) =====
SELECT 'SUPERVISOR QUERY SIMULATION (TT001):' as check_type;
-- Giả lập query mà API /api/payroll/my-department sẽ chạy
SELECT p.*, e.employee_id, e.full_name, e.department, e.chuc_vu
FROM payrolls p
INNER JOIN employees e ON p.employee_id = e.employee_id
WHERE e.department = 'Hoàn Thành'  -- department của TT001
  AND p.salary_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')  -- tháng hiện tại
ORDER BY e.full_name;

-- ===== KIỂM TRA RLS POLICIES =====
SELECT 'RLS POLICIES:' as check_type;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename IN ('payrolls', 'employees', 'department_permissions')
ORDER BY tablename, policyname;

-- ===== KIỂM TRA CURRENT MONTH DATA =====
SELECT 'CURRENT MONTH SUMMARY:' as check_type;
SELECT 
    TO_CHAR(CURRENT_DATE, 'YYYY-MM') as current_month,
    COUNT(DISTINCT p.employee_id) as total_employees_with_payroll,
    COUNT(DISTINCT e.department) as departments_with_data,
    STRING_AGG(DISTINCT e.department, ', ') as departments_list
FROM payrolls p
JOIN employees e ON p.employee_id = e.employee_id
WHERE p.salary_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM');

-- ===== KIỂM TRA SIGNATURE STATUS =====
SELECT 'SIGNATURE STATUS:' as check_type;
SELECT e.department, 
       COUNT(*) as total_payrolls,
       SUM(CASE WHEN p.is_signed THEN 1 ELSE 0 END) as signed_count,
       ROUND(SUM(CASE WHEN p.is_signed THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as signed_percentage
FROM payrolls p
JOIN employees e ON p.employee_id = e.employee_id
WHERE p.salary_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
GROUP BY e.department
ORDER BY e.department;

-- ===== TROUBLESHOOTING QUERIES =====

-- Kiểm tra có employees nào không có payroll không
SELECT 'EMPLOYEES WITHOUT PAYROLL:' as check_type;
SELECT e.employee_id, e.full_name, e.department, e.chuc_vu
FROM employees e
LEFT JOIN payrolls p ON e.employee_id = p.employee_id 
    AND p.salary_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
WHERE e.is_active = true AND p.employee_id IS NULL
ORDER BY e.department, e.employee_id;

-- Kiểm tra có payroll nào không match với employees không
SELECT 'ORPHANED PAYROLLS:' as check_type;
SELECT p.employee_id, p.salary_month, p.tien_luong_thuc_nhan_cuoi_ky
FROM payrolls p
LEFT JOIN employees e ON p.employee_id = e.employee_id
WHERE e.employee_id IS NULL
ORDER BY p.employee_id, p.salary_month;

-- ===== FINAL SUMMARY =====
SELECT 'FINAL SUMMARY:' as check_type;
SELECT 
    'Total Active Employees' as metric, COUNT(*)::text as value
FROM employees WHERE is_active = true
UNION ALL
SELECT 
    'Total Payroll Records (Current Month)' as metric, COUNT(*)::text as value
FROM payrolls WHERE salary_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
UNION ALL
SELECT 
    'Departments with Data' as metric, COUNT(DISTINCT e.department)::text as value
FROM payrolls p JOIN employees e ON p.employee_id = e.employee_id
WHERE p.salary_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
UNION ALL
SELECT 
    'Active Department Permissions' as metric, COUNT(*)::text as value
FROM department_permissions WHERE is_active = true;
