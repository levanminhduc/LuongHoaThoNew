> **RÀNG BUỘC CỨNG — KHÔNG ĐỤNG DATABASE.** Không migration, không sửa `scripts/supabase-setup/*.sql`, không đổi bảng · cột · index · RLS · SQL function, không script sửa/backfill dữ liệu. Chỉ sửa code TypeScript. Bước nào hoá ra bắt buộc phải đổi DB mới làm được thì **dừng và hỏi**, không tự làm. Xem `design.md` mục D0.

Quy ước: mỗi nhóm = **1 PR**. Trước khi mở PR chạy `npm run format && npm run lint && npm run typecheck`; trước khi merge chạy `npm run build` (webpack, không turbopack). Test local fail 8/22 suite là do pnpm layout — lấy CI làm chuẩn. Nhánh nền: `refactor/backend-architecture`.

---

# PHASE 0 — Vá bảo mật (P0)

## 1. Chặn leak stack trace và credential (BLOCKER, gộp 1 PR ~30 dòng)

- [x] 1.0 Tạo `lib/config/runtime.ts` với `isProduction()` — **phát sinh khi làm**: SWC (next/jest) inline `process.env.NODE_ENV` lúc transform nên check trực tiếp trong `api-error-handler.ts` không test được. Hàm này nhóm 10 (`toErrorResponse`) cũng sẽ dùng lại
- [x] 1.1 `lib/api-error-handler.ts:113-128` — trong `fromError()`, thêm `console.error("[API_ERROR]", error)` và đổi `details` thành `isProduction() ? undefined : (stack | String(error))`
- [x] 1.1b Test `lib/__tests__/api-error-handler.test.ts` — 6 case, mock `../config/runtime` để điều khiển `isProduction()`
- [x] 1.2 Kiểm caller đang nhận `details`: `app/api/admin/bonus-import/route.ts:281-286` và `app/api/admin/import-dual-files/route.ts` chỉ truyền `ApiError` vào `createErrorResponse`, **không** UI nào render `details`. `lib/api/client.ts:115-128` có đọc `body.details` nhưng ở **cấp gốc** body, trong khi `createErrorResponse` đặt nó trong `error.details` → client chưa từng nhận được field này. Không cần sửa caller
- [x] 1.3 (gộp vào 1.2)
- [x] 1.4 `app/api/employee/lookup/route.ts:401` — xóa dòng `cccd,` khỏi `baseResponse`
- [x] 1.5 `app/api/employee/lookup/route.ts:28` — xóa field `cccd` khỏi type `LookupPayrollResponse`
- [x] 1.6 Grep `\.cccd` trong `app/employee/**`, `components/**`, `lib/hooks/**` xác nhận không nơi nào đọc field này **từ response** (verify 2026-08-01: mọi hit đều là state do người dùng nhập). `cccd` còn lại trong route chỉ là input + swagger request body + `bcrypt.compare` ← (verify: `curl` POST `/api/employee/lookup` với credential đúng → JSON không có key `cccd` ở mọi cấp; ném lỗi giả trong một route dùng `ApiErrorHandler` với `NODE_ENV=production` → body không chứa `"at "`, không chứa đường dẫn `.ts`; luồng tra cứu + xem lịch sử + đổi mật khẩu trên UI chạy như cũ)

## 2. Rào build-time `server-only` (BLOCKER)

- [x] 2.1 `npm i server-only --package-lock-only` — `package.json` +1 dependency (`^0.0.1`), `package-lock.json` +7 dòng, `pnpm-lock.yaml` không đụng. **Phát sinh khi làm**: `pnpm add server-only` fail EPERM vì entry của project trong store `D:\.pnpm-store\v11\projects\432074df…` là thư mục thay vì symlink — lỗi môi trường máy, ngoài repo, không tự sửa. Để build/test được tại chỗ đã `npm pack server-only@0.0.1` rồi giải nén thủ công vào `node_modules/server-only/`. **Việc cho người chạy máy**: `npm ci` (khớp CI) hoặc sửa store rồi `pnpm add server-only`, nếu không lần `pnpm install` sau sẽ xoá mất package này khỏi node_modules
- [x] 2.2 `utils/supabase/server.ts` — thêm `import "server-only";` dòng đầu; `npm run build` xanh ngay → không có client component nào import nhầm file gốc
- [x] 2.3 Thêm `import "server-only";` vào `lib/auth.ts`
- [x] 2.4 Thêm vào `lib/audit-service.ts`
- [x] 2.5 Thêm vào `lib/cascade-update-employee.ts`
- [x] 2.6 Thêm vào `lib/bonus/bonus-signature-status.ts`
- [x] 2.7 Thêm vào `lib/management-signature-utils.ts`
- [x] 2.8 Thêm vào `lib/auth-middleware.ts` và `lib/config/jwt.ts`
- [x] 2.9 Build sau khi gắn hết 8 file — xanh, không leak nào lộ ra (kế hoạch ghi build sau **mỗi** file; thực tế build file gốc trước rồi build 1 lần cho 7 file còn lại để tiết kiệm thời gian, có bisect sẵn nếu đỏ)
- [x] 2.10 **Bẫy cần nhớ cho nhóm 11/13/15**: `jest.config.js` dùng `testEnvironment: "jsdom"`, mà `server-only` ném lỗi khi bị import ngoài môi trường server. Test hiện tại không chạm 8 file này nên vẫn xanh, nhưng test cho repository/service sắp viết thì phải mock module có `server-only` hoặc đặt `@jest-environment node` ở đầu file test ← (verify: `grep -rl 'import "server-only"' lib utils` trả về đúng 8 file; `npm run build` xanh; kiểm `.next/static/chunks/**` không chứa chuỗi `SUPABASE_SERVICE_ROLE_KEY`)

## 3. `IP_SALT` vào env schema + sửa bug precedence

- [x] 3.0 Tạo `lib/utils/hash-ip.ts` với `hashClientIp(ip, salt)` + test `lib/utils/__tests__/hash-ip.test.ts` (5 case, có case "đổi salt thì hash phải đổi" chính là regression test cho bug precedence). **Phát sinh khi làm**: `hashIp` bị copy nguyên si ở cả 2 route, sửa 2 chỗ giống nhau là mời bug quay lại — rút một hàm nhận `salt` tường minh thì không thể tái diễn lỗi `+` ưu tiên hơn `||`
- [x] 3.1 `lib/config/env.ts` — thêm `IP_SALT: z.string().min(16)` vào `envSchema` và vào object truyền cho `safeParse`
- [x] 3.2 `app/api/auth/forgot-password/route.ts` — xoá `hashIp` cục bộ, gọi `hashClientIp(ip, getEnv().IP_SALT)`; bỏ luôn `import crypto` đã thành thừa
- [x] 3.3 `app/api/auth/change-password-with-cccd/route.ts` — sửa y hệt 3.2
- [x] 3.4 `.env.example` thêm `IP_SALT=your-ip-hash-salt-at-least-16-chars`. **Việc cho người deploy**: phải set `IP_SALT` (≥16 ký tự) trước khi lên bản mới, nếu không `getEnv()` sẽ throw. Đã thêm giá trị dev vào `.env` local (file untracked) để dev server không gãy
- [x] 3.5 Ghi chú vào PR: hash IP cũ và mới **khác nhau** (trước đây salt rỗng), nên bản ghi rate-limit/audit dựa trên IP hash cũ sẽ không khớp — chấp nhận, không cần migrate ← (verify: xóa `IP_SALT` khỏi `.env.local` → gọi `/api/auth/forgot-password` ném lỗi env rõ ràng thay vì chạy im lặng với salt rỗng; set `IP_SALT` đủ 16 ký tự → luồng quên mật khẩu chạy bình thường)

## 4. Bỏ verify token copy-paste

- [x] 4.1 `app/api/employees/update-cccd/route.ts` — xóa `verifyAdminToken` cục bộ, xóa import `jwt` / `JWTPayload` / `getJwtSecret` đã thành thừa
- [x] 4.2 Thay bằng `verifyAdminAccess(request)` — kèm lợi ích phụ: `van_phong` giờ nhận **403** thay vì 401, nên client không xoá session oan
- [x] 4.3 Cập nhật cả `POST` và `GET`; dùng thông báo lỗi của middleware
- [x] 4.4 **Audit bỏ sót 3 file nữa** cũng verify inline, grep bắt được: `app/api/admin/import-history/route.ts` (3 chỗ), `app/api/admin/import-dual-files/route.ts` (1 chỗ), `app/api/api-docs/openapi/route.ts` (1 chỗ)
- [x] 4.5 `import-history` + `import-dual-files` → chuyển sang `verifyToken()`. **Cố ý dùng `verifyToken` chứ không phải `verifyAdminAccess`**: cả 4 chỗ này hiện **chỉ verify chữ ký, không hề check role** dù nằm dưới `app/api/admin/`. Đổi sang `verifyAdminAccess` là siết quyền — đúng về bảo mật nhưng là đổi hành vi, vượt phạm vi "bỏ copy-paste". Xem 4.7
- [x] 4.6 **Ngoại lệ có chủ đích**: `app/api/api-docs/openapi/route.ts:22` giữ nguyên `jwt.verify`. Lý do: hàm `verifyApiDocsAccess` ở đây đọc token từ **cookie `auth_token`** ngoài header, còn `verifyToken()` chỉ đọc header → chuyển sang sẽ làm trang API docs mở bằng trình duyệt mất quyền truy cập. Muốn dọn nốt thì phải mở rộng `verifyToken` đọc cookie, việc đó chạm 57 route nên phải là task riêng
- [ ] 4.7 **Phát hiện mới, chưa vá — cần bạn quyết**: 4 handler dưới `app/api/admin/` (`import-history` GET/POST/DELETE, `import-dual-files` POST) chấp nhận **token hợp lệ của bất kỳ role nào**, kể cả nhân viên thường. Comment trong code ghi "Verify admin authentication" nhưng không có dòng nào check role. Vá = đổi `verifyToken` → `verifyAdminAccess` (4 dòng), rủi ro là chặn nhầm role đang dùng thật (`van_phong`? `nguoi_lap_bieu`?) ← (verify: `grep -rn "jwt.verify" app/api` chỉ còn đúng 1 dòng ở `api-docs/openapi`; `npm run build` xanh; typecheck + lint sạch; 87 test pass)

