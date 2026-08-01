# Bản đồ commit (task 9.5)

> **ĐÃ THỰC HIỆN — nhưng rút còn 3 commit, không phải 22.** Bản đồ chi tiết bên dưới **giữ nguyên** cho ai muốn tách lại bằng `git add -p`.
>
> | Commit    | Nội dung                                                           |
> | --------- | ------------------------------------------------------------------ |
> | `fe99866` | `style: format lại 4 file prettier bỏ sót`                         |
> | `aa00118` | `refactor: vá bảo mật và tách layer backend theo audit` — 143 file |
> | `813f40c` | `docs: spec refactor backend và cập nhật báo cáo audit`            |
>
> **Vì sao không tách được theo file** (thử rồi mới biết, ghi lại để khỏi thử lại):
>
> 1. File nằm ở nhiều nhóm — `lookup/route.ts` ở nhóm 1, 7, 10; `import-history` ở 4, 5, 6.
> 2. Quan trọng hơn: **nhóm 18 đổi đường dẫn 6 module**. Bất kỳ commit nào tách _trước_ nó mà đụng 8 file call site sẽ có import trỏ vào đường dẫn cũ → **không build được**. Commit không build được thì mất luôn giá trị chính của việc tách (bisect, revert từng phần).
>
> Nếu làm lại bằng `git add -p`: commit nhóm 18 phải đi **đầu tiên** trong loạt code, không phải cuối như ghi chú cũ ở cuối file.
>
> **Chưa push.** Đẩy lên remote cần người dùng duyệt.

Chuẩn bị sẵn để khi được duyệt là tách được ngay. Nhánh `refactor/backend-architecture`, 67 mục đang nằm chung trong working tree.

Thứ tự dưới đây là thứ tự commit — mỗi commit đứng một mình vẫn build được và test xanh.

## 1. `style: format lại 4 file prettier bỏ sót`

```
app/admin/column-mapping-config/page.tsx
components/admin/admin-session-provider.tsx
components/admin/admin-sidebar.tsx
lib/auth/secure-session.ts
```

Commit **đầu tiên và tách riêng**: 4 file này đã vi phạm prettier từ trước ở `main` (verify: `git show HEAD:<file> | prettier --check` fail cả 4), không liên quan refactor. Để lẫn vào sẽ làm diff nhóm 1 phình lên 420 dòng nhiễu. Xem task 9.6.

## 2. `fix: không trả stack trace và CCCD người dùng về client` (nhóm 1)

```
lib/api-error-handler.ts
lib/config/runtime.ts
lib/__tests__/api-error-handler.test.ts
app/api/employee/lookup/route.ts        (chỉ phần xoá field cccd)
```

BLOCKER S4. Ghi vào mô tả PR: `details` giờ chỉ có ở non-production; `admin/bonus-import` và `import-dual-files` không hiển thị field này nên không ảnh hưởng UI.

## 3. `fix: rào server-only cho 8 module chạm DB và secret` (nhóm 2)

```
package.json  package-lock.json
utils/supabase/server.ts
lib/auth.ts  lib/audit-service.ts  lib/cascade-update-employee.ts
lib/bonus/bonus-signature-status.ts  lib/management-signature-utils.ts
lib/auth-middleware.ts  lib/config/jwt.ts
```

BLOCKER S1. **Người deploy cần biết**: `pnpm-lock.yaml` chưa được cập nhật (store pnpm của máy lỗi EPERM), CI dùng `npm ci` nên vẫn xanh — xem task 2.1.

## 4. `fix: sửa lỗi precedence IP_SALT và đưa biến vào env schema` (nhóm 3)

```
lib/utils/hash-ip.ts  lib/utils/__tests__/hash-ip.test.ts
lib/config/env.ts
app/api/auth/forgot-password/route.ts
app/api/auth/change-password-with-cccd/route.ts
.env.example
```

**Chặn deploy nếu chưa set `IP_SALT` ≥16 ký tự.** Ghi rõ trong mô tả PR.

