-- =====================================================
-- FIX: Add ON UPDATE CASCADE to ALL Missing Foreign Key Constraints
-- =====================================================
-- Purpose: Sửa lỗi "violates foreign key constraint" khi thay đổi employee_id
-- Date: 2025-11-10
-- Author: System Enhancement

BEGIN;

-- ===== 1. FIX ADMIN_BULK_SIGNATURE_LOGS.ADMIN_ID CONSTRAINT =====
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_bulk_signature_logs') THEN
        ALTER TABLE admin_bulk_signature_logs DROP CONSTRAINT IF EXISTS fk_admin_bulk_signature_logs_admin;

        ALTER TABLE admin_bulk_signature_logs
        ADD CONSTRAINT fk_admin_bulk_signature_logs_admin
        FOREIGN KEY (admin_id)
        REFERENCES employees(employee_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE;

        RAISE NOTICE '✅ UPDATED: admin_bulk_signature_logs.admin_id';
        RAISE NOTICE '   - ON DELETE: CASCADE, ON UPDATE: CASCADE';
    ELSE
        RAISE NOTICE 'SKIPPED: admin_bulk_signature_logs table does not exist';
    END IF;
END $$;

-- ===== 2. FIX DEPARTMENT_PERMISSIONS.EMPLOYEE_ID CONSTRAINT =====
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'department_permissions') THEN
        ALTER TABLE department_permissions DROP CONSTRAINT IF EXISTS department_permissions_employee_id_fkey;
        ALTER TABLE department_permissions DROP CONSTRAINT IF EXISTS fk_dept_perm_employee;

        ALTER TABLE department_permissions
        ADD CONSTRAINT fk_dept_perm_employee
        FOREIGN KEY (employee_id)
        REFERENCES employees(employee_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE;

        RAISE NOTICE '✅ UPDATED: department_permissions.employee_id';
        RAISE NOTICE '   - ON DELETE: CASCADE, ON UPDATE: CASCADE';
    ELSE
        RAISE NOTICE 'SKIPPED: department_permissions table does not exist';
    END IF;
END $$;

-- ===== 3. FIX DEPARTMENT_PERMISSIONS.GRANTED_BY CONSTRAINT =====
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'department_permissions') THEN
        ALTER TABLE department_permissions DROP CONSTRAINT IF EXISTS department_permissions_granted_by_fkey;
        ALTER TABLE department_permissions DROP CONSTRAINT IF EXISTS fk_dept_perm_granted_by;

        ALTER TABLE department_permissions
        ADD CONSTRAINT department_permissions_granted_by_fkey
        FOREIGN KEY (granted_by)
        REFERENCES employees(employee_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE;

        RAISE NOTICE '✅ UPDATED: department_permissions.granted_by';
        RAISE NOTICE '   - ON DELETE: SET NULL, ON UPDATE: CASCADE';
    ELSE
        RAISE NOTICE 'SKIPPED: department_permissions table does not exist';
    END IF;
END $$;

COMMIT;

-- ===== VERIFICATION =====
SELECT 'ALL FOREIGN KEY CONSTRAINTS VERIFICATION:' as info;

SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.update_rule,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND (
        (tc.table_name = 'admin_bulk_signature_logs' AND kcu.column_name = 'admin_id')
        OR (tc.table_name = 'department_permissions' AND kcu.column_name IN ('employee_id', 'granted_by'))
    )
ORDER BY tc.table_name, kcu.column_name;

-- ===== SUCCESS MESSAGE =====
SELECT 'ALL CASCADE UPDATE FIXES COMPLETED!' as status,
       'All foreign key constraints now support ON UPDATE CASCADE' as message;

-- ===== EXPECTED VERIFICATION OUTPUT =====
-- constraint_name                           | table_name                    | column_name  | update_rule | delete_rule
-- ------------------------------------------|-------------------------------|--------------|-------------|-------------
-- fk_admin_bulk_signature_logs_admin       | admin_bulk_signature_logs     | admin_id     | CASCADE     | CASCADE
-- fk_dept_perm_employee                    | department_permissions        | employee_id  | CASCADE     | CASCADE
-- department_permissions_granted_by_fkey   | department_permissions        | granted_by   | CASCADE     | SET NULL