## 5. Zod hóa 11 route mutate đang thiếu validate

Danh sách xác minh 2026-08-01: 17 route đọc `request.json()` không import `@/lib/validations`. Nhóm này làm 11 route mutate; 6 route còn lại (chỉ đọc) làm ở nhóm 6.

- [x] 5.0 **Chặn trên đường trước, phải sửa trước mọi route**: `lib/api/client.ts` coi `body.error` là **string**, trong khi `createValidationErrorResponse` trả `error` là **object** → mọi thông báo lỗi mới sẽ hiện `[object Object]`. Đã viết lại `errorFromParsedBody` (đọc được cả 3 shape: `error` string, `error` object, mảng `errors`) + 6 test ở `lib/api/__tests__/error-from-parsed-body.test.ts`. Sửa này vá luôn cho **28 route đã dùng shape đó từ trước**
- [x] 5.1 `update-cccd` (POST) — `UpdateCccdRequestSchema` + 6 test; bỏ 3 khối if-check tay và các `.trim()` giờ đã thừa vì schema tự trim
- [x] 5.2 `update-signature-date` (POST) — dời schema inline vào `lib/validations/employee.ts`, **gộp luôn 2 check tay sau parse vào `superRefine`** (định dạng tháng theo `is_t13`, và `scope=selected` bắt buộc có `employee_ids`) + 9 test
- [x] 5.3 `update-management-signature-date` (POST) — `UpdateManagementSignatureDateRequestSchema`, bỏ mảng `VALID_SIGNATURE_TYPES` tự chế, dùng `SignatureTypeSchema` sẵn có
- [x] 5.4 `admin/payroll/[id]` (PUT) — `PayrollUpdateRequestSchema` (validate phong bì `updates` + `changeReason`; whitelist 40+ cột sửa được giữ nguyên trong route vì đó là logic nghiệp vụ, không phải shape input)
- [x] 5.5 `admin/departments` — chỉ POST đọc body (PUT không đọc), `DepartmentCreateRequestSchema`
- [x] 5.6 `admin/column-aliases` (POST, PUT) — `ColumnAliasCreateRequestSchema` + `ColumnAliasBulkRequestSchema`
- [x] 5.7 `admin/column-aliases/[id]` (PUT) — `ColumnAliasUpdateRequestSchema`; DELETE không đọc body
- [x] 5.8 `admin/mapping-configurations` (POST, PUT) — `MappingConfigurationCreateRequestSchema` + `MappingConfigurationSaveRequestSchema`; `mapping_type` chuyển thành enum khớp `FieldMapping`
- [x] 5.9 `admin/import-history` (POST, DELETE) — `ImportSessionHistoryCreateSchema` + `ImportHistoryDeleteQuerySchema`; **xoá interface `ImportHistoryRecord`** trong route vì schema đã là nguồn sự thật
- [x] 5.10 `admin/advanced-upload` (POST) — `AdvancedUploadRequestSchema` (body là JSON chứ không phải FormData như kế hoạch dự đoán)
- [x] 5.11 `admin/export-import-errors` (POST) — `ImportErrorItemSchema` + `ImportErrorExportRequestSchema`; xoá 2 interface `ImportError` / `ErrorExportRequest` đã trùng schema
- [x] 5.12 Mọi route đều dùng `parseSchema()` + `createValidationErrorResponse()`, không còn if-check tay
- [x] 5.13 Xử lý ở mức chung bằng 5.0 thay vì sửa từng hook — mọi hook đi qua `apiClient` nên chỉ cần `errorFromParsedBody` đọc đúng là toàn bộ thông báo hiển thị đúng
- [x] 5.14 Đã bù: `lib/validations/__tests__/import-config.test.ts` (28 test cho 11 schema import/mapping/column-alias) + `employee-request.test.ts` (21 test cho signature-date quản lý, salary-history, check-password-status, department, payroll update, audit filter, attendance). Tổng test toàn repo: 117 → **166**
- [x] 5.15 `mapping-configurations/route.ts:277` — thay `new Date(new Date().getTime() + 7*60*60*1000)` bằng `getVietnamTimestamp().slice(0, 16)`, giữ nguyên định dạng `YYYY-MM-DD HH:MM`
- [x] 5.17 **Ba handler bị sót khi lập danh sách ban đầu**, tìm ra khi quét lại toàn repo: `POST` của `payroll/my-data:153`, `payroll/my-department:160`, `payroll/my-departments:176`. Danh sách xác minh ban đầu chỉ soi route **không import** `@/lib/validations`, mà ba file này có import — nhưng chỉ dùng cho query string của `GET`, còn `POST` vẫn destructure `request.json()` thô. Giá trị `month`/`year` đi thẳng vào `.eq()` / `.like()` không qua `sanitizePostgrestValue`, và `month?.endsWith()` ném lỗi nếu client gửi số
- [x] 5.18 Thêm `YearlySummaryRequestSchema` (year 2020-2100, `z.coerce`, optional) và `DepartmentStatsRequestSchema` (dùng `SalaryMonthSchema` sẵn có nên nhận cả `YYYY-MM` lẫn `YYYY-13`) vào `lib/validations/payroll.ts`, export qua barrel + 10 test. Kiểm caller trước khi siết: `useEmployeeYearlySummaryQuery(year: number)` và `useSupervisorStatsQuery/useSupervisorTrendQuery` đều gửi đúng dạng schema chấp nhận → không vỡ client. `my-departments` POST **không có caller nào** trong repo (chỉ `GET` được dùng ở `use-role-payroll.ts:214`) — vẫn validate chứ không xoá, vì xoá là quyết định của bạn
- [x] 5.16 **Đã xử lý.** Từ 26 chỗ `new Date()` trong `app/api/**/route.ts` xuống còn **5**, và 5 chỗ còn lại là đúng chứ không phải bỏ sót.

  Thêm 4 helper vào `lib/utils/vietnam-timezone.ts` (đều dựng trên `getVietnamTimestamp()` sẵn có, 9 test ở `lib/utils/__tests__/vietnam-timezone.test.ts` chạy với `jest.setSystemTime`): `getVietnamDate()`, `getVietnamMonth()`, `getVietnamYear()`, `getVietnamMonthsAgo(n)`.

  **17 chỗ sai thật, đã vá** — chia 2 loại:
  - _Mặc định tháng/năm khi người dùng không truyền tham số_ (13 chỗ: `admin/dashboard-stats:77`, `admin/departments:28,34`, `admin/departments/[departmentName]:51,57`, `admin/payroll-export-template:279`, `admin/sync-template:134`, `payroll/my-data:164`, `payroll/my-department:56,175`, `payroll/my-departments:57,211`, `admin/data-validation:183`, `admin/update-signature-date:276`). Đây là lỗi thật: từ 00:00 đến 07:00 giờ Việt Nam ngày mùng 1, `toISOString()` vẫn trả tháng cũ → dashboard và bộ lọc mặc định hiện sai tháng suốt 7 tiếng mỗi đầu tháng. `new Date().getFullYear()` còn tệ hơn vì nó theo **giờ local của server**, tức khác nhau giữa máy dev (Việt Nam) và Vercel (UTC).
  - _Ngày trong tên file export_ (4 chỗ: `attendance-export:676`, `payroll-export:594`, `sync-template:224`, `unsigned-employees-export:163`) — cùng lỗi lệch ngày, sửa luôn vì cùng một helper.

  **Bonus: 1 bug tính tháng** — `admin/departments/[departmentName]:249` dùng `sixMonthsAgo.setMonth(getMonth() - 6)`. Gọi vào ngày 31 thì `Date` tự tràn (31/08 lùi 6 tháng → 31/02 → 03/03), làm mốc `gte` lệch hẳn một tháng. `getVietnamMonthsAgo(6)` tính thuần trên số tháng nên không có chuyện đó; có test riêng cho ca ngày 31.

  **5 chỗ cố ý giữ `new Date()`** vì chúng so sánh/cộng **mốc thời gian tuyệt đối**, không rút thành phần ngày-tháng nên không có khái niệm múi giờ: `lockExpiry > new Date()` (`change-password-with-cccd:123`, `forgot-password:135`, `employee/change-password:97`), tính số giờ trôi qua ở `forgot-password:169`, và `currentTime + 30s` ở `signature-progress:134` ← (verify: format + lint + typecheck + build webpack xanh; 242 test pass, tăng 9 test mới) Phần lớn là sinh tên file export hoặc lấy tháng/năm mặc định chứ không phải timestamp ghi DB, nên không vi phạm non-negotiable. Nhưng vài chỗ như `admin/dashboard-stats:77` (`new Date().toISOString().substr(0,7)`) và `admin/departments:28` lấy tháng hiện tại theo **UTC** — lệch ngày ở ranh giới đầu/cuối tháng so với giờ Việt Nam. Đáng rà riêng, không thuộc phạm vi nhóm 5 ← (verify: POST thiếu field bắt buộc tới từng route → HTTP 400 kèm danh sách field lỗi; POST hợp lệ → hành vi và response giống hệt trước refactor; `npm test -- --testPathPattern="validations"` xanh)

