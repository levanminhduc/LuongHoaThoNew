-- SCRIPT 38: HARDENING DB — HÀM SECURITY DEFINER, search_path, RLS, POLICY, CHỨC VỤ ADMIN
--
-- Bổ sung phần script 36/37 còn sót (SEC-07, SEC-08, SEC-26, SEC-27, SEC-28 và lớp DB của SEC-01).
-- Khác script 36: không dùng danh sách tên cứng mà quét catalog, để không bỏ sót hàm/bảng
-- có trên DB thật nhưng không có trong repo. Object thuộc extension (pg_depend deptype 'e')
-- luôn được bỏ qua.
--
-- Bối cảnh: app chỉ truy cập DB qua createServiceClient() (service_role, bỏ qua RLS).
-- Không có code nào dùng anon key để đọc/ghi bảng, gọi RPC, realtime hay storage.
-- RLS bật mà không có policy = chỉ service_role truy cập được: đó là trạng thái mong muốn.
--
-- Phạm vi:
--   PHẦN 0: kiểm DB thật (read-only) — chạy TRƯỚC, lưu kết quả
--   PHẦN 1: mọi hàm SECURITY DEFINER trong public chỉ cho service_role EXECUTE
--   PHẦN 2: mọi hàm trong public có search_path cố định
--   PHẦN 3: mọi bảng trong public bật RLS
--   PHẦN 4: xóa policy USING/WITH CHECK (true) và policy chứa auth.jwt() IS NULL
--   PHẦN 5: CHECK employees.chuc_vu <> 'admin'
--   PHẦN 6: tự kiểm — sai một điều kiện thì RAISE EXCEPTION, cả transaction rollback
--   PHẦN 7: kiểm tra sau khi chạy
--
-- RUNBOOK (Supabase SQL Editor chỉ hiện kết quả của câu lệnh cuối cùng được chạy):
--   1. Backup DB (Dashboard > Database > Backups, hoặc pg_dump).
--   2. Chạy LẦN LƯỢT từng câu 0a..0i, lưu kết quả vào docs/audit/2026-11-15-db-state.md.
--      DROP POLICY ở PHẦN 4 không hoàn tác được: kết quả 0b là bản backup định nghĩa policy.
--   3. Đọc kết quả PHẦN 0:
--      - 0d có dòng: nhân viên mang chức vụ admin. Nên đổi chức vụ TRƯỚC khi chạy: khi
--        constraint còn NOT VALID, mọi UPDATE vào chính các dòng đó (đổi mật khẩu, khóa) bị chặn.
--      - 0a/0c có owner khác postgres: PHẦN 1-3 sẽ lỗi "must be owner" và rollback toàn bộ.
--      - 0i có view anon/authenticated SELECT được: xử lý riêng.
--      - Có bảng/hàm mà một hệ thống KHÁC đang truy cập bằng anon key: thêm vào
--        migration_38_exceptions ở đầu transaction (mặc định rỗng).
--   4. Chạy toàn bộ khối từ BEGIN tới COMMIT vào lúc vắng người dùng (ALTER TABLE giữ khóa
--      ACCESS EXCLUSIVE tới COMMIT). Có EXCEPTION -> không có gì thay đổi.
--   5. Chạy lần lượt từng câu 7a..7e: tất cả phải rỗng, riêng 7e phải convalidated = true.
--   6. Smoke test app: đăng nhập admin + nhân viên, tra cứu, ký lương, import 2 file,
--      xuất template, xem audit log nhân viên.
--   7. Dashboard > Advisors > Security Advisor > "Rerun linter". Các mục INFO
--      "RLS Enabled No Policy" là trạng thái mong muốn.
--   8. Script chạy lại nhiều lần được (idempotent).
--
-- Nếu sau này CREATE OR REPLACE FUNCTION mà không kèm SET search_path, hàm đó mất
-- search_path cố định: chạy lại PHẦN 2 (hoặc cả script).

-- ===== PHẦN 0: kiểm DB thật (read-only, chạy từng câu, lưu kết quả) =====

