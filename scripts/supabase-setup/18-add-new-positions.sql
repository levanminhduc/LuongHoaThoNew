-- SCRIPT 18: ADD NEW POSITIONS TO SYSTEM
-- Bổ sung 3 chức vụ mới: giam_doc, ke_toan, nguoi_lap_bieu

-- ===== VERIFY CURRENT POSITIONS =====
SELECT 'CURRENT POSITIONS IN DATABASE:' as info;
SELECT 
    chuc_vu,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM employees 
WHERE is_active = true
GROUP BY chuc_vu
ORDER BY count DESC;

-- ===== ADD CONSTRAINT FOR NEW POSITIONS =====
-- Drop existing constraint if exists
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_chuc_vu_check;

-- Add new constraint with 7 positions
ALTER TABLE employees 
ADD CONSTRAINT employees_chuc_vu_check 
CHECK (chuc_vu IN (
    'admin',
    'giam_doc',
    'ke_toan', 
    'nguoi_lap_bieu',
    'truong_phong',
    'to_truong',
    'nhan_vien'
));

-- ===== UPDATE COMMENTS =====
COMMENT ON COLUMN employees.chuc_vu IS 'Chức vụ: admin, giam_doc, ke_toan, nguoi_lap_bieu, truong_phong, to_truong, nhan_vien - dùng cho phân quyền';

-- ===== VERIFY CONSTRAINT =====
SELECT 'CONSTRAINT VERIFICATION:' as info;
SELECT
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname = 'employees_chuc_vu_check';

-- ===== CREATE SAMPLE EMPLOYEES FOR NEW POSITIONS =====
-- Note: These are sample entries for testing, real data will be imported separately

-- Sample Giám Đốc
INSERT INTO employees (
    employee_id, 
    full_name, 
    cccd_hash, 
    department, 
    chuc_vu, 
    is_active
) VALUES (
    'GD001',
    'NGUYỄN VĂN GIÁM ĐỐC',
    '$2b$10$samplehashforgiamdoc123456789',
    'BAN GIÁM ĐỐC',
    'giam_doc',
    true
) ON CONFLICT (employee_id) DO NOTHING;

-- Sample Kế Toán
INSERT INTO employees (
    employee_id, 
    full_name, 
    cccd_hash, 
    department, 
    chuc_vu, 
    is_active
) VALUES (
    'KT001',
    'TRẦN THỊ KẾ TOÁN',
    '$2b$10$samplehashforketoan123456789',
    'Phòng Kế Toán',
    'ke_toan',
    true
) ON CONFLICT (employee_id) DO NOTHING;

-- Sample Người Lập Biểu
INSERT INTO employees (
    employee_id, 
    full_name, 
    cccd_hash, 
    department, 
    chuc_vu, 
    is_active
) VALUES (
    'NLB001',
    'LÊ VĂN NGƯỜI LẬP BIỂU',
    '$2b$10$samplehashfornguoilapbieu123',
    'THỐNG KÊ',
    'nguoi_lap_bieu',
    true
) ON CONFLICT (employee_id) DO NOTHING;

-- ===== VERIFY NEW POSITIONS =====
SELECT 'NEW POSITIONS ADDED:' as info;
SELECT 
    chuc_vu,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM employees 
WHERE is_active = true
GROUP BY chuc_vu
ORDER BY 
    CASE chuc_vu
        WHEN 'admin' THEN 1
        WHEN 'giam_doc' THEN 2
        WHEN 'ke_toan' THEN 3
        WHEN 'nguoi_lap_bieu' THEN 4
        WHEN 'truong_phong' THEN 5
        WHEN 'to_truong' THEN 6
        WHEN 'nhan_vien' THEN 7
    END;

-- ===== VERIFY SAMPLE EMPLOYEES =====
SELECT 'SAMPLE EMPLOYEES FOR NEW POSITIONS:' as info;
SELECT 
    employee_id,
    full_name,
    department,
    chuc_vu,
    is_active
FROM employees
WHERE chuc_vu IN ('giam_doc', 'ke_toan', 'nguoi_lap_bieu')
ORDER BY chuc_vu, employee_id;

-- ===== SUCCESS MESSAGE =====
SELECT 'SUCCESS: 3 new positions added to system!' as result;
SELECT 'Next steps: Update authentication system and role-based access control' as next_action;