## 5. `refactor: dùng verifyAdminAccess và verifyToken thay verify jwt inline` (nhóm 4)

```
app/api/employees/update-cccd/route.ts
app/api/admin/import-history/route.ts
app/api/admin/import-dual-files/route.ts
```

Kèm ghi chú task 4.7 (4 handler admin chưa check role) để reviewer thấy.

## 6. `fix: apiClient đọc đúng shape lỗi từ createValidationErrorResponse` (nhóm 5.0)

```
lib/api/client.ts
lib/api/__tests__/error-from-parsed-body.test.ts
```

Tách riêng vì nó **sửa cho cả 28 route đã dùng shape này từ trước**, không chỉ phục vụ nhóm 5. Reviewer cần thấy độc lập.

## 7. `feat: validate mọi route mutate bằng zod schema` (nhóm 5)

```
lib/validations/{index,common,employee,payroll,admin-employee}.ts
lib/validations/__tests__/{admin-employee,signature-date,import-config,employee-request}.test.ts
app/api/employees/update-cccd/route.ts
app/api/admin/{update-signature-date,update-management-signature-date,departments}/route.ts
app/api/admin/payroll/[id]/route.ts
app/api/admin/column-aliases/route.ts        app/api/admin/column-aliases/[id]/route.ts
app/api/admin/mapping-configurations/route.ts
app/api/admin/import-history/route.ts
app/api/admin/advanced-upload/route.ts
app/api/admin/export-import-errors/route.ts
```

Diff lớn nhất. Nếu reviewer thấy nặng thì tách đôi theo `app/api/admin/**` và phần còn lại.

Kèm phần 5.17-5.18 (3 handler `POST` bị sót): `lib/validations/__tests__/payroll-stats-request.test.ts` và **phần `POST`** của `app/api/payroll/{my-data,my-department,my-departments}/route.ts`. Ba file route này cũng xuất hiện ở commit 11 — `git add -p`, lấy hunk `POST` ở đây và hunk `GET`/select ở đó.

## 8. `feat: chuẩn hóa query param bằng pageQuerySchema` (nhóm 6)

```
lib/validations/common.ts  lib/validations/attendance.ts
lib/validations/__tests__/page-query.test.ts
app/api/payroll/{my-data,my-department,my-departments}/route.ts
app/api/employee/{salary-history,check-password-status}/route.ts
app/api/admin/payroll/audit/[id]/route.ts
app/api/admin/{attendance-employees,password-reset-history,import-history,column-aliases,mapping-configurations}/route.ts
app/api/admin/employees/[id]/audit-logs/route.ts
app/api/employees/all-employees/route.ts
```

Kèm câu quan trọng trong mô tả: **`salary-history:169` là chỗ echo CCCD thứ hai, audit bỏ sót** (task 6.9).

## 9. `fix: rate limit endpoint công khai và đóng oracle dò mã nhân viên` (nhóm 7-8)

```
app/api/employee/lookup/route.ts
app/api/employee/check-password-status/route.ts
app/api/auth/forgot-password/route.ts
app/api/auth/change-password-with-cccd/route.ts
```

Ghi giới hạn đã biết: `rateLimitStore` in-memory, reset khi deploy.

## 10. `refactor: tách AppError, repository và service của employee` (nhóm 10.1-10.5, 11, 12, 13)

```
lib/errors/  lib/employee/
lib/validations/errors.ts  lib/validations/index.ts  (ParseFailure)
lib/validations/__tests__/parse-schema-or-throw.test.ts
app/api/employee/{lookup,check-password-status,sign-bonus}/route.ts
```

Điểm cần nêu: `lookup/route.ts` **487 → 199 dòng**; và bug `bcrypt.compare` với hash `null` (task 11.8) được vá trong commit này.

## 11. `refactor: gom select và filter của danh sách lương` (nhóm 15.1-15.2)

