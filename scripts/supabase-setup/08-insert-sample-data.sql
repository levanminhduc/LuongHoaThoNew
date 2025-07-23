-- STEP 8: INSERT SAMPLE DATA

-- Sample employees
INSERT INTO employees (employee_id, full_name, cccd_hash, department, chuc_vu, phone_number) VALUES
('NV001', 'Nguyễn Văn An', 'hash_cccd_001', 'Phòng Sản Xuất', 'nhan_vien', '0901234567'),
('NV002', 'Trần Thị Bình', 'hash_cccd_002', 'Phòng Sản Xuất', 'to_truong', '0901234568'),
('NV003', 'Lê Văn Cường', 'hash_cccd_003', 'Phòng Kế Toán', 'nhan_vien', '0901234569'),
('NV004', 'Phạm Thị Dung', 'hash_cccd_004', 'Phòng Kế Toán', 'to_truong', '0901234570'),
('ADMIN001', 'Hoàng Văn Admin', 'hash_cccd_admin', 'Phòng Hành Chính', 'truong_phong', '0901234571'),
('NV005', 'Vũ Thị Em', 'hash_cccd_005', 'Phòng Sản Xuất', 'nhan_vien', '0901234572'),
('NV006', 'Đỗ Văn Phương', 'hash_cccd_006', 'Phòng QC', 'nhan_vien', '0901234573'),
('NV007', 'Bùi Thị Giang', 'hash_cccd_007', 'Phòng QC', 'to_truong', '0901234574');

-- Sample payroll data cho tháng 2024-07 (với dữ liệu realistic)
INSERT INTO payrolls (
  employee_id, salary_month, source_file, import_batch_id,
  he_so_lam_viec, he_so_luong_co_ban, luong_toi_thieu_cty,
  ngay_cong_trong_gio, gio_cong_tang_ca, tong_gio_lam_viec,
  tong_luong_san_pham_cong_doan, tien_luong_san_pham_trong_gio, tien_luong_tang_ca,
  tong_cong_tien_luong, bhxh_bhtn_bhyt_total, thue_tncn, tam_ung,
  tien_luong_thuc_nhan_cuoi_ky
) VALUES
('NV001', '2024-07', 'bang_luong_thang_07_2024.xlsx', 'BATCH_2024_07_001',
 1.2, 1.0, 4680000, 22.0, 8.0, 30.0,
 12000000, 10000000, 2000000, 15000000, 1500000, 500000, 1000000, 12000000),

('NV002', '2024-07', 'bang_luong_thang_07_2024.xlsx', 'BATCH_2024_07_001',
 1.5, 1.2, 4680000, 22.0, 10.0, 32.0,
 15000000, 12000000, 3000000, 18000000, 1800000, 800000, 500000, 14900000),

('NV003', '2024-07', 'bang_luong_thang_07_2024.xlsx', 'BATCH_2024_07_001',
 1.0, 1.0, 4680000, 20.0, 5.0, 25.0,
 8000000, 7000000, 1000000, 12000000, 1200000, 300000, 800000, 9700000),

('NV004', '2024-07', 'bang_luong_thang_07_2024.xlsx', 'BATCH_2024_07_001',
 1.3, 1.1, 4680000, 22.0, 8.0, 30.0,
 13000000, 11000000, 2000000, 16000000, 1600000, 600000, 1200000, 12600000),

('NV005', '2024-07', 'bang_luong_thang_07_2024.xlsx', 'BATCH_2024_07_001',
 1.1, 1.0, 4680000, 21.0, 6.0, 27.0,
 9000000, 8000000, 1000000, 13000000, 1300000, 400000, 500000, 10800000),

('NV006', '2024-07', 'bang_luong_thang_07_2024.xlsx', 'BATCH_2024_07_001',
 1.0, 1.0, 4680000, 22.0, 4.0, 26.0,
 7500000, 7000000, 500000, 11500000, 1150000, 250000, 600000, 9500000),

('NV007', '2024-07', 'bang_luong_thang_07_2024.xlsx', 'BATCH_2024_07_001',
 1.4, 1.1, 4680000, 22.0, 9.0, 31.0,
 14000000, 12000000, 2000000, 17000000, 1700000, 700000, 800000, 13800000);

-- Sample payroll data cho tháng 2024-08 (một số nhân viên)
INSERT INTO payrolls (
  employee_id, salary_month, source_file, import_batch_id,
  he_so_lam_viec, he_so_luong_co_ban, luong_toi_thieu_cty,
  ngay_cong_trong_gio, gio_cong_tang_ca, tong_gio_lam_viec,
  tong_luong_san_pham_cong_doan, tien_luong_san_pham_trong_gio, tien_luong_tang_ca,
  tong_cong_tien_luong, bhxh_bhtn_bhyt_total, thue_tncn, tam_ung,
  tien_luong_thuc_nhan_cuoi_ky
) VALUES
('NV001', '2024-08', 'bang_luong_thang_08_2024.xlsx', 'BATCH_2024_08_001',
 1.2, 1.0, 4680000, 23.0, 7.0, 30.0,
 12500000, 10500000, 2000000, 15500000, 1550000, 550000, 800000, 12600000),

('NV002', '2024-08', 'bang_luong_thang_08_2024.xlsx', 'BATCH_2024_08_001',
 1.5, 1.2, 4680000, 23.0, 9.0, 32.0,
 15500000, 12500000, 3000000, 18500000, 1850000, 850000, 600000, 15200000),

('NV003', '2024-08', 'bang_luong_thang_08_2024.xlsx', 'BATCH_2024_08_001',
 1.0, 1.0, 4680000, 21.0, 4.0, 25.0,
 8200000, 7200000, 1000000, 12200000, 1220000, 320000, 700000, 9960000);

-- Test ký lương cho một số nhân viên
SELECT auto_sign_salary('NV001', '2024-07', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0');
SELECT auto_sign_salary('NV003', '2024-07', '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/537.36');
