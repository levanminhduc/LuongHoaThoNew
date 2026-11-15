# F-013 Hardening DB: RPC, RLS, policy, script admin (SEC-07/08/09/26/27/28)

Status: DONE (2026-11-15)
Related: bổ sung migration 36/37 (commit 3ab9f30) · F-012 (lớp DB cho chặn `chuc_vu = 'admin'`)
Complexity: hard <!-- migration quyền trên DB prod, không có harness test SQL -->
Risk: high <!-- quyền truy cập DB, dữ liệu lương/cá nhân, tài khoản admin -->
Session model: opus <!-- người dùng chọn opus thay fable (2026-11-15) -->

## 1. Problem & goal

Script 36 mới vá một phần Supabase Advisor. Còn sót:

- 3 RPC `SECURITY DEFINER` vẫn `GRANT EXECUTE ... TO authenticated` (`import_dual_files_transaction` ghi thẳng `payrolls`).
- `admin_users` chưa bật RLS. Có script trong repo tắt RLS `employees`/`payrolls`/`signature_logs` mà không bật lại.
- Policy `USING (true)` trên `payroll_audit_logs`. Policy `auth.jwt() IS NULL` trên 4 bảng lõi.
- 7+ hàm thiếu `search_path`.
- Script tạo admin hardcode mật khẩu, bcrypt 10 rounds, in mật khẩu ra màn hình. `create-tables.sql` seed `admin` với hash công khai.

Xong khi:

- Anon/authenticated không gọi được hàm `SECURITY DEFINER` nào và không đọc được bảng `public` nào.
- Advisor hết `rls_disabled_in_public` và `function_search_path_mutable`.
- Repo không còn mật khẩu hardcode trong `scripts/`.
- App vẫn chạy bình thường, vì mọi truy cập DB đi qua service role (đã xác minh: 93 lời gọi `createServiceClient()`, không có code nào dùng anon key cho bảng/RPC/realtime/storage).

## 2. Scope

- In:
  - Migration `38-security-hardening-functions-rls.sql`. Phần 0 của nó là các truy vấn kiểm DB thật của Đợt 0.1.
  - Dọn script SQL (`quick-fix-rls-disable.sql`, `fix-audit-trail-rls.sql`, seed trong `create-tables.sql`).
  - Viết lại `create-admin-user.js`.
  - Bỏ mật khẩu hardcode trong `scripts/test-*.js`.
  - Runbook để người dùng tự chạy trên prod.
- Out (cố ý không làm):
  - Không chạy SQL trên prod. Người dùng tự chạy sau khi backup.
  - Không DROP RPC nào. Không thêm policy mới: RLS bật không policy, service role tự bypass.
  - Không đổi default privileges của schema (Open question 2).
  - CCCD hardcode trong `scripts/create-xn11-to-truong.js` thuộc SEC-14 / Đợt 7.
  - Không sửa code app (`app/`, `lib/`, `components/`).

## 3. Acceptance criteria

- Là quản trị hệ thống, tôi muốn anon/authenticated key không đụng được dữ liệu, để lộ anon key (vốn công khai trong bundle) không lộ lương.
  - Given migration 38 đã chạy When gọi `POST /rest/v1/rpc/import_dual_files_transaction` bằng anon key Then bị từ chối (401/403/404).
  - Given migration 38 đã chạy When `GET /rest/v1/employees` (và `payrolls`, `signature_logs`, `admin_users`) bằng anon key Then trả mảng rỗng hoặc bị từ chối.
  - Given migration 38 đã chạy Then khối ASSERT trong migration xác nhận:
    - anon và authenticated không EXECUTE được hàm `SECURITY DEFINER` nào trong `public` (trừ hàm thuộc extension);
    - không còn bảng `public` tắt RLS, ngoài danh sách ngoại lệ;
    - không còn policy có `qual`/`with_check` = `true` cấp cho role khác `service_role`;
    - không còn policy chứa `auth.jwt() IS NULL`;
    - mọi hàm không thuộc extension trong `public` đã có `search_path`.
  - Given migration 38 chạy lần thứ hai Then không lỗi (idempotent).
