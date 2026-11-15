# Thiết kế khắc phục bảo mật toàn diện — 89 phát hiện từ vbsec scan 2026-10-08

Nguồn: `vbsec-reports/scan-2026-10-08-092725.md` (verdict FAIL: 4 CRITICAL, 20 HIGH, 31 MEDIUM, 34 LOW, 11 NOT_MAPPED).

## 1. Mục tiêu và ràng buộc

**Mục tiêu:** sửa triệt để toàn bộ 89 phát hiện theo 3 pha, mỗi pha một PR, re-scan sau mỗi pha. Pha 1 xong → không còn CRITICAL/HIGH. Pha 3 xong → PASS.

**Quyết định đã chốt với người dùng:**

- Chỉ `admin` (sống trong `admin_users`) được gán role quản lý; không ai sửa role chính mình hoặc người có role cao hơn.
- Luồng employee bỏ hẳn fallback `employee_id + cccd`, chỉ nhận session token từ lookup.
- Rate-limit và lockout lưu trong Postgres (Supabase), không in-memory.
- API admin xác thực qua cookie `auth_token` httpOnly; bỏ token trong localStorage và `client-crypto`.
- Revocation rẻ qua claim `pv` (password_version), không dùng bảng session.
- Người dùng tự chạy SQL trên Supabase prod, **bắt buộc backup trước**.

**Ràng buộc repo (CLAUDE.md):** không comment trong code; file length cap (route 100, hook/zod/util 200, component 300, hard 500); `getVietnamTimestamp()`; `BCRYPT_ROUNDS`; zod cho mọi input; `apiClient` + `ENDPOINTS`; build webpack + verify bundle ES2019 cho iOS cũ; không xoá lockfile; tiếng Việt cho UI/lỗi/commit.

## 2. Kernel auth

### 2.1 Token admin

- Ký: `jwt.sign(payload, secret, { algorithm: "HS256", audience: "admin", expiresIn: "24h" })`.
- Payload thêm `pv: number` — `employees.password_version` với tài khoản nhân viên; `admin_users.token_version` (cột mới) với admin.
- `readAuthContext(request)` trong `lib/auth-middleware.ts`:
  1. Lấy token từ cookie `auth_token`. Chỉ khi `!isProduction()` mới chấp nhận header `Authorization: Bearer` (phục vụ swagger, test).
  2. `jwt.verify(token, secret, { algorithms: ["HS256"], audience: "admin" })`.
  3. Validate payload bằng `JWTPayloadSchema` (zod, `lib/validations/auth.ts`): `role` ∈ `ROLES`, `permissions: string[]`, `employee_id`, `username`, `pv: number`. Sai → `null`.
- Sáu helper hiện có (`verifyToken`, `verifyAdminToken`, `verifyAdminAccess`, `verifyAuditLogsAccess`, `verifyEmployeeManagementAccess`, `authorizeRoles`) giữ nguyên chữ ký, gọi kernel. 60 route không đổi.
- `verifyAuditLogsAccess` đổi kiểu trả về thành `JWTPayload | null` để lỗi `if (!admin)` ở `audit-logs/route.ts` không tái diễn. Xoá `audit-logs/route.txt`.
- `app/api/api-docs/openapi/route.ts` bỏ `jwt.verify` inline, dùng `authorizeRoles`.

### 2.2 Token employee session (`lib/employee-session.ts`)

- Ký với `audience: "employee_session"`, verify với `algorithms: ["HS256"], audience: "employee_session"`.
- Vẫn truyền qua `Authorization: Bearer`, giữ trong React state. Admin token không dùng được ở route employee và ngược lại.
- Helper chung `lib/auth/require-employee-session.ts`: `requireEmployeeSession(request) → { employee_id } | NextResponse 401`. Năm route employee dùng chung.

### 2.3 Revocation