```
lib/payroll/
app/api/payroll/{my-data,my-department,my-departments}/route.ts
```

Ghi kèm task 15.8 (bug count query phân trang) để reviewer biết chỗ đó **cố ý chưa vá**.

## 12. `fix: xác thực trả sai mật khẩu thay vì lỗi 500 khi cột hash rỗng` (nhóm 11.10-11.14)

```
lib/auth/employee-credential.ts
lib/auth/__tests__/employee-credential.test.ts
lib/auth.ts
lib/employee/lookup-service.ts
app/api/auth/change-password-with-cccd/route.ts
app/api/auth/forgot-password/route.ts
app/api/employee/{change-password,sign-salary,salary-history,sign-bonus}/route.ts
```

Gộp 7 bản sao của quy tắc chọn hash về một helper. Ghi vào mô tả PR: `forgot-password` **cố ý** giữ nguyên ngữ nghĩa "luôn xác thực bằng CCCD", chỉ thêm guard null — reviewer dễ tưởng đây là chỗ bỏ sót.

## 13. `chore: chặn import xuyên tầng và vá vòng import bằng ESLint` (nhóm 20)

```
eslint.config.mjs
lib/sync/mapping-config-sync.ts
lib/stores/mapping-config-store.ts
```

Nêu trong PR: 0 vi phạm ở cả 3 rule mới nên đây là chốt chặn phòng ngừa. Vòng import `store ↔ sync` được phá bằng `registerConfigurationRefresher()` — reviewer cần kiểm rằng store vẫn tự đăng ký lúc module load, nếu không sync sẽ im lặng không refresh.

## 14. `feat: validate biến môi trường ngay lúc khởi động server` (nhóm 21)

```
instrumentation.ts
utils/supabase/server.ts
proxy.ts
app/api/admin/login/route.ts
app/api/admin/departments/[departmentName]/route.ts
```

Nêu trong PR: từ nay thiếu/sai env là **server không boot** thay vì lỗi ở request đầu tiên — deploy nào đang thiếu biến sẽ lộ ra ngay. `utils/supabase/client.ts` và `utils/supabase/middleware.ts` cố ý không đổi.

## 15. `refactor: dồn schema zod của form về lib/validations` (nhóm 19)

```
lib/validations/{auth,admin-employee,index}.ts
app/admin/login/admin-login-form.tsx
app/admin/department-management/assign-permissions/page.tsx
```

Nêu trong PR: form đăng nhập nay dùng chung `AdminLoginRequestSchema` với API, nên **có thêm ràng buộc mới ở client** (username ≤ 50, password ≤ 200, username bị trim).

## 16. `refactor: gom lib theo domain` (nhóm 18)

```
lib/payroll/{payroll-select,payroll-validation,payroll-field-definitions}.ts
lib/employee/{employee-parser,cascade-update-employee}.ts
lib/attendance/attendance-parser.ts
+ 8 file call site
```

Commit này **chỉ được chứa rename + đổi đường dẫn import**, không lẫn thay đổi logic — nếu không `git log --follow` sẽ khó đọc. Kiểm bằng `git diff --cached -M` phải thấy toàn dòng `rename from/to`.

## 17. `fix: lấy tháng và năm mặc định theo giờ Việt Nam thay vì UTC` (nhóm 5.16)

```
lib/utils/vietnam-timezone.ts
lib/utils/__tests__/vietnam-timezone.test.ts
app/api/admin/{dashboard-stats,departments,departments/[departmentName],payroll-export-template,sync-template,data-validation,update-signature-date,generate-import-template,attendance-export,payroll-export,unsigned-employees-export}/route.ts
app/api/payroll/{my-data,my-department,my-departments}/route.ts
```

Nêu trong PR: từ 00:00-07:00 giờ Việt Nam ngày mùng 1, dashboard và bộ lọc mặc định đang hiện **tháng trước**. Kèm 1 bug riêng: `setMonth(getMonth() - 6)` gọi vào ngày 31 bị `Date` tự tràn sang tháng khác.

