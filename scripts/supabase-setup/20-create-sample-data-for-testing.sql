-- STEP 20: CREATE SAMPLE DATA FOR ROLE-BASED TESTING
-- Tạo sample data để test hệ thống phân quyền
-- Thực hiện: 2025-07-30

-- ===== BACKUP REMINDER =====
-- QUAN TRỌNG: Backup database trước khi chạy script này!
-- pg_dump -h your_host -U your_user -d your_database > backup_before_sample_data.sql

-- ===== XÓA DỮ LIỆU CŨ (NẾU CẦN) =====
-- Uncomment nếu muốn reset data
-- DELETE FROM signature_logs;
-- DELETE FROM payrolls;
-- DELETE FROM department_permissions;
-- DELETE FROM employees WHERE employee_id LIKE 'TEST_%';

-- ===== TẠO SAMPLE EMPLOYEES =====

-- Employees cho department "Hoàn Thành"
INSERT INTO employees (employee_id, full_name, department, chuc_vu, cccd, cccd_hash, is_active) VALUES
-- Tổ trưởng Hoàn Thành (TT001 - test account)
('TT001', 'Trần Thị B', 'Hoàn Thành', 'to_truong', '123456789012', '$2a$10$example_hash_for_totruong123', true),

-- Nhân viên Hoàn Thành (NV001 - test account)
('NV001', 'Lê Văn C', 'Hoàn Thành', 'nhan_vien', '123456789013', '$2a$10$example_hash_for_nhanvien123', true),

-- Thêm nhân viên khác trong Hoàn Thành
('TEST_HT001', 'Nguyễn Văn D', 'Hoàn Thành', 'nhan_vien', '123456789014', '$2a$10$example_hash_default', true),
('TEST_HT002', 'Phạm Thị E', 'Hoàn Thành', 'nhan_vien', '123456789015', '$2a$10$example_hash_default', true),
('TEST_HT003', 'Hoàng Văn F', 'Hoàn Thành', 'nhan_vien', '123456789016', '$2a$10$example_hash_default', true),
('TEST_HT004', 'Vũ Thị G', 'Hoàn Thành', 'nhan_vien', '123456789017', '$2a$10$example_hash_default', true);

-- Employees cho department "KCS"
INSERT INTO employees (employee_id, full_name, department, chuc_vu, cccd, cccd_hash, is_active) VALUES
-- Tổ trưởng KCS
('TEST_KCS_TT', 'Đỗ Văn H', 'KCS', 'to_truong', '123456789018', '$2a$10$example_hash_default', true),

-- Nhân viên KCS
('TEST_KCS001', 'Bùi Thị I', 'KCS', 'nhan_vien', '123456789019', '$2a$10$example_hash_default', true),
('TEST_KCS002', 'Lý Văn J', 'KCS', 'nhan_vien', '123456789020', '$2a$10$example_hash_default', true),
('TEST_KCS003', 'Trương Thị K', 'KCS', 'nhan_vien', '123456789021', '$2a$10$example_hash_default', true),
('TEST_KCS004', 'Phan Văn L', 'KCS', 'nhan_vien', '123456789022', '$2a$10$example_hash_default', true);

-- Trưởng phòng (TP001 - test account) - quản lý cả 2 departments
INSERT INTO employees (employee_id, full_name, department, chuc_vu, cccd, cccd_hash, is_active) VALUES
('TP001', 'Nguyễn Văn A', 'Hoàn Thành', 'truong_phong', '123456789023', '$2a$10$example_hash_for_truongphong123', true);

-- ===== TẠO DEPARTMENT PERMISSIONS CHO TRƯỞNG PHÒNG =====

INSERT INTO department_permissions (employee_id, department, granted_by, notes) VALUES
('TP001', 'Hoàn Thành', 'admin', 'Trưởng phòng quản lý department Hoàn Thành'),
('TP001', 'KCS', 'admin', 'Trưởng phòng quản lý department KCS');

-- ===== TẠO SAMPLE PAYROLL DATA =====

