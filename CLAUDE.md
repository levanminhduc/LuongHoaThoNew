# CLAUDE.md

Hệ thống quản lý lương nội bộ MAY HÒA THỌ ĐIỆN BÀN: import lương từ Excel, nhân viên tra cứu + ký nhận, quản lý ký duyệt 3 cấp. Next.js 16 App Router (React 19, TS strict) + Supabase PostgreSQL, auth JWT tự viết (không dùng Supabase Auth). Deploy standalone qua Docker/Vercel.

Toàn bộ UI, thông báo lỗi và commit message dùng **tiếng Việt**. Code (tên biến/hàm/file) dùng tiếng Anh.

## Tra cứu codebase

Luôn hỏi `codebase-retrieval` (context-engine MCP) trước khi mở file lẻ. Cần đúng đoạn trong một file cụ thể mà chưa biết dòng → dùng `file-retrieval` MCP rồi Read lại theo line range trước khi sửa.

## Non-negotiables

- **Username `admin` bị chặn cứng** trong `lib/auth.ts` — không tạo/không dùng cho bất kỳ account nào. Admin login qua bảng `admin_users`.
- **Mọi timestamp dùng `getVietnamTimestamp()`** (`lib/utils/vietnam-timezone.ts`), KHÔNG `new Date()`. DB ở UTC; SQL function phải `+ INTERVAL '7 hours'`.
- **KHÔNG viết comment trong code.** Code phải tự kể chuyện: đặt tên rõ, tách hàm nhỏ, đọc BE xong đọc FE hiểu ngay.
- **KHÔNG tạo file `*-enhanced.ts` / `*-v2.tsx`** — sửa thẳng file hiện có. Repo còn 2 file legacy đi ngược quy ước này (`app/admin/dashboard/admin-dashboard-v2.tsx`, `lib/enhanced-import-validation.ts`); chúng là nợ cũ, không phải mẫu để nhân bản.
- **KHÔNG đọc `process.env.JWT_SECRET` trực tiếp** — import `getJwtSecret()` từ `lib/config/jwt.ts`, hoặc `getEnv()` từ `lib/config/env.ts` (zod validate, JWT_SECRET min 32 ký tự).
- **Bcrypt luôn 12 rounds** — dùng `BCRYPT_ROUNDS` từ `lib/constants/security.ts`, không hardcode 10.
- **Mọi input API validate bằng zod schema** trong `lib/validations/` — dùng `parseSchema()` + `createValidationErrorResponse()`, hoặc `parseSchemaOrThrow()`. Không tự viết if-check tay.
- **API route mới dùng `verifyToken()` / `verifyAdminAccess()` / `authorizeRoles()`** từ `lib/auth-middleware.ts` — không copy-paste block verify inline.
- **Client gọi API qua `apiClient` + `ENDPOINTS`** (`lib/api/`), không `fetch()` trần và không hardcode đường dẫn.
- **File code mới < 200 dòng.** Ngưỡng áp cho file bạn tạo hoặc đang sửa; vượt thì tách component/module. Repo hiện chưa đạt: `lib/advanced-excel-parser.ts` 1159 dòng, `components/payroll-import/ImportErrorModal.tsx` 1051, `app/admin/payroll-import-export/page.tsx` 1047, và hàng chục file > 500. Đó là nợ kỹ thuật đã biết — đừng lấy làm mẫu, cũng đừng tự ý refactor khi task không yêu cầu.
- Type-only import: `import type { ... }`.
- Nguyên tắc: YAGNI – KISS – DRY.

## Lệnh (đã verify chạy được 01/08/2026)

```bash
npm run dev                                  # dev server, Turbopack
npm run build                                # PRODUCTION BUILD — dùng webpack, KHÔNG turbopack
npm run format && npm run lint && npm run typecheck   # chạy sau mỗi lần code; hiện tại sạch
npm test                                     # jest — xem pitfall bên dưới, hiện fail 8/22 suite
npm test -- --testPathPattern="use-payroll"  # chạy 1 file
```

CI (`.github/workflows/ci.yml`) chạy: prettier --check → eslint → tsc → jest --coverage → next build → docker build → Trivy scan. Node pin 20, cài bằng `npm ci`.

## Pitfalls (mất thời gian nhất nếu không biết)

**1. Build production PHẢI là webpack.** `package.json` cố tình để `next build --webpack`. Lý do: repo hỗ trợ iOS/Safari 12 cũ qua `browserslist` (`package.json`) + danh sách `transpilePackages` rất dài trong `next.config.mjs`. Turbopack không áp browserslist đó → bundle ES2020+ làm trắng trang trên máy khách hàng.

