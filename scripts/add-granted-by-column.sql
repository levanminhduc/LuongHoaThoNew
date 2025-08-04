-- ADD GRANTED_BY COLUMN: Bổ sung cột granted_by vào bảng department_permissions
-- Script này sẽ kiểm tra và thêm cột granted_by nếu chưa có

-- ===== KIỂM TRA CẤU TRÚC BẢNG HIỆN TẠI =====
SELECT 'CURRENT TABLE STRUCTURE:' as info;
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'department_permissions' 
ORDER BY ordinal_position;

-- ===== KIỂM TRA CỘT GRANTED_BY CÓ TỒN TẠI KHÔNG =====
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'department_permissions' 
        AND column_name = 'granted_by'
    ) THEN
        RAISE NOTICE 'MISSING: granted_by column not found - will add it';
        
        -- Thêm cột granted_by
        ALTER TABLE department_permissions 
        ADD COLUMN granted_by VARCHAR(50) NOT NULL DEFAULT 'admin';
        
        RAISE NOTICE 'SUCCESS: granted_by column added';
    ELSE
        RAISE NOTICE 'OK: granted_by column already exists';
    END IF;
END $$;

-- ===== KIỂM TRA CÁC CỘT KHÁC CẦN THIẾT =====
DO $$
BEGIN
    -- Kiểm tra và thêm cột notes nếu chưa có
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'department_permissions' 
        AND column_name = 'notes'
    ) THEN
        ALTER TABLE department_permissions 
        ADD COLUMN notes TEXT;
        RAISE NOTICE 'ADDED: notes column';
    END IF;
    
    -- Kiểm tra và thêm cột granted_at nếu chưa có
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'department_permissions' 
        AND column_name = 'granted_at'
    ) THEN
        ALTER TABLE department_permissions 
        ADD COLUMN granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'ADDED: granted_at column';
    END IF;
    
    -- Kiểm tra và thêm cột is_active nếu chưa có
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'department_permissions' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE department_permissions 
        ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE 'ADDED: is_active column';
    END IF;
END $$;

-- ===== TẠO ADMIN EMPLOYEE NẾU CHƯA CÓ =====
INSERT INTO employees (
    employee_id, 
    full_name, 
    department, 
    chuc_vu, 
    cccd_hash, 
    is_active
) VALUES (
    'admin', 
    'System Administrator', 
    'Administration', 
    'admin', 
    '$2a$10$admin_system_hash', 
    true
) ON CONFLICT (employee_id) DO NOTHING;

-- ===== VERIFY CẤU TRÚC BẢNG SAU KHI THÊM =====
SELECT 'UPDATED TABLE STRUCTURE:' as info;
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'department_permissions' 
ORDER BY ordinal_position;

-- ===== TEST INSERT SAU KHI THÊM CỘT =====
DO $$
DECLARE
    test_employee_id VARCHAR(50);
    test_department VARCHAR(100);
BEGIN
    -- Lấy employee_id để test
    SELECT employee_id INTO test_employee_id
    FROM employees 
    WHERE chuc_vu IN ('truong_phong', 'to_truong') 
    AND is_active = true
    LIMIT 1;
    
    -- Lấy department để test
    SELECT DISTINCT department INTO test_department
    FROM employees 
    WHERE department IS NOT NULL AND department != ''
    LIMIT 1;
    
    IF test_employee_id IS NOT NULL AND test_department IS NOT NULL THEN
        BEGIN
            -- Test insert với granted_by
            INSERT INTO department_permissions (
                employee_id, 
                department, 
                granted_by, 
                notes
            ) VALUES (
                test_employee_id, 
                test_department, 
                'admin', 
                'Test insert after adding granted_by column'
            ) ON CONFLICT (employee_id, department) DO NOTHING;
            
            RAISE NOTICE 'SUCCESS: Test insert worked with granted_by column';
            
            -- Clean up test data
            DELETE FROM department_permissions 
            WHERE employee_id = test_employee_id 
            AND department = test_department 
            AND notes = 'Test insert after adding granted_by column';
            
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'ERROR: Test insert failed - %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'SKIP: No test data available';
    END IF;
END $$;

-- ===== KIỂM TRA FOREIGN KEY CONSTRAINTS =====
SELECT 'FOREIGN KEY CONSTRAINTS:' as info;
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'department_permissions';

-- ===== TẠO FOREIGN KEY CHO GRANTED_BY (OPTIONAL) =====
-- Uncomment nếu muốn tạo foreign key constraint cho granted_by
/*
DO $$
BEGIN
    -- Chỉ tạo foreign key nếu chưa có
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_dept_perm_granted_by'
        AND table_name = 'department_permissions'
    ) THEN
        ALTER TABLE department_permissions 
        ADD CONSTRAINT fk_dept_perm_granted_by 
        FOREIGN KEY (granted_by) REFERENCES employees(employee_id) ON DELETE SET NULL;
        
        RAISE NOTICE 'ADDED: Foreign key constraint for granted_by';
    END IF;
END $$;
*/

-- ===== FINAL VERIFICATION =====
SELECT 'FINAL VERIFICATION:' as info;

-- Kiểm tra admin user
SELECT 'Admin user:' as check_type, 
       CASE WHEN EXISTS (SELECT 1 FROM employees WHERE employee_id = 'admin') 
            THEN 'EXISTS' ELSE 'MISSING' END as status;

-- Kiểm tra granted_by column
SELECT 'granted_by column:' as check_type,
       CASE WHEN EXISTS (
           SELECT 1 FROM information_schema.columns 
           WHERE table_name = 'department_permissions' 
           AND column_name = 'granted_by'
       ) THEN 'EXISTS' ELSE 'MISSING' END as status;

-- Kiểm tra có thể insert không
SELECT 'Insert capability:' as check_type, 'READY TO TEST' as status;

SELECT 'Next step: Test permission assignment in admin UI' as instruction;
