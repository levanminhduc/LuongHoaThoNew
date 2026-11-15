# Run report — F-013 Hardening DB: RPC, RLS, policy, script admin

Spec: ../features/F-013-db-hardening.md
Mode: auto
Started: 2026-11-15 15:00 Finished: 2026-11-15 17:30
Base: 885200b Dirty at start: .brain/features/F-013-db-hardening.md, .brain/REGISTRY.md (spec/registry của chính F-013)
Result: PASS

## Summary

Hardening DB lớp script (SEC-07/08/09/26/27/28 + lớp DB của SEC-01): migration 38 quét catalog, chỉ cho service_role gọi hàm SECURITY DEFINER, đặt search_path mọi hàm, bật RLS mọi bảng public, xoá policy `USING (true)`/`auth.jwt() IS NULL`, thêm CHECK `chuc_vu <> 'admin'`, tự kiểm và rollback khi sai. Script tạo admin đọc `--username` + env `ADMIN_PASSWORD` (bcrypt 12, không in mật khẩu); xoá seed admin và 2 script tắt RLS; dọn mật khẩu test trong `scripts/` và README. Verify 2 vòng: vòng 1 FAIL 1 blocker (README còn `admin`/`admin123`), vòng 2 PASS. Migration CHƯA chạy trên prod — người dùng chạy theo runbook.

## Steps

| Step   | Title                          | Agent (model)        | Status | Files changed                                                                                                 | Check                                         | Note                                                      |
| ------ | ------------------------------ | -------------------- | ------ | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------- |
| S1     | Script tạo admin + script test | implementer (sonnet) | DONE   | scripts/create-admin-user.js, scripts/test-data-validation-api.js, scripts/test-department-permissions-api.js | CLI exit 1 ×6, rg rỗng, eslint+prettier ✅    | song song S2                                              |
| S2     | Dọn script SQL + README        | implementer (sonnet) | DONE   | scripts/create-tables.sql, README.md, − scripts/quick-fix-rls-disable.sql, − scripts/fix-audit-trail-rls.sql  | rg tham chiếu rỗng, rg seed rỗng, prettier ✅ | song song S1                                              |
| S3     | Migration 38                   | orchestrator (opus)  | DONE   | scripts/supabase-setup/38-security-hardening-functions-rls.sql                                                | đọc lại; chạy DB do người dùng                | Amended: ASSERT → RAISE EXCEPTION                         |
| S_last | Update brain                   | orchestrator (opus)  | DONE   | .brain (REGISTRY, SYSTEM, DECISIONS, KNOWLEDGE, BACKLOG, spec) + docs/audit                                   | —                                             | D-014, D-015; KNOWLEDGE +4; BACKLOG +8, đóng 1; SEC ticks |

## Step log

### Verify R1 fixes — implementer-high + orchestrator — DONE

- README.md (implementer-high): bước tạo admin bằng script mới; viết lại mục RLS Policies; dòng troubleshooting.
- `scripts/verify-role-based-access.sql`, `scripts/fix-test-accounts-with-real-departments.sql` (orchestrator): bỏ literal mật khẩu test.
- Migration 38 (orchestrator): `ON ROUTINE`; owner/prokind ở 0a/0c; 0i view; runbook.
- Sau R2 (NITS N1/N2/N4/N5, orchestrator): README nói đúng "không policy mở"; `create-tables.sql` bổ sung cột `role, is_active, last_login, updated_at` cho `admin_users` (script admin và `lib/auth.ts` cần); comment PHẦN 4; 7a/7b hiện `from_extension`.

### S1 — implementer (sonnet) — DONE

- `create-admin-user.js` viết lại: `--username` + env `ADMIN_PASSWORD`, validate trước khi nạp `.env`/supabase/bcrypt (thiếu giá trị, `admin` không phân biệt hoa thường, mật khẩu < 12 → exit 1), `BCRYPT_ROUNDS = 12`, bỏ nhánh `exec_sql`, chỉ in username + role.
- 2 script test đọc `TEST_ADMIN_USERNAME`/`TEST_ADMIN_PASSWORD`, thiếu → exit 1; bỏ literal mật khẩu.
- Check: 6 lệnh CLI đều exit 1; rg bcrypt-10/exec_sql/log mật khẩu rỗng; rg `admin123` rỗng; eslint + prettier 3 file sạch.