-- Tháng hiện tại
DO $$
DECLARE
    current_month TEXT := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
    prev_month TEXT := TO_CHAR(CURRENT_DATE - INTERVAL '1 month', 'YYYY-MM');
    prev_month2 TEXT := TO_CHAR(CURRENT_DATE - INTERVAL '2 months', 'YYYY-MM');
BEGIN
    -- Payroll cho tháng hiện tại
    INSERT INTO payrolls (
        employee_id, salary_month, 
        luong_co_ban, phu_cap_chuc_vu, phu_cap_khac, thuong_hieu_qua, 
        tong_cong_tien_luong, bhxh_bhtn_bhyt_total, thue_tncn, 
        tien_luong_thuc_nhan_cuoi_ky, is_signed, created_at
    ) VALUES
    -- Department Hoàn Thành
    ('TT001', current_month, 8000000, 1000000, 500000, 300000, 9800000, 980000, 450000, 8370000, true, CURRENT_TIMESTAMP),
    ('NV001', current_month, 6000000, 0, 300000, 200000, 6500000, 650000, 200000, 5650000, false, CURRENT_TIMESTAMP),
    ('TEST_HT001', current_month, 5500000, 0, 200000, 150000, 5850000, 585000, 180000, 5085000, true, CURRENT_TIMESTAMP),
    ('TEST_HT002', current_month, 5800000, 0, 250000, 180000, 6230000, 623000, 220000, 5387000, false, CURRENT_TIMESTAMP),
    ('TEST_HT003', current_month, 5200000, 0, 200000, 120000, 5520000, 552000, 160000, 4808000, true, CURRENT_TIMESTAMP),
    ('TEST_HT004', current_month, 5600000, 0, 300000, 200000, 6100000, 610000, 200000, 5290000, false, CURRENT_TIMESTAMP),
    
    -- Department KCS
    ('TEST_KCS_TT', current_month, 7500000, 800000, 400000, 250000, 8950000, 895000, 400000, 7655000, true, CURRENT_TIMESTAMP),
    ('TEST_KCS001', current_month, 5400000, 0, 200000, 150000, 5750000, 575000, 170000, 5005000, true, CURRENT_TIMESTAMP),
    ('TEST_KCS002', current_month, 5700000, 0, 250000, 180000, 6130000, 613000, 210000, 5307000, false, CURRENT_TIMESTAMP),
    ('TEST_KCS003', current_month, 5300000, 0, 200000, 140000, 5640000, 564000, 170000, 4906000, true, CURRENT_TIMESTAMP),
    ('TEST_KCS004', current_month, 5500000, 0, 300000, 200000, 6000000, 600000, 190000, 5210000, false, CURRENT_TIMESTAMP),
    
    -- Trưởng phòng
    ('TP001', current_month, 12000000, 2000000, 1000000, 500000, 15500000, 1550000, 800000, 13150000, true, CURRENT_TIMESTAMP);

    -- Payroll cho tháng trước
    INSERT INTO payrolls (
        employee_id, salary_month, 
        luong_co_ban, phu_cap_chuc_vu, phu_cap_khac, thuong_hieu_qua, 
        tong_cong_tien_luong, bhxh_bhtn_bhyt_total, thue_tncn, 
        tien_luong_thuc_nhan_cuoi_ky, is_signed, created_at
    ) VALUES
    -- Department Hoàn Thành (tháng trước)
    ('TT001', prev_month, 8000000, 1000000, 500000, 250000, 9750000, 975000, 440000, 8335000, true, CURRENT_TIMESTAMP - INTERVAL '1 month'),
    ('NV001', prev_month, 6000000, 0, 300000, 180000, 6480000, 648000, 195000, 5637000, true, CURRENT_TIMESTAMP - INTERVAL '1 month'),
    ('TEST_HT001', prev_month, 5500000, 0, 200000, 120000, 5820000, 582000, 175000, 5063000, true, CURRENT_TIMESTAMP - INTERVAL '1 month'),
    ('TEST_HT002', prev_month, 5800000, 0, 250000, 160000, 6210000, 621000, 215000, 5374000, true, CURRENT_TIMESTAMP - INTERVAL '1 month'),
    
    -- Department KCS (tháng trước)
    ('TEST_KCS001', prev_month, 5400000, 0, 200000, 130000, 5730000, 573000, 165000, 4992000, true, CURRENT_TIMESTAMP - INTERVAL '1 month'),
    ('TEST_KCS002', prev_month, 5700000, 0, 250000, 160000, 6110000, 611000, 205000, 5294000, true, CURRENT_TIMESTAMP - INTERVAL '1 month'),
    
    -- Trưởng phòng (tháng trước)
    ('TP001', prev_month, 12000000, 2000000, 1000000, 450000, 15450000, 1545000, 790000, 13115000, true, CURRENT_TIMESTAMP - INTERVAL '1 month');

