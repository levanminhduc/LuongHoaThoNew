# Audit Report — LuongHoaThoNew (MAY HÒA THỌ ĐIỆN BÀN)

Ngày: 2026-08-01 | Next.js: 16.2.0 (App Router, React 19) | ORM: không dùng ORM — Supabase JS client (`@supabase/ssr` 0.5.2) | Scope: full (14 tiêu chí)

Quy mô: ~430 file `.ts/.tsx` (app 159, lib 113, components 142) · **78 route handler** / 18.394 dòng · **0 server action** · Auth JWT tự viết.

Công cụ: `codebase-retrieval` (context-engine MCP) + Grep/Glob. Lưu ý: MCP bị kẹt `LOCK` RocksDB ở lần chạy đầu (7 process `context-engine-rs` tranh index), đã kill PID giữ lock rồi chạy lại được.

---

> **Cập nhật 2026-08-01 (nhánh `refactor/backend-architecture`, chưa commit)** — phase 0 của lộ trình (`openspec/changes/refactor-backend-architecture/`) đã làm xong nhóm 1-8:
>
> | Tiêu chí | Trước | Sau | Ghi chú |
> |---|---|---|---|
> | S1 server-only | Fail | **Pass** | 8 file chạm DB/secret đã có rào; build xanh nên hiện không có leak thật |
> | S4 Không leak | Fail | **Pass** | Bỏ `error.stack` khỏi response production; xoá `cccd` khỏi `lookup` **và** `salary-history` (chỗ thứ hai audit bỏ sót). Riêng `select("*")` vẫn còn — thuộc nhóm 14, phase 1 |
> | S3 Validate boundary | Partial | **Pass** cho route mutate | 17 route đã Zod hoá; `parseInt(searchParams` còn 0 dòng trong `app/api/**/route.ts` |
> | Rate limit | 4/78 | 6/78 | Đã phủ hết endpoint công khai; ngưỡng giữ nguyên |
> | User enumeration | Có | **Đã đóng** | `check-password-status` trả response đồng nhất |
> | CSRF | 41/78 | 43/78 | Con số 37 "còn thiếu" của audit gây hiểu nhầm: 34 trong đó là GET-only, thực chất chỉ 3 route mutate thiếu, nay còn `admin/login` (cố ý) |
>
> Phát hiện thêm ngoài audit: chỗ echo credential thứ hai (`salary-history:169`), 3 file nữa verify `jwt` inline, và `errorFromParsedBody` của `apiClient` đọc sai shape lỗi khiến 28 route hiện thông báo `[object Object]`.

> **Cập nhật lần 2 — 2026-08-01, sau nhóm 10-11, 12-13, 14 (phần chứng minh được), 15, 18-21** (task 22.1). Số đo lại tại thời điểm này:
>
> | Tiêu chí | Audit gốc | Nay | Căn cứ đo |
> |---|---|---|---|
> | **A5** Error handling | Partial (2 route dùng) | **Pass** | `toErrorResponse()` phủ **97 chỗ**; script đếm catch-block-còn-tự-dựng-500 trong `app/api` trả **0** |
> | **A6** Schemas/DTO | Partial | **Pass** | `grep 'z\.object(' app/` = **0 hit**; 49/77 route import `@/lib/validations` (audit gốc: 28/78) |
> | **Q2** ESLint boundaries | Fail | **Pass** | `no-restricted-imports` chặn `components/**` + `app/**/*.tsx` import `@/utils/supabase/server` và `*-repository`; 0 vòng import (audit gốc chưa đo được vì thiếu công cụ) |
> | **Q3** Env validate | Partial (lazy) | **Pass** | `instrumentation.ts` — verify thật: `JWT_SECRET` sai → server **chết lúc boot**, không phải lúc gọi API đầu tiên |
> | **Q1** Bounded contexts | Fail | **Partial** | `lib/` đã gom theo domain (`payroll/`, `employee/`, `attendance/`, `bonus/`, `excel/`, `validations/`, `errors/`); vẫn layer-first ở cấp trên, **cố ý** theo D3 |
> | **Q4** Testability | Partial (22 file) | **Partial** | **39 test file / 257 test** (audit gốc 22 file). Logic trong route handler vẫn chưa test được — đúng như audit gốc nói |
> | **A3** Repository | Fail | **Partial** | 3 repository (`employee`, `payroll`, `bonus`); `lib/bonus/` và `lib/employee/` còn **0** chỗ gọi `.from()` ngoài repository. `app/api/admin/payroll*/**` chưa chuyển (task 15.3) |
> | **A2** Controller mỏng | Fail (TB 236 dòng) | **Partial** (TB **230**) | 17.754 dòng / 77 route. `lookup` 487→199, nhưng 10 route vẫn >400 dòng — hầu hết là route export XLSX, thuộc nhóm 16 chưa làm |
> | **A4** ORM singleton | Fail | **Không áp dụng** | Xem task 15.7: chỉ số này đo sai thứ. Theo D2 repository *nhận* `supabase` qua tham số nên route vẫn phải tạo client — 72 file, không giảm và sẽ không giảm. Đóng A4 thật đòi đổi D2 sang singleton, mà D2 đã bác bỏ (supabase-js là HTTP client stateless) |
> | **S1 · S3 · S4** | Fail/Partial | **Pass** | giữ nguyên kết luận lần cập nhật 1 |
>
> Còn **Fail: không còn tiêu chí nào**. Còn **Partial: 4** (A2, A3, Q1, Q4) — cả 4 đều đang bị chặn bởi nhóm 14/16 (bỏ `select("*")` và tách builder XLSX), mà hai nhóm đó cần smoke test luồng export bằng dữ liệu thật mới làm được.

