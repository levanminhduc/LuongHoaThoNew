-- SCRIPT 19: MANAGEMENT SIGNATURES TABLE FOR SALARY CONFIRMATION
-- Tạo bảng cho hệ thống ký xác nhận lương của 3 chức vụ: giam_doc, ke_toan, nguoi_lap_bieu

-- ===== CREATE MANAGEMENT SIGNATURES TABLE =====
CREATE TABLE IF NOT EXISTS management_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_type VARCHAR(20) NOT NULL CHECK (signature_type IN ('giam_doc', 'ke_toan', 'nguoi_lap_bieu')),
  salary_month VARCHAR(7) NOT NULL,
  signed_by_id VARCHAR(50) NOT NULL,
  signed_by_name VARCHAR(255) NOT NULL,
  department VARCHAR(100),
  signed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address VARCHAR(45),
  device_info TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== CREATE INDEXES FOR PERFORMANCE =====
CREATE INDEX IF NOT EXISTS idx_management_signatures_month ON management_signatures(salary_month);
CREATE INDEX IF NOT EXISTS idx_management_signatures_type ON management_signatures(signature_type);
CREATE INDEX IF NOT EXISTS idx_management_signatures_signed_by ON management_signatures(signed_by_id);
CREATE INDEX IF NOT EXISTS idx_management_signatures_active ON management_signatures(is_active);
CREATE INDEX IF NOT EXISTS idx_management_signatures_signed_at ON management_signatures(signed_at);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_management_signatures_month_type_active 
ON management_signatures(salary_month, signature_type, is_active);

-- ===== CREATE UNIQUE CONSTRAINT =====
-- Mỗi chức vụ chỉ được ký 1 lần cho 1 tháng
CREATE UNIQUE INDEX IF NOT EXISTS idx_management_signatures_unique_month_type 
ON management_signatures(salary_month, signature_type) 
WHERE is_active = true;

-- ===== ADD FOREIGN KEY CONSTRAINT =====
ALTER TABLE management_signatures 
ADD CONSTRAINT fk_management_signatures_employee 
FOREIGN KEY (signed_by_id) REFERENCES employees(employee_id);

-- ===== ADD COMMENTS =====
COMMENT ON TABLE management_signatures IS 'Bảng lưu chữ ký xác nhận lương của 3 chức vụ: giam_doc, ke_toan, nguoi_lap_bieu';
COMMENT ON COLUMN management_signatures.signature_type IS 'Loại chữ ký: giam_doc, ke_toan, nguoi_lap_bieu';
COMMENT ON COLUMN management_signatures.salary_month IS 'Tháng lương định dạng YYYY-MM';
COMMENT ON COLUMN management_signatures.signed_by_id IS 'Mã nhân viên người ký (FK to employees.employee_id)';
COMMENT ON COLUMN management_signatures.signed_by_name IS 'Tên người ký (cached từ employees.full_name)';
COMMENT ON COLUMN management_signatures.department IS 'Phòng ban của người ký';
COMMENT ON COLUMN management_signatures.signed_at IS 'Thời gian ký';
COMMENT ON COLUMN management_signatures.ip_address IS 'IP address của người ký';
COMMENT ON COLUMN management_signatures.device_info IS 'Thông tin thiết bị ký';
COMMENT ON COLUMN management_signatures.notes IS 'Ghi chú khi ký';
COMMENT ON COLUMN management_signatures.is_active IS 'Trạng thái active (soft delete)';

-- ===== CREATE RLS POLICIES =====
ALTER TABLE management_signatures ENABLE ROW LEVEL SECURITY;

-- Policy cho service client (admin access)
CREATE POLICY "management_signatures_service_client_access" ON management_signatures
  FOR ALL USING (
    auth.jwt() IS NULL OR
    auth.jwt() ->> 'role' = 'admin'
  );

-- Policy cho 3 chức vụ có quyền ký
CREATE POLICY "management_signatures_role_access" ON management_signatures
  FOR SELECT USING (
    auth.jwt() ->> 'role' IN ('admin', 'giam_doc', 'ke_toan', 'nguoi_lap_bieu')
  );

-- Policy cho insert (chỉ người có quyền mới được ký)
CREATE POLICY "management_signatures_insert_policy" ON management_signatures
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' IN ('admin', 'giam_doc', 'ke_toan', 'nguoi_lap_bieu') AND
    auth.jwt() ->> 'employee_id' = signed_by_id
  );

-- ===== CREATE TRIGGER FOR UPDATED_AT =====
CREATE OR REPLACE FUNCTION update_management_signatures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_management_signatures_updated_at
  BEFORE UPDATE ON management_signatures
  FOR EACH ROW
  EXECUTE FUNCTION update_management_signatures_updated_at();

-- ===== CREATE AUDIT FUNCTION =====
CREATE OR REPLACE FUNCTION log_management_signature_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (
      table_name,
      operation,
      record_id,
      old_values,
      new_values,
      user_id,
      timestamp
    ) VALUES (
      'management_signatures',
      'INSERT',
      NEW.id::text,
      NULL,
      row_to_json(NEW),
      NEW.signed_by_id,
      NOW()
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (
      table_name,
      operation,
      record_id,
      old_values,
      new_values,
      user_id,
      timestamp
    ) VALUES (
      'management_signatures',
      'UPDATE',
      NEW.id::text,
      row_to_json(OLD),
      row_to_json(NEW),
      NEW.signed_by_id,
      NOW()
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create audit trigger (if audit_logs table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    CREATE TRIGGER trigger_management_signatures_audit
      AFTER INSERT OR UPDATE ON management_signatures
      FOR EACH ROW
      EXECUTE FUNCTION log_management_signature_audit();
  END IF;
END $$;

-- ===== VERIFICATION QUERIES =====
SELECT 'MANAGEMENT SIGNATURES TABLE CREATED SUCCESSFULLY' as status;

-- Verify table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'management_signatures'
ORDER BY ordinal_position;

-- Verify indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'management_signatures';

-- Verify constraints
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'management_signatures'::regclass;

SELECT 'DATABASE SCHEMA SETUP COMPLETED' as result;
