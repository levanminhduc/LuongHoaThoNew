-- =====================================================
-- STEP 22: ADD ADMIN SIGNATURE TRACKING FIELDS
-- =====================================================
-- Purpose: Track admin bulk signature operations
-- Date: 2025-11-04
-- Author: System Enhancement

-- ===== ADD COLUMNS TO PAYROLLS TABLE =====

-- Add signed_by_admin_id to payrolls table
ALTER TABLE payrolls 
ADD COLUMN IF NOT EXISTS signed_by_admin_id VARCHAR(50) NULL;

-- Add comment
COMMENT ON COLUMN payrolls.signed_by_admin_id IS 'Mã admin thực hiện ký (NULL nếu employee tự ký)';

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_payrolls_signed_by_admin'
  ) THEN
    ALTER TABLE payrolls
    ADD CONSTRAINT fk_payrolls_signed_by_admin
    FOREIGN KEY (signed_by_admin_id)
    REFERENCES employees(employee_id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;

-- Add index for query performance
CREATE INDEX IF NOT EXISTS idx_payrolls_signed_by_admin 
ON payrolls(signed_by_admin_id) 
WHERE signed_by_admin_id IS NOT NULL;

-- ===== ADD COLUMNS TO SIGNATURE_LOGS TABLE =====

-- Add signed_by_admin_id to signature_logs table
ALTER TABLE signature_logs 
ADD COLUMN IF NOT EXISTS signed_by_admin_id VARCHAR(50) NULL;

-- Add comment
COMMENT ON COLUMN signature_logs.signed_by_admin_id IS 'Mã admin thực hiện ký (NULL nếu employee tự ký)';

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_signature_logs_signed_by_admin'
  ) THEN
    ALTER TABLE signature_logs
    ADD CONSTRAINT fk_signature_logs_signed_by_admin
    FOREIGN KEY (signed_by_admin_id)
    REFERENCES employees(employee_id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;

-- Add index for query performance
CREATE INDEX IF NOT EXISTS idx_signature_logs_signed_by_admin 
ON signature_logs(signed_by_admin_id) 
WHERE signed_by_admin_id IS NOT NULL;

-- ===== VERIFICATION =====

-- Verify columns were added
DO $$
DECLARE
  v_payrolls_column_exists BOOLEAN;
  v_signature_logs_column_exists BOOLEAN;
BEGIN
  -- Check payrolls table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payrolls' 
    AND column_name = 'signed_by_admin_id'
  ) INTO v_payrolls_column_exists;
  
  -- Check signature_logs table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'signature_logs' 
    AND column_name = 'signed_by_admin_id'
  ) INTO v_signature_logs_column_exists;
  
  -- Report results
  IF v_payrolls_column_exists AND v_signature_logs_column_exists THEN
    RAISE NOTICE '✅ SUCCESS: Admin signature tracking columns added successfully';
    RAISE NOTICE '   - payrolls.signed_by_admin_id: ADDED';
    RAISE NOTICE '   - signature_logs.signed_by_admin_id: ADDED';
  ELSE
    RAISE WARNING '⚠️ WARNING: Some columns may not have been added';
    RAISE NOTICE '   - payrolls.signed_by_admin_id: %', v_payrolls_column_exists;
    RAISE NOTICE '   - signature_logs.signed_by_admin_id: %', v_signature_logs_column_exists;
  END IF;
END $$;

-- ===== ROLLBACK SCRIPT (COMMENTED OUT) =====
-- Uncomment to rollback changes

/*
-- Drop indexes
DROP INDEX IF EXISTS idx_payrolls_signed_by_admin;
DROP INDEX IF EXISTS idx_signature_logs_signed_by_admin;

-- Drop foreign key constraints
ALTER TABLE payrolls DROP CONSTRAINT IF EXISTS fk_payrolls_signed_by_admin;
ALTER TABLE signature_logs DROP CONSTRAINT IF EXISTS fk_signature_logs_signed_by_admin;

-- Drop columns
ALTER TABLE payrolls DROP COLUMN IF EXISTS signed_by_admin_id;
ALTER TABLE signature_logs DROP COLUMN IF EXISTS signed_by_admin_id;
*/