## 6. Zod hóa 6 route đọc + chuẩn hóa query param

- [x] 6.7 `pageQuerySchema(defaultLimit, maxLimit)` trong `lib/validations/common.ts` + 9 test. Làm dạng **factory** vì mỗi route có default limit khác nhau (12 / 20 / 50); `null` từ `searchParams.get()` được coi là "không truyền" và rơi về default
- [x] 6.1 `payroll/my-data` — `pageQuerySchema(12)`
- [x] 6.2 `payroll/my-department` — `pageQuerySchema(20)`
- [x] 6.3 `payroll/my-departments` — `pageQuerySchema(20)`
- [x] 6.4 `employee/salary-history` (POST) — `SalaryHistoryActionRequestSchema`, gộp check "get_payroll bắt buộc có salary_month" vào `superRefine`
- [x] 6.5 `admin/payroll/audit/[id]` (POST) — `PayrollAuditFilterRequestSchema`
- [x] 6.6 `employee/check-password-status` (POST) — `CheckPasswordStatusRequestSchema` (phần đóng enumeration oracle vẫn thuộc nhóm 7)
- [x] 6.8 **Kế hoạch chỉ liệt kê 6 route, grep ra 9 file**. Làm nốt 3 file ngoài danh sách: `admin/attendance-employees` (thêm `lib/validations/attendance.ts` mới cho `period_year`/`period_month`), `admin/employees/[id]/audit-logs` (dùng `PaginationSchema` sẵn có, bỏ 2 if-check tay), `admin/password-reset-history`, `employees/all-employees`, `admin/import-history` GET, `admin/column-aliases` GET, `admin/mapping-configurations` GET
- [x] 6.9 **Phát hiện quan trọng khi đọc `salary-history`: chỗ echo credential thứ hai** mà audit bỏ sót — `route.ts:169` trả `cccd: body.cccd.trim()` trong `baseResponse`, đúng cùng loại BLOCKER S4 đã vá ở `lookup:401`. Đã xoá. Grep lại toàn `app/api`: không còn chỗ nào trả `cccd` về client
- [x] 6.10 `grep -rn "parseInt(searchParams" app/api --include=route.ts` → 0 dòng (còn 1 hit ở `audit-logs/route.txt`, file `.txt` không được biên dịch, bỏ qua) ← (verify: `?page=-5`, `?page=abc`, `?limit=100000` đều trả 400 và không chạm DB; phân trang bình thường trên UI không đổi)

## 7. Rate limit + đóng user-enumeration oracle

- [x] 7.1 `employee/lookup` — `rateLimit("payroll")` (50 req/phút) đặt **trước cả CSRF**, tức trước mọi truy vấn DB và mọi lần `bcrypt.compare`. Nhánh `responseFormat === "html"` trả trang lỗi 429 tiếng Việt thay vì JSON
- [x] 7.2 `employee/check-password-status` — `rateLimit("login")` ở dòng đầu handler
- [x] 7.3 `admin/login:43` — đã có sẵn `rateLimit("login")` ngay đầu `POST`, không cần sửa
- [x] 7.4 Bỏ nhánh 404: mã NV không tồn tại giờ trả **cùng status 200 và cùng tập field** với nhân viên chưa đổi mật khẩu (`hasPassword: false` → giao diện hỏi CCCD). Không còn cách nào dò được mã NV nào tồn tại
- [x] 7.5 **Giả định của kế hoạch sai**: grep toàn repo (kể cả `lib/api/endpoints.ts`) → **không có caller nào** gọi `check-password-status`. Endpoint này đang là dead code, nên không cần sửa client
- [ ] 7.7 **Cần bạn quyết**: vì `check-password-status` không có caller, cách sạch nhất là **xoá hẳn route** thay vì chỉ vá — bỏ luôn một endpoint không auth chạm bảng `employees`. Tôi không tự xoá vì có thể có caller ngoài repo (app mobile, script nội bộ). Quyết định D5 trong `design.md` viết "không bỏ endpoint vì đang được dùng thật" — tiền đề đó đã được chứng minh là sai
- [x] 7.6 Ghi vào PR giới hạn đã biết: `rateLimitStore` là `Map` in-memory, reset khi deploy và không chia sẻ giữa instance; ngưỡng `login` để 100/15 phút vì công ty dùng IP chung — **không** đổi ngưỡng trong PR này ← (verify: gửi vượt ngưỡng → 429 kèm `Retry-After`; POST mã NV không tồn tại và mã tồn tại → status và tập field giống hệt nhau; luồng quên mật khẩu trên UI vẫn chạy)

## 8. Phủ CSRF cho route mutate còn thiếu

- [x] 8.1 **Con số 37 của audit gây hiểu nhầm**: đúng là 41/78 route gọi `csrfProtection`, nhưng lọc theo "có handler `POST|PUT|PATCH|DELETE`" thì chỉ còn **3 route** thật sự thiếu. 34 route còn lại là GET-only, mà `csrfProtection` bỏ qua GET ngay dòng đầu (`lib/security-middleware.ts:64-67`) nên không có lỗ hổng nào ở đó
- [x] 8.2 Ba route thiếu đều là endpoint tiền-đăng-nhập: `admin/login`, `auth/forgot-password`, `auth/change-password-with-cccd`. Verify caller: hai route password được gọi bằng `fetch` same-origin từ modal trình duyệt (`app/employee/lookup/forgot-password-modal.tsx:82`, `reset-password-modal.tsx:84`) → trình duyệt tự gắn `Origin`, bật CSRF an toàn
- [x] 8.3 Thêm `csrfProtection` vào `auth/forgot-password` và `auth/change-password-with-cccd`, đặt **trước** `rateLimit` và trước khi đọc body
- [x] 8.4 Không cần chia commit theo thư mục vì chỉ đụng 2 file
- [ ] 8.5 **Cố ý chưa làm, cần bạn quyết**: `admin/login` vẫn không có CSRF, theo đúng ngoại lệ mà 8.2 của kế hoạch đặt ra cho endpoint đăng nhập. Bật thêm sẽ chống được login-CSRF, rủi ro là chặn mọi caller không phải trình duyệt (script giám sát, health check tự động đăng nhập nếu có) ← (verify: gọi một route đã bổ sung bằng `curl` không kèm `Origin`/`Referer` → 403; thao tác tương ứng trên UI → chạy bình thường; smoke test import lương + ký nhận + sửa nhân viên)

## 9. Chốt phase 0

