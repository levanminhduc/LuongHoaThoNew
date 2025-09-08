-- Migration: Split password_hash and cccd_hash into separate columns
-- Purpose: Allow password changes via CCCD verification while keeping CCCD hash separate
-- Date: 2024

-- Step 1: Add new columns for proper password management
ALTER TABLE employees
  -- Password hash for authentication (separate from CCCD)
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  -- CCCD hash for verification during password reset (never used for login)
  ADD COLUMN IF NOT EXISTS password_version INT4 NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_password_change_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recovery_fail_count INT4 NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recovery_locked_until TIMESTAMPTZ;

-- Note: cccd_hash column already exists in the table

-- Step 2: Create security events table for audit logging
CREATE TABLE IF NOT EXISTS employee_security_events (
  id BIGSERIAL PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  event TEXT NOT NULL, -- 'password_changed_via_cccd', 'change_pw_cccd_failed', 'account_locked'
  ip_hash TEXT,
  user_agent TEXT,
  details JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes separately for performance
CREATE INDEX IF NOT EXISTS idx_security_events_employee 
ON employee_security_events (employee_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_event 
ON employee_security_events (event, occurred_at DESC);

-- Step 3: Comments for documentation
COMMENT ON COLUMN employees.password_hash IS 'Password hash for authentication - separate from CCCD hash';
COMMENT ON COLUMN employees.cccd_hash IS 'CCCD hash for verification during password reset - never used for login';
COMMENT ON COLUMN employees.password_version IS 'Incremented on each password change for session invalidation';
COMMENT ON COLUMN employees.last_password_change_at IS 'Timestamp of last password change';
COMMENT ON COLUMN employees.recovery_fail_count IS 'Failed password reset attempts counter';
COMMENT ON COLUMN employees.recovery_locked_until IS 'Account lock expiry for password reset attempts';

COMMENT ON TABLE employee_security_events IS 'Audit log for security-related events';

-- Step 4: Initial data migration - copy cccd_hash to password_hash if password_hash is null
-- This allows users to login with their CCCD initially, then change to a custom password
UPDATE employees 
SET 
  password_hash = cccd_hash,
  password_version = 0,
  last_password_change_at = NULL  -- NULL indicates never changed from CCCD
WHERE 
  password_hash IS NULL 
  AND cccd_hash IS NOT NULL;

-- Step 5: Create function to safely update password
CREATE OR REPLACE FUNCTION update_employee_password(
  p_employee_id VARCHAR(50),
  p_new_password_hash TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE employees 
  SET 
    password_hash = p_new_password_hash,
    password_version = password_version + 1,
    last_password_change_at = NOW(),
    recovery_fail_count = 0,  -- Reset fail count on successful change
    recovery_locked_until = NULL  -- Clear any lock
  WHERE 
    employee_id = p_employee_id;
    
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create function to check and increment fail count
CREATE OR REPLACE FUNCTION handle_password_reset_failure(
  p_employee_id VARCHAR(50),
  p_max_attempts INT DEFAULT 5,
  p_lock_duration INTERVAL DEFAULT '30 minutes'
) RETURNS JSONB AS $$
DECLARE
  v_fail_count INT;
  v_result JSONB;
BEGIN
  -- Get current fail count
  SELECT recovery_fail_count INTO v_fail_count
  FROM employees
  WHERE employee_id = p_employee_id;
  
  -- Increment fail count
  v_fail_count := COALESCE(v_fail_count, 0) + 1;
  
  -- Check if should lock
  IF v_fail_count >= p_max_attempts THEN
    UPDATE employees
    SET 
      recovery_fail_count = v_fail_count,
      recovery_locked_until = NOW() + p_lock_duration
    WHERE employee_id = p_employee_id;
    
    v_result := jsonb_build_object(
      'locked', true,
      'fail_count', v_fail_count,
      'locked_until', (NOW() + p_lock_duration)::TEXT
    );
  ELSE
    UPDATE employees
    SET recovery_fail_count = v_fail_count
    WHERE employee_id = p_employee_id;
    
    v_result := jsonb_build_object(
      'locked', false,
      'fail_count', v_fail_count,
      'attempts_remaining', p_max_attempts - v_fail_count
    );
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Enable RLS on security events table
ALTER TABLE employee_security_events ENABLE ROW LEVEL SECURITY;

-- Service role can access everything
CREATE POLICY "Service role full access to security events" ON employee_security_events
  FOR ALL USING (true);

-- Step 8: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_employees_password_version 
ON employees(employee_id, password_version) 
WHERE password_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_employees_recovery_locked 
ON employees(recovery_locked_until) 
WHERE recovery_locked_until IS NOT NULL;

-- Note: After migration, the system will work as follows:
-- 1. Login/authentication uses password_hash (initially same as cccd_hash)
-- 2. Password reset via CCCD verifies against cccd_hash (never changes)
-- 3. After password change, password_hash differs from cccd_hash
-- 4. Users can always reset password using their CCCD
