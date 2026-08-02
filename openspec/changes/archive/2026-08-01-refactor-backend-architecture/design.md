## Context

Repo là monolith Next.js 16 App Router, layer-first (`app/` · `lib/` · `components/` · `utils/`), không ORM — truy cập DB bằng `@supabase/ssr` qua `createServiceClient()` gọi tại chỗ ở ~70 route handler. Không có server action nào; toàn bộ backend là 78 route handler, client dùng TanStack Query.

Ba ràng buộc định hình cách làm, đều nằm trong `CLAUDE.md`:

1. **Thêm dependency là rủi ro thật.** Repo hỗ trợ Safari 12 qua `browserslist` + danh sách `transpilePackages` dài trong `next.config.mjs`; package ship syntax hiện đại làm trắng trang máy khách hàng. Kế hoạch này chỉ thêm đúng `server-only` — package không có runtime code, không vào client bundle.
2. **Build production dùng webpack** (`next build --webpack`), không turbopack. Mọi bước "chạy build để bắt leak" phải là `npm run build`.
3. **File code mới < 200 dòng, không comment trong code, timestamp qua `getVietnamTimestamp()`, input validate bằng Zod ở `lib/validations/`.** Refactor phải tuân, không được lấy file 500-1000 dòng hiện có làm mẫu.

Ràng buộc vận hành: `npm test` local fail 8/22 suite do `node_modules` cài bằng pnpm trong khi `transformIgnorePatterns` khớp layout npm — **không phải lỗi kiến trúc**. Chuẩn xanh/đỏ lấy theo CI (`npm ci`).

Điểm tựa sẵn có, tận dụng thay vì viết mới:

- `lib/validations/{common,employee,payroll,bonus,auth,admin-employee}.ts` + `errors.ts` (`parseSchema`, `parseSchemaOrThrow`, `createValidationErrorResponse`).
- `lib/auth-middleware.ts` với `verifyToken` / `verifyAdminAccess` (`:100`) / `authorizeRoles`.
- `lib/security-middleware.ts` với `rateLimit(type)` (`:18`) và `csrfProtection` (`:63`).
- `lib/api-error-handler.ts` với `ApiResponse` + `ErrorCodes` + `getUserFriendlyMessage`.
- `lib/bonus/bonus-signature-service.ts:13-19` — service nhận `supabase` qua tham số, đúng hướng, dùng làm khuôn.
- `lib/payroll-select.ts` — hằng danh sách cột `PAYROLL_SELECT_CORE` / `_T13` / `_MONTHLY`.

## Goals / Non-Goals

**Goals:**

- Đóng 3 BLOCKER P0 trong PR đầu tiên, tổng thay đổi ~30 dòng.
- Mọi boundary nhận user input đi qua Zod; không còn if-check tay.
- Có một khuôn service/repository nhân bản được cho payroll và employee, giống `bonus-signature-service`.
- Logic nghiệp vụ rút khỏi route handler trở thành hàm thuần test được, có test kèm ngay trong PR rút hàm.
- Mỗi bước là 1 PR review được trong một lần ngồi; rollback = revert 1 commit.

**Non-Goals:**

- `src/features/` + clean 4 layer đầy đủ (`application/ports/`, `domain/`, `infrastructure/`). Chi phí di chuyển 430 file lớn hơn lợi ích; gom domain trong `lib/` đạt phần lớn giá trị.
- IoC container, `next-safe-action`, đổi Supabase client sang Prisma/Drizzle, tách microservice, `@t3-oss/env-nextjs`. Lý do từng mục ghi trong `docs/audit/nextjs-backend-audit.md` mục "Không đề xuất".
- **Mọi thay đổi ở tầng database.** Ràng buộc cứng, xem D0.
- Refactor 3 file legacy đang vi phạm quy ước (`admin-dashboard-v2.tsx`, `lib/enhanced-import-validation.ts`, `lib/advanced-excel-parser.ts` 1159 dòng) — ngoài phạm vi audit này.
- Thay `rateLimitStore` in-memory bằng Redis. Ghi nhận giới hạn, không xử lý ở đây.