- `assertTokenFresh(user)` so `pv` trong token với DB (`employees.password_version` hoặc `admin_users.token_version`). Lệch → 401 `AUTH_EXPIRED`.
- Gọi trong các helper phục vụ ghi: `verifyAdminAccess`, `verifyEmployeeManagementAccess`, và trong `authorizeRoles` khi `request.method !== "GET"`. GET không tốn query.
- Mọi thao tác đổi mật khẩu, admin reset mật khẩu, khoá tài khoản → tăng version. Logout xoá cookie.

### 2.4 CSRF

- `csrfProtection()` giữ kiểm tra Origin/Referer; ở production bỏ `http://${host}` khỏi allow-list.
- Wrapper `withCsrf(handler)` trong `lib/security-middleware.ts`; mọi route non-GET dưới `app/api/**` dùng wrapper. Audit bằng grep trong plan.

### 2.5 Test

`lib/__tests__/auth-kernel.test.ts`: token thiếu `aud` bị từ chối; employee token ở route admin bị từ chối; `alg: none` bị từ chối; payload thiếu `role` bị từ chối; `pv` lệch → 401 ở helper ghi, pass ở GET; production bỏ qua Bearer.

## 3. Client session

- `lib/api/client.ts`: bỏ import `secure-session` và header Authorization; mọi request `credentials: "same-origin"`. 401 `AUTH_EXPIRED` → `onAuthExpired` + xoá key localStorage còn sót (`admin_token`, `auth_token`, `user_info`, `admin_user`, `employee_user`).
- Login response không trả `token`, chỉ `user`.
- `lib/auth/secure-session.ts` còn lưu duy nhất `user_info` (JSON plaintext: username, role, department, allowed_departments, permissions). Xoá `TOKEN_KEY`, `LEGACY_TOKEN_FALLBACK_KEYS`, `lib/utils/client-crypto.ts`, `lib/auth/jwt-expiry.ts` và test tương ứng.
- Endpoint mới `GET /api/admin/me` (`ENDPOINTS.auth.me`): `verifyToken` → trả `user`. `AdminSessionProvider`, `RoleBasedRouter`, `use-logout` dùng `me` làm nguồn sự thật; 401 → xoá `user_info`, redirect `/admin/login?redirect=`. Bỏ default role `"admin"` khi thiếu.
- "Nhớ mật khẩu" xoá ở `admin-login-form.tsx` và `use-employee-lookup.ts`; khi mount xoá key `admin_saved_credentials`, `salary_saved_credentials` (và tên legacy). Chỉ nhớ username/mã NV plaintext. Bỏ auto-submit.
- `utils/departmentCache.ts` xoá; dữ liệu payroll chỉ nằm trong TanStack Query; logout gọi `queryClient.clear()`.
- `use-employee-lookup.ts`: 9 `fetch()` trần → `apiClient` + `ENDPOINTS.employee.*`; session Bearer qua `opts.headers`. Bỏ gửi `employee_id/cccd` cho sign-salary, sign-bonus, salary-history. File hiện > 800 dòng: tách `employee-lookup-api.ts` (gọi API) khỏi reducer/hook để tiến về ngưỡng.
- Open redirect: `resolveRedirectPath(raw)` trong `lib/api/auth-redirect.ts` chỉ chấp nhận `/^\/(?![\/\\])/`, mặc định `/admin/dashboard`.
- `app/api-docs/page.tsx`: bỏ đọc cookie bằng JS và `requestInterceptor`; swagger gửi cookie tự động.
- Test: `client.test.ts` đổi assertion (không Authorization, có credentials); `auth-redirect.test.ts` chặn `//evil.com`, `/\evil.com`, `https://x`.

## 4. Chính sách gán role — `lib/auth/role-policy.ts`

Module thuần, không I/O:

```
ROLE_RANK = { admin: 7, giam_doc: 6, ke_toan: 5, nguoi_lap_bieu: 4,
              van_phong: 3, truong_phong: 2, to_truong: 1, nhan_vien: 0 }
ASSIGNABLE_BY = {
  admin:          mọi role trừ "admin",
  van_phong:      ["truong_phong", "to_truong", "nhan_vien"],
  nguoi_lap_bieu: ["to_truong", "nhan_vien"],
  còn lại:        []
}
CAN_CREATE = ["admin", "van_phong"]
```