- Là quản trị, tôi muốn DB tự chặn `chuc_vu = 'admin'` ở bảng `employees`, để import/script nào cũng không tạo được nhân viên mang quyền admin.
  - Given migration 38 đã chạy When INSERT/UPDATE `employees` với `chuc_vu = 'admin'` Then bị lỗi constraint.
  - Given DB đang có dòng `chuc_vu = 'admin'` When chạy migration Then migration vẫn chạy hết, constraint ở trạng thái `NOT VALID` và có NOTICE liệt kê số dòng cần xử lý.
- Là người vận hành, tôi muốn tạo admin bằng script an toàn.
  - Given chạy `node scripts/create-admin-user.js` thiếu `--username` hoặc thiếu biến `ADMIN_PASSWORD` Then thoát mã ≠ 0 kèm hướng dẫn, chưa đọc `.env`, chưa kết nối DB.
  - Given `--username admin` (không phân biệt hoa thường) hoặc mật khẩu < 12 ký tự Then thoát mã ≠ 0.
  - Given tham số hợp lệ Then hash bằng 12 rounds, không in mật khẩu, không gọi RPC `exec_sql`.
- Là người bảo trì repo: `rg` không tìm thấy mật khẩu hardcode, seed `admin`, `quick-fix-rls-disable.sql` hay `fix-audit-trail-rls.sql` trong `scripts/` và `README.md`.

## 4. Contracts

- Data:
  - `+ scripts/supabase-setup/38-security-hardening-functions-rls.sql`.
  - `~` quyền EXECUTE của mọi hàm `SECURITY DEFINER` trong `public`: chỉ còn `service_role`. Owner 36 / F-003 import, F-007 ký.
  - `~` RLS bật cho mọi bảng `public`, kể cả `admin_users` (owner F-001), `employees` (F-002), `payrolls` (F-003), `signature_logs` (F-005).
  - `~` DROP policy `USING/WITH CHECK (true)` và policy `auth.jwt() IS NULL`.
  - `~` `search_path = public, extensions, pg_temp` cho mọi hàm không thuộc extension trong `public`.
  - `+ employees_chuc_vu_not_admin CHECK (chuc_vu <> 'admin')`.
- Scripts:
  - `~ scripts/create-admin-user.js`: CLI `--username <u>`, mật khẩu qua env `ADMIN_PASSWORD`.
  - `~ scripts/create-tables.sql`: bỏ seed admin, bật RLS `admin_users`.
  - `~ scripts/test-data-validation-api.js`, `scripts/test-department-permissions-api.js`: đọc env `TEST_ADMIN_USERNAME`, `TEST_ADMIN_PASSWORD`.
  - `- scripts/quick-fix-rls-disable.sql`, `- scripts/fix-audit-trail-rls.sql`.
  - `~ README.md`: bảng troubleshooting và Debug Scripts (dòng ~1621, ~1629).
- API / Events / FE: `=` không đổi. RPC vẫn được gọi qua `createServiceClient()` (D-002).

## 5. Overlap check

| Việc liên quan                                                                          | Chồng ở đâu                                                               | Quyết định                                                                                                                |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Migration 36 (commit 3ab9f30)                                                           | REVOKE 5 hàm, RLS 8 bảng, drop policy `true` 8 bảng, `search_path` 18 hàm | extend: 38 bổ sung phần còn sót, không sửa file 36. Dùng 36 làm khuôn (pre-check → BEGIN → phần sửa → COMMIT → kiểm sau). |
| Migration 37                                                                            | RLS 12 bảng kho (app khác?)                                               | reuse: vòng lặp bật RLS không đổi gì với bảng đã bật. Không thêm policy.                                                  |
| KNOWLEDGE: RPC `import_dual_files_transaction`, `analyze_payroll_columns` đang được gọi | `import-dual-files/route.ts:231`, `payroll-export-template/route.ts:189`  | Chỉ REVOKE anon/authenticated, GRANT `service_role`, không DROP.                                                          |
| KNOWLEDGE: `admin_users` chỉ có trong `create-tables.sql`                               | bảng không có migration riêng                                             | 38 bật RLS bằng vòng lặp động. `create-tables.sql` thêm `ENABLE RLS`.                                                     |
| D-002 JWT tự viết, service role                                                         | app không dùng Supabase Auth / role `authenticated`                       | reuse: RLS không policy an toàn cho app (đã xác minh bằng Explore).                                                       |
| F-012 / D-011 chặn `chuc_vu: admin` ở zod + login                                       | lớp app                                                                   | extend: thêm CHECK ở lớp DB. Đóng mục BACKLOG "import nhân viên không kiểm `chuc_vu`".                                    |
| BACKLOG `bulk_signature_history` không có migration                                     | RPC `bulk_sign_salaries`                                                  | Không đụng: không phải `SECURITY DEFINER` trong repo. Phần 0 sẽ cho thấy trạng thái thật.                                 |