- [x] 9.1 `npm run format && npm run lint && npm run typecheck` — sạch
- [x] 9.2 `npm run build` (webpack) — xanh
- [~] 9.3 **Mới xong 1/3 luồng.** Bạn tự test trên nhánh `refactor/backend-architecture` (69 thay đổi chưa commit, không stash → dev server chạy đúng code này) và xác nhận **tra cứu lương + xem chi tiết chạy y hệt trước**. Đây là luồng được refactor nặng nhất: `lookup/route.ts` 487 → 199 dòng, tách `lookup-service` + `lookup-html` + `employee-repository`, và là luồng chạm nhiều nhất vào nhóm 10-13. **Chưa test: ký nhận, import Excel, export XLSX** — nên các nhóm phụ thuộc vẫn đóng (xem 9.3a)
- [ ] 9.3a Ba luồng còn thiếu chặn đúng ba nhóm: **ký nhận** → chưa xác nhận 7 chỗ sửa xác thực hash (11.10-11.14); **import Excel** → chưa xác nhận nhóm 1 (chặn stack trace trong response lỗi) và nhóm 5; **export XLSX** → chặn nhóm 14 (bỏ `select("*")`) và nhóm 16 (tách builder). Nhóm 14 đặc biệt không được mở nếu chỉ "bấm qua loa": thiếu một cột trong JSON trả về là lỗi im lặng, TypeScript không bắt, mắt thường không thấy
- [x] 9.4 Cập nhật `docs/audit/nextjs-backend-audit.md` — thêm bảng đối chiếu trước/sau ở đầu báo cáo
- [x] 9.7 **Tự soát lại diff trước khi commit** — lọc mọi dòng bị xoá có dính `csrfProtection|rateLimit|verifyToken|verifyAdminAccess|bcrypt|status 4xx`: không có middleware bảo mật nào bị mất mà không có thay thế. Dòng xoá chỉ gồm các `status: 400` của if-check tay (đã thay bằng zod) và 3 dòng `401 "Unauthorized"` ở `import-history` (gộp vào `verifyToken` → vẫn 401, chỉ đổi message của trường hợp thiếu header). Kiểm thêm 2 chỗ nghi siết chặt hành vi: trần `limit` 200 — client cao nhất đang gọi đúng 200 nên không vỡ; sàn năm 2020 của `attendance` — trùng với `PeriodExportRequestSchema` có sẵn trong repo, không phải tôi tự đặt
- [x] 9.6 **Đã tách thành commit `style:` đầu tiên (`fe99866`).** Chứng minh 4 file chỉ đổi định dạng chứ không đổi logic: chạy `prettier` lên **bản HEAD** của từng file rồi so với bản hiện tại — giống hệt cả 4. Ghi lại phát hiện gốc: `main` đang đỏ CI từ trước.
- [~] 9.5 **Đã commit — nhưng 3 commit chứ không phải 22, và lý do quan trọng hơn con số.**

  Bản đồ 22 commit trong `commit-plan.md` **không tách được theo file**. Hai nguyên nhân độc lập:
  1. _File nằm ở nhiều nhóm_: `lookup/route.ts` thuộc nhóm 1, 7, 10; `import-history` thuộc 4, 5, 6. Tách đúng đòi `git add -p` từng hunk.
  2. _Nhóm 18 đổi đường dẫn 6 module_. Commit nào tách **trước** nó mà đụng 8 file call site sẽ có import trỏ vào đường dẫn cũ → **không build được**. Mà commit không build được thì mất luôn giá trị chính của việc tách commit (bisect, revert từng phần).

  Nên chọn cách `commit-plan.md` đã ghi sẵn là chấp nhận được, rút còn 3:
  - `fe99866` `style:` — 4 file prettier bỏ sót (task 9.6)
  - `aa00118` `refactor:` — toàn bộ code, 143 file
  - `813f40c` `docs:` — spec + báo cáo audit (`docs/` bị gitignore nên `add -f` có chủ đích)

  Bản đồ 22 commit **giữ nguyên** trong `commit-plan.md` cho ai muốn làm lại bằng `git add -p`.

  **Chưa push** — đẩy lên remote là việc cần bạn duyệt. Nhánh `refactor/backend-architecture`, working tree sạch.

---

# PHASE 1 — Tách layer (P1). Chỉ bắt đầu khi nhóm 1-9 đã merge.

## 10. `AppError` + `toErrorResponse()`

> **Trạng thái nhóm 10**: đã làm xong phần **không đổi hành vi** (10.1-10.5) vì nó độc lập và không rơi vào cổng D8. Phần migrate route (10.6-10.8) **cố ý chưa làm** — đó mới là chỗ đổi response shape thật, phải qua smoke test 9.3 trước.

- [x] 10.1 Tạo `lib/errors/app-error.ts`: `class AppError extends Error` mang `code: string` và `status: number`; subclass `ValidationError` (400, `ErrorCodes.VALIDATION_ERROR`), `NotFoundError` (404), `ForbiddenError` (403), `UnauthorizedError` (401)
- [x] 10.2 `toErrorResponse(error)` cùng file — 66 dòng, không cần tách. `AppError` → status/code của nó; lỗi lạ → 500 + message chung, message gốc chỉ lộ ngoài production (dùng lại `isProduction()` từ nhóm 1)
- [x] 10.3 Dùng lại `ApiErrorHandler.createErrorResponse` + `ErrorCodes` cũ, không tạo envelope mới
- [x] 10.4 `parseSchemaOrThrow` ném `ValidationError`. **Va tên khi làm**: repo đang có tới 3 thứ tên `ValidationError` (interface parse-failure ở `lib/validations/errors.ts`, class mới, component ở `components/signature/ErrorHandling.tsx`, cộng 1 interface nữa trong `lib/enhanced-import-validation.ts`). Đã đổi interface parse-failure thành **`ParseFailure`** (không caller nào ngoài barrel) để tên `ValidationError` chỉ còn nghĩa "lỗi validate ném ra được"
- [x] 10.5 Test `lib/errors/__tests__/app-error.test.ts` 11 case + `lib/validations/__tests__/parse-schema-or-throw.test.ts` 4 case. Phải khai `@jest-environment node` vì `NextResponse.json` không chạy được trong jsdom — bẫy này áp cho mọi test đụng `NextResponse` sau này
- [x] 10.5 Test `lib/errors/__tests__/app-error.test.ts`: mỗi subclass map đúng status/code; lỗi lạ → 500 và message gốc không lọt ra khi `NODE_ENV=production`
- [x] 10.6 Migrate `app/api/employee/**` — **nhưng phải sửa `toErrorResponse` trước, vì bản gốc migrate vào là tụt hạng chứ không phải cải thiện.** Hai thứ bị mất nếu làm cơ học:
  1. **Message tiếng Việt theo ngữ cảnh.** Các catch block đang trả "Có lỗi xảy ra khi ký nhận lương", "…khi lấy chi tiết lương"… `toErrorResponse` bản gốc ép hết về `getUserFriendlyMessage(INTERNAL_ERROR)` = "Lỗi hệ thống nội bộ". Người dùng mất manh mối chỗ nào hỏng.
  2. **`CACHE_HEADERS.sensitive`.** Mọi route employee gắn header này cả ở nhánh lỗi; `toErrorResponse` bản gốc không nhận header nào → response lỗi của endpoint nhạy cảm trở nên cache được.

  Nên `toErrorResponse(error, { fallbackMessage?, headers? })`: `fallbackMessage` **chỉ** áp cho lỗi lạ, không đè message của `AppError` (có test riêng cho đúng điều này); `headers` áp cho cả hai nhánh. 7 route × 8 catch block đã đổi, message và header giữ nguyên từng chữ.

  Cái thu được: `AppError` ném từ tầng sâu (ví dụ `parseSchemaOrThrow`) nay ra đúng status/code thay vì bị catch-all nuốt thành 500. `lib/api/client.ts:129-143` đọc được cả hai dạng body (`error` là chuỗi hoặc là object có `message`) nên client không phải sửa gì — đã kiểm trước khi đổi, không phải suy đoán.

  `employee/lookup/route.ts` **không** migrate: nó có `createLookupErrorResponse` riêng vì phải trả được cả HTML lẫn JSON tuỳ `responseFormat` ← (verify: 3 test mới cho `fallbackMessage`/`headers`; 245 test pass; format + lint + typecheck + build xanh)

- [x] 10.7 Migrate `app/api/payroll/**` — 8 catch block ở 5 route. **Phát hiện khi làm**: các catch này trả 500 **không kèm `CACHE_HEADERS.sensitive`**, trong khi mọi response thành công trong chính file đó đều có. Tức response lỗi của endpoint lương đang cache được. Đã gắn header vào lúc migrate — đây là đổi hành vi ngoài phạm vi "migrate", ghi ra để reviewer thấy chứ không giấu
- [x] 10.8 Migrate `app/api/admin/**` **và toàn bộ phần còn lại của `app/api/**`**. Tổng cộng **97 chỗ** gọi `toErrorResponse(error, ...)`; đếm lại catch block còn tự dựng response 500: **0**.

  Ba dạng envelope khác nhau đã gặp, mỗi dạng kiểm riêng chứ không thay mù:
  - `{ error: "chuỗi" }` — dạng phổ biến nhất.
  - `{ success: false, message: "chuỗi" }` — dùng ở `column-aliases` và `mapping-configurations`. `ApiErrorHandler.createErrorResponse` đặt **cả** `error.message` lẫn `message` ở cấp gốc, nên body mới là **cộng thêm field**, không mất field nào. Kiểm consumer thật: `lib/hooks/use-column-mapping.ts:83` đọc `response.message` — nhưng nó nằm sau `apiClient`, mà `apiClient` ném lỗi ở mọi status không-2xx nên nhánh 500 không bao giờ chạy tới dòng đó; text hiển thị đến từ `errorFromParsedBody` (`lib/api/client.ts:135-146`), hàm này đọc được cả `body.error` dạng chuỗi lẫn dạng object.
  - `ApiErrorHandler.fromError(error, INTERNAL_ERROR)` + `createErrorResponse` ở `bonus-import`, `import-dual-files`, `payroll-import` — đây **đúng bằng** những gì `toErrorResponse` làm bên trong, nên thay vào là rút gọn thuần, mỗi chỗ bớt 6 dòng.

  2 catch dùng biến tên khác (`accessError`, `connectError`) là guard lồng giữa hàm chứ không phải handler cuối — vẫn đổi được vì chỉ thay một `return` bằng một `return` ← (verify: format + lint + typecheck + build webpack xanh; 245 test pass; `grep -c "toErrorResponse(error" app/api` = 97; script đếm catch-block-còn-dựng-500 trả 0)