## ⚠️ BLOCKERS

- **S4** — Stack trace của lỗi server bị trả thẳng về client: `ApiErrorHandler.fromError()` nhét `error.stack` vào `details` (`lib/api-error-handler.ts:116`), và `details` nằm trong payload response (`lib/api-error-handler.ts:78-84`); dùng thật tại `app/api/admin/bonus-import/route.ts:281-286`.
- **S4** — Endpoint tra cứu lương trả lại **mật khẩu/CCCD người dùng vừa nhập** dưới dạng plaintext trong JSON: `app/api/employee/lookup/route.ts:401` (`cccd,` trong `baseResponse`), có mặt trong cả type `LookupPayrollResponse` (`:28`).
- **S1** — **Không có `import 'server-only'` ở bất kỳ file nào** trong repo (grep toàn repo = 0 hit); package `server-only` cũng chưa cài (`package.json:24-91`). 5 module chạm DB nằm ngoài `app/api/**` — `lib/auth.ts`, `lib/audit-service.ts`, `lib/cascade-update-employee.ts`, `lib/bonus/bonus-signature-status.ts`, `lib/management-signature-utils.ts` — không có rào chắn build nào ngăn client component import nhầm.

---

## Tổng quan

**Cấu trúc hiện tại:** layer-first (`app/` · `lib/` · `components/` · `utils/`), **không có** `features/`, `repositories/`, `infrastructure/`, `ports/`, `domain/`. Toàn bộ truy cập dữ liệu nằm trực tiếp trong 78 route handler (`createServiceClient()` gọi tại chỗ) cộng 5 module `lib/`. Không có server action nào — kiến trúc thuần route-handler + TanStack Query ở client. `app/**/page.tsx` **không** chạm DB (0 hit `createServiceClient` trong page), nên logic nghiệp vụ tập trung hết ở tầng route handler chứ không rò xuống UI.

**Điểm mạnh (có dẫn chứng):**
- **Zod schema đã có tổ chức theo domain**, không rải rác vô kỷ luật: `lib/validations/{common,employee,payroll,bonus,auth,admin-employee,errors}.ts` + barrel `index.ts`, kèm helper chuẩn `parseSchema` / `parseSchemaOrThrow` / `createValidationErrorResponse` (`lib/validations/errors.ts:39-86`).
- **RBAC tập trung** ở `lib/auth-middleware.ts` (`verifyToken` / `verifyAdminAccess` / `verifyEmployeeManagementAccess`), dùng thật ở 57/78 route — ví dụ lọc theo `allowed_departments` tại `app/api/admin/payroll/[id]/route.ts:64-88`.
- **Env đã validate bằng Zod** với `JWT_SECRET` min 32 ký tự (`lib/config/env.ts:3-11`) và sanitize input PostgREST (`sanitizePostgrestValue`, dùng ở `app/api/admin/payroll/search/route.ts:191`) — không tìm thấy raw SQL nối chuỗi nào.
- **Đã xuất hiện mầm service layer đúng hướng**: `lib/bonus/bonus-signature-service.ts:13-19` và `lib/bonus/bonus-signature-status.ts:94-98` nhận `supabase` qua **tham số** thay vì tự tạo client → đây chính là dependency injection kiểu factory, test được, và là mẫu để nhân rộng cho payroll/employee.

**Scorecard:**