## Decisions

### D0 — Không đụng database (ràng buộc cứng, chi phối mọi quyết định sau)

Change này **chỉ sửa code TypeScript**. Cụ thể là KHÔNG:

- thêm/sửa file trong `scripts/supabase-setup/*.sql`, không chạy migration nào;
- tạo/xoá/đổi tên bảng, cột, index, constraint, RLS policy, trigger, SQL function;
- chạy `UPDATE`/`INSERT`/`DELETE` sửa dữ liệu sẵn có, backfill hay script dọn dữ liệu;
- đổi khoá trùng khi import (`employee_id`, `salary_month`) hay bất kỳ hợp đồng dữ liệu nào.

Phần duy nhất chạm tới DB là **cách code truy vấn**: thay `select("*")` bằng danh sách cột (nhóm 14) và gom truy vấn vào repository (nhóm 11, 15). Cả hai đọc đúng dữ liệu cũ, không ghi gì thêm, và có thể revert bằng đúng một commit.

Hệ quả lên các quyết định khác:

- **D6** không được "chuẩn hoá cột" hay bỏ cột thừa ở DB — chỉ liệt kê cột đang có.
- **D7** chỉ thêm `IP_SALT` vào Zod env schema; hash IP cũ trong dữ liệu để nguyên, không migrate (đã ghi ở tasks 3.5).
- Nếu một bước refactor hoá ra **bắt buộc** phải đổi DB mới làm được, bước đó **dừng lại và hỏi**, không tự làm.

### D1 — Thêm `AppError` **bọc lên trên** `ApiErrorHandler`, không thay thế

`ApiResponse` và `ErrorCodes` đang là hợp đồng thực tế với client (`lib/hooks/**` đọc theo shape này). Đổi envelope một lượt cho 78 route là big-bang và sẽ vỡ hook.

Chọn: `lib/errors/app-error.ts` định nghĩa `AppError` + subclass, và `toErrorResponse(err)` **map ngược về `ApiResponse` sẵn có** với `ErrorCodes` cũ. Route migrate dần theo nhóm; route chưa migrate vẫn chạy y như cũ.

Đã cân nhắc và loại: (a) viết envelope mới `{ ok, error }` — vỡ toàn bộ hook; (b) sửa thẳng `ApiErrorHandler` thành class error — trộn hai trách nhiệm trong một file đang được 2 route dùng thật.

### D2 — Repository nhận `supabase` qua tham số, không singleton, không DI container

Signature chuẩn của repo này:

```ts
export async function findEmployeeAuthRecord(
  supabase: SupabaseServiceClient,
  employeeId: string,
): Promise<EmployeeAuthRecord | null>;
```

Lý do: `bonus-signature-service.ts:13-19` đã làm đúng vậy và test được; `supabase-js` là HTTP client stateless nên singleton không mang lại lợi ích như Prisma pool; truyền tham số là DI đủ dùng, không cần container.

Hệ quả: A4 (client singleton) tự đóng theo A3 — số nơi gọi `createServiceClient()` giảm dần khi repository nhận client từ route.

### D3 — Gom domain trong `lib/`, không dựng `src/features/`

`lib/bonus/` và `lib/excel/` đã chứng minh cách gom này chạy được trong repo. Phase 2 nhân rộng: `lib/payroll/`, `lib/employee/`, `lib/attendance/`. Dùng `git mv` để giữ history, mỗi domain 1 PR, chỉ đổi import path (`@/*` alias đã có).

Điều kiện xét lại `src/features/`: có ≥2 team cùng sửa repo, hoặc số route vượt ~120.

### D4 — `server-only` gắn từ dưới lên, build là bộ dò leak

