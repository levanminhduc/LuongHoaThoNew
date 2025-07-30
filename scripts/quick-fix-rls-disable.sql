-- QUICK FIX: TEMPORARILY DISABLE RLS FOR TESTING
-- Run this in Supabase SQL Editor to fix 500 error immediately

-- Disable RLS on tables temporarily
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE payrolls DISABLE ROW LEVEL SECURITY;
ALTER TABLE signature_logs DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('employees', 'payrolls', 'signature_logs');

-- Expected result: rowsecurity = false for all tables

-- NOTE: This is a temporary fix for testing
-- After confirming API works, you should:
-- 1. Re-enable RLS: ALTER TABLE tablename ENABLE ROW LEVEL SECURITY;
-- 2. Run the proper fix script: 15-fix-rls-for-service-client.sql