| Nhóm | Tiêu chí | Điểm | Dẫn chứng chính |
|---|---|---|---|
| P0 | S1 server-only | **Fail** | 0 hit toàn repo; `lib/auth.ts`, `lib/audit-service.ts` chạm DB không rào |
| P0 | S2 Re-auth actions | **N/A** | 0 file `"use server"` — xem ghi chú dưới bảng |
| P0 | S3 Validate boundary | **Partial** | 28/78 route import `@/lib/validations`; 17 route `request.json()` không Zod |
| P0 | S4 Không leak | **Fail** | `lib/api-error-handler.ts:116` (stack), `app/api/employee/lookup/route.ts:401` (cccd) |
| P1 | A1 app/ mỏng | **Pass** | 0 `createServiceClient` trong `page.tsx`; không có supabase import ở `components/` |
| P1 | A2 Controller mỏng | **Fail** | 18.394 dòng/78 route (TB 236); `attendance-export/route.ts` 698 dòng |
| P1 | A3 Repository | **Fail** | Không có `repositories/`/`ports/`; ~70 route gọi Supabase trực tiếp |
| P1 | A4 ORM singleton | **Fail** (mức nghiêm trọng thấp) | `utils/supabase/server.ts:34` factory, gọi mới ở mỗi route |
| P1 | A5 Error handling | **Partial** | `ApiErrorHandler` tồn tại nhưng chỉ 2 route dùng; còn lại ad-hoc |
| P1 | A6 Schemas/DTO | **Partial** | `lib/validations/` tổ chức tốt nhưng schema inline ở `update-signature-date/route.ts:9` |
| P2 | Q1 Bounded contexts | **Fail** | Layer-first; không có `features/` |
| P2 | Q2 ESLint boundaries | **Fail** | `eslint.config.mjs:57-69` không có `no-restricted-paths`/`boundaries`/`no-cycle` |
| P2 | Q3 Env validate | **Partial** | `lib/config/env.ts` tốt nhưng lazy + 11 file đọc `process.env` vòng qua nó |
| P2 | Q4 Testability | **Partial** | 22 test file cho logic thuần; logic trong route handler không test được |

**Ghi chú S2:** repo không dùng server action, nên tiêu chí "re-auth trong action" không áp dụng. Rủi ro tương đương được kiểm ở tầng route handler: 57/78 route qua `lib/auth-middleware.ts` hoặc `verifyEmployeeSession`, 2 route công khai có chủ đích (`lookup`, `check-password-status`), 1 route **copy-paste verify inline** thay vì dùng middleware chung (`app/api/employees/update-cccd/route.ts:20` — `jwt.verify(token, getJwtSecret())`), vi phạm chính non-negotiable trong `CLAUDE.md`.

---

## Chi tiết từng gap

### S1. server-only — Fail

- **Hiện trạng:** không file nào có `import 'server-only'`; package chưa cài. 5 module ngoài `app/api/**` truy cập DB bằng service-role key: `lib/auth.ts`, `lib/audit-service.ts`, `lib/cascade-update-employee.ts`, `lib/bonus/bonus-signature-status.ts`, `lib/management-signature-utils.ts`. `utils/supabase/server.ts:36-37` đọc `SUPABASE_SERVICE_ROLE_KEY`.
- **Gap so với chuẩn:** trụ 5 yêu cầu mọi module DAL/service có rào build-time. Hiện chỉ dựa vào tribal knowledge ("`createServiceClient()` chỉ dùng trong API route" — comment `utils/supabase/server.ts:33`); một `import` nhầm từ component sẽ đẩy service-role key vào client bundle mà build **không** báo lỗi.
- **Mức ưu tiên:** P0
- **Hướng refactor:**
  1. `npm i server-only`, thêm `import "server-only";` vào `utils/supabase/server.ts` trước.
  2. Thêm tiếp vào 5 module `lib/` nêu trên + `lib/auth-middleware.ts`, `lib/config/jwt.ts`.
  3. Chạy `npm run build` — build fail ở đâu là đang có leak thật ở đó, sửa từng chỗ.
  - Effort: XS | Risk: thấp (build tự bắt lỗi)

### S3. Validate ở boundary — Partial

