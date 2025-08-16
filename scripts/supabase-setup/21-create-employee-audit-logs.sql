-- =====================================================
-- EMPLOYEE AUDIT LOGS TABLE
-- Tracks all employee data modifications for compliance
-- =====================================================

-- Create employee_audit_logs table
CREATE TABLE IF NOT EXISTS employee_audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Audit metadata
  audit_timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  admin_user_id VARCHAR(50) NOT NULL,
  admin_user_name VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  
  -- Employee information
  employee_id VARCHAR(50) NOT NULL,
  employee_name VARCHAR(255),
  
  -- Action details
  action_type VARCHAR(20) NOT NULL CHECK (action_type IN (
    'CREATE', 'UPDATE', 'DELETE', 'DEACTIVATE', 'ACTIVATE', 
    'PASSWORD_CHANGE', 'EMPLOYEE_ID_CHANGE', 'CASCADE_UPDATE'
  )),
  
  -- Change details
  table_name VARCHAR(50) NOT NULL DEFAULT 'employees',
  field_name VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  
  -- Additional context
  change_reason TEXT,
  batch_id UUID, -- For grouping related changes
  cascade_operation BOOLEAN DEFAULT FALSE,
  
  -- Status
  status VARCHAR(20) DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'FAILED', 'PARTIAL')),
  error_message TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Indexes for performance
  CONSTRAINT employee_audit_logs_timestamp_idx UNIQUE (id, audit_timestamp)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_employee_audit_logs_employee_id ON employee_audit_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_audit_logs_timestamp ON employee_audit_logs(audit_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_employee_audit_logs_admin_user ON employee_audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_employee_audit_logs_action_type ON employee_audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_employee_audit_logs_batch_id ON employee_audit_logs(batch_id);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_employee_audit_logs_employee_timestamp
ON employee_audit_logs(employee_id, audit_timestamp DESC);

-- =====================================================
-- RLS POLICIES FOR AUDIT LOGS
-- =====================================================

-- Enable RLS
ALTER TABLE employee_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything (for audit logging)
CREATE POLICY "Service role full access" ON employee_audit_logs
FOR ALL USING (auth.role() = 'service_role');

-- Policy: Admins can read audit logs
CREATE POLICY "Admin can read audit logs" ON employee_audit_logs
FOR SELECT USING (
  auth.role() = 'service_role' OR
  EXISTS (
    SELECT 1 FROM employees
    WHERE employee_id = auth.jwt() ->> 'employee_id'
    AND chuc_vu IN ('admin', 'giam_doc')
  )
);

-- Policy: Audit logs are immutable (no updates or deletes)
CREATE POLICY "Audit logs are immutable" ON employee_audit_logs
FOR UPDATE USING (false);

CREATE POLICY "Audit logs cannot be deleted" ON employee_audit_logs
FOR DELETE USING (false);

-- =====================================================
-- AUDIT LOG HELPER FUNCTIONS
-- =====================================================

-- Function to log employee changes
CREATE OR REPLACE FUNCTION log_employee_change(
  p_admin_user_id VARCHAR(50),
  p_admin_user_name VARCHAR(255),
  p_employee_id VARCHAR(50),
  p_employee_name VARCHAR(255),
  p_action_type VARCHAR(20),
  p_field_name VARCHAR(100) DEFAULT NULL,
  p_old_value TEXT DEFAULT NULL,
  p_new_value TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_change_reason TEXT DEFAULT NULL,
  p_batch_id UUID DEFAULT NULL,
  p_cascade_operation BOOLEAN DEFAULT FALSE
) RETURNS UUID AS $$
DECLARE
  audit_id UUID;
BEGIN
  INSERT INTO employee_audit_logs (
    admin_user_id,
    admin_user_name,
    employee_id,
    employee_name,
    action_type,
    field_name,
    old_value,
    new_value,
    ip_address,
    user_agent,
    change_reason,
    batch_id,
    cascade_operation,
    status
  ) VALUES (
    p_admin_user_id,
    p_admin_user_name,
    p_employee_id,
    p_employee_name,
    p_action_type,
    p_field_name,
    p_old_value,
    p_new_value,
    p_ip_address,
    p_user_agent,
    p_change_reason,
    p_batch_id,
    p_cascade_operation,
    'SUCCESS'
  ) RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log failed operations
CREATE OR REPLACE FUNCTION log_employee_change_failed(
  p_admin_user_id VARCHAR(50),
  p_admin_user_name VARCHAR(255),
  p_employee_id VARCHAR(50),
  p_action_type VARCHAR(20),
  p_error_message TEXT,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  audit_id UUID;
BEGIN
  INSERT INTO employee_audit_logs (
    admin_user_id,
    admin_user_name,
    employee_id,
    action_type,
    status,
    error_message,
    ip_address,
    user_agent
  ) VALUES (
    p_admin_user_id,
    p_admin_user_name,
    p_employee_id,
    p_action_type,
    'FAILED',
    p_error_message,
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get audit logs for an employee
CREATE OR REPLACE FUNCTION get_employee_audit_logs(
  p_employee_id VARCHAR(50),
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
  id UUID,
  audit_timestamp TIMESTAMPTZ,
  admin_user_name VARCHAR(255),
  action_type VARCHAR(20),
  field_name VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  change_reason TEXT,
  status VARCHAR(20)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    eal.id,
    eal.audit_timestamp,
    eal.admin_user_name,
    eal.action_type,
    eal.field_name,
    eal.old_value,
    eal.new_value,
    eal.change_reason,
    eal.status
  FROM employee_audit_logs eal
  WHERE eal.employee_id = p_employee_id
  ORDER BY eal.audit_timestamp DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify table creation
SELECT 'employee_audit_logs table created successfully' as status
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'employee_audit_logs'
);

-- Verify indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename = 'employee_audit_logs';

-- Verify RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'employee_audit_logs';

-- Verify functions
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_name LIKE '%employee%audit%' OR routine_name LIKE '%log_employee%';
