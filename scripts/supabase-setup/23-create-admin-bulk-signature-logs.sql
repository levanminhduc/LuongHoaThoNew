-- =====================================================
-- STEP 23: CREATE ADMIN BULK SIGNATURE LOGS TABLE
-- =====================================================
-- Purpose: Audit trail cho bulk signature operations bởi admin
-- Date: 2025-11-04
-- Author: System Enhancement

-- ===== DROP TABLE IF EXISTS (FOR CLEAN INSTALL) =====
DROP TABLE IF EXISTS admin_bulk_signature_logs CASCADE;

-- ===== CREATE TABLE =====
CREATE TABLE admin_bulk_signature_logs (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Bulk Operation Identifier
  bulk_batch_id VARCHAR(100) UNIQUE NOT NULL,
  
  -- Admin Information
  admin_id VARCHAR(50) NOT NULL,
  admin_name VARCHAR(255) NOT NULL,
  
  -- Target Month
  salary_month VARCHAR(20) NOT NULL,
  
  -- Statistics
  total_unsigned_before INTEGER NOT NULL,
  total_processed INTEGER NOT NULL,
  success_count INTEGER NOT NULL,
  error_count INTEGER NOT NULL,
  
  -- Errors Detail (JSON Array)
  errors JSONB DEFAULT '[]'::JSONB,
  
  -- Tracking Information
  ip_address VARCHAR(45),
  device_info TEXT,
  admin_note TEXT,
  
  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_seconds INTEGER,
  
  -- Audit Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign Key
  CONSTRAINT fk_admin_bulk_signature_logs_admin 
    FOREIGN KEY (admin_id) 
    REFERENCES employees(employee_id) 
    ON DELETE CASCADE
);

-- ===== CREATE INDEXES =====

-- Index on salary_month for filtering by month
CREATE INDEX idx_bulk_signature_logs_month 
ON admin_bulk_signature_logs(salary_month);

-- Index on admin_id for filtering by admin
CREATE INDEX idx_bulk_signature_logs_admin 
ON admin_bulk_signature_logs(admin_id);

-- Index on created_at for sorting (descending)
CREATE INDEX idx_bulk_signature_logs_created 
ON admin_bulk_signature_logs(created_at DESC);

-- Index on bulk_batch_id for quick lookup
CREATE INDEX idx_bulk_signature_logs_batch_id 
ON admin_bulk_signature_logs(bulk_batch_id);

-- Composite index for common queries
CREATE INDEX idx_bulk_signature_logs_month_admin 
ON admin_bulk_signature_logs(salary_month, admin_id);

-- ===== ADD COMMENTS =====

COMMENT ON TABLE admin_bulk_signature_logs IS 
'Audit trail cho bulk signature operations bởi admin - track toàn bộ quá trình ký hàng loạt';

COMMENT ON COLUMN admin_bulk_signature_logs.id IS 
'UUID primary key';

COMMENT ON COLUMN admin_bulk_signature_logs.bulk_batch_id IS 
'Unique ID cho mỗi bulk operation (format: BULK_timestamp_random)';

COMMENT ON COLUMN admin_bulk_signature_logs.admin_id IS 
'Mã nhân viên admin thực hiện bulk signature';

COMMENT ON COLUMN admin_bulk_signature_logs.admin_name IS 
'Tên admin thực hiện bulk signature (cached)';

COMMENT ON COLUMN admin_bulk_signature_logs.salary_month IS 
'Tháng lương được ký hàng loạt (format: YYYY-MM)';

COMMENT ON COLUMN admin_bulk_signature_logs.total_unsigned_before IS 
'Số lượng chữ ký chưa ký trước khi bulk sign';

COMMENT ON COLUMN admin_bulk_signature_logs.total_processed IS 
'Tổng số chữ ký được xử lý';

COMMENT ON COLUMN admin_bulk_signature_logs.success_count IS 
'Số lượng ký thành công';

COMMENT ON COLUMN admin_bulk_signature_logs.error_count IS 
'Số lượng ký thất bại';

COMMENT ON COLUMN admin_bulk_signature_logs.errors IS 
'Chi tiết lỗi dạng JSON array: [{"employee_id": "NV001", "error": "message"}]';

COMMENT ON COLUMN admin_bulk_signature_logs.ip_address IS 
'IP address của admin khi thực hiện bulk signature';

COMMENT ON COLUMN admin_bulk_signature_logs.device_info IS 
'Thông tin thiết bị/browser của admin';

COMMENT ON COLUMN admin_bulk_signature_logs.admin_note IS 
'Ghi chú của admin khi thực hiện bulk signature (optional)';

COMMENT ON COLUMN admin_bulk_signature_logs.started_at IS 
'Thời gian bắt đầu bulk operation';

COMMENT ON COLUMN admin_bulk_signature_logs.completed_at IS 
'Thời gian hoàn thành bulk operation';

COMMENT ON COLUMN admin_bulk_signature_logs.duration_seconds IS 
'Thời gian thực hiện (giây)';

-- ===== VERIFICATION =====

DO $$
DECLARE
  v_table_exists BOOLEAN;
  v_index_count INTEGER;
BEGIN
  -- Check if table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'admin_bulk_signature_logs'
  ) INTO v_table_exists;
  
  -- Count indexes
  SELECT COUNT(*) INTO v_index_count
  FROM pg_indexes 
  WHERE tablename = 'admin_bulk_signature_logs';
  
  -- Report results
  IF v_table_exists THEN
    RAISE NOTICE '✅ SUCCESS: admin_bulk_signature_logs table created successfully';
    RAISE NOTICE '   - Indexes created: %', v_index_count;
  ELSE
    RAISE WARNING '⚠️ WARNING: Table creation may have failed';
  END IF;
END $$;

-- ===== SAMPLE QUERY (FOR TESTING) =====
-- Uncomment to test

/*
-- Get recent bulk signature operations
SELECT 
  bulk_batch_id,
  admin_name,
  salary_month,
  total_processed,
  success_count,
  error_count,
  duration_seconds,
  created_at
FROM admin_bulk_signature_logs
ORDER BY created_at DESC
LIMIT 10;
*/