- **Hiện trạng:** 28/78 route import `@/lib/validations`. **17 route đọc `request.json()` mà không parse Zod**, gồm cả route mutate dữ liệu: `app/api/admin/departments/route.ts`, `app/api/admin/payroll/[id]/route.ts`, `app/api/employees/update-cccd/route.ts`, `app/api/admin/update-signature-date/route.ts`, `app/api/admin/mapping-configurations/route.ts`, `app/api/admin/column-aliases/[id]/route.ts`, `app/api/payroll/my-department/route.ts`… Kiểu check tay còn phổ biến: `if (!employee_id) return 400` (`app/api/employee/check-password-status/route.ts:13`). Query param cũng parse tay: `parseInt(searchParams.get("page") || "1")` không chặn giá trị âm/NaN (`app/api/payroll/my-data/route.ts:31-32`).
- **Gap so với chuẩn:** trụ 3 yêu cầu 100% boundary nhận user input đi qua schema.
- **Mức ưu tiên:** P0 (route mutate) → P1 (route đọc)
- **Hướng refactor:**
  1. Ưu tiên 6 route mutate trước: `update-cccd`, `update-signature-date`, `payroll/[id]`, `departments`, `column-aliases/[id]`, `mapping-configurations`.
  2. Mỗi route: thêm schema vào file domain tương ứng trong `lib/validations/`, dùng `parseSchema()` + `createValidationErrorResponse()` (đã có sẵn, không viết mới).
  3. Chuẩn hóa query param bằng `z.coerce.number().int().positive()` thay `parseInt`.
  - Effort: M (chia ~4 PR) | Risk: vừa (đổi mã lỗi trả về, cần kiểm hook client tương ứng)

### S4. Không leak secret/raw record — Fail

- **Hiện trạng:** ba lớp rò rỉ khác nhau.
  1. **Stack trace ra client** — `lib/api-error-handler.ts:113-128`:
     ```ts
     const details = error instanceof Error ? error.stack : String(error);
     ```
     `details` được đưa nguyên vào response body (`:78-84`), dùng thật ở `app/api/admin/bonus-import/route.ts:281-286`.
  2. **Echo credential** — `app/api/employee/lookup/route.ts:398-401` trả `cccd` (đúng chuỗi mật khẩu/CCCD người dùng vừa POST) trong `payroll` object.
  3. **Raw record** — 29 route dùng `select("*")`, ví dụ `app/api/payroll/my-data/route.ts:38-51` trả nguyên bảng `payrolls` (45 cột) kèm join `employees`, không map DTO.
- **Gap so với chuẩn:** trụ 4 + mục "server-only & chống leak" (DTO tối thiểu, không leak chi tiết lỗi).
- **Mức ưu tiên:** P0
- **Hướng refactor:**
  1. `fromError()`: chỉ `console.error(err)` phía server, bỏ `details` khỏi response (hoặc chỉ giữ khi `NODE_ENV !== "production"`).
  2. Xóa field `cccd` khỏi `baseResponse` và khỏi type `LookupPayrollResponse`; kiểm `app/employee/lookup/use-employee-lookup.ts` xem client có đang đọc field này không trước khi xóa.
  3. Thay `select("*")` bằng danh sách cột — đã có sẵn `getPayrollSelectSummary()` (`lib/payroll-select.ts`) làm mẫu, mở rộng thành `getPayrollSelectDetail()`.
  - Effort: S (bước 1-2) / M (bước 3) | Risk: thấp / vừa

### A2. Controller mỏng — Fail

- **Hiện trạng:** 18.394 dòng cho 78 route (TB 236 dòng/route). Top: `admin/attendance-export/route.ts` 698, `admin/payroll-export/route.ts` 628, `admin/import-dual-files/route.ts` 548, `admin/employees/[id]/route.ts` 539, `employee/lookup/route.ts` 481. Route `lookup` gộp 5 trách nhiệm trong 1 file: CSRF, parse input, **render HTML server-side** (`:84-182`, gồm cả CSS inline), verify bcrypt (`:327`), query DB (`:306-354`), map response T13/monthly (`:419-465`).
- **Gap so với chuẩn:** controller đúng chuẩn làm 3 việc: validate → gọi use-case → map response.
- **Mức ưu tiên:** P1
- **Hướng refactor:**
  1. Bắt đầu bằng `employee/lookup`: tách khối render HTML (`:65-211`) sang `lib/employee/lookup-html.ts` — thuần hàm, không đụng DB, gần zero risk.
  2. Tách phần verify + query sang `lib/employee/lookup-service.ts` theo đúng mẫu `lib/bonus/bonus-signature-service.ts` (nhận `supabase` qua tham số).
  3. Lặp lại cho `attendance-export` và `payroll-export` — hai file này chủ yếu là logic build XLSX, chuyển vào `lib/excel/` (module đã tồn tại).
  - Effort: L (mỗi route 1 PR) | Risk: vừa — làm sau khi có test smoke cho từng endpoint

### A3. Repository pattern — Fail