## 11. Repository đầu tiên — employee credential

> Làm nhóm này trước phần migrate của nhóm 10 vì nó **không đổi response shape** — thứ mà cổng smoke test 9.3 bảo vệ. Toàn bộ là rút hàm, hành vi giữ nguyên, verify được bằng typecheck + test + build.

- [x] 11.1 `lib/employee/employee-repository.ts` — `findEmployeeAuthRecord(supabase, employeeId)`, 32 dòng, nhận client qua tham số theo đúng mẫu `bonus-signature-service`. Không import `createServiceClient` nên không cần `server-only`, test chạy được trong jsdom
- [x] 11.2 `EmployeeAuthRecord` khai ngay cạnh hàm, cột nullable khai đúng là nullable
- [x] 11.3 Call site 1: `employee/lookup`
- [x] 11.4 Call site 2: `employee/check-password-status`
- [x] 11.5 Call site 3: `employee/sign-bonus`
- [x] 11.6 Test 6 case (đúng bảng, đúng cột, không `select("*")`, tìm thấy, không tìm thấy, lỗi truy vấn → null)
- [x] 11.8 **Bug tiềm ẩn type system vừa lộ ra**: cả `lookup` lẫn `sign-bonus` đều gọi `bcrypt.compare(cccd, hashToVerify)` mà `hashToVerify` có thể `null` (nhân viên đã đổi mật khẩu nhưng `password_hash` rỗng, hoặc chưa đổi mà `cccd_hash` rỗng) → **ném lỗi 500 lúc chạy** thay vì trả "mật khẩu không đúng". Trước đây query trả kiểu lỏng nên TS không thấy. Đã vá cả 2 chỗ: thiếu hash thì coi như xác thực thất bại
- [x] 11.9 Cùng lý do đó, `LookupPayrollResponse` khai `full_name`/`position`/`department` là `string` trong khi cột DB nullable — đã coalesce về `""` khi dựng response
- [x] 11.7 Chưa tạo interface/port — chỉ rút hàm ← (verify: 3 endpoint trên hoạt động y như trước; `grep -n "from(\"employees\")" app/api/employee` chỉ còn ở chỗ không phải truy vấn credential)
- [x] 11.10 **Quét lại toàn repo thì 11.8 còn 5 chỗ nữa chưa vá** (grep `bcrypt.compare` trong `app/api` + `lib`): `auth/change-password-with-cccd:139`, `employee/change-password:125`, `employee/sign-salary:91`, `employee/salary-history:78`, `lib/auth.ts:161`. Cùng một lỗi, cùng hậu quả: 500 thay vì 401, và 500-vs-401 là oracle phân biệt trạng thái tài khoản
- [x] 11.11 Thay vì vá 5 chỗ bằng 5 ternary giống nhau, rút `lib/auth/employee-credential.ts` (29 dòng): `hasChangedPassword()`, `selectCredentialHash()`, `verifyEmployeeCredential()`. Quy tắc "NULL → dùng `cccd_hash`, ngược lại `password_hash`" từ nay chỉ còn **một** chỗ định nghĩa thay vì 7 bản sao chép tay
- [x] 11.12 Đưa cả 7 call site về helper: 5 chỗ ở 11.10, cộng `sign-bonus` và `lookup-service` (hai chỗ đã vá ở 11.8 nhưng vẫn giữ bản sao logic). Xoá luôn 9 dòng comment giải thích quy tắc — helper tự kể chuyện rồi
- [x] 11.13 `auth/forgot-password:209` **cố ý không dùng helper**: luồng quên mật khẩu luôn xác thực bằng CCCD kể cả khi user đã đổi mật khẩu (helper sẽ chuyển sang `password_hash` → đổi hành vi). Chỉ thêm guard null tại chỗ
- [x] 11.14 Test 9 case cho helper (`lib/auth/__tests__/employee-credential.test.ts`): chọn đúng hash theo `last_password_change_at`, đúng/sai credential, và **hash null trả `false` chứ không ném** — chính là case gây 500. Toàn bộ: 223 test xanh (8 suite fail vẫn là baseline pnpm/msw)

## 12. Tách render HTML khỏi `employee/lookup`

- [x] 12.1 `lib/employee/lookup-html.ts` (99 dòng) — `escapeHtml`, `renderLookupShell`, `renderErrorHtml`, `renderLookupResultHtml`. Thuần chuỗi, không import Supabase, không đọc env. Tách thêm `buildDetailRows` cho dễ đọc
- [x] 12.2 CSS tách sang `lib/employee/lookup-html-styles.ts` (21 dòng). Nội dung copy **nguyên văn** kể cả xuống dòng/thụt lề nên `<style>${LOOKUP_PAGE_STYLES}</style>` sinh ra chuỗi giống hệt bản cũ
- [x] 12.3 Thêm `lib/employee/lookup-types.ts` giữ `LookupPayrollResponse` + `LookupResponseFormat` — route và lib dùng chung một type, chuẩn bị sẵn cho nhóm 13. Route giữ lại `createHtmlResponse` vì đó là việc của `NextResponse`, không phải render
- [x] 12.4 Test 9 case gồm cả 2 case bảo mật: mã NV độc hại không chèn được thẻ `<script>`, và HTML **không bao giờ in ra `cccd`** kể cả khi payload lỡ mang field đó ← (verify: `route.ts` **487 → 362 dòng**; mọi file mới < 200 dòng; 196 test pass; build xanh; mở đúng URL trả HTML trên trình duyệt, giao diện không đổi một pixel nào so với trước; số dòng `route.ts` giảm ~150)

## 13. `lookup-service.ts` + test

- [x] 13.1 `lib/employee/lookup-service.ts` (204 dòng) — `lookupEmployeePayroll(supabase, input)` trả **discriminated union** `{ok:true, payroll, session_token}` | `{ok:false, status, error}`, nên route không phải biết gì về DB. Tách tiếp thành `verifyPassword` / `findLatestPayroll` / `buildBaseResponse` / `buildT13Response` / `buildMonthlyResponse` cho dễ đọc
- [x] 13.2 Giữ nguyên regex T13 và toàn bộ logic map field, copy nguyên văn từ route
- [x] 13.3 Route còn đúng 4 việc: rate limit + CSRF → parse Zod → gọi service → map sang HTML/JSON
- [x] 13.4 Test 10 case, dùng bcrypt thật với 4 rounds cho nhanh: chưa đổi mật khẩu verify `cccd_hash`, đã đổi verify `password_hash`, sai mật khẩu, **không có hash nào** (bug 11.8), không tìm thấy NV, không có dữ liệu lương, T13 sai định dạng, map T13, map tháng thường, và không bao giờ trả `cccd`
- [x] 13.6 Phải `jest.mock` cả `employee-repository` lẫn `@/lib/employee-session` — không mock thì test kéo theo `lib/config/jwt.ts` vốn có `import "server-only"` và sẽ ném ngay. Đúng cái bẫy đã ghi ở 2.10
- [x] 13.5 Route **487 → 199 dòng**, đạt ngưỡng < 200 của `CLAUDE.md` ← (verify: 4 case trên chạy đúng trên UI thật; `route.ts` từ 481 dòng còn dưới 200; test mới xanh)

## 14. Bỏ `select("*")`

Danh sách xác minh 2026-08-01 — 21 call site:

> **Đính chính danh sách của nhóm 14 (đo lại 2026-08-01).** `grep 'select("\*")'` ra 41 hit, nhưng **15 trong số đó là `.select("*", { count: "exact", head: true })`** — query chỉ đếm, `head: true` nghĩa là PostgREST **không trả dòng nào**, nên `"*"` ở đó không tốn một byte payload nào và là cách viết chuẩn để đếm. Đổi chúng thành danh sách cột là công cốc, tệ hơn là dễ làm hỏng bộ đếm. Số hit thật sự cần xử lý là **~20**, không phải 41. (Ngoại lệ cần chú ý: `bulk-signature-history:38`, `column-aliases:51`, `import-history:102` dùng `count: "exact"` **không có** `head` → có trả dòng, vẫn thuộc diện phải sửa.)