`canAssignRole(actor, target)` với `target = { employee_id, currentRole, newRole }`:

1. `actor.employee_id !== target.employee_id`.
2. `ROLE_RANK[target.currentRole] < ROLE_RANK[actor.role]`.
3. `target.newRole ∈ ASSIGNABLE_BY[actor.role]`.

Khi PUT không đổi role vẫn phải qua bước 1–2 (không sửa thông tin người ngang/cao hơn).

**Áp dụng:**

- `app/api/admin/employees/route.ts` POST: `canCreateEmployee(actor)` + `canAssignRole`. `[id]/route.ts` PUT: `canAssignRole` trước mọi update. Xoá `ROLES_NGUOI_LAP_BIEU_CANNOT_ASSIGN`.
- Zod `lib/validations/admin-employee.ts`: `chuc_vu` dùng `EmployeeRoleSchema = z.enum(EMPLOYEE_ROLES)` với `EMPLOYEE_ROLES = ROLES` trừ `"admin"` (định nghĩa trong `lib/validations/common.ts`).
- `lib/auth.ts authenticateUser`: nếu `employee.chuc_vu === "admin"` → từ chối (phòng data cũ).
- `components/EmployeeManagementModal.tsx` import `ASSIGNABLE_BY`, `CAN_CREATE` để render dropdown và ẩn nút tạo.
- Migration: `ALTER TABLE employees ADD CONSTRAINT employees_chuc_vu_not_admin CHECK (chuc_vu <> 'admin')` sau pre-check `SELECT count(*) ... WHERE chuc_vu = 'admin'` = 0.

Test `role-policy.test.ts`: ma trận actor × currentRole × newRole; route test: van_phong gán admin → 403, nguoi_lap_bieu gán van_phong → 403, sửa chính mình → 403, nguoi_lap_bieu POST → 403.

## 5. Brute-force: lockout và rate-limit trong Postgres

### 5.1 Migration `scripts/supabase-setup/30-auth-lockout-and-rate-limit.sql`

- `admin_users` thêm `failed_login_attempts INT NOT NULL DEFAULT 0`, `locked_until TIMESTAMPTZ`, `token_version INT NOT NULL DEFAULT 0`.
- `record_login_failure(p_table TEXT, p_id TEXT) RETURNS JSONB`: `CASE p_table WHEN 'employees' ... WHEN 'admin_users' ... ELSE RAISE`; một `UPDATE ... SET failed_login_attempts = failed_login_attempts + 1, locked_until = CASE WHEN failed_login_attempts + 1 >= 5 THEN NOW() + INTERVAL '15 minutes' END RETURNING ...`. Trả `{locked, attempts_remaining}`. Hằng số trong hàm, không nhận từ caller.
- `record_login_success(p_table TEXT, p_id TEXT)`: reset đếm và `locked_until`.
- `handle_password_reset_failure(p_employee_id)`: bỏ `p_max_attempts`, `p_lock_duration`; hằng 5 lần / 30 phút.
- `rate_limit_buckets(key TEXT PRIMARY KEY, count INT NOT NULL, reset_at TIMESTAMPTZ NOT NULL)`.
- `consume_rate_limit(p_key TEXT, p_limit INT, p_window INTERVAL) RETURNS JSONB`: `INSERT ... ON CONFLICT (key) DO UPDATE SET count = CASE WHEN buckets.reset_at < NOW() THEN 1 ELSE buckets.count + 1 END, reset_at = CASE WHEN buckets.reset_at < NOW() THEN NOW() + p_window ELSE buckets.reset_at END RETURNING count, reset_at`; trả `{allowed, retry_after_seconds}`. Trong hàm: `IF random() < 0.01 THEN DELETE FROM rate_limit_buckets WHERE reset_at < NOW() - INTERVAL '1 hour'`.
- Tất cả: `SECURITY INVOKER`, `REVOKE EXECUTE ... FROM PUBLIC, anon, authenticated; GRANT EXECUTE ... TO service_role`.