- **Hiện trạng:** không có thư mục `repositories/`, `infrastructure/`, `ports/`. `createServiceClient()` được gọi rải rác ở ~70 file route. Cùng một truy vấn lặp lại nhiều nơi: query `employees` theo `employee_id` kèm `cccd_hash/password_hash/last_password_change_at` xuất hiện ít nhất 3 lần (`app/api/employee/lookup/route.ts:306-312`, `app/api/employee/check-password-status/route.ts:23-27`, `app/api/employee/sign-bonus/route.ts:62`).
- **Gap so với chuẩn:** trụ 2 — không gọi client DB ngoài repository.
- **Mức ưu tiên:** P1
- **Hướng refactor:**
  1. Tạo `lib/employee/employee-repository.ts` gom trước **một** query lặp nhiều nhất (lookup credential), signature `(supabase, employeeId) => Promise<EmployeeAuthRecord | null>`. Chưa cần interface.
  2. Chuyển 3 call site trên sang dùng nó.
  3. Lặp cho `payroll` rồi `bonus` (bonus đã đi được nửa đường sẵn).
  4. Chỉ khi 3 repository đã ổn định mới cân nhắc thêm interface + wiring.
  - Effort: M | Risk: thấp (thuần rút hàm, hành vi không đổi)

### A4. Client singleton — Fail (mức nghiêm trọng thấp)

- **Hiện trạng:** `utils/supabase/server.ts:34-45` là factory, mỗi route gọi tạo một instance mới; ~70 call site.
- **Gap so với chuẩn:** chuẩn yêu cầu singleton qua `globalThis`. **Nhưng** `supabase-js` là HTTP client stateless, không giữ connection pool như Prisma → không có nguy cơ cạn connection khi hot-reload. Đây là lệch chuẩn hình thức, không phải bug.
- **Mức ưu tiên:** P2 (hạ từ P1 vì không dùng ORM có pool)
- **Hướng refactor:** khi làm A3, để repository giữ client — số call site tự giảm còn vài chỗ. Không cần PR riêng.
  - Effort: XS (đi kèm A3) | Risk: thấp

### A5. Error handling tập trung — Partial

- **Hiện trạng:** đã có `ApiErrorHandler` với `ErrorCodes` + `getUserFriendlyMessage` (`lib/api-error-handler.ts:133-206`) nhưng **chỉ 2 route dùng** (`admin/bonus-import`, `admin/import-dual-files`). 76 route còn lại tự chế format: `{ error: "Có lỗi xảy ra" }` (`app/api/admin/departments/route.ts:294`), `{ error: auth.error }` (`app/api/admin/upload/route.ts:13`), `{ error: "Lỗi server" }` (`app/api/admin/payroll-preview/route.ts:58`). Không có class `AppError`, không phân biệt domain error với infrastructure error; `parseSchemaOrThrow` ném `new Error(message)` trần (`lib/validations/errors.ts:75`).
- **Gap so với chuẩn:** trụ 4 — một `toErrorResponse()` chung.
- **Mức ưu tiên:** P1
- **Hướng refactor:**
  1. Thêm `lib/errors/app-error.ts`: `AppError` + `ValidationError`/`NotFoundError`/`ForbiddenError`, và `toErrorResponse(err)` map sang `ApiResponse` sẵn có (giữ nguyên `ErrorCodes` để không vỡ client).
  2. Đổi `parseSchemaOrThrow` ném `ValidationError` thay `Error`.
  3. Migrate theo nhóm: `app/api/employee/**` (1 PR) → `app/api/payroll/**` → `app/api/admin/**`.
  - Effort: M | Risk: vừa — response shape đổi, phải sửa kèm hook trong `lib/hooks/`

### A6. Schemas/DTO — Partial

- **Hiện trạng:** tổ chức tốt (`lib/validations/` theo domain, có test riêng `lib/validations/__tests__`), nhưng vẫn còn schema định nghĩa tại chỗ ngoài thư mục đó: `app/api/admin/update-signature-date/route.ts:9` (`UpdateSignatureDateSchema`), `app/admin/department-management/assign-permissions/page.tsx:37` (`AssignPermissionSchema`), `app/admin/login/admin-login-form.tsx:25` (`LoginSchema`). Chưa có lớp DTO tách khỏi DB record (xem S4.3).
- **Mức ưu tiên:** P2
- **Hướng refactor:** di chuyển 3 schema trên vào file domain tương ứng, export type bằng `z.infer` để client/server dùng chung. Effort: XS | Risk: thấp

### Q1. Bounded contexts — Fail

