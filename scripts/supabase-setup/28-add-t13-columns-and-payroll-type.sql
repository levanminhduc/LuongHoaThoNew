-- SCRIPT 28: ADD T13 COLUMNS AND PAYROLL_TYPE TO PAYROLLS TABLE
-- Thêm 17 cột lương tháng 13 và cột payroll_type để phân biệt loại lương

-- ===== STEP 1: ADD PAYROLL_TYPE COLUMN =====
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS payroll_type VARCHAR(20) DEFAULT 'monthly';

ALTER TABLE payrolls DROP CONSTRAINT IF EXISTS check_payroll_type;
ALTER TABLE payrolls ADD CONSTRAINT check_payroll_type 
  CHECK (payroll_type IN ('monthly', 't13'));

COMMENT ON COLUMN payrolls.payroll_type IS 'Loại lương: monthly (lương thường 01-12), t13 (lương tháng 13)';

-- ===== STEP 2: ADD T13 SPECIFIC COLUMNS =====
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS chi_dot_1_13 DECIMAL(15,2) DEFAULT 0;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS chi_dot_2_13 DECIMAL(15,2) DEFAULT 0;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS tong_luong_13 DECIMAL(15,2) DEFAULT 0;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS so_thang_chia_13 DECIMAL(5,2) DEFAULT 0;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS tong_sp_12_thang DECIMAL(15,2) DEFAULT 0;

ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS t13_thang_01 DECIMAL(15,2) DEFAULT 0;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS t13_thang_02 DECIMAL(15,2) DEFAULT 0;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS t13_thang_03 DECIMAL(15,2) DEFAULT 0;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS t13_thang_04 DECIMAL(15,2) DEFAULT 0;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS t13_thang_05 DECIMAL(15,2) DEFAULT 0;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS t13_thang_06 DECIMAL(15,2) DEFAULT 0;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS t13_thang_07 DECIMAL(15,2) DEFAULT 0;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS t13_thang_08 DECIMAL(15,2) DEFAULT 0;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS t13_thang_09 DECIMAL(15,2) DEFAULT 0;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS t13_thang_10 DECIMAL(15,2) DEFAULT 0;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS t13_thang_11 DECIMAL(15,2) DEFAULT 0;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS t13_thang_12 DECIMAL(15,2) DEFAULT 0;

COMMENT ON COLUMN payrolls.chi_dot_1_13 IS 'Chi đợt 1 lương tháng 13';
COMMENT ON COLUMN payrolls.chi_dot_2_13 IS 'Chi đợt 2 lương tháng 13';
COMMENT ON COLUMN payrolls.tong_luong_13 IS 'Tổng lương tháng 13 = chi_dot_1_13 + chi_dot_2_13';
COMMENT ON COLUMN payrolls.so_thang_chia_13 IS 'Số tháng để tính lương tháng 13 (1-12)';
COMMENT ON COLUMN payrolls.tong_sp_12_thang IS 'Tổng sản phẩm 12 tháng = sum(t13_thang_01 đến t13_thang_12)';

-- ===== STEP 3: UPDATE UNIQUE CONSTRAINT =====
ALTER TABLE payrolls DROP CONSTRAINT IF EXISTS payrolls_employee_id_salary_month_key;
ALTER TABLE payrolls DROP CONSTRAINT IF EXISTS payrolls_unique_record;

CREATE UNIQUE INDEX IF NOT EXISTS payrolls_unique_record 
  ON payrolls(employee_id, salary_month, payroll_type);

-- ===== STEP 4: ADD PAYROLL_TYPE TO SIGNATURE_LOGS =====
ALTER TABLE signature_logs ADD COLUMN IF NOT EXISTS payroll_type VARCHAR(20) DEFAULT 'monthly';

ALTER TABLE signature_logs DROP CONSTRAINT IF EXISTS signature_logs_employee_id_salary_month_key;

CREATE UNIQUE INDEX IF NOT EXISTS signature_logs_unique_signature 
  ON signature_logs(employee_id, salary_month, payroll_type);

COMMENT ON COLUMN signature_logs.payroll_type IS 'Loại lương đã ký: monthly hoặc t13';

-- ===== STEP 5: ADD PAYROLL_TYPE TO MANAGEMENT_SIGNATURES =====
ALTER TABLE management_signatures ADD COLUMN IF NOT EXISTS payroll_type VARCHAR(20) DEFAULT 'monthly';