END $$;

-- ===== TẠO SIGNATURE LOGS =====

INSERT INTO signature_logs (employee_id, payroll_month, signature_time, ip_address, user_agent) VALUES
('TT001', TO_CHAR(CURRENT_DATE, 'YYYY-MM'), CURRENT_TIMESTAMP, '192.168.1.100', 'Mozilla/5.0'),
('TEST_HT001', TO_CHAR(CURRENT_DATE, 'YYYY-MM'), CURRENT_TIMESTAMP, '192.168.1.101', 'Mozilla/5.0'),
('TEST_HT003', TO_CHAR(CURRENT_DATE, 'YYYY-MM'), CURRENT_TIMESTAMP, '192.168.1.102', 'Mozilla/5.0'),
('TEST_KCS_TT', TO_CHAR(CURRENT_DATE, 'YYYY-MM'), CURRENT_TIMESTAMP, '192.168.1.103', 'Mozilla/5.0'),
('TEST_KCS001', TO_CHAR(CURRENT_DATE, 'YYYY-MM'), CURRENT_TIMESTAMP, '192.168.1.104', 'Mozilla/5.0'),
('TEST_KCS003', TO_CHAR(CURRENT_DATE, 'YYYY-MM'), CURRENT_TIMESTAMP, '192.168.1.105', 'Mozilla/5.0'),
('TP001', TO_CHAR(CURRENT_DATE, 'YYYY-MM'), CURRENT_TIMESTAMP, '192.168.1.106', 'Mozilla/5.0');

-- ===== VERIFY DATA CREATED =====

-- Kiểm tra employees đã được tạo
SELECT 'EMPLOYEES CREATED:' as info, department, chuc_vu, COUNT(*) as count
FROM employees 
WHERE employee_id LIKE 'TEST_%' OR employee_id IN ('TP001', 'TT001', 'NV001')
GROUP BY department, chuc_vu
ORDER BY department, chuc_vu;

-- Kiểm tra payrolls đã được tạo
SELECT 'PAYROLLS CREATED:' as info, 
       e.department, 
       p.salary_month, 
       COUNT(*) as count,
       SUM(p.tien_luong_thuc_nhan_cuoi_ky) as total_salary
FROM payrolls p
JOIN employees e ON p.employee_id = e.employee_id
WHERE e.department IN ('Hoàn Thành', 'KCS')
GROUP BY e.department, p.salary_month
ORDER BY e.department, p.salary_month DESC;

-- Kiểm tra department permissions
SELECT 'DEPARTMENT PERMISSIONS:' as info, * FROM department_permissions;

-- ===== ROLLBACK SCRIPT (NẾU CẦN) =====
-- Để rollback sample data này, chạy:
/*
DELETE FROM signature_logs WHERE employee_id LIKE 'TEST_%' OR employee_id IN ('TP001', 'TT001', 'NV001');
DELETE FROM payrolls WHERE employee_id LIKE 'TEST_%' OR employee_id IN ('TP001', 'TT001', 'NV001');
DELETE FROM department_permissions WHERE employee_id = 'TP001';
DELETE FROM employees WHERE employee_id LIKE 'TEST_%' OR employee_id IN ('TP001', 'TT001', 'NV001');
*/

PRINT 'Sample data created successfully for role-based testing!';