-- 0a. Bảng public đang tắt RLS (owner khác postgres sẽ làm PHẦN 3 lỗi "must be owner")
SELECT c.relname, c.relkind, pg_get_userbyid(c.relowner) AS owner
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND NOT c.relrowsecurity
ORDER BY 1;

-- 0b. Toàn bộ policy hiện có (backup trước khi PHẦN 4 xóa)
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY 1, 2;

-- 0c. Hàm trong public: SECURITY DEFINER, search_path, ai được EXECUTE, owner
SELECT p.oid::regprocedure AS fn,
       p.prokind,
       pg_get_userbyid(p.proowner) AS owner,
       p.prosecdef,
       p.proconfig,
       has_function_privilege('anon', p.oid, 'EXECUTE')          AS anon_exec,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec,
       EXISTS (SELECT 1 FROM pg_depend d
               WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e')
         AS from_extension
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
ORDER BY 1;

-- 0d. Nhân viên đang mang chức vụ admin
SELECT employee_id, full_name, is_active
FROM public.employees
WHERE chuc_vu = 'admin';

-- 0e. Tài khoản admin (đối chiếu superadmin / admin; không lấy hash)
SELECT id, username, created_at
FROM public.admin_users
ORDER BY created_at;

-- 0f. Trigger trên employees
SELECT tgname, pg_get_triggerdef(oid)
FROM pg_trigger
WHERE tgrelid = 'public.employees'::regclass AND NOT tgisinternal;

-- 0g. Cột của admin_users
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'admin_users'
ORDER BY ordinal_position;

-- 0h. Kiểm tay: Dashboard > Settings > API > JWT Secret của project PHẢI khác JWT_SECRET
--     của app (biến môi trường trên Vercel). Không chép secret vào file kết quả.

-- 0i. View trong public (view mặc định chạy bằng quyền owner, bỏ qua RLS của bảng gốc).
--     Có dòng nào anon/authenticated SELECT được: xử lý riêng, script này không đụng view.
SELECT c.relname, c.relkind,
       has_table_privilege('anon', c.oid, 'SELECT')          AS anon_select,
       has_table_privilege('authenticated', c.oid, 'SELECT') AS auth_select
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('v', 'm')
ORDER BY 1;

BEGIN;

CREATE TEMP TABLE migration_38_exceptions (
  kind text NOT NULL CHECK (kind IN ('function', 'table')),
  name text NOT NULL
) ON COMMIT DROP;

-- Ngoại lệ (mặc định rỗng). Chỉ thêm khi PHẦN 0 cho thấy hệ thống khác cần anon key, ví dụ:
-- INSERT INTO migration_38_exceptions VALUES ('table', 'ten_bang'), ('function', 'ten_ham');

-- ===== PHẦN 1: hàm SECURITY DEFINER chỉ cho service_role (SEC-07) =====
DO $$
DECLARE
  fn regprocedure;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND NOT EXISTS (SELECT 1 FROM pg_depend d
                      WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e')
      AND p.proname NOT IN (SELECT name FROM migration_38_exceptions WHERE kind = 'function')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON ROUTINE %s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON ROUTINE %s TO service_role', fn);
    RAISE NOTICE 'Chỉ service_role được gọi: %', fn;
  END LOOP;
END $$;

-- ===== PHẦN 2: cố định search_path cho mọi hàm (SEC-26) =====
-- Dùng public (không phải '') vì thân hàm gọi bảng không kèm schema, giống script 36.
DO $$
DECLARE
  fn regprocedure;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind IN ('f', 'p')
      AND NOT EXISTS (SELECT 1 FROM pg_depend d
                      WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e')
      AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig, '{}'::text[])) cfg
                      WHERE cfg LIKE 'search_path=%')
  LOOP
    EXECUTE format('ALTER ROUTINE %s SET search_path = public, extensions, pg_temp', fn);
    RAISE NOTICE 'Đặt search_path: %', fn;
  END LOOP;
END $$;

-- ===== PHẦN 3: bật RLS cho mọi bảng public (SEC-08) =====
DO $$
DECLARE
  tbl record;
