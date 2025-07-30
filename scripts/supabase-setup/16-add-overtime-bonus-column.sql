-- STEP 16: ADD OVERTIME BONUS COLUMN
-- Bổ sung cột "Tiền tăng ca vượt" vào bảng payrolls
-- Thực hiện: 2025-07-30

-- ===== BACKUP REMINDER =====
-- QUAN TRỌNG: Backup database trước khi chạy script này!
-- pg_dump -h your_host -U your_user -d your_database > backup_before_overtime_bonus_addition.sql

-- ===== THÊM CỘT MỚI =====

-- Thêm cột "Tiền tăng ca vượt"
ALTER TABLE payrolls 
ADD COLUMN tien_tang_ca_vuot DECIMAL(15,2) DEFAULT 0;

-- ===== THÊM COMMENT CHO DOCUMENTATION =====

COMMENT ON COLUMN payrolls.tien_tang_ca_vuot IS 'Tiền thưởng cho giờ tăng ca vượt định mức';

-- ===== VERIFY COLUMN ADDED =====
-- Kiểm tra cột đã được thêm thành công
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    col_description(pgc.oid, pa.attnum) as column_comment
FROM information_schema.columns isc
JOIN pg_class pgc ON pgc.relname = isc.table_name
JOIN pg_attribute pa ON pa.attrelid = pgc.oid AND pa.attname = isc.column_name
WHERE isc.table_name = 'payrolls' 
  AND isc.column_name = 'tien_tang_ca_vuot'
ORDER BY isc.column_name;

-- ===== UPDATE EXISTING RECORDS (OPTIONAL) =====
-- Nếu cần set giá trị mặc định cho các records hiện có
-- UPDATE payrolls SET tien_tang_ca_vuot = 0 WHERE tien_tang_ca_vuot IS NULL;

-- ===== ROLLBACK SCRIPT (NẾU CẦN) =====
-- Để rollback thay đổi này, chạy:
-- ALTER TABLE payrolls DROP COLUMN IF EXISTS tien_tang_ca_vuot;

-- ===== THÔNG TIN THÊM =====
-- Sau khi chạy script này, cần cập nhật:
-- 1. TypeScript interfaces trong app/admin/payroll-management/types.ts
-- 2. Field definitions trong lib/payroll-field-definitions.ts  
-- 3. Excel parser trong lib/advanced-excel-parser.ts
-- 4. API routes liên quan đến payroll data
-- 5. Frontend components hiển thị payroll data
-- 6. Export template functions

-- ===== TESTING CHECKLIST =====
-- □ Backup database completed
-- □ Script executed successfully  
-- □ Column verified in database
-- □ Existing data integrity maintained
-- □ TypeScript interfaces updated
-- □ Frontend components updated
-- □ Import/export functionality tested
-- □ API endpoints tested

PRINT 'Migration completed: Added tien_tang_ca_vuot column successfully!';