### S2 — implementer (sonnet) — DONE

- `create-tables.sql`: bỏ comment mật khẩu mặc định + INSERT seed admin; thêm `ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;`.
- `git rm` 2 script mở RLS; README trỏ sang 38, bỏ dòng `fix-audit-trail-rls.sql`.
- Check: rg tham chiếu 2 file đã xoá (ngoài docs/plans/.brain) rỗng; rg `INSERT INTO admin_users` rỗng; prettier README sạch.

### S3 — orchestrator (opus) — DONE

- Migration 38 (347 dòng): PHẦN 0 (0a–0h read-only) → BEGIN → bảng tạm `migration_38_exceptions` (rỗng) → PHẦN 1 REVOKE/GRANT hàm DEFINER → PHẦN 2 `ALTER ROUTINE … SET search_path` → PHẦN 3 ENABLE RLS → PHẦN 4 DROP policy true/`auth.jwt() IS NULL` (giữ policy chỉ service_role) → PHẦN 5 CHECK NOT VALID + VALIDATE khi sạch → PHẦN 6 tự kiểm → COMMIT → PHẦN 7 (7a–7e).
- Mọi vòng lặp loại object thuộc extension (`pg_depend.deptype = 'e'`).
- Amended: spec ghi khối `ASSERT`; dùng `IF … RAISE EXCEPTION` vì ASSERT bị bỏ qua khi `plpgsql.check_asserts = off`.

## Verification

| Round | Runner (haiku)                                                                                        | Verifier (opus) | Blockers                                |
| ----- | ----------------------------------------------------------------------------------------------------- | --------------- | --------------------------------------- |
| 1     | 14/14 PASS (CLI exit 1 ×5, rg ×5, eslint, prettier, lint, không đụng app/lib/components)              | FAIL            | 1: README.md:209 còn `admin`/`admin123` |
| 2     | rg mật khẩu/tham chiếu/`auth.jwt() IS NULL` rỗng, prettier ✅, lint ✅, không đụng app/lib/components | PASS            | —                                       |

### Blockers & how they were fixed

- R1-B1 README.md:209 hướng dẫn đăng nhập `admin`/`admin123` → implementer-high: thay bằng `create-admin-user.js --username` + `ADMIN_PASSWORD` (PowerShell + bash); cùng lúc viết lại mục "RLS Policies" (bỏ policy `auth.jwt() IS NULL`) và dòng troubleshooting. Orchestrator dọn thêm literal mật khẩu test còn lại trong `scripts/verify-role-based-access.sql` (cột `suggested_password`) và `scripts/fix-test-accounts-with-real-departments.sql` (NEXT STEPS) để đạt Goal "không còn mật khẩu hardcode trong scripts/".
- NITS R1 đã sửa trong 38 (orchestrator): `ON ROUTINE` cho REVOKE/GRANT; 0a/0c thêm owner (+ prokind); 0i liệt kê view/matview anon đọc được; runbook: sửa `chuc_vu=admin` trước, lỗi owner, chạy lúc vắng (khóa ACCESS EXCLUSIVE).

## Escalations

| Step         | Ladder             | Reason                  |
| ------------ | ------------------ | ----------------------- |
| Verify R1-B1 | → implementer-high | blocker vòng 1 (README) |

## Learned & noticed

- NITS (verifier r2): N1 README "không có policy nào" chưa đúng (đã sửa); N2 `create-tables.sql` thiếu cột admin_users (đã sửa); N3 mật khẩu inline vào bash history (BACKLOG); N4 comment PHẦN 4 (đã sửa); N5 7a/7b báo nhầm object extension (đã sửa); N6 khớp `auth.jwt()` không tiền tố (BACKLOG); N7 report thiếu vòng verify (đã ghi).