Thứ tự: `utils/supabase/server.ts` trước, rồi `lib/auth.ts`, `lib/audit-service.ts`, `lib/cascade-update-employee.ts`, `lib/bonus/bonus-signature-status.ts`, `lib/management-signature-utils.ts`, `lib/auth-middleware.ts`, `lib/config/jwt.ts`.

Sau mỗi lần thêm chạy `npm run build`: chỗ nào build fail là chỗ đang có client component import nhầm module server — đó là leak thật, sửa tại chỗ. Nếu build xanh ngay từ đầu thì rào chắn vẫn có giá trị phòng ngừa cho code sau này.

Chốt chặn thứ hai ở phase 2: ESLint cấm `components/**` và `app/**/page.tsx` import `@/utils/supabase/server`.

### D5 — `check-password-status`: làm response đồng nhất, không bỏ endpoint

Endpoint đang được luồng "quên mật khẩu"/đăng nhập lần đầu dùng thật, nên không bỏ được. Cách vá: trả cùng một status + cùng tập field cho cả trường hợp mã NV tồn tại lẫn không tồn tại, cộng rate limit. Kẻ tấn công mất khả năng dò danh sách mã NV; người dùng thật không thấy khác biệt.

Đã cân nhắc và loại: yêu cầu JWT cho endpoint này — không khả thi, nó chạy **trước** khi người dùng đăng nhập.

### D6 — `select("*")`: mở rộng hằng trong `lib/payroll-select.ts`, không viết mapper thủ công

21 chỗ `select("*")` trong `app/` + `lib/`. Thay bằng hằng danh sách cột giữ nguyên shape response (client vẫn đọc đúng field cũ), chi phí thấp hơn hẳn viết hàm map DTO cho 45 cột. Thêm `PAYROLL_SELECT_DETAIL` và một hằng tương ứng cho `employees`.

Kiểm chứng bắt buộc trước khi merge: diff key của JSON response trước/sau cho từng endpoint đổi — thiếu cột là lỗi im lặng, TypeScript không bắt được vì query trả `any`-ish.

### D7 — Env validate eager qua `instrumentation.ts` (file chưa tồn tại, sẽ tạo)

`lib/config/env.ts` đang validate lazy nên thiếu env chỉ vỡ lúc runtime. Tạo `instrumentation.ts` ở root, trong `register()` gọi `getEnv()` — Next.js chạy file này một lần khi server khởi động, chỉ phía server, không vào client bundle. `IP_SALT` thêm vào `envSchema` cùng lúc.

Đã cân nhắc và loại: `@t3-oss/env-nextjs` — thêm dependency kéo theo rủi ro `transpilePackages`/Safari 12 cho đúng thứ 10 dòng code tự viết là xong.

### D8 — Thứ tự thực thi và điều kiện vào phase sau

Phase 0 (nhóm 1-8) làm hết trước, mỗi nhóm 1 PR, không xen kẽ phase 1. Điều kiện vào phase 1: toàn bộ nhóm 1-8 đã merge, CI xanh, và đã smoke test 3 luồng chính (tra cứu lương, ký nhận, import lương).

Trong phase 1, nhóm 9 (`AppError`) đi trước nhóm 10-15 vì các nhóm sau đều dùng nó khi rút hàm.

Phase 2 chỉ bắt đầu khi phase 1 xong: bật ESLint boundaries trước khi có cấu trúc để enforce là tự tạo hàng loạt warning vô nghĩa.

### D9 — Repository: **chưa cần** interface/port (kết luận task 15.6, chốt sau khi có 3 repository thật)

Hiện có 3 chỗ đóng vai repository: `lib/employee/employee-repository.ts`, `lib/payroll/payroll-list-query.ts`, `lib/bonus/bonus-repository.ts`. Câu hỏi 15.6 đặt ra là có nên rút thành `interface EmployeeRepository { ... }` rồi cho hàm nhận port thay vì hàm cụ thể không.