- [x] 14.1 `lib/payroll/payroll-select.ts` (đã move ở nhóm 18) — **chưa thêm `PAYROLL_SELECT_DETAIL`**: hằng này chỉ có nghĩa khi biết chính xác cột nào UI chi tiết đọc, mà đó đúng là thứ cổng 9.3a đang chặn. Phần nhóm 14 làm được không cần dữ liệu thật đã làm ở 14.11, 14.15-14.17 (xem bên dưới), mỗi chỗ đều có nguồn chứng minh trong repo (mọi cột UI chi tiết cần) và `EMPLOYEE_SELECT_BASIC`
- [ ] 14.2 `app/api/admin/payroll/[id]/route.ts`
- [ ] 14.3 `app/api/admin/payrolls/route.ts`
- [ ] 14.4 `app/api/admin/payroll-export/route.ts` (2 chỗ)
- [ ] 14.5 `app/api/admin/bulk-payroll-export/route.ts`
- [ ] 14.6 `app/api/admin/attendance-export/route.ts` (2 chỗ)
- [ ] 14.7 `app/api/admin/payroll/audit/[id]/route.ts`
- [x] 14.8 `update-management-signature-date` — `select("*")` → `select("id")`. Toàn file chỉ đọc **duy nhất** `existing.id` (grep `existing\.[a-z_]*` ra đúng 1 kết quả), phần còn lại của bản ghi chưa từng được dùng
- [x] 14.9 `column-aliases/[id]` — liệt kê đúng 9 field của `interface ColumnAlias` (`lib/column-alias-config.ts:6-16`), vì kết quả được gán thẳng vào `ApiResponse<ColumnAlias>`
- [x] 14.10 `sync-template` — **41 cột**, danh sách rút **cơ học từ chính code** chứ không gõ tay: `re.findall(r"payroll\.([a-z0-9_]+)")` trên file đó. Đối chiếu tiếp 41 tên này với `scripts/supabase-setup/02-create-payrolls-table.sql` và danh sách select tường minh ở `departments/[departmentName]` — **không tên nào lạ**. Đây là chỗ rủi ro nhất của cả nhóm 14 vì `select("*")` trước đây nuốt lỗi im lặng (`payroll.cot_khong_ton_tai || 0` cho ra giá trị mặc định), còn select tường minh thì PostgREST trả lỗi cho cả endpoint
- [x] 14.11 `app/api/employee/change-password/route.ts` — **comment "Select all to handle missing columns gracefully" là tiền đề sai, đã chứng minh và bỏ.** File này đọc 5 cột (`locked_until`, `failed_login_attempts`, `must_change_password`, `password_changed_at`, `password_hash`) cộng 3 cột `verifyEmployeeCredential` cần (`cccd_hash`, `password_hash`, `last_password_change_at`).

  Chứng minh 4 cột "có thể vắng" thật ra là bắt buộc:
  - `must_change_password` + `password_changed_at`: chính file này, dòng 285, đã `.select("must_change_password, password_changed_at")` **tường minh và không hề guard** — nếu cột vắng thì chỗ đó đã vỡ từ lâu.
  - `failed_login_attempts` + `locked_until`: chỉ được **ghi** qua `updateData` (dòng 131-211); ghi vào cột không tồn tại cũng lỗi y như đọc.
  - Cả 4 do `scripts/supabase-setup/20-add-password-management.sql` tạo; 3 cột hash còn lại do migration 21, và `lib/auth.ts:141` (đường đăng nhập) đã select tường minh chúng.

  Tức `select("*")` ở đây không hề "graceful" — nó chỉ giấu lỗi ở đúng một dòng trong khi cả file vẫn phụ thuộc cứng

- [x] 14.12 `management-signature` — 4 cột (`signed_by_id, signed_by_name, signed_at, department`). Bản ghi chỉ dùng để dựng thông báo "đã có chữ ký", code nêu tên đúng 4 field đó
- [x] 14.13 `signature-history` — dùng lại `MANAGEMENT_SIGNATURE_SELECT` (11 cột). **Bằng chứng nằm ngay trong file**: nhánh fallback khi bảng chưa tồn tại trả về dữ liệu mock liệt kê đúng 11 field này, tức đó chính là hợp đồng mà client đang trông đợi.

  Hai thứ phải sửa kèm, cả hai đều do `select("*")` che đi:
  - `let signatures = []` suy ra `any[]`. Khi select đã tường minh, TypeScript không suy được nữa và bắt lỗi `TS7034` — phải khai `SignatureRecord[]`.
  - Khai xong thì lộ ra **một `interface SignatureRecord` cục bộ ở dòng 197 che mất bản import**: cùng một tên mang hai nghĩa trong một file, bản cục bộ chỉ có 2 field. Đổi tên thành `MonthlyStatSource` theo đúng việc nó làm

- [x] 14.14 `signature-status/[month]` — 8 cột. Code đọc bản ghi bằng cách dựng object nêu tên từng field (`id, signed_by_id, signed_by_name, department, signed_at, notes, payroll_type`) cộng `signature_type` dùng làm khoá
- [x] 14.15 `lib/auth.ts` — 2 chỗ, xử lý khác nhau:
  - `:78` `admin_users` → `ADMIN_CREDENTIAL_SELECT = "id, username, password_hash"`. Đây là **đúng 3 cột caller đọc** (`admin.password_hash` để bcrypt, `admin.id` để update `last_login`, `admin.username` để dựng session). Đổi kiểu trả về `AdminUser` → `AdminCredentialRecord = Pick<AdminUser, ...>` và bỏ được `as AdminUser` — ép kiểu đó đang che việc TypeScript không kiểm tra gì cả. **Cố ý không liệt kê đủ 8 field của `AdminUser`**: DDL `admin_users` trong `scripts/create-tables.sql` đã cũ (thiếu `role`, `is_active`, `last_login`, `updated_at` mà code đang dùng), nên không có nguồn nào trong repo chứng minh `updated_at` tồn tại. Liệt kê theo cái code thật sự đọc thì không cần đoán.
  - `:267` `verifyEmployeeCredentials` — **xoá hẳn**. Hàm này có **0 caller** trong toàn repo, và nó query `payrolls` với `.eq("cccd", cccd)` trong khi `cccd` là cột của `employees` chứ không phải `payrolls`; tức nó vừa chết vừa hỏng. Xoá an toàn hơn hẳn `check-password-status` (task 7.7) vì đây là hàm nội bộ trong file có `import "server-only"`, không có đường nào gọi từ ngoài repo
- [x] 14.16 `lib/bonus/{bonus-signature-service,bonus-signature-status}.ts` — tạo `lib/bonus/bonus-select.ts` với `BONUS_SIGNATURE_SELECT` (8 cột, đúng bằng `BonusSignatureRecord` trong `bonus-types.ts` mà `toBonusSignatureRecord()` map ra). Đặt hằng ở module riêng thay vì cho file này import file kia — tránh dựng lại đúng loại vòng import vừa phá ở 20.4
- [x] 14.17 `lib/management-signature-utils.ts` — 2 chỗ, dùng chung `MANAGEMENT_SIGNATURE_SELECT` (11 cột = đúng `SignatureRecord`). Chỗ này có tính chất tốt: kết quả được gán thẳng vào biến kiểu `SignatureRecord | null`, nên khi select đã tường minh thì **TypeScript bắt được nếu thiếu cột** — khác với `select("*")` vốn trả kiểu lỏng và nuốt mọi sai sót

  > **Kiểm chứng cơ chế (làm khi tới 14.17, ghi lại vì nó đổi cách đọc cả nhóm 14):** supabase-js **có** phân tích chuỗi select ở mức kiểu. Thử bớt cột trong `MANAGEMENT_SIGNATURE_SELECT` từ 11 xuống 3 → `tsc` báo `TS2739: missing the following properties from type 'SignatureRecord'` ở đúng 2 dòng. Nghĩa là: chỗ nào kết quả query được gán vào **biến có kiểu tường minh** thì thiếu cột là lỗi biên dịch, không phải lỗi im lặng. Chỗ nào kết quả chỉ được đọc bằng `row.ten_cot` (kiểu `any`) thì TypeScript không giúp gì — đó mới là chỗ nguy hiểm thật.

- [ ] 14.18 Với **mỗi** endpoint đổi: ghi lại danh sách key JSON trước và sau, dán vào PR — thiếu cột là lỗi im lặng, TypeScript không bắt được
- [ ] 14.19 Chia thành ≥3 PR theo nhóm (payroll export / signature / auth) ← (verify: diff key JSON trước-sau rỗng cho mọi endpoint; file XLSX export mở ra đủ cột như bản cũ)

> **Đã khảo sát nhóm 16 và quyết định KHÔNG làm trước cổng 9.3** (ghi lại để lần sau khỏi khảo sát lại). Khác với nhóm 12/13 vốn rút được sạch, `attendance-export/route.ts` có **một truy vấn DB nằm giữa phần dựng sheet**: khi `daily_records_json` rỗng, code fallback sang query bảng `attendance_daily` ngay trong nhánh `include_daily` (`route.ts:308-330`). Muốn tách builder thành hàm thuần thì phải kéo phần fetch fallback ra trước, tức đổi thứ tự truy vấn — không còn là rút hàm cơ học nữa. Cộng thêm: đúng/sai của nhóm này chỉ chứng minh được bằng cách mở file XLSX xuất ra và so với bản cũ, mà việc đó cần dữ liệu thật. Test đơn vị chỉ khẳng định lại chính điều tôi vừa viết. Vậy nhóm 16 xếp **sau** 9.3 cùng với 14 và 10.6-10.8.

## 15. Repository cho payroll và bonus

