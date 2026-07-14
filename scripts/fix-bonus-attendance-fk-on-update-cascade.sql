-- FIX: Add ON UPDATE CASCADE cho FK của các bảng mới (employee_bonuses, attendance_daily, attendance_monthly)
-- Giải quyết lỗi khi đổi mã nhân viên (employee_id):
--   "update or delete on table "employees" violates foreign key constraint
--    "employee_bonuses_employee_id_fkey" on table "employee_bonuses""
-- Nguyên nhân: script 33 (bonus) và 27 (attendance) tạo FK chỉ có ON DELETE CASCADE,
-- thiếu ON UPDATE CASCADE nên cascade-update-employee.ts không đổi được employee_id.
-- Idempotent: chạy lại an toàn.

BEGIN;

-- ===== 1. EMPLOYEE_BONUSES =====
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employee_bonuses') THEN
        ALTER TABLE employee_bonuses DROP CONSTRAINT IF EXISTS employee_bonuses_employee_id_fkey;

        ALTER TABLE employee_bonuses
        ADD CONSTRAINT employee_bonuses_employee_id_fkey
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
        ON DELETE CASCADE ON UPDATE CASCADE;

        RAISE NOTICE 'UPDATED: employee_bonuses.employee_id (ON DELETE CASCADE, ON UPDATE CASCADE)';
    ELSE
        RAISE NOTICE 'SKIPPED: employee_bonuses table does not exist';
    END IF;
END $$;

-- ===== 2. ATTENDANCE_DAILY =====
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance_daily') THEN
        ALTER TABLE attendance_daily DROP CONSTRAINT IF EXISTS fk_attendance_daily_employee;

        ALTER TABLE attendance_daily
        ADD CONSTRAINT fk_attendance_daily_employee
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
        ON DELETE CASCADE ON UPDATE CASCADE;

        RAISE NOTICE 'UPDATED: attendance_daily.employee_id (ON DELETE CASCADE, ON UPDATE CASCADE)';
    ELSE
        RAISE NOTICE 'SKIPPED: attendance_daily table does not exist';
    END IF;
END $$;

-- ===== 3. ATTENDANCE_MONTHLY =====
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance_monthly') THEN
        ALTER TABLE attendance_monthly DROP CONSTRAINT IF EXISTS fk_attendance_monthly_employee;

        ALTER TABLE attendance_monthly
        ADD CONSTRAINT fk_attendance_monthly_employee
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
        ON DELETE CASCADE ON UPDATE CASCADE;

        RAISE NOTICE 'UPDATED: attendance_monthly.employee_id (ON DELETE CASCADE, ON UPDATE CASCADE)';
    ELSE
        RAISE NOTICE 'SKIPPED: attendance_monthly table does not exist';
    END IF;
END $$;

COMMIT;

-- ===== VERIFICATION =====
-- Tất cả FK trỏ tới employees phải có update_rule = CASCADE
SELECT
    tc.table_name,
    kcu.column_name,
    tc.constraint_name,
    rc.update_rule,
    rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'employees'
ORDER BY tc.table_name, kcu.column_name;