**Kết luận: chưa cần.** Ba lý do, đo trên code thật chứ không theo nguyên tắc chung:

1. **Không có implementation thứ hai, kể cả trong test.** Test của cả 3 repository (`employee-repository.test.ts`, `bonus-repository.test.ts`) mock ở tầng **`supabase` client** — giả `from().select().eq()` — chứ không giả repository. Port chỉ có giá trị khi cần thay implementation; ở đây điểm thay thế đã nằm thấp hơn một tầng rồi.
2. **Tham số `supabase` đã là DI.** Theo D2, mọi hàm repository nhận client qua tham số. Muốn đổi nguồn dữ liệu thì truyền client khác, không cần lớp trừu tượng nữa.
3. **Interface sẽ phải khai lại từng hàm hai lần.** Với 5 hàm của bonus và 1 của employee, cái giá là ~60 dòng khai báo trùng lặp đổi lấy một khả năng chưa ai cần.

**Điều kiện xét lại** — bất kỳ điều nào sau đây xảy ra thì mở lại quyết định này:

- xuất hiện nguồn dữ liệu thứ hai cho cùng một domain (đọc từ cache/Redis, hoặc gọi service ngoài);
- có test cần giả **hành vi nghiệp vụ** của repository chứ không phải hình dạng dữ liệu (ví dụ "lần gọi thứ 3 thì timeout");
- tách microservice thật, lúc đó port là ranh giới tiến trình chứ không còn là ranh giới module.

## Risks / Trade-offs

| Rủi ro                                                                              | Ảnh hưởng                                           | Cách giảm                                                                                                                                                 |
| ----------------------------------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bỏ `details` khỏi error response làm mất thông tin debug của luồng import           | Admin khó chẩn đoán lỗi import Excel                | Giữ `details` khi `NODE_ENV !== "production"`; ở production log đầy đủ phía server. `admin/bonus-import` (`:281-286`) là caller phải kiểm tay sau khi đổi |
| Zod hóa 17 route đổi mã lỗi trả về (từ tự chế sang `createValidationErrorResponse`) | Hook trong `lib/hooks/` hiển thị sai thông báo      | Mỗi PR route phải mở hook tương ứng kiểm; ưu tiên giữ nguyên HTTP status, chỉ đổi body                                                                    |
| Bật `csrfProtection` cho 37 route có thể chặn caller không phải trình duyệt         | Script nội bộ / tool import ngừng chạy              | Rà caller trước khi bật từng route; `csrfProtection` dựa trên `Origin`/`Referer` nên chỉ trình duyệt tự pass                                              |
| `git mv` gom `lib/` theo domain gây conflict lớn với nhánh đang mở                  | Nhánh feature khác merge đau                        | Làm phase 2 khi không có nhánh dài hạn nào mở; mỗi domain 1 PR merge nhanh                                                                                |
| Thay `select("*")` thiếu cột                                                        | Field biến mất khỏi UI mà không có lỗi              | Diff key JSON trước/sau cho từng endpoint, ghi kết quả vào PR                                                                                             |
| `rateLimit` dùng `Map` in-memory                                                    | Reset khi deploy; không chia sẻ giữa nhiều instance | Chấp nhận trong scope này; vẫn tốt hơn không có gì. Ghi thành việc riêng nếu chuyển sang chạy nhiều instance                                              |
| Ngưỡng `login: 100 requests / 15 phút` đặt cao vì công ty dùng IP chung             | Rate limit yếu trước brute-force                    | Không đổi ngưỡng trong PR này (sẽ chặn người dùng thật); đề xuất riêng: rate limit theo `employee_id` thay vì theo IP                                     |
| Test local fail 8/22 suite do pnpm layout                                           | Nhầm là refactor làm vỡ test                        | Lấy CI (`npm ci`) làm chuẩn; ghi rõ trong mỗi PR                                                                                                          |