BEGIN
  FOR tbl IN
    SELECT n.nspname, c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND NOT c.relrowsecurity
      AND NOT EXISTS (SELECT 1 FROM pg_depend d
                      WHERE d.classid = 'pg_class'::regclass AND d.objid = c.oid AND d.deptype = 'e')
      AND c.relname NOT IN (SELECT name FROM migration_38_exceptions WHERE kind = 'table')
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', tbl.nspname, tbl.relname);
    RAISE NOTICE 'Bật RLS: %', tbl.relname;
  END LOOP;
END $$;

-- ===== PHẦN 4: xóa policy luôn đúng và policy auth.jwt() IS NULL (SEC-27, SEC-28) =====
-- service_role bỏ qua RLS nên không cần policy nào cho nó. Policy luôn đúng chỉ cấp cho service_role
-- được giữ; policy chứa auth.jwt() IS NULL bị xóa với mọi role.
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname, cmd, roles
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename NOT IN (SELECT name FROM migration_38_exceptions WHERE kind = 'table')
      AND (
        (
          (btrim(coalesce(qual, '')) IN ('true', '(true)')
           OR btrim(coalesce(with_check, '')) IN ('true', '(true)'))
          AND NOT (roles = ARRAY['service_role']::name[])
        )
        OR regexp_replace(lower(coalesce(qual, '')), '\s', '', 'g') LIKE '%auth.jwt()isnull%'
        OR regexp_replace(lower(coalesce(with_check, '')), '\s', '', 'g') LIKE '%auth.jwt()isnull%'
      )
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    RAISE NOTICE 'Xóa policy "%" trên % (cmd=%, roles=%)',
      pol.policyname, pol.tablename, pol.cmd, pol.roles;
  END LOOP;
END $$;

-- ===== PHẦN 5: DB chặn nhân viên mang chức vụ admin (SEC-01, lớp DB) =====
-- NOT VALID: chặn ngay mọi INSERT/UPDATE mới, không bắt dữ liệu cũ phải sạch trước.
DO $$
DECLARE
  violating_rows integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'employees_chuc_vu_not_admin'
      AND conrelid = 'public.employees'::regclass
  ) THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT employees_chuc_vu_not_admin CHECK (chuc_vu <> 'admin') NOT VALID;
  END IF;

  SELECT count(*) INTO violating_rows FROM public.employees WHERE chuc_vu = 'admin';

  IF violating_rows = 0 THEN
    ALTER TABLE public.employees VALIDATE CONSTRAINT employees_chuc_vu_not_admin;
  ELSE
    RAISE NOTICE 'Còn % nhân viên chuc_vu = admin (xem 0d). Đổi chức vụ hoặc khóa, rồi chạy: ALTER TABLE public.employees VALIDATE CONSTRAINT employees_chuc_vu_not_admin;',
      violating_rows;
  END IF;
END $$;

-- ===== PHẦN 6: tự kiểm — sai thì RAISE EXCEPTION, rollback toàn bộ =====
DO $$
DECLARE
  exposed_definers integer;
  tables_without_rls integer;
  always_true_policies integer;
  jwt_null_policies integer;
  functions_without_search_path integer;