- **Hiện trạng:** tổ chức theo layer. Domain thực tế đã lộ khá rõ trong tên file — payroll, employee, bonus, attendance, signature, import/excel — nhưng nằm phẳng trong `lib/` (`lib/payroll-validation.ts`, `lib/attendance-parser.ts`, `lib/employee-parser.ts`) trừ `lib/bonus/` và `lib/excel/` đã gom thư mục.
- **Mức ưu tiên:** P2
- **Hướng refactor:** không cần dựng `src/features/` ngay. Bước rẻ nhất: gom theo domain trong `lib/` như `lib/bonus/` đã làm — `lib/payroll/`, `lib/employee/`, `lib/attendance/` (dùng `git mv` giữ history, 1 domain = 1 PR). Effort: M | Risk: thấp (chỉ đổi import path, `@/*` alias sẵn có)

### Q2. ESLint boundaries — Fail

- **Hiện trạng:** `eslint.config.mjs` chỉ có `js.recommended` + `tseslint.recommended` + react/next plugin; không `import/no-restricted-paths`, không `boundaries/*`, không `import/no-cycle`, không `dependency-cruiser`. Đáng lưu ý: `@typescript-eslint/no-explicit-any` để `"warn"` (`:59`) nên `any` không chặn được ở CI.
- **Mức ưu tiên:** P2
- **Hướng refactor:** chỉ nên bật **sau** Q1. Bắt đầu bằng đúng 1 rule có giá trị ngay lập tức và không cần cấu trúc mới: cấm `components/**` và `app/**/page.tsx` import `utils/supabase/server` — đó là chốt chặn thứ hai cho S1. Effort: S | Risk: thấp

### Q3. Env validate — Partial

- **Hiện trạng:** `lib/config/env.ts:3-11` schema Zod đúng hướng nhưng validate **lazy** (`:33-41`) nên thiếu env chỉ vỡ lúc runtime, không fail lúc build. 11 file đọc `process.env` vòng qua schema, trong đó có 2 chỗ dùng biến **không nằm trong schema**: `IP_SALT` tại `app/api/auth/forgot-password/route.ts:21` và `app/api/auth/change-password-with-cccd/route.ts:23`.
- **Bug kèm theo (không thuộc rubric, phát hiện khi đọc):**
  ```ts
  .update(ip + process.env.IP_SALT || "default-salt")
  ```
  `+` ưu tiên cao hơn `||`, nên vế trái luôn là chuỗi truthy (`"1.2.3.4undefined"` khi thiếu env) → **fallback `"default-salt"` không bao giờ chạy**, và IP bị hash bằng salt rỗng trên môi trường chưa set `IP_SALT`. Đúng ý phải là `ip + (process.env.IP_SALT || "default-salt")`.
- **Mức ưu tiên:** P1 cho bug precedence, P2 cho phần còn lại
- **Hướng refactor:** thêm `IP_SALT` (`z.string().min(16)`) vào `envSchema`, sửa dấu ngoặc, đổi 2 route sang `getEnv().IP_SALT`. Effort: XS | Risk: thấp

### Q4. Testability — Partial

- **Hiện trạng:** 22 test file, tập trung ở logic thuần (`lib/validations/__tests__`, `lib/utils/__tests__`, `lib/bonus/__tests__`, `lib/hooks/__tests__`) — đây là phần test được vì không dính framework. Logic trong 78 route handler thì không: nó buộc `NextRequest` + `createServiceClient()` gọi trực tiếp trong thân hàm. `lib/bonus/bonus-signature-service.ts:13-19` là ngoại lệ đúng chuẩn (nhận `supabase` qua tham số → mock được). Ghi chú vận hành: `npm test` hiện fail 8/22 suite trên máy local do node_modules cài bằng pnpm, không phải lỗi kiến trúc (CI dùng `npm ci` và xanh).
- **Mức ưu tiên:** P2
- **Hướng refactor:** testability sẽ tự cải thiện theo A3 — mỗi hàm rút ra khỏi route handler theo mẫu `bonus-signature-service` là một hàm test được. Viết test kèm ngay trong PR rút hàm, đừng để thành PR "thêm test" riêng.

---

## Phát hiện ngoài rubric (đáng vá cùng phase 0)

| Vấn đề | Dẫn chứng | Ghi chú |
|---|---|---|
| Rate limit gần như không có | 4/78 route dùng `rateLimit` | `check-password-status` và `lookup` là endpoint công khai nhận `employee_id` + mật khẩu — hiện brute-force không bị chặn ở tầng route |
| User enumeration oracle | `app/api/employee/check-password-status/route.ts:29-34` | Endpoint không auth, trả 404 "Không tìm thấy nhân viên" → dò được mã NV nào tồn tại; lại còn tiết lộ NV đó đã đổi mật khẩu chưa (`:42`) |
| CSRF không phủ hết | 41/78 route gọi `csrfProtection` | Cần rà 37 route còn lại xem có route mutate nào lọt không |
| Verify token copy-paste | `app/api/employees/update-cccd/route.ts:20` | Vi phạm non-negotiable trong `CLAUDE.md`; đổi sang `verifyToken()` là 1 dòng |

