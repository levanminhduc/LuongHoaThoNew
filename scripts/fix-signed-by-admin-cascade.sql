-- =====================================================
-- FIX: Add ON UPDATE CASCADE to signed_by_admin_id Foreign Key Constraints
-- =====================================================
-- Purpose: Sửa lỗi "violates foreign key constraint fk_payrolls_signed_by_admin"
--          khi thay đổi employee_id trong employee-management
-- Date: 2025-11-10
-- Author: System Enhancement

-- ===== BACKUP REMINDER =====
-- QUAN TRỌNG: Backup database trước khi chạy!
-- pg_dump -h your_host -U your_user -d your_database > backup_before_signed_by_admin_cascade_fix.sql

BEGIN;

-- ===== 1. FIX PAYROLLS.SIGNED_BY_ADMIN_ID CONSTRAINT =====
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payrolls') THEN
        -- Drop existing constraint
        ALTER TABLE payrolls DROP CONSTRAINT IF EXISTS fk_payrolls_signed_by_admin;

        -- Recreate with ON UPDATE CASCADE and ON DELETE SET NULL
        ALTER TABLE payrolls
        ADD CONSTRAINT fk_payrolls_signed_by_admin
        FOREIGN KEY (signed_by_admin_id) 
        REFERENCES employees(employee_id)
        ON DELETE SET NULL 
        ON UPDATE CASCADE;

        RAISE NOTICE '✅ UPDATED: payrolls.signed_by_admin_id foreign key constraint';
        RAISE NOTICE '   - ON DELETE: SET NULL';
        RAISE NOTICE '   - ON UPDATE: CASCADE';
    ELSE
        RAISE NOTICE 'SKIPPED: payrolls table does not exist';
    END IF;
END $$;

-- ===== 2. FIX SIGNATURE_LOGS.SIGNED_BY_ADMIN_ID CONSTRAINT =====
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'signature_logs') THEN
        -- Drop existing constraint
        ALTER TABLE signature_logs DROP CONSTRAINT IF EXISTS fk_signature_logs_signed_by_admin;

        -- Recreate with ON UPDATE CASCADE and ON DELETE SET NULL
        ALTER TABLE signature_logs
        ADD CONSTRAINT fk_signature_logs_signed_by_admin
        FOREIGN KEY (signed_by_admin_id) 
        REFERENCES employees(employee_id)
        ON DELETE SET NULL 
        ON UPDATE CASCADE;

        RAISE NOTICE '✅ UPDATED: signature_logs.signed_by_admin_id foreign key constraint';
        RAISE NOTICE '   - ON DELETE: SET NULL';
        RAISE NOTICE '   - ON UPDATE: CASCADE';
    ELSE
        RAISE NOTICE 'SKIPPED: signature_logs table does not exist';
    END IF;
END $$;

COMMIT;

-- ===== VERIFICATION =====
SELECT 'SIGNED_BY_ADMIN_ID FOREIGN KEY CONSTRAINTS VERIFICATION:' as info;

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
    AND kcu.column_name = 'signed_by_admin_id'
    AND ccu.table_name = 'employees'
ORDER BY tc.table_name;

-- ===== SUCCESS MESSAGE =====
SELECT 'SIGNED_BY_ADMIN_ID CASCADE UPDATE FIX COMPLETED!' as status,
       'Both fk_payrolls_signed_by_admin and fk_signature_logs_signed_by_admin now support ON UPDATE CASCADE' as message;

-- ===== EXPECTED VERIFICATION OUTPUT =====
-- constraint_name                        | table_name      | column_name         | update_rule | delete_rule
-- ---------------------------------------|-----------------|---------------------|-------------|-------------
-- fk_payrolls_signed_by_admin           | payrolls        | signed_by_admin_id  | CASCADE     | SET NULL
-- fk_signature_logs_signed_by_admin     | signature_logs  | signed_by_admin_id  | CASCADE     | SET NULL

