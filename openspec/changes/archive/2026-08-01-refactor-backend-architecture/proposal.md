## Why

Audit kiến trúc backend ngày 2026-08-01 (`docs/audit/nextjs-backend-audit.md`) chấm 14 tiêu chí trên 78 route handler / 18.394 dòng và tìm ra **3 BLOCKER P0**:

1. `ApiErrorHandler.fromError()` nhét `error.stack` vào body response trả về client (`lib/api-error-handler.ts:116` → `:78-84`).
2. `app/api/employee/lookup/route.ts:401` trả lại **đúng chuỗi mật khẩu/CCCD người dùng vừa POST** trong JSON.
3. Không có `import "server-only"` ở bất kỳ file nào; 5 module `lib/` dùng service-role key nằm ngoài `app/api/**` mà không có rào build-time.

Kèm theo là 4 phát hiện ngoài rubric cùng mức rủi ro: chỉ 4/78 route có rate limit trong khi `employee/lookup` và `employee/check-password-status` là endpoint công khai nhận mật khẩu; `check-password-status` là user-enumeration oracle; 17 route đọc `request.json()` không qua Zod; và một bug precedence khiến `IP_SALT` fallback không bao giờ chạy.

Phần còn lại là nợ kiến trúc: không có repository layer (~70 route gọi `createServiceClient()` tại chỗ), controller trung bình 236 dòng, `ApiErrorHandler` tồn tại nhưng chỉ 2/78 route dùng. Nợ này không gây sự cố ngay nhưng làm mọi thay đổi sau tốn gấp đôi và khiến logic nghiệp vụ không test được.

Làm ngay vì nhóm P0 chạm dữ liệu cá nhân (CCCD, lương) của toàn bộ nhân viên, và vì chi phí vá 3 BLOCKER chỉ khoảng 30 dòng.

## What Changes

Chia làm 3 phase, mỗi phase nhiều PR nhỏ, **không big-bang**. Phase sau chỉ bắt đầu khi phase trước đã merge và xanh CI.

**Phase 0 — Vá bảo mật (P0, ~7 PR)**

- `ApiErrorHandler.fromError()` **không còn** đưa `error.stack` vào response; stack chỉ `console.error` phía server, `details` chỉ giữ ở `NODE_ENV !== "production"`.
- Xóa field `cccd` khỏi response `employee/lookup` và khỏi type `LookupPayrollResponse`.
- Cài `server-only`, gắn vào `utils/supabase/server.ts` + 6 module `lib/` chạm DB/secret.
- `IP_SALT` vào `envSchema`, sửa lỗi precedence `ip + process.env.IP_SALT || "default-salt"` ở 2 route auth.
- `app/api/employees/update-cccd/route.ts` bỏ `jwt.verify` inline, dùng `verifyAdminAccess()`.
- 17 route đang đọc `request.json()` không validate → Zod schema trong `lib/validations/`, ưu tiên 11 route mutate trước.
- Rate limit cho 3 endpoint công khai; `check-password-status` trả response đồng nhất để không lộ mã NV nào tồn tại.
- Rà 37 route thiếu `csrfProtection`, bổ sung cho mọi route mutate.

**Phase 1 — Tách layer (P1, ~6 PR)**

- Thêm `lib/errors/app-error.ts`: `AppError` + `ValidationError`/`NotFoundError`/`ForbiddenError` + `toErrorResponse()` map sang `ApiResponse` sẵn có; migrate theo nhóm route.
- Thêm repository đầu tiên `lib/employee/employee-repository.ts` (gom query credential lặp ở 3 nơi), sau đó payroll và bonus. Repository nhận `supabase` qua **tham số**, theo đúng mẫu `lib/bonus/bonus-signature-service.ts:13-19`.
- Tách `app/api/employee/lookup/route.ts` (481 dòng) thành `lookup-html.ts` + `lookup-service.ts` + route mỏng; viết test cho service.
- Thay 21 chỗ `select("*")` bằng danh sách cột tường minh, mở rộng `lib/payroll-select.ts`.
- Chuyển logic build XLSX của `attendance-export` (698 dòng) và `payroll-export` (628 dòng) vào `lib/excel/`.

**Phase 2 — Ranh giới (P2, ~5 PR)**

- Gom `lib/` theo domain: `lib/payroll/`, `lib/employee/`, `lib/attendance/` (`git mv` giữ history).
- Dời 3 schema Zod inline về `lib/validations/`.
- ESLint: cấm `components/**` và `app/**/page.tsx` import `@/utils/supabase/server`; thêm `import/no-cycle` (warn → error).
- `env.ts` validate eager qua `instrumentation.ts`.

**Không làm** (đã ghi lý do trong audit): `src/features/`, IoC container, `next-safe-action`, đổi ORM, tách microservice, `@t3-oss/env-nextjs`.

## Capabilities

### New Capabilities

- `secure-api-response`: response của API không mang stack trace, credential người dùng, hay raw DB record; mọi lỗi đi qua một mapper chung.
- `api-input-validation`: mọi route handler nhận user input (body và query param) đều parse qua Zod schema trong `lib/validations/`.
- `public-endpoint-hardening`: endpoint công khai (không cần JWT) có rate limit và không tiết lộ sự tồn tại của nhân viên.

### Modified Capabilities

<!-- Không có capability nào trong openspec/specs/ đổi requirement. Phần tách layer (repository, thin controller, gom lib/ theo domain, ESLint boundaries) là refactor thuần: hành vi API không đổi, nên không sinh spec delta. -->

## Impact

- **Dependencies**: thêm `server-only` (dependency của Next.js, không ship code runtime — không ảnh hưởng `transpilePackages` / browserslist Safari 12).
- **API contract**: 3 thay đổi client nhìn thấy — bỏ `cccd` khỏi response lookup (đã verify không client nào đọc), bỏ `details` khỏi error response ở production, `check-password-status` đổi mã lỗi. Phần còn lại giữ nguyên shape.
- **Files phase 0**: `lib/api-error-handler.ts`, `app/api/employee/lookup/route.ts`, `utils/supabase/server.ts`, 6 module `lib/`, `lib/config/env.ts`, 2 route `app/api/auth/**`, 17 route thiếu validate, `lib/validations/**`, ~37 route bổ sung CSRF.
- **Files phase 1-2**: thêm `lib/errors/`, `lib/employee/`, `lib/payroll/`, `lib/attendance/`; sửa `eslint.config.mjs`, `instrumentation.ts`.
- **Database**: **KHÔNG đụng tới database** — ràng buộc cứng của change này. Không migration, không sửa `scripts/supabase-setup/*.sql`, không thêm/xoá/đổi bảng · cột · index · RLS policy · SQL function, không script sửa dữ liệu, không backfill. Toàn bộ thay đổi nằm ở tầng code TypeScript. Phần chạm DB duy nhất là **cách truy vấn** (`select("*")` → danh sách cột, gom query vào repository) — đọc cùng dữ liệu, không đổi cấu trúc lẫn nội dung.
- **Test**: mỗi hàm rút ra khỏi route handler có test kèm trong cùng PR (không tách PR "thêm test" riêng).