---

## Roadmap tổng (thứ tự thực thi)

| # | Phase | Bước | Gap | Effort | Risk |
|---|---|---|---|---|---|
| 1 | 0 | Bỏ `error.stack` khỏi response `fromError()` | S4 | XS | thấp |
| 2 | 0 | Xóa field `cccd` khỏi response `employee/lookup` | S4 | XS | thấp |
| 3 | 0 | Cài `server-only`, thêm vào `utils/supabase/server.ts` + 6 module `lib/` chạm DB | S1 | XS | thấp |
| 4 | 0 | Sửa precedence `IP_SALT`, đưa `IP_SALT` vào `envSchema` | Q3 | XS | thấp |
| 5 | 0 | `update-cccd` dùng `verifyToken()` thay `jwt.verify` inline | S2* | XS | thấp |
| 6 | 0 | Zod hóa 6 route mutate đang thiếu validate | S3 | M | vừa |
| 7 | 0 | Rate limit cho `lookup`, `check-password-status`, `admin/login` | ngoài rubric | S | thấp |
| 8 | 0 | Rà 37 route thiếu `csrfProtection`, bổ sung cho route mutate | ngoài rubric | S | thấp |
| 9 | 1 | `lib/errors/app-error.ts` + `toErrorResponse()`; migrate `app/api/employee/**` | A5 | M | vừa |
| 10 | 1 | `lib/employee/employee-repository.ts`, gom query credential (3 call site) | A3 | S | thấp |
| 11 | 1 | Tách render HTML khỏi `employee/lookup/route.ts` | A2 | S | thấp |
| 12 | 1 | `lib/employee/lookup-service.ts` theo mẫu `bonus-signature-service` + test | A2, Q4 | M | vừa |
| 13 | 1 | Thay `select("*")` bằng cột tường minh (mở rộng `lib/payroll-select.ts`) | S4 | M | vừa |
| 14 | 1 | Repository cho payroll, rồi bonus | A3, A4 | M | thấp |
| 15 | 1 | Tách logic XLSX của `attendance-export` / `payroll-export` vào `lib/excel/` | A2 | L | vừa |
| 16 | 2 | Gom `lib/` theo domain: `lib/payroll/`, `lib/employee/`, `lib/attendance/` | Q1 | M | thấp |
| 17 | 2 | Dời 3 schema inline về `lib/validations/` | A6 | XS | thấp |
| 18 | 2 | ESLint: cấm `components/**` + `page.tsx` import `utils/supabase/server` | Q2, S1 | S | thấp |
| 19 | 2 | `env.ts` validate eager ở `instrumentation.ts` | Q3 | S | thấp |
| 20 | 2 | Bổ sung `import/no-cycle` (warn → error) | Q2 | S | vừa |

Bước 1-5 gộp được thành 1 PR nhỏ (~30 dòng đổi tổng cộng) và nên làm ngay hôm nay.

---

## Không đề xuất (và vì sao)

- **`src/features/` + clean 4 layer đầy đủ (`application/ports/`, `domain/`, `infrastructure/`)** — repo đang là một sản phẩm nội bộ một team, chưa có cross-feature import nào bị phát hiện (grep = 0 hit). Chi phí di chuyển 430 file lớn hơn lợi ích hiện tại. Gom theo domain trong `lib/` (bước 16) đạt 80% giá trị với 20% rủi ro. Xét lại khi: có ≥2 team cùng sửa repo, hoặc khi số route vượt ~120.
- **IoC container (ioctopus/Inversify)** — chưa cần. Truyền `supabase` qua tham số như `bonus-signature-service` đã đủ để test và đủ để đổi implementation. Xét lại khi đã có ≥3 repository có interface và thật sự cần swap implementation lúc runtime.
- **`next-safe-action`** — repo **không dùng server action nào**; cài vào là thêm dependency không có chỗ dùng. Chỉ xét khi quyết định chuyển form admin sang server action.
- **Prisma/Drizzle thay Supabase client** — không có lý do kỹ thuật nào trong phạm vi audit này. Repository layer (bước 10, 14) mới là thứ làm việc đổi ORM khả thi sau này, không phải đổi ORM trước.
- **Tách microservice (phase 4), contract-first OpenAPI** — chưa đủ điều kiện: bounded context chưa ổn định, repository layer chưa có, `swagger-jsdoc` hiện chỉ dùng để sinh docs cho vài route (`app/api/employee/lookup/route.ts:223-271`) chứ không phải contract. Xét lại sau khi phase 1-2 xong.
- **`@t3-oss/env-nextjs`** — `lib/config/env.ts` tự viết đã đủ tốt; chỉ cần đổi từ lazy sang eager (bước 19). Thêm dependency mới còn kéo theo rủi ro `transpilePackages` với browserslist Safari 12 của repo.

