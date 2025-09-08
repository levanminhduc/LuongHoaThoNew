-- Migration: Add password management features to existing employees table
-- Purpose: Enable password change functionality using existing cccd_hash column as password storage
-- Date: 2024

-- Step 1: Add minimal columns for password management
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;

-- Step 2: Add comments for documentation
COMMENT ON COLUMN employees.cccd_hash IS 'Password hash (bcrypt) - initially stores CCCD hash, then user-chosen password';
COMMENT ON COLUMN employees.must_change_password IS 'True if user needs to change password (e.g., still using CCCD)';
COMMENT ON COLUMN employees.password_changed_at IS 'Last password change timestamp';
COMMENT ON COLUMN employees.failed_login_attempts IS 'Failed login counter for rate limiting';
COMMENT ON COLUMN employees.locked_until IS 'Account lock expiry after too many failed attempts';

-- Step 3: Mark all existing users to change password (optional - not forced)
-- UPDATE employees 
-- SET must_change_password = true
-- WHERE password_changed_at IS NULL;
-- Note: Commented out to allow voluntary password changes

-- Step 4: Create security audit log table (minimal)
CREATE TABLE IF NOT EXISTS security_logs (
  id SERIAL PRIMARY KEY,
  employee_id VARCHAR(50),
  action VARCHAR(50) NOT NULL, -- 'password_change', 'failed_login', 'account_locked'
  ip_address VARCHAR(45),
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_security_logs_employee 
ON security_logs(employee_id, created_at DESC);

-- Step 5: Enable RLS on security_logs
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;

-- Service role can access everything
CREATE POLICY "Service role full access to security_logs" ON security_logs
  FOR ALL USING (true);
