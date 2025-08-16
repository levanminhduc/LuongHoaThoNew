-- =====================================================
-- SCRIPT 22: ADD VAN_PHONG ROLE TO SYSTEM
-- Safely add "van_phong" role to MAY HÒA THỌ ĐIỆN BÀN system
-- =====================================================

-- ===== BACKUP CURRENT STATE =====
SELECT 'CURRENT ROLE DISTRIBUTION:' as info;
SELECT 
    chuc_vu,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM employees 
WHERE is_active = true
GROUP BY chuc_vu
ORDER BY count DESC;

-- ===== VERIFY CURRENT CONSTRAINT =====
SELECT 'CURRENT CONSTRAINT:' as info;
SELECT
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname = 'employees_chuc_vu_check';

-- ===== UPDATE DATABASE CONSTRAINT =====
-- Drop existing constraint
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_chuc_vu_check;

-- Add new constraint with van_phong role
ALTER TABLE employees 
ADD CONSTRAINT employees_chuc_vu_check 
CHECK (chuc_vu IN (
    'admin',
    'giam_doc',
    'ke_toan', 
    'nguoi_lap_bieu',
    'truong_phong',
    'to_truong',
    'nhan_vien',
    'van_phong'
));

-- ===== UPDATE COLUMN COMMENT =====
COMMENT ON COLUMN employees.chuc_vu IS 'Chức vụ: admin, giam_doc, ke_toan, nguoi_lap_bieu, truong_phong, to_truong, nhan_vien, van_phong - dùng cho phân quyền';

-- ===== UPDATE AUDIT LOGS RLS POLICY =====
-- Update audit logs policy to include van_phong for viewing audit logs
DROP POLICY IF EXISTS "Admin can read audit logs" ON employee_audit_logs;

CREATE POLICY "Admin can read audit logs" ON employee_audit_logs
FOR SELECT USING (
  auth.role() = 'service_role' OR
  EXISTS (
    SELECT 1 FROM employees 
    WHERE employee_id = auth.jwt() ->> 'employee_id' 
    AND chuc_vu IN ('admin', 'giam_doc', 'van_phong')
  )
);

-- ===== VERIFY UPDATES =====
SELECT 'UPDATED CONSTRAINT VERIFICATION:' as info;
SELECT
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname = 'employees_chuc_vu_check';

-- ===== TEST CONSTRAINT =====
-- Test that van_phong role is accepted
DO $$
BEGIN
    -- Try to insert a test record with van_phong role
    INSERT INTO employees (
        employee_id, 
        full_name, 
        cccd_hash, 
        department, 
        chuc_vu, 
        is_active
    ) VALUES (
        'TEST_VAN_PHONG_' || EXTRACT(EPOCH FROM NOW())::text,
        'Test Van Phong User',
        'test_hash',
        'Văn Phòng',
        'van_phong',
        false  -- Inactive test record
    );
    
    RAISE NOTICE 'SUCCESS: van_phong role constraint test passed';
    
    -- Clean up test record
    DELETE FROM employees 
    WHERE employee_id LIKE 'TEST_VAN_PHONG_%' 
    AND is_active = false;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERROR: van_phong role constraint test failed: %', SQLERRM;
END $$;

-- ===== ROLLBACK SCRIPT (COMMENT OUT TO USE) =====
/*
-- ROLLBACK: Remove van_phong role if needed
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_chuc_vu_check;

ALTER TABLE employees 
ADD CONSTRAINT employees_chuc_vu_check 
CHECK (chuc_vu IN (
    'admin',
    'giam_doc',
    'ke_toan', 
    'nguoi_lap_bieu',
    'truong_phong',
    'to_truong',
    'nhan_vien'
));

COMMENT ON COLUMN employees.chuc_vu IS 'Chức vụ: admin, giam_doc, ke_toan, nguoi_lap_bieu, truong_phong, to_truong, nhan_vien - dùng cho phân quyền';
*/

-- ===== FINAL VERIFICATION =====
SELECT 'FINAL VERIFICATION:' as info;
SELECT 'Database constraint updated successfully for van_phong role' as status;

-- Check if any existing employees would be affected
SELECT 'EXISTING EMPLOYEES CHECK:' as info;
SELECT COUNT(*) as total_employees, 
       COUNT(CASE WHEN chuc_vu NOT IN ('admin', 'giam_doc', 'ke_toan', 'nguoi_lap_bieu', 'truong_phong', 'to_truong', 'nhan_vien', 'van_phong') THEN 1 END) as invalid_roles
FROM employees;

SELECT 'READY FOR APPLICATION UPDATES' as next_step;
