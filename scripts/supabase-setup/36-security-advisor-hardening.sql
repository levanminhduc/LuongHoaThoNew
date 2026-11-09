-- SCRIPT 36: SỬA LỖI SUPABASE SECURITY ADVISOR (project luong-nhan-vien)
--
-- Bối cảnh: app chỉ truy cập DB qua createServiceClient() (service_role, bỏ qua RLS).
-- Anon key không được dùng để đọc/ghi bảng hay gọi RPC ở đâu trong code, nên các bước
-- dưới đây chỉ chặn truy cập trực tiếp bằng anon key, không ảnh hưởng app.
--
-- Phạm vi:
--   PHẦN 1: thu hồi quyền EXECUTE của anon/authenticated trên 5 hàm SECURITY DEFINER
--   PHẦN 2: bật RLS cho 8 bảng của app (không tạo policy -> chỉ service_role truy cập)
--   PHẦN 3: xóa các policy USING(true)/WITH CHECK(true) áp cho anon/authenticated/public
--   PHẦN 4: cố định search_path cho 18 hàm
--   PHẦN 5: kiểm tra lại
--
-- 3 bảng import_* là bảng cũ của chính app này (tạo ở script 11/12), code hiện tại không
-- dùng; không repo nào khác trỏ tới project này -> để chung script 36.
-- 12 bảng kho/chỉ (dat_chi, khach_hang, ...) KHÔNG thuộc app này -> xem script 37.
--
-- Cách chạy (Supabase SQL Editor chỉ hiện kết quả của câu lệnh cuối):
--   1. Chạy riêng câu SELECT "PHẦN 0" và LƯU kết quả: DROP POLICY không hoàn tác được.
--   2. Chạy khối BEGIN ... COMMIT (phần 1-4).
--   3. Chạy lần lượt từng câu 5a, 5b, 5c.
--   4. Advisors > Security Advisor > "Rerun linter". Sẽ xuất hiện thêm các mục INFO
--      "RLS Enabled No Policy" cho các bảng vừa khóa: đó là trạng thái mong muốn.

-- ===== PHẦN 0: backup định nghĩa policy sẽ bị xóa ở PHẦN 3 =====
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('attendance_daily', 'attendance_monthly', 'column_aliases',
                    'configuration_field_mappings', 'employee_security_events',
                    'import_mapping_history', 'mapping_configurations', 'security_logs')
ORDER BY 1, 2;

BEGIN;

-- ===== PHẦN 1: SECURITY DEFINER functions chỉ cho service_role =====
DO $$
DECLARE
  fn regprocedure;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'update_employee_password',
        'handle_password_reset_failure',
        'log_employee_change',
        'log_employee_change_failed',
        'get_employee_audit_logs'
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
    RAISE NOTICE 'Revoked public execute: %', fn;
  END LOOP;
END $$;

-- ===== PHẦN 2: bật RLS cho bảng của app =====
-- admin_users_backup* là bảng backup cũ, code không dùng. Sau khi xác nhận không cần,
-- nên DROP hẳn thay vì chỉ bật RLS.
ALTER TABLE IF EXISTS public.admin_users_backup                ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_users_backup_before_disable ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_bulk_signature_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.department_permissions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.management_signatures             ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.import_sessions                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.import_file_configs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.import_column_mappings            ENABLE ROW LEVEL SECURITY;

-- ===== PHẦN 3: xóa policy "luôn đúng" mở cho anon/authenticated/public =====
-- service_role bỏ qua RLS nên không cần policy nào cho nó.
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname, cmd, roles
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'attendance_daily',
        'attendance_monthly',
        'column_aliases',
        'configuration_field_mappings',
        'employee_security_events',
        'import_mapping_history',
        'mapping_configurations',
        'security_logs'
      )
      AND (
        btrim(coalesce(qual, '')) IN ('true', '(true)')
        OR btrim(coalesce(with_check, '')) IN ('true', '(true)')
      )
      AND NOT (roles = ARRAY['service_role']::name[])
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    RAISE NOTICE 'Dropped policy "%" on % (cmd=%, roles=%)',
      pol.policyname, pol.tablename, pol.cmd, pol.roles;
  END LOOP;
END $$;

-- ===== PHẦN 4: cố định search_path =====
-- Dùng public (không phải '') vì thân hàm gọi bảng không kèm schema.
DO $$
DECLARE
  fn regprocedure;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'update_updated_at_column',
        'log_employee_change',
        'update_admin_users_updated_at',
        'log_employee_change_failed',
        'get_employee_audit_logs',
        'bulk_update_signature_dates',
        'update_employee_password',
        'get_salary_by_month',
        'get_signature_report',
        'get_employee_salary_detail',
        'trigger_set_security_logs_vietnam_timestamp',
        'handle_password_reset_failure',
        'trigger_set_vietnam_timestamp',
        'trigger_attendance_updated_at',
        'log_management_signature_audit',
        'bulk_sign_salaries',
        'auto_sign_salary',
        'sign_bonus'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, extensions, pg_temp', fn);
  END LOOP;
END $$;

COMMIT;

-- ===== PHẦN 5: kiểm tra =====
-- 5a. 5 hàm nhạy cảm: anon/authenticated phải là false
SELECT p.oid::regprocedure AS fn,
       has_function_privilege('anon', p.oid, 'EXECUTE')          AS anon_exec,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('update_employee_password', 'handle_password_reset_failure',
                    'log_employee_change', 'log_employee_change_failed',
                    'get_employee_audit_logs');

-- 5b. Bảng public còn tắt RLS (sau script 36 chỉ còn bảng của script 37)
SELECT c.relname
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
ORDER BY 1;

-- 5c. Policy còn lại trên 8 bảng ở PHẦN 3
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('attendance_daily', 'attendance_monthly', 'column_aliases',
                    'configuration_field_mappings', 'employee_security_events',
                    'import_mapping_history', 'mapping_configurations', 'security_logs')
ORDER BY 1, 2;

-- Sau khi chạy: Dashboard > Advisors > Security Advisor > "Rerun linter".
-- Còn lại cảnh báo "Postgres version has security patches available":
-- nâng cấp ở Settings > Infrastructure (không làm bằng SQL).