### 5.2 App

- `lib/security-middleware.ts`: `rateLimit(type)` trả `async (request, accountKey?) => NextResponse | null`; gọi `consume_rate_limit` với key `${type}:ip:${ip}` và nếu có `accountKey` thêm `${type}:acct:${accountKey}`. Ngưỡng:

  | type | IP | account |
  |---|---|---|
  | login | 20 / 15 phút | 10 / 15 phút |
  | payroll (lookup) | 30 / phút | 10 / 5 phút |
  | passwordReset | 5 / 15 phút | 3 / 15 phút |
  | passwordChange | 3 / phút | — |
  | api / admin | 100 / phút, 200 / phút | — |

- `getClientIP()` duy nhất, export từ `lib/security-middleware.ts`: `x-real-ip` → phần tử cuối của `x-forwarded-for` → `"unknown"`. Xoá `cf-connecting-ip`. Xoá 3 bản sao ở `payroll/[id]/route.ts`, `audit-service.ts`, `auth-middleware.ts:179`; `bonus-signature-status.ts` cắt về 45 ký tự.
- `lib/auth.ts authenticateUser` và `lib/employee/lookup-service.ts`: đọc `locked_until` → nếu đang khoá: log, trả lỗi chung; sai → `record_login_failure`; đúng → `record_login_success`. Lỗi duy nhất cho mọi nhánh: `"Thông tin đăng nhập không đúng"`.
- Ba route đổi mật khẩu bỏ tăng đếm thủ công, dùng RPC; `forgot-password` không trả thời điểm đổi mật khẩu trước xác thực.
- `findEmployeeAuthRecord` thêm `.eq("is_active", true)`; cập nhật fixture parity test.

Test: `getClientIP` ưu tiên header; `lookup-service.test.ts` mock RPC → khoá sau 5 lần, thông báo đồng nhất; `rateLimit` mock RPC trả 429 có `Retry-After`.

## 6. IDOR, phạm vi phòng ban, luồng employee, mass-assignment

- `lib/auth/department-scope.ts`: `assertDepartmentAccess(auth, department)` ném `AppError` 403; `applyDepartmentScope(query, auth)` thêm `.in("department", allowed)` trừ admin/van_phong.
- `admin/payroll/[id]` GET+PUT: lấy `department` từ record → assert. PUT đổi bất kỳ cột tiền lương của record `is_signed = true` → reset `is_signed=false, signed_at=null, signed_by_name=null` + audit log lý do `"Sửa sau khi ký"`.
- `admin/departments` GET: `include_stats` chỉ cho role ≠ `nhan_vien`/`to_truong`, lọc theo scope.
- `admin/unsigned-employees-export`: assert `department` param.
- `employees/all-employees` GET: `applyDepartmentScope`; cột lương chỉ cho `giam_doc`, `ke_toan`.
- `admin/import-dual-files`: `authorizeRoles(["admin","nguoi_lap_bieu"])`, giới hạn 10 MB, kiểm tra extension `.xlsx/.xls` + magic bytes, `rateLimit("admin")`. `admin/upload`, `payroll-import` cùng giới hạn.
- `payroll-import`, `bonus-import` overwrite record đã ký → reset `is_signed` như trên.
- Employee: `sign-salary`, `sign-bonus`, `salary-history` bỏ nhánh `employee_id + cccd`; zod bỏ hai field; dùng `requireEmployeeSession`. `employee/change-password` set `last_password_change_at = getVietnamTimestamp()`, `password_version + 1`. Xoá GET không auth ở `change-password-with-cccd` và `employee/change-password`.
- Mass-assignment: `PAYROLL_COLUMNS` export từ `lib/payroll/payroll-select.ts`; `database_field` trong `lib/validations/payroll.ts` (alias, mapping-config) dùng `z.enum(PAYROLL_COLUMNS)`; `advanced-upload` thay `z.record` spread bằng schema `.pick` whitelist. `use-mapping-config.ts` dùng cùng danh sách cho dropdown.
- `cascade-update-employee.ts`: RPC `rename_employee_id(p_old TEXT, p_new TEXT)` plpgsql một transaction (payrolls, signature_logs, bonus tables, audit); app chỉ gọi RPC.

