-- STEP 15: ADD MISSING PAYROLL COLUMNS
-- Bổ sung 3 cột dữ liệu lương chưa có trong bảng payrolls
-- Thực hiện: 2024-07-30

-- ===== BACKUP REMINDER =====
-- QUAN TRỌNG: Backup database trước khi chạy script này!
-- pg_dump -h your_host -U your_user -d your_database > backup_before_column_addition.sql

-- ===== THÊM CÁC CỘT MỚI =====

-- 1. Thêm cột "Ngày công chủ nhật"
ALTER TABLE payrolls 
ADD COLUMN ngay_cong_chu_nhat DECIMAL(5,2) DEFAULT 0;

-- 2. Thêm cột "Tiền lương chủ nhật"  
ALTER TABLE payrolls 
ADD COLUMN tien_luong_chu_nhat DECIMAL(15,2) DEFAULT 0;

-- 3. Thêm cột "Lương CNKCP vượt" (Công nhân kỹ thuật cao phẩm vượt)
ALTER TABLE payrolls 
ADD COLUMN luong_cnkcp_vuot DECIMAL(15,2) DEFAULT 0;

-- ===== THÊM COMMENTS CHO DOCUMENTATION =====

COMMENT ON COLUMN payrolls.ngay_cong_chu_nhat IS 'Số ngày công làm việc chủ nhật trong tháng';
COMMENT ON COLUMN payrolls.tien_luong_chu_nhat IS 'Tiền lương cho các ngày làm việc chủ nhật';
COMMENT ON COLUMN payrolls.luong_cnkcp_vuot IS 'Lương công nhân kỹ thuật cao phẩm vượt định mức';

-- ===== VERIFY COLUMNS ADDED =====
-- Kiểm tra các cột đã được thêm thành công
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
  AND isc.column_name IN ('ngay_cong_chu_nhat', 'tien_luong_chu_nhat', 'luong_cnkcp_vuot')
ORDER BY isc.column_name;


PRINT 'Migration completed: Added 3 new payroll columns successfully!';