- [x] 15.1 Làm phần **an toàn**: `lib/payroll/payroll-list-query.ts` — hằng `PAYROLL_WITH_EMPLOYEE_SELECT` (chuỗi select kèm join `employees`, trước đây copy nguyên si ở 3 route) + `applyPayrollFilters(query, {salaryMonth, payrollType, search})`. 8 test. Đây cũng chính là **một chỗ duy nhất** để nhóm 14 sau này thay `*` bằng danh sách cột, thay vì sửa 3 nơi
- [x] 15.2 Ba route `payroll/my-*` dùng hằng chung. `applyPayrollFilters` mới áp cho `my-data` (bộ lọc trùng khớp hoàn toàn); hai route phòng ban **cố ý chưa áp** vì bộ lọc của chúng khác (xem 15.8), áp vào là đổi hành vi
- [ ] 15.8 **BUG tìm được khi đọc, chưa vá — cần bạn quyết**: ở `payroll/my-department` và `payroll/my-departments`, **count query không áp cùng bộ lọc với list query**:
  - thiếu bộ lọc `search` → khi người dùng tìm kiếm, `total` và `totalPages` vẫn tính trên toàn bộ tập, phân trang hiện thừa trang rỗng;
  - thiếu bộ lọc `department` cụ thể ở `my-departments:93-95`;
  - và đáng ngờ nhất: count query dùng `.select("*", {count:"exact", head:true})` **không có embed `employees`** nhưng lại lọc `.eq("employees.department", ...)` — PostgREST cần embed mới lọc được cột của bảng nhúng, nên nhiều khả năng bộ lọc phòng ban **không có tác dụng** và `total` đang là tổng số bản ghi `payrolls` của toàn công ty. Cần xác nhận trên DB thật rồi mới sửa; sửa xong `total` sẽ đổi giá trị nên phải báo người dùng
- [~] 15.3 Tạo `lib/payroll/payroll-repository.ts` và chuyển **4/9 file** dưới `app/api/admin/payroll*/**` về **0 chỗ gọi `.from()`**: `payroll/[id]`, `payroll/audit/[id]`, `payroll-preview`, `payrolls`.

  **Đây là phép dời thuần, không phải viết lại**: mỗi chuỗi select được đưa nguyên si vào hằng trong repository. Đã đối chiếu chuỗi cũ (`git show HEAD:<file>`) với hằng mới sau khi bỏ khoảng trắng — **giống hệt từng ký tự**. Với query bị bồi thêm bộ lọc phía sau (`payroll/[id]:56`, `payrolls:21`, audit summary) thì repository trả về **query builder** chứ không trả dữ liệu, để phần lọc theo role ở route giữ nguyên vị trí. Một điều chỉnh kiểu: `payrollId` trong `payroll/[id]` là `number` chứ không phải `string`, nên tham số repository khai `string | number`.

  **5 file còn lại cố ý chưa chuyển** (`payroll-export` 6 chỗ, `payroll-import` 6, `payroll/search` 9, `bulk-payroll-export` 3, `payroll-export-template` 3) — đều nằm trong luồng import/export chưa smoke test, và `payroll/search` còn dính `sanitizePostgrestValue` cùng nhánh fallback phức tạp. Chuyển tiếp khi cổng 9.3a mở

- [x] 15.4 `lib/bonus/bonus-repository.ts` — gom cả **5** chỗ gọi Supabase trực tiếp trong `lib/bonus/` (2 ở `bonus-signature-service.ts`, 2 ở `bonus-signature-status.ts`, cộng chỗ insert): `findBonusSignFlags`, `findActiveSigner`, `findActiveBonusSignatures`, `findActiveBonusSignatureByType`, `insertBonusSignature`. Theo đúng khuôn D2 (nhận `supabase` qua tham số).

  Kèm một siết kiểu: `toBonusSignatureRecord()` trước nhận `Record<string, unknown>` — tức không kiểm tra gì. Nay nhận `BonusSignatureRow`, nên bỏ được 2 ép kiểu `as string | null`. `insertBonusSignature` cũng đổi `.select()` trần thành `.select(BONUS_SIGNATURE_SELECT)` để bản ghi trả về có cùng hình dạng với bản ghi đọc ra

- [x] 15.5 `lib/bonus/__tests__/bonus-repository.test.ts` — 12 test, mock ở tầng `supabase` client (giả chuỗi `from().select().eq()`), cùng kiểu với `employee-repository.test.ts` có sẵn. Có test khẳng định `findActiveBonusSignatures` **không** dùng `select("*")` và lấy đúng 8 cột — để nhóm 14 không bị vô hiệu hoá về sau.

  **Bẫy gặp khi viết**: test dùng `bonus_type: "thuong_tet"` chạy xanh 12/12 dưới jest nhưng `tsc` báo lỗi — `BonusType` thật là `thuong_le | thuong_quy | thuong_nong | khac`. Lý do: next/jest dùng SWC, xoá type chứ không kiểm tra. Nhắc lại vì sao `npm run typecheck` phải chạy riêng, `npm test` xanh không thay thế được

- [x] 15.6 Kết luận ghi vào `design.md` mục **D9 — chưa cần interface/port**, kèm 3 lý do đo trên code thật (test đã mock ở tầng `supabase` client nên port không thêm điểm thay thế nào; tham số `supabase` đã là DI theo D2; 6 hàm × khai 2 lần = ~60 dòng trùng lặp) và 3 điều kiện xét lại
- [~] 15.7 **Đếm lại sau 15.4: 72 file** gọi `createServiceClient()`, so với ~70 lúc bắt đầu. Con số **không giảm, và sẽ không giảm theo cách kế hoạch đã hình dung** — đây là chỗ kế hoạch đặt sai chỉ số, ghi lại để khỏi đuổi theo nó:

  Theo D2, repository **nhận `supabase` qua tham số** chứ không tự tạo. Nên route vẫn phải gọi `createServiceClient()` một lần rồi truyền xuống — số file gọi hàm này gần như không đổi dù rút bao nhiêu repository. Cái thật sự giảm là **số chỗ gọi `.from("bảng")` rải rác ngoài tầng repository**: `lib/bonus/` từ 5 xuống 0, `lib/employee/` đã về 0 từ nhóm 11-13.

  A4 (client singleton) vì vậy **không đóng theo A3** như kế hoạch giả định. Muốn đóng A4 thật thì phải đổi D2 sang singleton — mà D2 đã cân nhắc và bác bỏ (supabase-js là HTTP client stateless, singleton không lợi như Prisma pool). Đề nghị: coi A4 là **không áp dụng** thay vì còn nợ

## 16. Tách logic XLSX khỏi route export

> **Cập nhật 22.2: bẫy này áp cho CẢ HAI route, không riêng `attendance-export`.** `payroll-export/route.ts` cũng vậy — workbook tạo ở dòng 251, worksheet ráp ở dòng 491, nhưng giữa hai mốc có **2 truy vấn DB** (`signature_logs:289`, `management_signatures:357`). Nên 16.2 không dễ hơn 16.1 như kế hoạch giả định; cả nhóm 16 đều đòi kéo phần fetch ra trước, tức đổi thứ tự truy vấn.

- [ ] 16.1 `app/api/admin/attendance-export/route.ts` (697 dòng) — chuyển phần build workbook sang `lib/excel/attendance-export-builder.ts`, nhận dữ liệu đã query, trả `Buffer`/`Workbook`
- [ ] 16.2 `app/api/admin/payroll-export/route.ts` (628 dòng) — tương tự, `lib/excel/payroll-export-builder.ts`
- [ ] 16.3 Query dữ liệu dùng repository từ nhóm 15
- [ ] 16.4 Nếu builder vượt 200 dòng: tách theo sheet/section, không để một file khổng lồ
- [ ] 16.5 Test builder: dữ liệu mẫu → workbook có đúng số sheet, đúng header, đúng số dòng
- [ ] 16.6 Mỗi route 1 PR ← (verify: tải file export từ UI, mở bằng Excel, so với file xuất từ bản trước: giống hệt về sheet/header/định dạng số)

## 17. Chốt phase 1

- [x] 17.1 Chạy trên **bản đã commit** (không phải working tree): format, lint, typecheck, `npm run build` (webpack) — sạch cả 4. 257 test pass; 7 suite fail đúng baseline pnpm/msw đã biết từ đầu
- [ ] 17.2 Smoke test: tra cứu lương, ký nhận, import, export attendance, export payroll, thưởng
- [x] 17.3 Đã làm cùng 22.1 (bảng **"Cập nhật lần 2"** trong `docs/audit/nextjs-backend-audit.md`) — hai task này trùng nhau, 17.3 chỉ hẹp hơn ở 3 tiêu chí. Trạng thái ghi trong bảng: **A5 Pass**, **A3 Partial**, **A2 Partial**, mỗi ô kèm căn cứ đo

---

# PHASE 2 — Ranh giới (P2). Chỉ bắt đầu khi phase 1 xong và không có nhánh dài hạn nào đang mở.

## 18. Gom `lib/` theo domain

