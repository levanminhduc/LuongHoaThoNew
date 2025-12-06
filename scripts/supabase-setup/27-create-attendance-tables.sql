-- =====================================================
-- STEP 27: CREATE ATTENDANCE TABLES
-- Bảng chấm công chi tiết theo ngày và tổng hợp theo tháng
-- Hoạt động độc lập với payrolls, dùng để đối chiếu
-- =====================================================

-- ===== TABLE 1: ATTENDANCE_DAILY =====
CREATE TABLE IF NOT EXISTS attendance_daily (
  id BIGSERIAL PRIMARY KEY,

  employee_id VARCHAR(50) NOT NULL,
  work_date DATE NOT NULL,
  period_year SMALLINT NOT NULL,
  period_month SMALLINT NOT NULL CHECK (period_month BETWEEN 1 AND 12),

  check_in_time TIME,
  check_out_time TIME,

  working_units DECIMAL(4,2) DEFAULT 0,
  overtime_units DECIMAL(4,2) DEFAULT 0,

  note VARCHAR(255),
  source_file VARCHAR(255),
  import_batch_id VARCHAR(100),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_attendance_daily_employee
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
  CONSTRAINT uq_attendance_daily_emp_date
    UNIQUE (employee_id, work_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_daily_period 
  ON attendance_daily (period_year, period_month, employee_id);

CREATE INDEX IF NOT EXISTS idx_attendance_daily_batch 
  ON attendance_daily (import_batch_id);

COMMENT ON TABLE attendance_daily IS 'Bảng chấm công chi tiết theo ngày - dữ liệu tĩnh từ file Excel';
COMMENT ON COLUMN attendance_daily.period_year IS 'Năm chấm công (import từ Excel)';
COMMENT ON COLUMN attendance_daily.period_month IS 'Tháng chấm công 1-12 (import từ Excel)';
COMMENT ON COLUMN attendance_daily.working_units IS 'Số công chuẩn trong ngày (row 3, cột lẻ)';
COMMENT ON COLUMN attendance_daily.overtime_units IS 'Số công tăng ca trong ngày (row 3, cột chẵn)';


-- ===== TABLE 2: ATTENDANCE_MONTHLY =====
CREATE TABLE IF NOT EXISTS attendance_monthly (
  id BIGSERIAL PRIMARY KEY,
  
  employee_id VARCHAR(50) NOT NULL,
  period_year SMALLINT NOT NULL,
  period_month SMALLINT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  
  total_hours DECIMAL(7,2) DEFAULT 0,
  total_days DECIMAL(5,2) DEFAULT 0,
  total_meal_ot_hours DECIMAL(7,2) DEFAULT 0,
  total_ot_hours DECIMAL(7,2) DEFAULT 0,
  sick_days DECIMAL(5,2) DEFAULT 0,
  
  source_file VARCHAR(255),
  import_batch_id VARCHAR(100),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_attendance_monthly_employee 
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
  CONSTRAINT uq_attendance_monthly_emp_period 
    UNIQUE (employee_id, period_year, period_month)
);

CREATE INDEX IF NOT EXISTS idx_attendance_monthly_batch 
  ON attendance_monthly (import_batch_id);

COMMENT ON TABLE attendance_monthly IS 'Bảng tổng hợp chấm công theo tháng - lưu từ các cột BM-BW trong Excel';
COMMENT ON COLUMN attendance_monthly.total_hours IS 'Tổng Giờ Công (cột BM)';
COMMENT ON COLUMN attendance_monthly.total_days IS 'Tổng Ngày Công (cột BN)';
COMMENT ON COLUMN attendance_monthly.total_meal_ot_hours IS 'Tổng Giờ Ăn TC (cột BO)';
COMMENT ON COLUMN attendance_monthly.total_ot_hours IS 'Tổng Giờ Tăng Ca (cột BP)';
COMMENT ON COLUMN attendance_monthly.sick_days IS 'Nghỉ Ốm (cột BW)';


-- ===== TRIGGER: AUTO UPDATE updated_at =====
CREATE OR REPLACE FUNCTION trigger_attendance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP + INTERVAL '7 hours';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_attendance_daily_updated ON attendance_daily;
CREATE TRIGGER trg_attendance_daily_updated
  BEFORE UPDATE ON attendance_daily
  FOR EACH ROW
  EXECUTE FUNCTION trigger_attendance_updated_at();

DROP TRIGGER IF EXISTS trg_attendance_monthly_updated ON attendance_monthly;
CREATE TRIGGER trg_attendance_monthly_updated
  BEFORE UPDATE ON attendance_monthly
  FOR EACH ROW
  EXECUTE FUNCTION trigger_attendance_updated_at();


-- ===== RLS POLICIES =====
ALTER TABLE attendance_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_monthly ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access on attendance_daily"
  ON attendance_daily FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow service role full access on attendance_monthly"
  ON attendance_monthly FOR ALL
  USING (true)
  WITH CHECK (true);


-- ===== VERIFICATION =====
SELECT 
  'attendance_daily' as table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'attendance_daily') as column_count
UNION ALL
SELECT 
  'attendance_monthly' as table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'attendance_monthly') as column_count;