BEGIN
  SELECT count(*) INTO exposed_definers
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef
    AND NOT EXISTS (SELECT 1 FROM pg_depend d
                    WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e')
    AND p.proname NOT IN (SELECT name FROM migration_38_exceptions WHERE kind = 'function')
    AND (has_function_privilege('anon', p.oid, 'EXECUTE')
         OR has_function_privilege('authenticated', p.oid, 'EXECUTE'));
  IF exposed_definers > 0 THEN
    RAISE EXCEPTION '%', format('%s hàm SECURITY DEFINER vẫn cho anon/authenticated EXECUTE', exposed_definers);
  END IF;

  SELECT count(*) INTO tables_without_rls
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r', 'p')
    AND NOT c.relrowsecurity
    AND NOT EXISTS (SELECT 1 FROM pg_depend d
                    WHERE d.classid = 'pg_class'::regclass AND d.objid = c.oid AND d.deptype = 'e')
    AND c.relname NOT IN (SELECT name FROM migration_38_exceptions WHERE kind = 'table');
  IF tables_without_rls > 0 THEN
    RAISE EXCEPTION '%', format('%s bảng public vẫn tắt RLS', tables_without_rls);
  END IF;

  SELECT count(*) INTO always_true_policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename NOT IN (SELECT name FROM migration_38_exceptions WHERE kind = 'table')
    AND (btrim(coalesce(qual, '')) IN ('true', '(true)')
         OR btrim(coalesce(with_check, '')) IN ('true', '(true)'))
    AND NOT (roles = ARRAY['service_role']::name[]);
  IF always_true_policies > 0 THEN
    RAISE EXCEPTION '%', format('%s policy luôn đúng vẫn còn', always_true_policies);
  END IF;

  SELECT count(*) INTO jwt_null_policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename NOT IN (SELECT name FROM migration_38_exceptions WHERE kind = 'table')
    AND (regexp_replace(lower(coalesce(qual, '')), '\s', '', 'g') LIKE '%auth.jwt()isnull%'
         OR regexp_replace(lower(coalesce(with_check, '')), '\s', '', 'g') LIKE '%auth.jwt()isnull%');
  IF jwt_null_policies > 0 THEN
    RAISE EXCEPTION '%', format('%s policy auth.jwt() IS NULL vẫn còn', jwt_null_policies);
  END IF;

  SELECT count(*) INTO functions_without_search_path
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prokind IN ('f', 'p')
    AND NOT EXISTS (SELECT 1 FROM pg_depend d
                    WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e')
    AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig, '{}'::text[])) cfg
                    WHERE cfg LIKE 'search_path=%');
  IF functions_without_search_path > 0 THEN
    RAISE EXCEPTION '%', format('%s hàm chưa có search_path', functions_without_search_path);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'employees_chuc_vu_not_admin'
      AND conrelid = 'public.employees'::regclass
  ) THEN
    RAISE EXCEPTION 'Thiếu constraint employees_chuc_vu_not_admin';
  END IF;

  RAISE NOTICE 'Script 38: tất cả điều kiện tự kiểm đạt';
END $$;

COMMIT;

-- ===== PHẦN 7: kiểm tra sau khi chạy (chạy từng câu) =====

-- 7a. Hàm SECURITY DEFINER anon/authenticated còn gọi được (phải rỗng, trừ ngoại lệ đã khai
--     và hàm thuộc extension, from_extension = true)
SELECT p.oid::regprocedure AS fn,
       EXISTS (SELECT 1 FROM pg_depend d
               WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e')
         AS from_extension,
       has_function_privilege('anon', p.oid, 'EXECUTE')          AS anon_exec,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef
  AND (has_function_privilege('anon', p.oid, 'EXECUTE')
       OR has_function_privilege('authenticated', p.oid, 'EXECUTE'))
ORDER BY 1;

-- 7b. Bảng public còn tắt RLS (phải rỗng, trừ ngoại lệ đã khai và bảng thuộc extension)
SELECT c.relname,
       EXISTS (SELECT 1 FROM pg_depend d
               WHERE d.classid = 'pg_class'::regclass AND d.objid = c.oid AND d.deptype = 'e')
         AS from_extension
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND NOT c.relrowsecurity
ORDER BY 1;

-- 7c. Policy còn lại trong public (không còn qual/with_check = true hay auth.jwt() IS NULL)
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY 1, 2;

-- 7d. Hàm chưa có search_path (phải rỗng, trừ hàm thuộc extension)
SELECT p.oid::regprocedure AS fn, p.proconfig
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prokind IN ('f', 'p')
  AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig, '{}'::text[])) cfg
                  WHERE cfg LIKE 'search_path=%')
ORDER BY 1;

-- 7e. Constraint chức vụ admin: convalidated = true khi không còn nhân viên chuc_vu = admin
SELECT conname, convalidated,
       (SELECT count(*) FROM public.employees WHERE chuc_vu = 'admin') AS violating_rows
FROM pg_constraint
WHERE conname = 'employees_chuc_vu_not_admin';

-- Sau khi chạy: Dashboard > Advisors > Security Advisor > "Rerun linter".
