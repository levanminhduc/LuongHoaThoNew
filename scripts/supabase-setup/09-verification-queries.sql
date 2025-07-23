-- STEP 9: VERIFICATION QUERIES

-- Kiểm tra cấu trúc bảng
SELECT table_name, column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('employees', 'payrolls', 'signature_logs')
ORDER BY table_name, ordinal_position;

-- Kiểm tra indexes
SELECT indexname, tablename, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('employees', 'payrolls', 'signature_logs');

-- Kiểm tra functions
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%salary%';

-- Kiểm tra RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public';

-- Test data integrity
SELECT 
  e.employee_id,
  e.full_name,
  e.department,
  e.chuc_vu,
  p.salary_month,
  p.tien_luong_thuc_nhan_cuoi_ky,
  p.is_signed,
  p.signed_by_name,
  p.signed_at
FROM employees e
LEFT JOIN payrolls p ON e.employee_id = p.employee_id
ORDER BY e.employee_id, p.salary_month;

-- Kiểm tra signature logs
SELECT 
  sl.employee_id,
  sl.salary_month,
  sl.signed_by_name,
  sl.signed_at,
  sl.signature_ip,
  sl.is_valid
FROM signature_logs sl
ORDER BY sl.signed_at DESC;

-- Test các functions
SELECT * FROM get_signature_report('2024-07');
SELECT * FROM get_salary_by_month('NV001', '2024-07');
SELECT * FROM get_employee_salary_detail('NV001', '2024-07');

-- Final validation query
SELECT 
  'Database setup complete' as status,
  (SELECT COUNT(*) FROM employees) as employees_count,
  (SELECT COUNT(*) FROM payrolls) as payrolls_count,
  (SELECT COUNT(*) FROM signature_logs) as signatures_count,
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') as indexes_count,
  (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name LIKE '%salary%') as functions_count;