## 6. Decisions

- Chọn: vòng lặp động trên catalog (mọi hàm `prosecdef`, mọi bảng `public`, mọi hàm thiếu `search_path`), loại hàm/bảng thuộc extension qua `pg_depend.deptype = 'e'`. Kèm danh sách ngoại lệ khai báo đầu file, mặc định rỗng, điền từ kết quả Phần 0.
  - Bác bỏ: danh sách tên cứng như 36 (đã bỏ sót 3 hàm; DB thật có thể có hàm/bảng không nằm trong repo).
  - (durable)
- Chọn: RLS bật không policy cho bảng lõi; truy cập chỉ qua service role.
  - Bác bỏ: viết policy theo claim JWT (app không gửi JWT cho Supabase; policy cũ theo claim là code chết).
  - (durable)
- Chọn: CHECK `chuc_vu <> 'admin'` luôn thêm dạng `NOT VALID`; chỉ `VALIDATE CONSTRAINT` khi không còn dòng vi phạm, nếu còn thì `RAISE NOTICE` số dòng.
  - Bác bỏ: `RAISE EXCEPTION` làm hỏng cả migration (một vấn đề dữ liệu chặn toàn bộ hardening); bỏ qua constraint (mất chặn cho dòng mới).
- Chọn: mật khẩu admin lấy từ biến môi trường `ADMIN_PASSWORD`, username qua `--username`; validate trước khi đọc `.env`.
  - Bác bỏ: `--password` trên dòng lệnh (lưu vào shell history).
- Chọn: Phần 0 của migration 38 chính là truy vấn kiểm DB Đợt 0.1. Người dùng chạy riêng Phần 0 trước, lưu kết quả vào `docs/audit/2026-11-15-db-state.md`, điền ngoại lệ, rồi mới chạy transaction.
  - Bác bỏ: file kiểm tra riêng (thêm một file phải giữ đồng bộ).
- Chọn: làm trên nhánh hiện tại `security/supabase-advisor-fixes`, không mở `security/fix-2-db-hardening` như plan, vì tên nhánh đúng phạm vi.

## 7. Plan

Không có harness test SQL (không pgTAP/supabase CLI, CI không chạy SQL) nên không có bước `(test)` cho migration. Hành vi của migration được kiểm bằng khối ASSERT trong chính file và kiểm tay trên DB (mục 8). Phần script JS kiểm bằng lệnh CLI trong Check.

### S1 [sonnet] Viết lại script tạo admin và script test

Files: `scripts/create-admin-user.js`, `scripts/test-data-validation-api.js`, `scripts/test-department-permissions-api.js`.
Do:

- `create-admin-user.js`:
  - Parse `--username <u>` từ `process.argv`, mật khẩu từ `process.env.ADMIN_PASSWORD`.
  - Validate trước mọi thao tác đọc `.env` hay tạo client: thiếu username/mật khẩu, username `admin` (không phân biệt hoa thường), mật khẩu < 12 ký tự → in hướng dẫn tiếng Việt ra stderr, `process.exit(1)`.
  - `const BCRYPT_ROUNDS = 12` (theo `scripts/create-xn11-to-truong.js:12`). Bỏ nhánh `exec_sql`: thiếu bảng thì báo lỗi và thoát.
  - Không in mật khẩu: chỉ in username và role.
  - Giữ cách đọc `.env` hiện có.