- NITS (verifier r1, không sửa): khớp `auth.jwt()isnull` giả định `pg_get_expr` in tiền tố `auth.`; CHECK `chuc_vu <> 'admin'` phân biệt hoa thường (khớp app); ví dụ `ADMIN_PASSWORD='…'` trong usage của create-admin-user.js lưu vào shell history; `--username --x` nhận `--x`; 2 script test còn comment `// Step`, log emoji, in 20 ký tự đầu token.
- NOTICED (verifier r1): migration cũ 12/14/20/21/27 (`USING (true)`) và 15/19 (`auth.jwt() IS NULL`) tạo lại policy mở nếu chạy lại sau 38; `create-tables.sql` định nghĩa `admin_users` thiếu cột role/is*active/last_login/updated_at mà code dùng; placeholder `$2a$10$example_hash_for*…`trong supabase-setup/18, 20 và fix-test-accounts;`app/test-roles/page.tsx` có mật khẩu test (ngoài phạm vi).

- NOTICED (S1): 2 script test còn comment `//` và log emoji ngoài phạm vi; luồng test giả định username `admin` (bị chặn trong `lib/auth.ts`) — phải dùng tài khoản thật qua `TEST_ADMIN_USERNAME`.
- LEARNED (S2): cảnh báo LF→CRLF của git trên README/create-tables.sql là autocrlf bình thường.
- LEARNED (S3): `ASSERT` trong PL/pgSQL im lặng khi `plpgsql.check_asserts = off` — khối tự kiểm migration nên dùng `RAISE EXCEPTION`.

## Retro notes

- R1-B1 (README còn `admin`/`admin123`): spec-quality — S2 chỉ liệt kê 2 dòng README (~1621, ~1629) và lệnh Check rg `admin123` không quét README; AC nói "scripts/ và README.md" nhưng Done when của S2 không khớp AC. Lặp lại L-003 (Done when lệch phạm vi). Ghi cho /retro.
- Runner bỏ sót README trong check `admin123` vì orchestrator viết lệnh chỉ liệt kê 4 file: orchestrator (viết lệnh Verification), không phải lỗi runner.

## Cost check

- Steps by agent: implementer 2 (S1, S2) · implementer-high 1 (R1-B1) · orchestrator 2 (S3, S_last) + sửa R1/R2 nits · runner 1 · verifier 2

## Contract changes

- - `scripts/supabase-setup/38-security-hardening-functions-rls.sql` (chưa chạy prod).
- ~ DB (sau khi chạy 38): EXECUTE hàm SECURITY DEFINER public chỉ service_role; search_path `public, extensions, pg_temp` mọi hàm public; RLS mọi bảng public; xoá policy luôn đúng (trừ chỉ-service_role) và mọi policy `auth.jwt() IS NULL`; + CHECK `employees_chuc_vu_not_admin`.
- ~ `scripts/create-admin-user.js`: CLI `--username` + env `ADMIN_PASSWORD`.
- ~ `scripts/test-data-validation-api.js`, `scripts/test-department-permissions-api.js`: env `TEST_ADMIN_USERNAME`/`TEST_ADMIN_PASSWORD`.
- ~ `scripts/create-tables.sql`: bỏ seed admin, `admin_users` thêm cột role/is_active/last_login/updated_at, bật RLS.
- − `scripts/quick-fix-rls-disable.sql`, `scripts/fix-audit-trail-rls.sql`.
- ~ README.md, `scripts/verify-role-based-access.sql`, `scripts/fix-test-accounts-with-real-departments.sql` (tài liệu/script, không phải contract).

## Brain updates

- REGISTRY F-013 → DONE; SYSTEM (rule DB + admin_users, Last updated); DECISIONS D-014, D-015; KNOWLEDGE +4; BACKLOG +8, đóng mục import `chuc_vu`; spec → DONE; `docs/audit/2026-11-15-security-scan-requirements.md` tick mục làm trong repo, mục cần DB ghi "chờ chạy prod".

## Open items

- Người dùng chạy trên prod theo runbook đầu file 38: backup → PHẦN 0 (0a–0i) lưu `docs/audit/2026-11-15-db-state.md` → xử lý `chuc_vu=admin` (0d) → khối BEGIN..COMMIT lúc vắng → PHẦN 7 → smoke test → Rerun Security Advisor.
- Kiểm tay: JWT Secret Supabase ≠ `JWT_SECRET` (0h); đổi mật khẩu/xoá `superadmin`/`admin` cũ sau khi tạo admin mới bằng script.
- Anon key gọi RPC `import_dual_files_transaction` và GET 4 bảng lõi phải bị chặn.