## 18. `refactor: employee route dùng toErrorResponse` (nhóm 10.6)

```
lib/errors/app-error.ts
lib/errors/__tests__/app-error.test.ts
app/api/employee/{bonuses,check-password-status,detail,salary-history,sign-bonus,sign-salary,change-password}/route.ts
```

Nêu trong PR: `toErrorResponse` nhận thêm `fallbackMessage` + `headers` — **bắt buộc**, nếu không migrate sẽ nuốt mất message tiếng Việt theo ngữ cảnh và `CACHE_HEADERS.sensitive` của route.

## 19. `refactor: mọi catch block trả lỗi qua toErrorResponse` (nhóm 10.7-10.8)

```
app/api/payroll/**/route.ts        (5 file)
app/api/admin/**/route.ts          (28 file)
app/api/{auth,bonuses,employees,management-signature,signature-*,bonus-management-signature,api-docs}/**/route.ts
```

Diff rộng nhất của cả đợt — 97 chỗ. Nêu trong PR: **body lỗi là cộng thêm field, không mất field nào**; `apiClient` đọc được cả hai dạng nên client không sửa gì. Riêng `app/api/payroll/**` có đổi hành vi nhỏ: response 500 nay kèm `CACHE_HEADERS.sensitive` (trước đây thiếu, nên lỗi của endpoint lương cache được).

## 20. `refactor: bỏ select(*) ở các query chỉ dùng nội bộ` (nhóm 14.11, 14.15-14.17)

```
lib/auth.ts
lib/bonus/bonus-select.ts
lib/bonus/{bonus-signature-service,bonus-signature-status}.ts
lib/management-signature-utils.ts
app/api/employee/change-password/route.ts
```

Chỉ gồm những chỗ **chứng minh được bằng code trong repo** cột nào đang dùng. Nêu trong PR: `verifyEmployeeCredentials` bị xoá (0 caller, query sai bảng); `verifyAdminCredentials` đổi kiểu trả về sang `Pick<...>` nên bỏ được `as AdminUser`.

## 21. `refactor: gom truy cập DB của bonus vào bonus-repository` (nhóm 15.4-15.6)

```
lib/bonus/bonus-repository.ts
lib/bonus/__tests__/bonus-repository.test.ts
lib/bonus/{bonus-signature-service,bonus-signature-status}.ts
openspec/changes/refactor-backend-architecture/design.md   (mục D9)
```

Nêu trong PR: `lib/bonus/` từ 5 chỗ gọi `.from()` xuống 0. **Không** kỳ vọng số `createServiceClient()` giảm — xem task 15.7, chỉ số đó đặt sai từ đầu.

## 22. `docs: kế hoạch refactor backend và cập nhật báo cáo audit`

```
openspec/changes/refactor-backend-architecture/
docs/audit/nextjs-backend-audit.md   (cần git add -f, docs/ bị gitignore)
```

---

## Lưu ý khi thực hiện

- Nhiều file xuất hiện ở **nhiều commit** (`lookup/route.ts` ở commit 2, 9, 10; `import-history` ở 5, 7, 8). Phải dùng `git add -p` để tách hunk, không `git add` cả file.
- **Commit 16 (nhóm 18) phải đi cuối cùng trong loạt refactor**, sau 13-15. Lý do: nó đổi đường dẫn của 6 file mà các commit trước cũng chạm vào; làm ngược lại thì mọi commit sau phải sửa lại đường dẫn import.
- Cách nhanh hơn nếu chấp nhận được: gộp thành **3 commit** theo phase — `fix:` bảo mật (2-6, 9, 12, 17), `feat:` validate (7-8, 14), `refactor:` tách layer (10-11, 13, 15, 16, 18, 19, 20, 21) — rồi commit 1 và 22 vẫn để riêng.
- Sau mỗi commit chạy `npm run typecheck && npx jest` để chắc commit đó đứng một mình vẫn xanh.
