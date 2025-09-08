-- Check existing columns in employees table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'employees'
AND column_name IN (
    'cccd_hash',
    'password_hash',
    'must_change_password',
    'password_changed_at',
    'failed_login_attempts',
    'locked_until',
    'password_version',
    'last_password_change_at',
    'recovery_fail_count',
    'recovery_locked_until'
)
ORDER BY ordinal_position;

-- Check if security tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('security_logs', 'employee_security_events');