Test: truong_phong PUT payroll phòng khác → 403; sign-salary không Bearer → 401; `database_field` lạ → 400; sửa record đã ký → `is_signed=false`.

## 7. DB hardening

### 7.1 Quy trình bắt buộc cho mỗi migration prod

1. Supabase Dashboard → Database → Backups → tạo backup thủ công (hoặc `pg_dump` qua connection string pooler). Ghi tên/thời điểm backup vào mô tả PR.
2. Chạy script trong `BEGIN; ... COMMIT;`. Mỗi script kết thúc bằng khối `DO $$ ... ASSERT ... $$` kiểm tra kết quả; fail → transaction tự rollback.
3. Smoke test: login admin, lookup employee, ký 1 record thử trên tài khoản test. Chỉ sau đó deploy code phụ thuộc.
4. Thứ tự: migration chạy **trước** deploy code của pha (code mới cần cột/RPC mới; code cũ không bị ảnh hưởng bởi cột thêm).

### 7.2 Migration `31-harden-functions-and-rls.sql`

- `REVOKE EXECUTE` từ `PUBLIC, anon, authenticated` và `GRANT TO service_role` cho: `update_employee_password`, `handle_password_reset_failure`, `import_dual_files_transaction`, các hàm `log_employee_audit*`, `rename_employee_id`, các RPC ở §5.
- Chuyển các hàm trên sang `SECURITY INVOKER`. Hàm nào buộc DEFINER thì `SET search_path = public, pg_temp`.
- `ENABLE ROW LEVEL SECURITY` cho `admin_users`, `import_configurations`, `column_aliases`, `admin_bulk_signature_logs`, không tạo policy.
- `DROP POLICY` các policy `USING (true)` ở `employee_security_events`, `security_logs`, `payroll_audit_logs`, bảng attendance.
- `DELETE FROM admin_users WHERE username IN ('admin','superadmin') AND password_hash = '<hash seed admin123>'` — chỉ sau khi người dùng xác nhận không còn dùng.
- Khối verify cuối: số hàm `prosecdef = true` trong `public` ngoài danh sách cho phép = 0; bảng `public` chưa RLS = 0; policy có `qual = 'true'` = 0.

### 7.3 Script trong repo

- Xoá `scripts/quick-fix-rls-disable.sql`, `scripts/create-xn11-to-truong.js`, `scripts/test-department-permissions-api.js`, `app/test-roles/`.
- `scripts/create-admin-user.js`: bắt buộc arg `--username --password` (≥ 12 ký tự), chặn `admin`, `BCRYPT_ROUNDS`, không in password.
- `scripts/create-tables.sql`: bỏ seed admin; thêm `ENABLE ROW LEVEL SECURITY` cho `admin_users`.
- **Người dùng rotate thủ công**: CCCD/mật khẩu nhân viên DB00694; mật khẩu mọi tài khoản `admin_users` hiện có; `JWT_SECRET` (sau khi deploy Pha 1, vì token cũ không có `aud` sẽ vô hiệu dù sao).

Timestamp trong SQL dùng `NOW()` UTC chỉ để so sánh khoá/đếm, không hiển thị → không cộng 7h.

## 8. Dependencies, headers, infra, hygiene

### 8.1 Dependencies (Pha 1)

