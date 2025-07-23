-- STEP 12: INSERT DEFAULT IMPORT CONFIGURATIONS

-- Insert default File 1 configuration (Basic salary data)
INSERT INTO import_file_configs (config_name, file_type, description) VALUES
('File 1 - Basic Salary Data', 'file1', 'Import basic salary information including work hours and basic calculations');

-- Get the File 1 config ID
DO $$
DECLARE
    file1_config_id INTEGER;
BEGIN
    SELECT id INTO file1_config_id FROM import_file_configs WHERE config_name = 'File 1 - Basic Salary Data';
    
    -- Insert File 1 column mappings
    INSERT INTO import_column_mappings (config_id, excel_column_name, database_field, data_type, is_required, display_order) VALUES
    (file1_config_id, 'Mã Nhân Viên', 'employee_id', 'text', true, 1),
    (file1_config_id, 'Tháng Lương', 'salary_month', 'text', true, 2),
    (file1_config_id, 'Hệ Số Làm Việc', 'he_so_lam_viec', 'number', false, 3),
    (file1_config_id, 'Hệ Số Lương Cơ Bản', 'he_so_luong_co_ban', 'number', false, 4),
    (file1_config_id, 'Lương Tối Thiểu Công Ty', 'luong_toi_thieu_cty', 'number', false, 5),
    (file1_config_id, 'Ngày Công Trong Giờ', 'ngay_cong_trong_gio', 'number', false, 6),
    (file1_config_id, 'Giờ Công Tăng Ca', 'gio_cong_tang_ca', 'number', false, 7),
    (file1_config_id, 'Tổng Giờ Làm Việc', 'tong_gio_lam_viec', 'number', false, 8),
    (file1_config_id, 'Tổng Lương Sản Phẩm Công Đoạn', 'tong_luong_san_pham_cong_doan', 'number', false, 9),
    (file1_config_id, 'Tiền Lương Sản Phẩm Trong Giờ', 'tien_luong_san_pham_trong_gio', 'number', false, 10),
    (file1_config_id, 'Tiền Lương Tăng Ca', 'tien_luong_tang_ca', 'number', false, 11),
    (file1_config_id, 'Tổng Cộng Tiền Lương Sản Phẩm', 'tong_cong_tien_luong_san_pham', 'number', false, 12);
END $$;

-- Insert default File 2 configuration (Deductions and final salary)
INSERT INTO import_file_configs (config_name, file_type, description) VALUES
('File 2 - Deductions & Final Salary', 'file2', 'Import deductions, taxes, and final salary calculations');

-- Get the File 2 config ID
DO $$
DECLARE
    file2_config_id INTEGER;
BEGIN
    SELECT id INTO file2_config_id FROM import_file_configs WHERE config_name = 'File 2 - Deductions & Final Salary';
    
    -- Insert File 2 column mappings
    INSERT INTO import_column_mappings (config_id, excel_column_name, database_field, data_type, is_required, display_order) VALUES
    (file2_config_id, 'Mã Nhân Viên', 'employee_id', 'text', true, 1),
    (file2_config_id, 'Tháng Lương', 'salary_month', 'text', true, 2),
    (file2_config_id, 'BHXH BHTN BHYT Total', 'bhxh_bhtn_bhyt_total', 'number', false, 3),
    (file2_config_id, 'Thuế TNCN', 'thue_tncn', 'number', false, 4),
    (file2_config_id, 'Tạm Ứng', 'tam_ung', 'number', false, 5),
    (file2_config_id, 'Tổng Cộng Tiền Lương', 'tong_cong_tien_luong', 'number', false, 6),
    (file2_config_id, 'Tiền Bốc Vác', 'tien_boc_vac', 'number', false, 7),
    (file2_config_id, 'Hỗ Trợ Xăng Xe', 'ho_tro_xang_xe', 'number', false, 8),
    (file2_config_id, 'Thuế TNCN Năm 2024', 'thue_tncn_nam_2024', 'number', false, 9),
    (file2_config_id, 'Truy Thu Thẻ BHYT', 'truy_thu_the_bhyt', 'number', false, 10),
    (file2_config_id, 'Tiền Lương Thực Nhận Cuối Kỳ', 'tien_luong_thuc_nhan_cuoi_ky', 'number', false, 11);
END $$;