- Hai script test: đọc `TEST_ADMIN_USERNAME`/`TEST_ADMIN_PASSWORD` từ env, thiếu thì báo và thoát 1. Xoá literal mật khẩu.
- Không comment trong code. Thông báo tiếng Việt.

Done when:

- `node scripts/create-admin-user.js` → exit 1.
- `ADMIN_PASSWORD=short123 node scripts/create-admin-user.js --username abc` → exit 1.
- `ADMIN_PASSWORD=aaaaaaaaaaaaaa node scripts/create-admin-user.js --username ADMIN` → exit 1.
- `node scripts/test-data-validation-api.js` không có env → exit 1.
- `rg -n "bcrypt\.hash\([^)]*10\)|exec_sql|console\.log\([^)]*password" scripts/create-admin-user.js` → rỗng.
- `npx eslint` 3 file sạch; `npx prettier --check` 3 file sạch.

### S2 [sonnet] Dọn script SQL và README

Files: `scripts/create-tables.sql`, `scripts/quick-fix-rls-disable.sql` (xoá), `scripts/fix-audit-trail-rls.sql` (xoá), `README.md`.
Do:

- `create-tables.sql`: xoá comment chứa mật khẩu mặc định và khối `INSERT INTO admin_users` seed `admin` (dòng ~29-32). Thêm `ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;` sau DDL `admin_users`.
- `git rm` 2 file SQL.
- README: dòng troubleshooting "RLS policy block" trỏ sang `scripts/supabase-setup/38-security-hardening-functions-rls.sql`; bỏ dòng `fix-audit-trail-rls.sql` trong Debug Scripts.

Done when: `rg -n "quick-fix-rls-disable|fix-audit-trail-rls" --glob '!docs/**' --glob '!plans/**' --glob '!.brain/**'` rỗng; `rg -n "INSERT INTO admin_users" scripts/create-tables.sql` rỗng.

### S3 [opus] Migration 38

Files: `scripts/supabase-setup/38-security-hardening-functions-rls.sql`.
Do: theo khuôn `36-security-advisor-hardening.sql` (header/runbook → Phần 0 → BEGIN → Phần 1-5 → ASSERT → COMMIT → Phần kiểm sau).

- Header: runbook tiếng Việt.
  1. Backup.
  2. Chạy riêng Phần 0, lưu kết quả vào `docs/audit/2026-11-15-db-state.md`.
  3. Điền mảng ngoại lệ nếu cần.
  4. Chạy từ BEGIN tới COMMIT.
  5. Chạy Phần kiểm sau.
  6. Smoke test app.
  7. Rerun Supabase Advisor.
- Phần 0 (read-only, ngoài transaction): toàn bộ truy vấn Đợt 0.1:
  - bảng tắt RLS, `pg_policies`, hàm `SECURITY DEFINER` + quyền anon/authenticated;
  - `employees` có `chuc_vu = 'admin'`, `admin_users` (id, username, created_at; không lấy hash), trigger trên `employees`, cột `admin_users`;
  - nhắc so JWT secret Supabase ≠ `JWT_SECRET` app.
