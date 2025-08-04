-- DEBUG DEPARTMENTS: Kiểm tra tại sao departments không hiển thị đầy đủ
-- Script này sẽ giúp xác định nguyên nhân departments bị thiếu

-- ===== KIỂM TRA TẤT CẢ DEPARTMENTS TRONG DATABASE =====
SELECT 'ALL DEPARTMENTS (INCLUDING INACTIVE):' as info;
SELECT 
    department,
    COUNT(*) as total_employees,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_employees,
    COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_employees,
    STRING_AGG(DISTINCT chuc_vu, ', ') as roles_in_dept
FROM employees 
WHERE department IS NOT NULL AND department != ''
GROUP BY department
ORDER BY department;

-- ===== KIỂM TRA DEPARTMENTS CHỈ VỚI ACTIVE EMPLOYEES (LOGIC API HIỆN TẠI) =====
SELECT 'DEPARTMENTS WITH ACTIVE EMPLOYEES ONLY (CURRENT API LOGIC):' as info;
SELECT DISTINCT department, COUNT(*) as active_employee_count
FROM employees 
WHERE department IS NOT NULL 
  AND department != ''
  AND is_active = true
GROUP BY department
ORDER BY department;

-- ===== KIỂM TRA DEPARTMENTS VỚI NULL/EMPTY VALUES =====
SELECT 'EMPLOYEES WITH NULL/EMPTY DEPARTMENTS:' as info;
SELECT 
    employee_id,
    full_name,
    department,
    is_active,
    CASE 
        WHEN department IS NULL THEN 'NULL'
        WHEN department = '' THEN 'EMPTY STRING'
        ELSE 'HAS VALUE'
    END as department_status
FROM employees 
WHERE department IS NULL OR department = ''
ORDER BY is_active DESC, employee_id;

-- ===== KIỂM TRA MANAGERS/SUPERVISORS BY DEPARTMENT =====
SELECT 'MANAGERS AND SUPERVISORS BY DEPARTMENT:' as info;
SELECT 
    department,
    chuc_vu,
    COUNT(*) as count,
    STRING_AGG(employee_id || ' (' || full_name || ')', ', ') as employees
FROM employees 
WHERE chuc_vu IN ('truong_phong', 'to_truong')
  AND is_active = true
  AND department IS NOT NULL 
  AND department != ''
GROUP BY department, chuc_vu
ORDER BY department, chuc_vu;

-- ===== KIỂM TRA PAYROLL DATA BY DEPARTMENT =====
SELECT 'PAYROLL DATA BY DEPARTMENT (CURRENT MONTH):' as info;
SELECT 
    e.department,
    COUNT(DISTINCT p.employee_id) as employees_with_payroll,
    COUNT(p.id) as total_payroll_records,
    p.salary_month
FROM payrolls p
JOIN employees e ON p.employee_id = e.employee_id
WHERE p.salary_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
  AND e.department IS NOT NULL 
  AND e.department != ''
GROUP BY e.department, p.salary_month
ORDER BY e.department;

-- ===== SIMULATE API QUERY EXACTLY =====
SELECT 'SIMULATING EXACT API QUERY:' as info;
WITH api_departments AS (
    SELECT DISTINCT department
    FROM employees 
    WHERE is_active = true
      AND department IS NOT NULL 
      AND department != ''
    ORDER BY department
)
SELECT 
    department,
    'Would be included in API response' as status
FROM api_departments;

-- ===== KIỂM TRA DEPARTMENT PERMISSIONS =====
SELECT 'DEPARTMENT PERMISSIONS SUMMARY:' as info;
SELECT 
    dp.department,
    COUNT(*) as permission_count,
    COUNT(CASE WHEN dp.is_active = true THEN 1 END) as active_permissions,
    STRING_AGG(DISTINCT e.full_name, ', ') as employees_with_permissions
FROM department_permissions dp
LEFT JOIN employees e ON dp.employee_id = e.employee_id
GROUP BY dp.department
ORDER BY dp.department;

-- ===== FINAL COMPARISON =====
SELECT 'COMPARISON: DEPARTMENTS VS PERMISSIONS:' as info;
WITH dept_list AS (
    SELECT DISTINCT department
    FROM employees 
    WHERE is_active = true
      AND department IS NOT NULL 
      AND department != ''
),
perm_list AS (
    SELECT DISTINCT department
    FROM department_permissions
    WHERE is_active = true
)
SELECT 
    COALESCE(d.department, p.department) as department,
    CASE WHEN d.department IS NOT NULL THEN 'YES' ELSE 'NO' END as has_employees,
    CASE WHEN p.department IS NOT NULL THEN 'YES' ELSE 'NO' END as has_permissions,
    CASE 
        WHEN d.department IS NOT NULL AND p.department IS NULL THEN 'DEPT WITHOUT PERMISSIONS'
        WHEN d.department IS NULL AND p.department IS NOT NULL THEN 'PERMISSIONS WITHOUT DEPT'
        WHEN d.department IS NOT NULL AND p.department IS NOT NULL THEN 'BOTH EXIST'
        ELSE 'ERROR'
    END as status
FROM dept_list d
FULL OUTER JOIN perm_list p ON d.department = p.department
ORDER BY COALESCE(d.department, p.department);
