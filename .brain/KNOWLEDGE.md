# Knowledge — bẫy và mẹo của repo này

<!-- Thứ KHÔNG hiển nhiên từ code mà người hay agent mới sẽ vấp: cách chạy local, test hay chập chờn, thứ tự bắt buộc, phụ thuộc ngầm, lệnh hay dùng.
     Mỗi mục 1–2 dòng: - [module] điều cần biết — bằng chứng (path hoặc lệnh) · nguồn · ngày
     Tối đa khoảng 80 mục. /sync gộp mục trùng và đánh dấu ?stale khi bằng chứng không còn.
     Quy ước code thuộc về CLAUDE.md. Bản đồ thuộc về SYSTEM.md. Lý do thuộc về DECISIONS.md.
     Ví dụ:
     - [test] `pnpm test` cần Redis chạy sẵn ở cổng 6379, thiếu thì treo 30 giây rồi fail khó hiểu — docker-compose.dev.yml · B-003 · 2026-11-14
-->

Pitfall chính (webpack build, transpilePackages, proxy.ts, pnpm làm jest fail, van_phong bypass, T13, ±10%...) đã nằm trong CLAUDE.md mục "Pitfalls" — không chép lại ở đây.

## Chạy và môi trường

- [deploy] Prod = Vercel tự deploy khi push `main` (2 project). Workflow GitHub "Deploy SSH" luôn fail vì thiếu secret — không phải dấu hiệu chưa deploy — `.github/workflows/deploy.yml` · memory · 2026-11-15
- [db] Migration SQL do người dùng tự chạy trên Supabase SQL Editor; số cuối hiện là 37 (`37-enable-rls-inventory-tables.sql`), có nhiều số bị trùng (10, 12, 13…) → migration mới bắt đầu từ 38 — `scripts/supabase-setup/` · 2026-11-15

## Test và build

- [test] Test mới đặt trong `lib/**/__tests__/` vì `tests/` bị gitignore (test ở đó không vào git) — `.gitignore` · 2026-11-15
- [test] `jest.setup.js` đặt `JWT_SECRET = "test-jwt-secret"` (15 ký tự, dưới mức 32 mà `getEnv()` yêu cầu) → test nào đi qua zod env sẽ lỗi — `jest.setup.js:140` · 2026-11-15
- [build] Script kiểm bundle ES2019 (Safari 12) CHƯA tồn tại trong repo; CLAUDE.md nhắc acorn nhưng phải tự chạy — `scripts/verify-es2019.mjs` vắng mặt · 2026-11-15

- [test] `npm test -- --testPathPattern` lỗi trên jest hiện tại; dùng `npx jest --testPathPatterns="a|b"` (số nhiều) — F-012 · 2026-11-15
- [test] Đổi câu query trong repository `lib/<domain>` thì chạy cả suite `parity` — test parity so từng câu select với bản legacy, khác biệt cố ý phải pin bằng assertion — `lib/employee/__tests__/employee-admin-repository-parity.test.ts` · F-012 · 2026-11-15
- [brain] `npm run format` chạy prettier cả `.brain/*.md`, biến `__tests__` ngoài backtick thành `**tests**` → luôn ghi đường dẫn trong backtick · F-012 · 2026-11-15

## Bẫy trong code

- [auth] `verifyToken()` nhận cả token `employee_session` (không có `role`) → mọi kiểm quyền dạng chặn một role đều lách được; phải allow-list bằng `authorizeRoles()` (D-013) — `lib/auth-middleware.ts:23`, `lib/employee/lookup-service.ts:188` · F-012 · 2026-11-15
- [ui-admin] `useAdminSession()` trả `role` mặc định `"admin"` khi session thiếu role; `user.employee_id` optional — chỉ dùng để ẩn/hiện UI, backend vẫn phải kiểm — `components/admin/admin-session-provider.tsx` · F-012 · 2026-11-15

- [auth] `verifyToken()` chỉ đọc header `Authorization: Bearer`, không đọc cookie; `proxy.ts` chỉ kiểm cookie `auth_token` có tồn tại. Client gắn Bearer từ localStorage (mã hoá khoá tĩnh) — `lib/auth-middleware.ts`, `lib/api/client.ts`, `lib/auth/secure-session.ts` · 2026-11-15
- [security] `rateLimit()` lưu Map trong bộ nhớ từng instance, chỉ 5 route gọi (admin/login, employee/change-password, auth/forgot-password, employee/lookup, auth/change-password-with-cccd) → không có tác dụng thật trên Vercel serverless — `lib/security-middleware.ts` · 2026-11-15
- [db] RPC `import_dual_files_transaction` và `analyze_payroll_columns` vẫn đang được gọi (`app/api/admin/import-dual-files/route.ts:231`, `payroll-export-template/route.ts:189`) — chỉ REVOKE quyền anon, đừng DROP · 2026-11-15
- [auth] Employee session JWT (30 phút, `type: "employee_session"`) ký cùng `JWT_SECRET` với token admin và không pin `aud` → hai loại token chưa tách bạch — `lib/employee-session.ts` · 2026-11-15

- [db] `admin_users` chỉ được tạo trong `scripts/create-tables.sql`, không có trong `scripts/supabase-setup/`; RPC `bulk_sign_salaries` ghi vào `bulk_signature_history` nhưng không migration nào tạo bảng đó — `26-fix-bulk-sign-salaries-function.sql:98` · brain-init · 2026-11-15
- [api] `lib/api/endpoints.ts` còn 4 đường dẫn không có route: `/api/payroll/payslip/[payrollId]`, `/api/admin/mapping-configurations/[id]`, `/api/debug/departments`, `/api/debug/count-departments`; 15 route thật chưa có trong ENDPOINTS (login, lookup, health, employee/detail…) · brain-init · 2026-11-15
- [payroll] `lib/feature-flags.ts:1` đặt `T13_ENABLED = false` trong khi CLAUDE.md mô tả T13 tự nhận diện — cần xác nhận cờ này chặn ở đâu trước khi đụng T13 · brain-init · 2026-11-15
- [ui] `RoleBasedRouter` không có nhánh `van_phong` và trỏ tới vài trang không tồn tại (`/director/reports`, `/accountant/payroll`…) — `components/RoleBasedRouter.tsx:77-116` · brain-init · 2026-11-15

## Khác

- [docs] Kế hoạch khắc phục bảo mật hiện hành: `docs/superpowers/plans/2026-11-15-security-remediation-plan.md` (thay plan 2026-10-08), yêu cầu ở `docs/audit/2026-11-15-security-scan-requirements.md` — cả hai local-only (docs/ bị gitignore) · 2026-11-15