- Phần 1 (SEC-07): vòng lặp mọi hàm `prosecdef` trong `public`, không thuộc extension, không trong ngoại lệ → `REVOKE EXECUTE ... FROM PUBLIC, anon, authenticated` + `GRANT EXECUTE ... TO service_role`.
- Phần 2 (SEC-26): vòng lặp mọi hàm trong `public`, không thuộc extension, `proconfig` chưa có `search_path=` → `ALTER FUNCTION %s SET search_path = public, extensions, pg_temp`. Dùng `oid::regprocedure` như 36.
- Phần 3 (SEC-08): vòng lặp mọi bảng thường/partitioned trong `public` (`relkind IN ('r','p')`), không thuộc extension, không trong ngoại lệ, `relrowsecurity = false` → `ENABLE ROW LEVEL SECURITY`.
- Phần 4 (SEC-27/28): DROP mọi policy trong `public` mà `qual`/`with_check` là `true`/`(true)` và `roles <> '{service_role}'`, cùng mọi policy có `qual`/`with_check` chứa `auth.jwt() IS NULL` (so khớp không phân biệt khoảng trắng/hoa thường).
- Phần 5: `ADD CONSTRAINT employees_chuc_vu_not_admin CHECK (chuc_vu <> 'admin') NOT VALID` nếu chưa có. Đếm dòng vi phạm: 0 → `VALIDATE CONSTRAINT`; > 0 → `RAISE NOTICE` kèm số dòng và hướng dẫn.
- Khối `DO $$ ... ASSERT ... $$` cho 5 điều kiện ở mục 3. Lỗi → transaction rollback.
  - Amended (S3): dùng `IF … THEN RAISE EXCEPTION` thay `ASSERT`, vì `ASSERT` bị bỏ qua khi `plpgsql.check_asserts = off`.
- Phần kiểm sau: SELECT lại các điều kiện; trạng thái `convalidated` của constraint.
- Idempotent: `IF NOT EXISTS` / kiểm catalog trước mỗi thay đổi.

Vì sao opus: SQL quyền trên prod, vòng lặp catalog động, không có test tự động.

Done when: file đủ các phần trên. Verifier đọc đối chiếu từng tiêu chí mục 3. Không còn tên hàm/bảng cứng ngoài danh sách ngoại lệ và lời gọi kiểm tra.

### S_last [opus] Update brain

Orchestrator cập nhật REGISTRY, SYSTEM (bảng DB: RLS/quyền), DECISIONS, KNOWLEDGE (bẫy `CREATE OR REPLACE FUNCTION` xoá `search_path`), BACKLOG (đóng mục import `chuc_vu`, thêm `migrate:bulk-signature` trỏ file không tồn tại, default privileges). Tick SEC-07/08/09/26/27/28 ở mục làm được trong repo; mục cần DB thật để ghi "chờ chạy prod".

## 8. Verification

- Commands:
  - Các lệnh CLI và `rg` trong Done when của S1, S2.
  - `npx eslint scripts/create-admin-user.js scripts/test-data-validation-api.js scripts/test-department-permissions-api.js`.
  - `npx prettier --check` các file JS đã sửa.
  - `npm run lint`.
- Không chạy `npm run build`, `typecheck`, jest: không đụng code app. Verifier xác nhận diff không chạm `app/`, `lib/`, `components/`.
- Kiểm tay (người dùng, trên Supabase sau backup), UNTESTABLE tự động:
  1. Phần 0 → `docs/audit/2026-11-15-db-state.md`.
  2. Transaction chạy qua ASSERT; chạy lần 2 không lỗi.
  3. Anon key gọi RPC `import_dual_files_transaction` và GET 4 bảng lõi bị chặn.
  4. Smoke: đăng nhập admin + nhân viên, tra cứu, ký lương, import 2 file, xuất template, audit log nhân viên.
  5. Advisor hết `rls_disabled_in_public`, `function_search_path_mutable`.
  6. Nếu có `superadmin`/`admin` cũ: tạo admin mới bằng script mới, đăng nhập thử, rồi mới đổi mật khẩu/xoá tài khoản cũ.
- Rủi ro verifier phải soi riêng:
  - Vòng lặp REVOKE không đụng hàm extension và không REVOKE khỏi `service_role`.
  - Không DROP policy cấp riêng cho `service_role`.
  - Đặt `search_path` cho hàm trigger không làm hỏng tham chiếu (mọi object nằm trong `public`/`extensions`).
  - ASSERT thật sự rollback khi sai.
  - Không lộ hash/mật khẩu trong Phần 0.
  - Hai file SQL bị xoá không còn được tham chiếu.

## Open questions

1. Session model → **đã chốt: opus**.
2. `ALTER DEFAULT PRIVILEGES` → **đã chốt: không làm** (ghi BACKLOG).
