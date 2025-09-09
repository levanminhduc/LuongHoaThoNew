-- FIX: Add ON UPDATE CASCADE to Foreign Key Constraints (SAFE VERSION)
-- Giải quyết lỗi "update or delete on table employees violates foreign key constraint"
-- Script này chỉ cập nhật các bảng TỒN TẠI trong database

-- ===== BACKUP REMINDER =====
-- QUAN TRỌNG: Backup database trước khi chạy!
-- pg_dump -h your_host -U your_user -d your_database > backup_before_cascade_fix.sql

-- ===== STEP 1: CHECK EXISTING TABLES FIRST =====
-- Chạy script check-existing-tables.sql trước để xác định bảng nào tồn tại

BEGIN;

-- ===== 1. PAYROLLS TABLE (CORE TABLE - ALWAYS EXISTS) =====
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payrolls') THEN
        -- Drop existing constraint
        ALTER TABLE payrolls DROP CONSTRAINT IF EXISTS payrolls_employee_id_fkey;

        -- Recreate with ON UPDATE CASCADE
        ALTER TABLE payrolls
        ADD CONSTRAINT payrolls_employee_id_fkey
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
        ON DELETE CASCADE ON UPDATE CASCADE;

        RAISE NOTICE 'UPDATED: payrolls foreign key constraint';
    ELSE
        RAISE NOTICE 'SKIPPED: payrolls table does not exist';
    END IF;
END $$;

-- ===== 2. SIGNATURE_LOGS TABLE =====
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'signature_logs') THEN
        -- Drop existing constraint
        ALTER TABLE signature_logs DROP CONSTRAINT IF EXISTS signature_logs_employee_id_fkey;

        -- Recreate with ON UPDATE CASCADE
        ALTER TABLE signature_logs
        ADD CONSTRAINT signature_logs_employee_id_fkey
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
        ON DELETE CASCADE ON UPDATE CASCADE;

        RAISE NOTICE 'UPDATED: signature_logs foreign key constraint';
    ELSE
        RAISE NOTICE 'SKIPPED: signature_logs table does not exist';
    END IF;
END $$;

-- ===== 3. DEPARTMENT_PERMISSIONS TABLE =====
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'department_permissions') THEN
        -- Drop existing constraints
        ALTER TABLE department_permissions DROP CONSTRAINT IF EXISTS department_permissions_employee_id_fkey;
        ALTER TABLE department_permissions DROP CONSTRAINT IF EXISTS fk_dept_perm_employee;

        -- Recreate with ON UPDATE CASCADE
        ALTER TABLE department_permissions
        ADD CONSTRAINT fk_dept_perm_employee
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
        ON DELETE CASCADE ON UPDATE CASCADE;

        RAISE NOTICE 'UPDATED: department_permissions foreign key constraint';
    ELSE
        RAISE NOTICE 'SKIPPED: department_permissions table does not exist';
    END IF;
END $$;

-- ===== 4. MANAGEMENT_SIGNATURES TABLE =====
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'management_signatures') THEN
        -- Drop existing constraint
        ALTER TABLE management_signatures DROP CONSTRAINT IF EXISTS fk_management_signatures_employee;

        -- Recreate with ON UPDATE CASCADE
        ALTER TABLE management_signatures
        ADD CONSTRAINT fk_management_signatures_employee
        FOREIGN KEY (signed_by_id) REFERENCES employees(employee_id)
        ON DELETE SET NULL ON UPDATE CASCADE;

        RAISE NOTICE 'UPDATED: management_signatures foreign key constraint';
    ELSE
        RAISE NOTICE 'SKIPPED: management_signatures table does not exist';
    END IF;
END $$;

-- ===== 5. ACCESS_LOGS TABLE (OPTIONAL) =====
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'access_logs') THEN
        -- Drop existing constraint
        ALTER TABLE access_logs DROP CONSTRAINT IF EXISTS access_logs_employee_accessed_fkey;

        -- Recreate with ON UPDATE CASCADE
        ALTER TABLE access_logs
        ADD CONSTRAINT access_logs_employee_accessed_fkey
        FOREIGN KEY (employee_accessed) REFERENCES employees(employee_id)
        ON DELETE SET NULL ON UPDATE CASCADE;

        RAISE NOTICE 'UPDATED: access_logs foreign key constraint';
    ELSE
        RAISE NOTICE 'SKIPPED: access_logs table does not exist';
    END IF;
END $$;

-- ===== 6. PAYROLL_AUDIT_LOGS TABLE (OPTIONAL) =====
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payroll_audit_logs') THEN
        -- Drop existing constraint
        ALTER TABLE payroll_audit_logs DROP CONSTRAINT IF EXISTS payroll_audit_logs_employee_id_fkey;

        -- Recreate with ON UPDATE CASCADE
        ALTER TABLE payroll_audit_logs
        ADD CONSTRAINT payroll_audit_logs_employee_id_fkey
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
        ON DELETE CASCADE ON UPDATE CASCADE;

        RAISE NOTICE 'UPDATED: payroll_audit_logs foreign key constraint';
    ELSE
        RAISE NOTICE 'SKIPPED: payroll_audit_logs table does not exist';
    END IF;
END $$;

-- ===== 7. EMPLOYEE_AUDIT_LOGS TABLE (NO FK NEEDED) =====
-- Note: This table stores employee_id as VARCHAR for historical tracking
-- No foreign key constraint needed

COMMIT;

-- ===== VERIFICATION =====
SELECT 'FOREIGN KEY CONSTRAINTS VERIFICATION:' as info;

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
    AND ccu.table_name = 'employees'
    AND ccu.column_name = 'employee_id'
ORDER BY tc.table_name;

-- ===== SUCCESS MESSAGE =====
SELECT 'CASCADE UPDATE FIX COMPLETED!' as status,
       'All existing foreign key constraints now support ON UPDATE CASCADE' as message;