- `next` → `^16.3.8`.
- `xlsx` → `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` (API tương thích, 8 sink không đổi). Nếu acorn ES2019 báo lỗi → thêm `xlsx` vào `transpilePackages`.
- Sau nâng: xoá `.next/cache`, `npm run build` (webpack), parse bundle bằng acorn ES2019.
- `swagger-ui-react` (dompurify/lodash): `npm audit fix` trước; còn lỗi → `app/api-docs` chỉ render khi `!isProduction()` qua `next/dynamic`. Quyết định khi chạy audit lại trong plan.

### 8.2 Headers (Pha 2)

- `proxy.ts applySecurityHeadersTo`: thêm `Strict-Transport-Security: max-age=31536000; includeSubDomains` (production), CSP `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`.
- Xoá `securityHeaders()` chết trong `security-middleware.ts`; xoá `validateRequestOrigin` trong `management-signature-auth.ts`.
- `next.config.mjs`: `poweredByHeader: false`. `proxy.ts` matcher không loại trừ `/api/**` theo đuôi ảnh.

### 8.3 Thông báo lỗi (Pha 3)

- `lib/errors/app-error.ts toErrorResponse`: production không trả `details` và `error.message` của Supabase; log server-side.
- ~15 route đang trả `error.message`/`details` chuyển sang `toErrorResponse`. `sign-salary`, `sign-bonus` lỗi RPC → thông báo cố định.
- `health/route.ts` chỉ trả `{ ok: true }`.

### 8.4 Infra/CI (Pha 2)

- `ci.yml`: `permissions: { contents: read }`, `trivy-action@<sha>`; `deploy.yml` pin SHA; `Dockerfile` pin digest; `docker-compose.prod.yml` bỏ `ports: 3000` (chỉ Traefik network); `.npmrc` bỏ `frozen-lockfile=false`; `.mcp.json` pin `shadcn@<version>`.

### 8.5 Repo hygiene (Pha 3)

- `git rm -r --cached .codex-review/runs`; xoá `.cursor.rar`.
- `26-FIX-README.md`, `README.md`, `public/sample-data/README.md`: bỏ project ref và `admin/admin123`.
- `export-import-errors`: escape cell bắt đầu bằng `= + - @` bằng `'`.
- `lib/validations/admin-employee.ts`: password min 8, không trùng `employee_id`.
- `employee-update-service.ts resolveIsActive()`: thiếu field → giữ giá trị cũ.
- `signing-date-generator.ts` dùng `getVietnamTimestamp()`; bỏ mock success ở `management-signature`, `signature-history`.
- `.gitignore` thêm `vbsec-reports/`.

## 9. Phân pha và kiểm chứng

| Pha | Nội dung | Mục tiêu re-scan |
|---|---|---|
| 1 | §2–§7 (CRITICAL + HIGH) + §8.1 | 0 CRITICAL, 0 HIGH |
| 2 | MEDIUM: §8.2, §8.4, phần MEDIUM còn lại trong §6 (cascade RPC, RLS policy) | 0 MEDIUM |
| 3 | LOW + NOT_MAPPED: §8.3, §8.5 | PASS |

Mỗi PR: `npm run format && npm run lint && npm run typecheck`; `npm test` (suite thuần logic xanh; 8 suite msw fail do pnpm layout là nợ đã biết); `npm run build` webpack + acorn ES2019; `/vbs-scan-security` đạt mục tiêu pha. Migration prod chạy trước deploy theo §7.1.

**Rủi ro và cách giảm:**

- Đổi cookie-auth làm mọi phiên admin hiện tại hết hạn → thông báo nội bộ trước khi deploy Pha 1.
- Rate-limit theo account có thể khoá nhầm nhân viên gõ sai → 10 lần/5 phút đủ rộng; admin có nút reset qua `record_login_success`.
- SheetJS 0.20.3 qua URL tgz: lockfile ghi URL; `npm ci` trên CI tải từ cdn.sheetjs.com. Nếu CI không ra ngoài được → vendor tgz vào `vendor/`.
