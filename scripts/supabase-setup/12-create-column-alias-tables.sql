-- STEP 12: CREATE COLUMN ALIAS CONFIGURATION TABLES
-- Hệ thống quản lý column aliases cho import Excel linh hoạt

-- Table to store column aliases for each database field
CREATE TABLE column_aliases (
  id SERIAL PRIMARY KEY,
  database_field VARCHAR(100) NOT NULL,
  alias_name VARCHAR(255) NOT NULL,
  confidence_score INTEGER DEFAULT 80 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(100) NOT NULL,
  config_id INTEGER REFERENCES mapping_configurations(id) ON DELETE SET NULL, -- Optional link to configuration
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Ensure unique alias names per database field (global or per config)
  UNIQUE(database_field, alias_name, COALESCE(config_id, 0))
);

-- Table to store mapping configurations (saved mappings)
CREATE TABLE mapping_configurations (
  id SERIAL PRIMARY KEY,
  config_name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table to store field mappings for each configuration
CREATE TABLE configuration_field_mappings (
  id SERIAL PRIMARY KEY,
  config_id INTEGER NOT NULL REFERENCES mapping_configurations(id) ON DELETE CASCADE,
  database_field VARCHAR(100) NOT NULL,
  excel_column_name VARCHAR(255) NOT NULL,
  confidence_score INTEGER DEFAULT 80 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  mapping_type VARCHAR(20) DEFAULT 'manual' CHECK (mapping_type IN ('exact', 'fuzzy', 'manual', 'alias')),
  validation_passed BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure unique mappings per configuration
  UNIQUE(config_id, database_field),
  UNIQUE(config_id, excel_column_name)
);

-- Table to track successful import mappings for learning
CREATE TABLE import_mapping_history (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(100) NOT NULL,
  excel_column_name VARCHAR(255) NOT NULL,
  database_field VARCHAR(100) NOT NULL,
  confidence_score INTEGER NOT NULL,
  mapping_type VARCHAR(20) NOT NULL,
  was_successful BOOLEAN DEFAULT true,
  admin_user VARCHAR(100) NOT NULL,
  file_name VARCHAR(255),
  import_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_column_aliases_database_field ON column_aliases(database_field);
CREATE INDEX idx_column_aliases_alias_name ON column_aliases(alias_name);
CREATE INDEX idx_column_aliases_active ON column_aliases(is_active);
CREATE INDEX idx_column_aliases_confidence ON column_aliases(confidence_score);

CREATE INDEX idx_mapping_configurations_active ON mapping_configurations(is_active);
CREATE INDEX idx_mapping_configurations_default ON mapping_configurations(is_default);

CREATE INDEX idx_config_field_mappings_config_id ON configuration_field_mappings(config_id);
CREATE INDEX idx_config_field_mappings_database_field ON configuration_field_mappings(database_field);

CREATE INDEX idx_import_mapping_history_session ON import_mapping_history(session_id);
CREATE INDEX idx_import_mapping_history_field ON import_mapping_history(database_field);
CREATE INDEX idx_import_mapping_history_date ON import_mapping_history(import_date);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_column_aliases_updated_at 
    BEFORE UPDATE ON column_aliases 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mapping_configurations_updated_at 
    BEFORE UPDATE ON mapping_configurations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default aliases for common Vietnamese column names
INSERT INTO column_aliases (database_field, alias_name, confidence_score, created_by) VALUES
-- Employee ID variations
('employee_id', 'Mã Nhân Viên', 95, 'system'),
('employee_id', 'Mã NV', 90, 'system'),
('employee_id', 'Employee ID', 85, 'system'),
('employee_id', 'ID Nhân Viên', 85, 'system'),
('employee_id', 'STT', 70, 'system'),

-- Salary month variations
('salary_month', 'Tháng Lương', 95, 'system'),
('salary_month', 'Tháng', 80, 'system'),
('salary_month', 'Salary Month', 85, 'system'),
('salary_month', 'Kỳ Lương', 90, 'system'),

-- Basic salary variations
('luong_co_ban', 'Lương Cơ Bản', 95, 'system'),
('luong_co_ban', 'Lương CB', 90, 'system'),
('luong_co_ban', 'Basic Salary', 85, 'system'),
('luong_co_ban', 'Lương Căn Bản', 85, 'system'),

-- Work coefficient variations
('he_so_lam_viec', 'Hệ Số Làm Việc', 95, 'system'),
('he_so_lam_viec', 'Hệ Số LV', 90, 'system'),
('he_so_lam_viec', 'HS Làm Việc', 90, 'system'),
('he_so_lam_viec', 'Work Coefficient', 80, 'system'),

-- Net salary variations
('tien_luong_thuc_nhan_cuoi_ky', 'Tiền Lương Thực Nhận Cuối Kỳ', 100, 'system'),
('tien_luong_thuc_nhan_cuoi_ky', 'Lương Thực Nhận', 95, 'system'),
('tien_luong_thuc_nhan_cuoi_ky', 'Net Salary', 85, 'system'),
('tien_luong_thuc_nhan_cuoi_ky', 'Thực Nhận', 90, 'system'),
('tien_luong_thuc_nhan_cuoi_ky', 'Lương Cuối Kỳ', 90, 'system'),

-- Insurance variations
('bao_hiem_xa_hoi_nv_dong', 'Bảo Hiểm Xã Hội NV Đóng', 95, 'system'),
('bao_hiem_xa_hoi_nv_dong', 'BHXH NV', 90, 'system'),
('bao_hiem_xa_hoi_nv_dong', 'Social Insurance', 80, 'system'),

('bao_hiem_y_te_nv_dong', 'Bảo Hiểm Y Tế NV Đóng', 95, 'system'),
('bao_hiem_y_te_nv_dong', 'BHYT NV', 90, 'system'),
('bao_hiem_y_te_nv_dong', 'Health Insurance', 80, 'system'),

-- Tax variations
('thue_thu_nhap_ca_nhan', 'Thuế Thu Nhập Cá Nhân', 95, 'system'),
('thue_thu_nhap_ca_nhan', 'Thuế TNCN', 90, 'system'),
('thue_thu_nhap_ca_nhan', 'Personal Income Tax', 80, 'system'),
('thue_thu_nhap_ca_nhan', 'PIT', 75, 'system'),

-- Overtime variations
('phu_cap_vuot_gio', 'Phụ Cấp Vượt Giờ', 95, 'system'),
('phu_cap_vuot_gio', 'PC Vượt Giờ', 90, 'system'),
('phu_cap_vuot_gio', 'Overtime Allowance', 80, 'system'),
('phu_cap_vuot_gio', 'Làm Thêm Giờ', 85, 'system'),

-- Night shift variations
('phu_cap_ca_dem', 'Phụ Cấp Ca Đêm', 95, 'system'),
('phu_cap_ca_dem', 'PC Ca Đêm', 90, 'system'),
('phu_cap_ca_dem', 'Night Shift Allowance', 80, 'system'),
('phu_cap_ca_dem', 'Ca Đêm', 85, 'system');

-- Create default mapping configuration
INSERT INTO mapping_configurations (config_name, description, is_default, created_by) VALUES
('Default Mapping', 'Cấu hình mapping mặc định cho import Excel', true, 'system');

-- Comments for documentation
COMMENT ON TABLE column_aliases IS 'Lưu trữ các tên thay thế (aliases) cho các trường database';
COMMENT ON TABLE mapping_configurations IS 'Cấu hình mapping đã lưu cho import Excel';
COMMENT ON TABLE configuration_field_mappings IS 'Chi tiết mapping cho từng cấu hình';
COMMENT ON TABLE import_mapping_history IS 'Lịch sử mapping để học và cải thiện auto-mapping';

COMMENT ON COLUMN column_aliases.confidence_score IS 'Độ tin cậy của alias (0-100)';
COMMENT ON COLUMN column_aliases.database_field IS 'Tên trường trong database (phải khớp với PAYROLL_FIELD_CONFIG)';
COMMENT ON COLUMN column_aliases.alias_name IS 'Tên thay thế có thể xuất hiện trong Excel';

-- Enable RLS (Row Level Security)
ALTER TABLE column_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE mapping_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuration_field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_mapping_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Admin only access)
CREATE POLICY "Admin can manage column aliases" ON column_aliases
    FOR ALL USING (true);

CREATE POLICY "Admin can manage mapping configurations" ON mapping_configurations
    FOR ALL USING (true);

CREATE POLICY "Admin can manage field mappings" ON configuration_field_mappings
    FOR ALL USING (true);

CREATE POLICY "Admin can view import history" ON import_mapping_history
    FOR SELECT USING (true);

CREATE POLICY "Admin can insert import history" ON import_mapping_history
    FOR INSERT WITH CHECK (true);
