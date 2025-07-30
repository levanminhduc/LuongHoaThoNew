-- SCRIPT: Check existing departments and data in current database
-- This will help us understand what departments actually exist

-- ===== CHECK EXISTING DEPARTMENTS =====
SELECT 'EXISTING DEPARTMENTS IN EMPLOYEES TABLE:' as info;
SELECT DISTINCT department, COUNT(*) as employee_count
FROM employees 
WHERE department IS NOT NULL AND department != ''
GROUP BY department
ORDER BY employee_count DESC;

-- ===== CHECK DEPARTMENTS WITH PAYROLL DATA =====
SELECT 'DEPARTMENTS WITH PAYROLL DATA:' as info;
SELECT DISTINCT e.department, COUNT(*) as payroll_count,
       MIN(p.salary_month) as earliest_month,
       MAX(p.salary_month) as latest_month
FROM payrolls p
JOIN employees e ON p.employee_id = e.employee_id
WHERE e.department IS NOT NULL AND e.department != ''
GROUP BY e.department
ORDER BY payroll_count DESC;

-- ===== CHECK EMPLOYEE ROLES BY DEPARTMENT =====
SELECT 'EMPLOYEE ROLES BY DEPARTMENT:' as info;
SELECT department, chuc_vu, COUNT(*) as count
FROM employees 
WHERE department IS NOT NULL AND department != ''
  AND is_active = true
GROUP BY department, chuc_vu
ORDER BY department, chuc_vu;

-- ===== CHECK RECENT PAYROLL DATA =====
SELECT 'RECENT PAYROLL DATA (LAST 3 MONTHS):' as info;
SELECT e.department, p.salary_month, COUNT(*) as payroll_count,
       SUM(p.tien_luong_thuc_nhan_cuoi_ky) as total_salary
FROM payrolls p
JOIN employees e ON p.employee_id = e.employee_id
WHERE p.salary_month >= TO_CHAR(CURRENT_DATE - INTERVAL '3 months', 'YYYY-MM')
  AND e.department IS NOT NULL AND e.department != ''
GROUP BY e.department, p.salary_month
ORDER BY p.salary_month DESC, e.department;

-- ===== CHECK FOR POTENTIAL MANAGERS/SUPERVISORS =====
SELECT 'POTENTIAL MANAGERS AND SUPERVISORS:' as info;
SELECT employee_id, full_name, department, chuc_vu
FROM employees
WHERE chuc_vu IN ('truong_phong', 'to_truong')
  AND is_active = true
ORDER BY department, chuc_vu;

-- ===== CHECK SAMPLE EMPLOYEES FOR TESTING =====
SELECT 'SAMPLE EMPLOYEES FOR ROLE TESTING:' as info;
SELECT employee_id, full_name, department, chuc_vu, is_active
FROM employees
WHERE employee_id IN ('TP001', 'TT001', 'NV001')
   OR employee_id LIKE 'TEST_%'
ORDER BY employee_id;

-- ===== SUMMARY FOR CONFIGURATION =====
SELECT 'SUMMARY FOR TEST ACCOUNT CONFIGURATION:' as info;
WITH dept_stats AS (
  SELECT e.department,
         COUNT(DISTINCT e.employee_id) as total_employees,
         COUNT(DISTINCT p.employee_id) as employees_with_payroll,
         COUNT(DISTINCT CASE WHEN e.chuc_vu = 'truong_phong' THEN e.employee_id END) as managers,
         COUNT(DISTINCT CASE WHEN e.chuc_vu = 'to_truong' THEN e.employee_id END) as supervisors,
         COUNT(DISTINCT CASE WHEN e.chuc_vu = 'nhan_vien' THEN e.employee_id END) as employees
  FROM employees e
  LEFT JOIN payrolls p ON e.employee_id = p.employee_id
  WHERE e.department IS NOT NULL AND e.department != ''
    AND e.is_active = true
  GROUP BY e.department
)
SELECT department,
       total_employees,
       employees_with_payroll,
       managers,
       supervisors,
       employees,
       CASE 
         WHEN employees_with_payroll > 0 THEN 'Good for testing'
         ELSE 'Needs payroll data'
       END as test_readiness
FROM dept_stats
ORDER BY employees_with_payroll DESC, total_employees DESC;