---

## Còn nợ — cố ý không làm trong đợt refactor này (task 22.2)

Khác với mục "Không đề xuất" ở trên (những thứ **không nên** làm), đây là những thứ **nên** làm nhưng đã cân nhắc và hoãn, kèm điều kiện mở lại.

### Nợ kỹ thuật giữ nguyên có chủ đích

- **Rate limit lưu in-memory** (`lib/security-middleware.ts`, `rateLimitStore`) — reset mỗi lần deploy, và không chia sẻ giữa các instance. Trên Vercel serverless nghĩa là mỗi cold start là một bộ đếm mới, nên nó chặn được kịch bản dò tự động thô nhưng không chặn được kẻ tấn công kiên nhẫn. Vá thật cần Redis/Upstash — thêm hạ tầng, ngoài phạm vi "chỉ sửa TypeScript". Xét lại khi: có log cho thấy brute-force thật, hoặc khi hệ thống mở ra ngoài mạng nội bộ.
- **Ngưỡng rate limit tính theo IP chung** — nhân viên trong cùng nhà máy đi chung một NAT sẽ chia nhau hạn mức. Đây là lý do ngưỡng đang để rộng. Muốn siết phải khoá theo `employee_id` thay vì IP, mà làm vậy lại mở ra hướng tấn công khoá tài khoản người khác. Cần quyết định nghiệp vụ, không phải quyết định kỹ thuật.
- **3 file legacy > 1000 dòng** — `lib/advanced-excel-parser.ts` (1159), `components/payroll-import/ImportErrorModal.tsx` (1051), `lib/enhanced-import-validation.ts`. `CLAUDE.md` đã ghi rõ đây là nợ cũ và **không phải mẫu để nhân bản**. Không đụng vì chúng nằm giữa luồng import lương — luồng chưa có test tự động nào và chưa được smoke test trong đợt này.
- **`app/admin/dashboard/admin-dashboard-v2.tsx`** — tên file đi ngược quy ước "không tạo `*-v2`". Đổi tên là đụng vào import ở nhiều nơi mà không mang lại giá trị kỹ thuật nào; gộp vào lần nào sửa file đó vì lý do khác.

### Chỉ số đo sai, đã sửa cách hiểu

- **A4 "ORM singleton"** — chuyển từ *Fail* sang **Không áp dụng**. Chi tiết ở task 15.7: `createServiceClient()` được gọi ở 72 file và **sẽ không giảm**, vì theo D2 repository nhận `supabase` qua tham số chứ không tự tạo. Chỉ số đúng để theo dõi là **số chỗ gọi `.from("bảng")` nằm ngoài tầng repository**.
- **Danh sách `select("*")` của nhóm 14** — 41 hit thô, nhưng **15 hit là `.select("*", { count: "exact", head: true })`**, tức query chỉ đếm và không trả dòng nào. Đổi chúng là công cốc và dễ làm hỏng bộ đếm. Số cần xử lý thật là ~20.

### Chặn bởi việc cần dữ liệu thật (không phải bởi kỹ thuật)

- **Nhóm 14 còn 12 mục** — các query mà kết quả đổ thẳng vào response cho UI (payroll detail, payroll export, signature history). Liệt kê cột đòi biết chính xác UI đọc gì; thiếu một cột là lỗi im lặng mà TypeScript lẫn test đều không bắt được.
- **Nhóm 16 (tách builder XLSX) — cả 2 route đều dính cùng một bẫy.** Kế hoạch ban đầu chỉ ghi nhận `attendance-export`; kiểm lại thì `payroll-export` giống hệt: workbook tạo ở dòng 251, worksheet ráp ở dòng 491, nhưng **giữa hai mốc đó có 2 truy vấn DB** (`signature_logs` dòng 289, `management_signatures` dòng 357). Rút builder thành hàm thuần đòi kéo phần fetch ra trước, tức đổi thứ tự truy vấn — không còn là rút hàm cơ học. Cộng thêm: đúng/sai chỉ chứng minh được bằng cách mở file XLSX xuất ra so với bản cũ.
- **Task 15.3** (repository cho `app/api/admin/payroll*/**`) — đụng thẳng vào luồng export chưa được smoke test.
