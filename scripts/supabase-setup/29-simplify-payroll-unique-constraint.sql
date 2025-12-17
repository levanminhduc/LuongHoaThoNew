-- SCRIPT 29: SIMPLIFY PAYROLL UNIQUE CONSTRAINT
-- Đơn giản hóa unique constraint từ 3 cột (employee_id, salary_month, payroll_type)
-- xuống còn 2 cột (employee_id, salary_month) để tự động UPDATE khi import lại

-- ===== RATIONALE =====
-- Business logic: Một nhân viên chỉ có 1 bảng lương duy nhất cho mỗi tháng
-- payroll_type (monthly/t13) chỉ là metadata phân loại, không phải business key
-- Auto-detect T13 từ salary_month pattern: "YYYY-13" hoặc "YYYY-T13"
-- Khi import lại cùng employee_id + salary_month → tự động UPDATE số liệu cũ

-- ===== STEP 1: UPDATE PAYROLLS TABLE =====

-- Drop old unique constraint (3 columns)
DROP INDEX IF EXISTS payrolls_unique_record;

-- Create new unique constraint (2 columns only)
CREATE UNIQUE INDEX payrolls_unique_record 
  ON payrolls(employee_id, salary_month);

COMMENT ON INDEX payrolls_unique_record IS 'Unique constraint: 1 nhân viên = 1 bảng lương/tháng. payroll_type được auto-detect từ salary_month.';

-- ===== STEP 2: UPDATE SIGNATURE_LOGS TABLE =====

-- Drop old unique constraint (3 columns)
DROP INDEX IF EXISTS signature_logs_unique_signature;

-- Create new unique constraint (2 columns only)
CREATE UNIQUE INDEX signature_logs_unique_signature 
  ON signature_logs(employee_id, salary_month);

COMMENT ON INDEX signature_logs_unique_signature IS 'Unique constraint: 1 nhân viên chỉ ký 1 lần/tháng. payroll_type được auto-detect.';

-- ===== STEP 3: UPDATE MANAGEMENT_SIGNATURES TABLE =====

-- Drop old unique constraint (3 columns)
DROP INDEX IF EXISTS idx_management_signatures_unique_month_type;

-- Create new unique constraint (2 columns: salary_month + signature_type)
-- Note: Không bao gồm payroll_type vì 1 chức vụ chỉ ký 1 lần/tháng bất kể loại lương
CREATE UNIQUE INDEX idx_management_signatures_unique_month_type 
  ON management_signatures(salary_month, signature_type) 
  WHERE is_active = true;

COMMENT ON INDEX idx_management_signatures_unique_month_type IS 'Unique constraint: Mỗi chức vụ (giam_doc/ke_toan/nguoi_lap_bieu) chỉ ký 1 lần/tháng cho tất cả loại lương.';

-- ===== STEP 4: VERIFY CHANGES =====

-- Check payrolls constraint
SELECT 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename = 'payrolls' 
  AND indexname = 'payrolls_unique_record';

-- Check signature_logs constraint
SELECT 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename = 'signature_logs' 
  AND indexname = 'signature_logs_unique_signature';

-- Check management_signatures constraint
SELECT 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename = 'management_signatures' 
  AND indexname = 'idx_management_signatures_unique_month_type';

-- ===== STEP 5: CHECK FOR POTENTIAL DUPLICATES =====
-- Kiểm tra xem có bị duplicate data sau khi thay đổi constraint không

-- Check payrolls duplicates
SELECT 
  employee_id, 
  salary_month, 
  COUNT(*) as count,
  STRING_AGG(DISTINCT payroll_type, ', ') as payroll_types
FROM payrolls
GROUP BY employee_id, salary_month
HAVING COUNT(*) > 1;

-- Check signature_logs duplicates
SELECT 
  employee_id, 
  salary_month, 
  COUNT(*) as count,
  STRING_AGG(DISTINCT payroll_type, ', ') as payroll_types
FROM signature_logs
GROUP BY employee_id, salary_month
HAVING COUNT(*) > 1;

-- Check management_signatures duplicates
SELECT 
  salary_month, 
  signature_type, 
  COUNT(*) as count,
  STRING_AGG(DISTINCT payroll_type, ', ') as payroll_types
FROM management_signatures
WHERE is_active = true
GROUP BY salary_month, signature_type
HAVING COUNT(*) > 1;

-- ===== NOTES =====
-- 1. Nếu có duplicates, cần merge/cleanup trước khi chạy migration này
-- 2. payroll_type column vẫn tồn tại trong database, chỉ bỏ khỏi unique constraint
-- 3. Auto-detect logic: salary_month match /^\d{4}-(13|T13)$/i → payroll_type = 't13', else 'monthly'
-- 4. Import logic mới: Check duplicate chỉ dùng (employee_id, salary_month), không dùng payroll_type

-- ===== ROLLBACK SCRIPT (NẾU CẦN) =====
-- Để rollback về constraint cũ (3 cột), chạy:
-- DROP INDEX IF EXISTS payrolls_unique_record;
-- CREATE UNIQUE INDEX payrolls_unique_record ON payrolls(employee_id, salary_month, payroll_type);
-- DROP INDEX IF EXISTS signature_logs_unique_signature;
-- CREATE UNIQUE INDEX signature_logs_unique_signature ON signature_logs(employee_id, salary_month, payroll_type);
-- DROP INDEX IF EXISTS idx_management_signatures_unique_month_type;
-- CREATE UNIQUE INDEX idx_management_signatures_unique_month_type ON management_signatures(salary_month, signature_type, payroll_type) WHERE is_active = true;

SELECT 'MIGRATION 29 COMPLETED: Simplified unique constraints to 2 columns (employee_id, salary_month)' as status;