- [x] 18.1 `git mv` các file payroll rời rạc vào `lib/payroll/`: `payroll-validation.ts`, `payroll-select.ts`, `payroll-field-definitions.ts`
- [x] 18.2 `git mv` file employee vào `lib/employee/`: `employee-parser.ts`, `cascade-update-employee.ts`
- [x] 18.3 `git mv` `lib/attendance-parser.ts` → `lib/attendance/attendance-parser.ts`
- [x] 18.4 8 file call site đổi sang `@/lib/<domain>/...`. Typecheck bắt thêm 2 import tương đối gãy sau khi move (`cascade-update-employee.ts` → `./audit-service`, `payroll-validation.ts` → `./api-error-handler`), đã đổi sang alias tuyệt đối
- [x] 18.5 Gộp 3 domain vào 1 lần move thay vì 3 PR: cả 3 nằm chung working tree chưa commit nên tách PR không giảm được rủi ro conflict
- [x] 18.6 `lib/advanced-excel-parser.ts` và `lib/enhanced-import-validation.ts` không bị đụng — `git status` xác nhận ← (verify: `npm run build` xanh; `git status` hiện đủ 6 dòng `R`; `git log --follow` chỉ kiểm chứng được sau khi commit vì đường dẫn mới chưa có commit nào)

## 19. Dời schema Zod inline

- [x] 19.1 `AssignPermissionSchema` → `lib/validations/admin-employee.ts`, đổi tên thành `DepartmentPermissionAssignSchema` cho khớp 3 schema anh em cùng file (`...Grant/Revoke/ListQuery`)
- [x] 19.2 `LoginSchema` inline bị **xoá hẳn** thay vì move: `AdminLoginRequestSchema` trong `lib/validations/auth.ts` đã là schema server dùng cho chính endpoint đó. Đã bổ sung `.trim()` + thông báo tiếng Việt vào schema server rồi cho form dùng chung — đúng tinh thần 19.4 hơn là giữ 2 schema song song. Hệ quả cố ý: form nay chặn username > 50 và password > 200 ngay tại client thay vì để server trả 400; username bị trim trước khi tra `admin_users`
- [x] 19.3 `app/api/admin/update-signature-date/route.ts` không còn `z.object(` inline
- [x] 19.4 Cả 2 schema export kèm type `z.infer` và đi qua barrel `lib/validations/index.ts` ← (verify: `grep -rn "z\.object(" app/` → 0 hit; format + lint + typecheck sạch)

## 20. ESLint boundaries

- [x] 20.1 Dùng `no-restricted-imports` (rule lõi của ESLint) thay vì `import/no-restricted-paths`: `eslint-plugin-import` **không phải dependency trực tiếp** của repo, nó chỉ tồn tại trong `node_modules` như dep bắc cầu của `eslint-config-next`. Rule lõi diễn đạt đủ ý mà không phải thêm dependency + sửa lockfile. Phạm vi áp: `components/**/*.{ts,tsx}` và `app/**/*.tsx` (rộng hơn `app/**/page.tsx` như kế hoạch, vì client component thường không phải là `page.tsx`); pattern chặn `**/utils/supabase/server`
- [x] 20.2 Cùng block, pattern `**/lib/*/*-repository`. Hiện có 0 vi phạm ở cả 2 rule nên thêm vào là thuần phòng ngừa, không phải sửa nợ
- [x] 20.3 **Đo được 1 vòng import** — nhưng không đo bằng `import/no-cycle`: bật rule đó cần thêm 2 devDependency (`eslint-plugin-import` + `eslint-import-resolver-typescript`) và cập nhật lockfile, mà repo đang cài bằng pnpm trong khi CI chạy `npm ci` → rủi ro làm đỏ CI cao hơn giá trị thu được. Thay bằng script dò vòng tự viết (đi 458 file `.ts/.tsx`, phân giải alias `@/` + đường dẫn tương đối, bỏ qua `import type` vì type-only bị xoá lúc compile nên không tạo vòng runtime). Kết quả: `lib/stores/mapping-config-store.ts` ↔ `lib/sync/mapping-config-sync.ts`
- [x] 20.4 Vá vòng đó bằng cách đảo chiều phụ thuộc: `mapping-config-sync.ts` không còn `import { useMappingConfigStore }`, thay bằng `registerConfigurationRefresher()` để store tự đăng ký hàm refresh lúc khởi tạo. Chiều còn lại (store → sync để gọi `syncManager.triggerXxx`) giữ nguyên. Đếm lại: **0 vòng**
- [x] 20.5 Nâng `@typescript-eslint/no-explicit-any` lên `"error"`: đếm trước khi nâng được **0 vi phạm** trên 471 file (`grep -rn ": any"` cũng 0 hit), nên nâng không tốn PR sửa nào ← (verify: file dò thử trong `components/` import cả `@/utils/supabase/server` lẫn `@/lib/employee/employee-repository` → lint báo đúng 2 error kèm thông báo tiếng Việt, đã xoá file dò sau khi kiểm; `npm run lint` toàn repo: 0 error 0 warning)

- [ ] 20.6 **Chưa làm, cần bạn quyết**: có thêm `eslint-plugin-import` + `eslint-import-resolver-typescript` vào `devDependencies` để `import/no-cycle` được CI chặn liên tục không? Hiện tại 0 vòng, nhưng không có gì ngăn vòng mới xuất hiện — script dò ở 20.3 là công cụ chạy tay, không nằm trong CI. Rủi ro: `npm install` sẽ ghi lại `package-lock.json` trong khi máy local đang cài bằng pnpm và repo còn cả `bun.lock`

## 21. Env validate eager

- [x] 21.1 Đã tạo `instrumentation.ts` ở root, kèm guard `process.env.NEXT_RUNTIME !== "nodejs"` để không chạy ở edge runtime (schema có `SUPABASE_SERVICE_ROLE_KEY`, biến này không chắc có mặt ở edge)
- [x] 21.2 Next 16.2.6 nhận file không cần flag: `npm run build` sinh `.next/server/instrumentation.js`, `required-server-files.json` không có `experimental.instrumentationHook`
- [x] 21.3 Chỉ có `.next/server/instrumentation.js`, **không** có `edge-instrumentation` → chỉ chạy phía Node. `grep -rl "SUPABASE_SERVICE_ROLE_KEY" .next/static/` → 0 file, secret không lọt vào client bundle
- [x] 21.4 Rà 11 file: chuyển `utils/supabase/server.ts` sang `getEnv()` (bỏ được 4 dấu `!` non-null assertion), và gom 3 chỗ so sánh `NODE_ENV` phía server về `isProduction()` (`proxy.ts:45`, `app/api/admin/login/route.ts:97`, `app/api/admin/departments/[departmentName]:218`). **Cố ý giữ nguyên 3 file**: `utils/supabase/client.ts` (chạy trong trình duyệt, `getEnv()` sẽ throw vì thiếu biến server-only), `utils/supabase/middleware.ts` (chạy trong proxy runtime, cùng lý do), `lib/config/jwt.ts` (là accessor chính thức theo CLAUDE.md, và `env.ts` re-export nó nên gọi ngược lại sẽ tạo vòng import) ← (verify: `JWT_SECRET="too-short" npx next start` → server **chết ngay lúc boot** với `An error occurred while loading instrumentation hook: Environment validation failed: JWT_SECRET: Invalid input`, chứ không phải lúc gọi API đầu tiên)

## 22. Chốt toàn bộ

- [x] 22.1 Đã chạy lại 14 tiêu chí và thêm bảng **"Cập nhật lần 2"** vào `docs/audit/nextjs-backend-audit.md`, mỗi ô kèm căn cứ đo chứ không phải tự chấm. Kết quả: **không còn tiêu chí nào Fail**; còn 4 Partial (A2, A3, Q1, Q4) và cả 4 đều chặn bởi nhóm 14/16. A4 chuyển sang **Không áp dụng** (xem 15.7)
- [x] 22.2 Mục **"Còn nợ"** ở cuối `docs/audit/nextjs-backend-audit.md`, tách riêng với mục "Không đề xuất" có sẵn (cái đó là _không nên làm_, cái này là _nên làm nhưng đã hoãn_), chia 3 phần: nợ kỹ thuật giữ nguyên có chủ đích (rate limit in-memory, ngưỡng theo IP chung, 3 file legacy >1000 dòng, `admin-dashboard-v2.tsx`), chỉ số đo sai đã sửa cách hiểu (A4, danh sách `select("*")`), và phần chặn bởi dữ liệu thật.

  **Phát hiện khi viết mục này**: kế hoạch ghi nhận bẫy "truy vấn DB nằm giữa phần dựng sheet" chỉ ở `attendance-export`. Kiểm lại thì `payroll-export` **giống hệt** — workbook tạo ở dòng 251, worksheet ráp ở dòng 491, giữa hai mốc có 2 truy vấn (`signature_logs:289`, `management_signatures:357`). Tức **cả nhóm 16 chứ không riêng 16.1** đều không phải là rút hàm cơ học

- [x] 22.3 Kiểm ràng buộc DB (D0) trên bản đã commit: `git diff main --stat -- scripts/supabase-setup/ scripts/*.sql` **rỗng**. Không một file `.sql` nào bị sửa qua toàn bộ 22 nhóm
- [ ] 22.4 Archive change này sang `openspec/changes/archive/2026-08-01-refactor-backend-architecture/` theo đúng quy ước repo ← (verify: scorecard mới không còn ô Fail nào ở nhóm P0; CI xanh; `npm run build` xanh; không có file `.sql` nào bị sửa)