**2. Thêm dependency mới có thể vỡ iOS cũ.** Package nào ship syntax hiện đại (optional chaining, `??=`, class fields...) phải thêm tên vào `transpilePackages` trong `next.config.mjs`. Sau khi đổi config phải xoá `.next/cache` rồi build lại. Verify bằng cách parse bundle với acorn ở mức ES2019.

**3. Middleware nằm ở `proxy.ts`, KHÔNG phải `middleware.ts`.** Next 16 đã đổi tên; export là `async function proxy(request)`. File này chỉ check _sự tồn tại_ của cookie `auth_token`, chặn dev-only route ở production, xử lý maintenance mode và gắn security headers — **verify JWT xảy ra trong từng API route**, không ở proxy.

**4. `npm test` fail 8/22 suite trên máy local.** Nguyên nhân: node_modules đang được cài bằng **pnpm** (layout `node_modules/.pnpm/rettime@x/node_modules/rettime`) trong khi `transformIgnorePatterns` của `jest.config.js` chỉ khớp layout phẳng của npm → msw/rettime không được transform, ném `SyntaxError: Cannot use import statement outside a module`. Suite thuần logic vẫn xanh (76 test pass). Muốn chạy đủ: cài lại bằng `npm ci` (CI dùng npm và xanh). Repo đang có cả 3 lockfile npm/pnpm/bun — **không tự ý xoá**, hỏi trước.

**5. `van_phong` bypass toàn bộ department filter.** `canAccessDepartment()` trong `lib/auth-middleware.ts` trả `true` cho `admin` và `van_phong`. Đừng giả định `van_phong` bị giới hạn theo `allowed_departments`.

**6. Duplicate key khi import lương chỉ là `(employee_id, salary_month)`** — `payroll_type` KHÔNG tham gia. Import lại cùng cặp đó sẽ UPDATE record cũ theo strategy skip/overwrite/merge.

**7. T13 tự nhận diện từ `salary_month`**, pattern `/^\d{4}-(13|T13)$/i` → `payroll_type = "t13"`. Không có checkbox nào từ frontend; đừng thêm.

**8. Cross-field validation lương có tolerance ±10%** (`lib/payroll-validation.ts`) — cố tình, do làm tròn và công thức tính khác nhau. Đừng siết chặt lại.

**9. Password nhân viên: `last_password_change_at` NULL → verify với `cccd_hash`; ngược lại → `password_hash`.**

**10. `docs/`, `plans/`, `.claude/` và cả `tests/` đều bị gitignore.** Spec/plan/rule viết ra là local-only; test mới viết cũng KHÔNG tự vào git. Một số file đã được `git add -f` từ trước nên vẫn đang được track (6 file `.claude/`, 2 `docs/`, 6 `plans/`, 9 `tests/`) — sửa chúng sẽ hiện trong `git status`, đừng tưởng nhầm là toàn bộ thư mục được track. Cần chia sẻ file mới thì phải `git add -f` có chủ đích.

**11. `next.config.mjs` có `typescript.ignoreBuildErrors`… KHÔNG bật** — build sẽ fail thật khi type sai. Luôn chạy `npm run typecheck` trước khi commit.

## Bản đồ code (chỗ dễ tìm nhầm)

- `lib/api/endpoints.ts` — registry MỌI đường dẫn API. Thêm endpoint là sửa ở đây trước.
- `lib/validations/index.ts` — barrel export toàn bộ zod schema theo domain (common/employee/payroll/bonus/auth/admin-employee).
- `lib/hooks/use-*.ts` — toàn bộ TanStack Query hooks; component không tự viết query.
- `lib/auth-middleware.ts` — RBAC 8 role; `lib/security-middleware.ts` — CSRF + rate limit + security headers.
- `lib/bonus/`, `lib/excel/`, `lib/attendance-parser.ts` — module Thưởng / builder XLSX / chấm công.
- `utils/supabase/server.ts` → `createServiceClient()` chỉ dùng trong API route, không bao giờ client-side.
- `openspec/` — spec + change proposal đang được dùng thật (xem `openspec/changes/archive/` để biết format).
- `scripts/supabase-setup/*.sql` — migration, chạy theo thứ tự số.

## Rules chi tiết

Load tự động theo file đang sửa (`.claude/rules/`, local-only):

- `api-routes.md` — khuôn viết route trong `app/api/**`
- `client-data.md` — TanStack Query / apiClient / zustand ở `lib/hooks`, `lib/api`, `components`, `app/**/*.tsx`
- `excel-import.md` — parser, column mapping, alias, validation lương
- `admin-shell.md` — layout/session/skeleton/điều hướng khu admin ở `app/admin/**`, `components/admin/**`, `components/patterns/**` (⚠️ khu admin KHÔNG dùng `loading.tsx`)

`AGENTS.md` chỉ là con trỏ về file này — đừng sửa nội dung ở hai nơi.