DROP INDEX IF EXISTS idx_management_signatures_unique_month_type;

CREATE UNIQUE INDEX IF NOT EXISTS idx_management_signatures_unique_month_type 
  ON management_signatures(salary_month, signature_type, payroll_type) 
  WHERE is_active = true;

COMMENT ON COLUMN management_signatures.payroll_type IS 'Loại lương: monthly hoặc t13';

-- ===== STEP 6: CREATE INDEXES FOR PERFORMANCE =====
CREATE INDEX IF NOT EXISTS idx_payrolls_payroll_type ON payrolls(payroll_type);
CREATE INDEX IF NOT EXISTS idx_payrolls_type_month ON payrolls(payroll_type, salary_month);
CREATE INDEX IF NOT EXISTS idx_signature_logs_payroll_type ON signature_logs(payroll_type);

-- ===== STEP 7: ADD T13 COLUMN ALIASES =====
INSERT INTO column_aliases (database_field, alias_name, confidence_score, created_by) 
VALUES
  ('chi_dot_1_13', 'Chi Đợt 1 Tháng 13', 95, 'system'),
  ('chi_dot_1_13', 'Chi Đợt 1', 90, 'system'),
  ('chi_dot_1_13', 'Đợt 1 T13', 85, 'system'),
  ('chi_dot_2_13', 'Chi Đợt 2 Tháng 13', 95, 'system'),
  ('chi_dot_2_13', 'Chi Đợt 2', 90, 'system'),
  ('chi_dot_2_13', 'Đợt 2 T13', 85, 'system'),
  ('tong_luong_13', 'Tổng Lương Tháng 13', 95, 'system'),
  ('tong_luong_13', 'Tổng T13', 90, 'system'),
  ('tong_luong_13', 'Tổng Lương 13', 90, 'system'),
  ('so_thang_chia_13', 'Số Tháng Chia', 95, 'system'),
  ('so_thang_chia_13', 'Số Tháng Chia 13', 90, 'system'),
  ('tong_sp_12_thang', 'Tổng SP 12 Tháng', 95, 'system'),
  ('tong_sp_12_thang', 'Tổng Sản Phẩm 12 Tháng', 90, 'system'),
  ('t13_thang_01', 'Tháng 1', 80, 'system'),
  ('t13_thang_01', 'T1', 75, 'system'),
  ('t13_thang_02', 'Tháng 2', 80, 'system'),
  ('t13_thang_02', 'T2', 75, 'system'),
  ('t13_thang_03', 'Tháng 3', 80, 'system'),
  ('t13_thang_03', 'T3', 75, 'system'),
  ('t13_thang_04', 'Tháng 4', 80, 'system'),
  ('t13_thang_04', 'T4', 75, 'system'),
  ('t13_thang_05', 'Tháng 5', 80, 'system'),
  ('t13_thang_05', 'T5', 75, 'system'),
  ('t13_thang_06', 'Tháng 6', 80, 'system'),
  ('t13_thang_06', 'T6', 75, 'system'),
  ('t13_thang_07', 'Tháng 7', 80, 'system'),
  ('t13_thang_07', 'T7', 75, 'system'),
  ('t13_thang_08', 'Tháng 8', 80, 'system'),
  ('t13_thang_08', 'T8', 75, 'system'),
  ('t13_thang_09', 'Tháng 9', 80, 'system'),
  ('t13_thang_09', 'T9', 75, 'system'),
  ('t13_thang_10', 'Tháng 10', 80, 'system'),
  ('t13_thang_10', 'T10', 75, 'system'),
  ('t13_thang_11', 'Tháng 11', 80, 'system'),
  ('t13_thang_11', 'T11', 75, 'system'),
  ('t13_thang_12', 'Tháng 12', 80, 'system'),
  ('t13_thang_12', 'T12', 75, 'system')
ON CONFLICT DO NOTHING;

-- ===== VERIFICATION =====
SELECT 'T13 COLUMNS AND PAYROLL_TYPE ADDED SUCCESSFULLY' as status;

SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'payrolls' 
  AND column_name IN ('payroll_type', 'chi_dot_1_13', 'chi_dot_2_13', 'tong_luong_13', 
                      'so_thang_chia_13', 'tong_sp_12_thang')
ORDER BY ordinal_position;

