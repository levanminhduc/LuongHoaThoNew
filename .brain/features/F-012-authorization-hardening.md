# F-012 Siết phân quyền: gán chức vụ, sửa lương, thống kê phòng ban (Đợt 1 bảo mật)

Status: DONE (APPROVED 2026-11-15) <!-- bạn đổi thành APPROVED để /go chạy. DOC = chỉ giữ làm tài liệu, không chạy -->
Related: F-002 extends · F-004 extends · F-009 extends · F-001 extends
Complexity: standard
Risk: high
Session model: opus

Nguồn: `docs/superpowers/plans/2026-11-15-security-remediation-plan.md` Đợt 1 · `docs/audit/2026-11-15-security-scan-requirements.md` SEC-01, SEC-02, SEC-03.

## 1. Problem & goal

Hiện tại API chỉ kiểm role của người gọi, không kiểm người bị tác động:

- `van_phong` tạo/gán được chức vụ `admin`, `giam_doc` (chỉ `nguoi_lap_bieu` bị chặn — `app/api/admin/employees/route.ts:266`, `[id]/route.ts:16,60`); ai cũng tự sửa được chính mình; `nguoi_lap_bieu` đổi được mật khẩu/CCCD của `truong_phong`, `van_phong`.
- Nhân viên có `chuc_vu = 'admin'` đăng nhập sẽ mang role admin (`lib/auth.ts:195`).
- `truong_phong` sửa được lương của phòng khác; sửa được phiếu đã ký; `updates` là `z.record` không kiểm kiểu (`app/api/admin/payroll/[id]/route.ts:129`, `lib/validations/payroll.ts:291`).
- `GET /api/admin/departments?include_stats=true` trả tổng lương toàn công ty cho `nhan_vien` và `van_phong` (`app/api/admin/departments/route.ts:184-225`).

Xong = mọi thao tác trên bị chặn bằng 403/409/400 rõ ràng, giao diện chỉ hiện chức vụ người dùng được phép gán, các luồng hợp lệ chạy như cũ.

## 2. Scope

- In:
  - Chính sách quản lý nhân viên dùng chung FE + BE (`lib/auth/role-policy.ts`).
  - `EmployeeRoleSchema` loại `admin`; đăng nhập từ chối nhân viên `chuc_vu = 'admin'`.
  - Áp chính sách cho POST/PUT/DELETE nhân viên + UI chọn chức vụ, nút tạo/xoá.
  - PUT lương: kiểm phòng ban, chặn phiếu đã ký (409), schema `updates` chặt (key lạ / sai kiểu → 400); chuyển logic xuống service.
  - GET phòng ban: `nhan_vien` → 403; `van_phong` không nhận trường lương.
- Out (cố ý không làm):
  - Đổi 401 → 403 của `verifyEmployeeManagementAccess` (SEC-43, Đợt 6).
  - CHECK constraint `chuc_vu <> 'admin'` trong DB (Đợt 2, migration 38). Không tự sửa nhân viên đang có `chuc_vu = 'admin'` nếu có.
  - Ghi audit lương nguyên tử với update (cần RPC) — giữ hành vi hiện tại, ghi vào BACKLOG.
  - Lọc danh sách GET nhân viên theo chính sách; refactor tổng thể các route đang vượt 100 dòng.

## 3. Acceptance criteria

Chính sách (`MANAGEABLE_ROLES`): `admin` → mọi role trừ `admin`; `van_phong` → `truong_phong`, `to_truong`, `nhan_vien`; `nguoi_lap_bieu` → `to_truong`, `nhan_vien`; role khác → không gì. Tạo/xoá: chỉ `admin`, `van_phong`.

- Là admin hệ thống, tôi muốn không ai tự nâng quyền để dữ liệu lương không bị lộ
  - Given `van_phong`, When POST nhân viên `chuc_vu: "admin"`, Then 400 (zod).
  - Given `van_phong`, When POST `chuc_vu: "giam_doc"` hoặc `"ke_toan"`, Then 403.
  - Given `van_phong`, When POST `chuc_vu: "to_truong"`, Then 201.
  - Given `nguoi_lap_bieu`, When POST bất kỳ, Then 403.
  - Given `van_phong`, When PUT chính mình (kể cả không đổi chức vụ), Then 403.
  - Given `nguoi_lap_bieu`, When PUT đổi mật khẩu của nhân viên đang là `truong_phong` hoặc `van_phong`, Then 403.
  - Given `nguoi_lap_bieu`, When PUT `to_truong` → `nhan_vien`, Then 200.
  - Given `van_phong`, When PUT nhân viên `nhan_vien` → `giam_doc`, Then 403.
  - Given `van_phong`, When DELETE nhân viên `ke_toan`, Then 403; DELETE `nhan_vien` → 200.
  - Given `admin`, When PUT/DELETE nhân viên bất kỳ (kể cả đang mang `chuc_vu = 'admin'` để hạ quyền), Then thành công.
  - Given nhân viên `chuc_vu = 'admin'` trong DB, When đăng nhập đúng mật khẩu, Then thất bại với thông báo chung.
  - Given UI tạo/sửa nhân viên, When người dùng là `van_phong`, Then dropdown chức vụ chỉ có `truong_phong`, `to_truong`, `nhan_vien`; `nguoi_lap_bieu` không thấy nút tạo/xoá.
- Là trưởng phòng, tôi chỉ sửa được lương phòng mình quản lý
  - Given `truong_phong` có `allowed_departments = [A]`, When PUT phiếu lương của nhân viên phòng B, Then 403.
  - Given phiếu `is_signed = true`, When PUT (admin hoặc truong_phong), Then 409 "Phiếu lương đã ký, không sửa được".
  - Given `updates` có key không nằm trong danh sách cột được sửa, When PUT, Then 400.
  - Given cột số nhận giá trị chuỗi, When PUT, Then 400.
  - Given phiếu chưa ký, phòng hợp lệ, dữ liệu đúng, When PUT, Then 200 và có dòng `payroll_audit_logs`.
- Là kế toán/giám đốc, số liệu lương phòng ban chỉ người có thẩm quyền xem
  - Given `nhan_vien`, When GET `/api/admin/departments`, Then 403.
  - Given `van_phong`, When GET `include_stats=true`, Then mỗi phòng có số người/số phiếu nhưng không có `totalSalary`, `averageSalary`.
  - Given `truong_phong`, When GET `include_stats=true`, Then chỉ phòng trong `allowed_departments` (như hiện tại) và có trường lương.

## 4. Contracts

- API: `~ POST /api/admin/employees` (owner F-002) — thêm 403 theo chính sách; `nguoi_lap_bieu` không tạo được nữa.
- API: `~ PUT, DELETE /api/admin/employees/[id]` (owner F-002) — 403 khi tự sửa / sửa ngoài phạm vi / gán chức vụ ngoài phạm vi.
- API: `~ PUT /api/admin/payroll/[id]` (owner F-004) — thêm 403 (phòng ban), 409 (đã ký), 400 (key lạ / sai kiểu). Request shape `{ updates, changeReason }` giữ nguyên.
- API: `~ GET /api/admin/departments` (owner F-009) — `nhan_vien` 403; `van_phong` bỏ trường lương trong stats.
- API: `~ POST /api/admin/login` (owner F-001) — từ chối nhân viên `chuc_vu = 'admin'`.
- Code: `+ lib/auth/role-policy.ts` — `MANAGEABLE_ROLES`, `getManageableRoles(role)`, `canCreateEmployee(role)`, `canDeleteEmployee(actor, target)`, `canManageEmployee(actor, target)`, `canAssignRole(actor, target | null, newRole)`. Thuần, không I/O, không `server-only` (FE dùng chung).
- Code: `+ lib/auth/department-scope.ts` — `assertDepartmentAccess(auth, department)` ném `AppError` 403.
- Code: `+ lib/payroll/payroll-update-service.ts` — `updatePayrollRecord(auth, payrollId, { updates, changeReason }, { clientIp })`; tự lấy client qua `createServiceClient()`.
  Amended (S1): chữ ký 4 tham số theo test; actor cho service nhân viên là tham số cuối `actor: { role, employeeId }` của `updateEmployee(supabase, currentId, input, adminAudit, actor)` và `removeEmployee(supabase, employeeId, adminAudit, actor)`.
- Code: `+ lib/department/department-stats-access.ts` — `SALARY_STATS_ROLES`, `redactSalaryStats(role, stats)`.
- Validation: `+ EMPLOYEE_ROLES`, `+ EmployeeRoleSchema` trong `lib/validations/common.ts`; `= RoleSchema`, `= ROLES` (giữ nguyên, nơi khác còn dùng). `~ EmployeeCreateRequestSchema`, `EmployeeUpdateRequestSchema` dùng `EmployeeRoleSchema`. `~ PayrollUpdateRequestSchema.updates` chặt theo danh sách cột.
- Data: `= employees`, `= payrolls`, `= payroll_audit_logs`, `= department_permissions` (không migration).
- FE: `~ EmployeeForm` (`app/admin/employee-management/components/EmployeeForm.tsx`) — thay prop `restrictedRoles` bằng `assignableRoles`; `~ EmployeeManagementModal`, `~ app/admin/employee-management/page.tsx`; `= useAdminSession` (owner ui-admin).
- `= lib/constants/role-labels.ts getRoleRank` — KHÔNG dùng cho phân quyền (đó là thứ tự hiển thị, `van_phong` đứng cuối).

## 5. Overlap check

| Việc liên quan                                 | Chồng ở đâu                                                                                            | Quyết định                                                                                                                    |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| F-002 Quản lý nhân viên                        | POST/PUT/DELETE nhân viên, `employee-update-service.ts`, `employee-removal-service.ts`, `EmployeeForm` | extend — thêm kiểm quyền, xoá `restrictedRoles` / `ROLES_NGUOI_LAP_BIEU_CANNOT_ASSIGN`                                        |
| F-004 Sửa lương admin                          | PUT `/api/admin/payroll/[id]`, `payroll-repository.ts`                                                 | extend — thêm phòng ban/đã ký/schema; tách logic ra service                                                                   |
| F-009 Phòng ban                                | GET `/api/admin/departments`                                                                           | extend — chỉ thêm chặn role + ẩn trường lương; chỉ `useManagerDepartmentsQuery` (truong_phong) gọi, không ảnh hưởng nhân viên |
| F-001 Đăng nhập                                | `lib/auth.ts authenticateUser`                                                                         | extend — một nhánh từ chối                                                                                                    |
| D-006 verifyAdminAccess 403                    | mã lỗi sai role                                                                                        | tôn trọng: kiểm tra mới trả 403; không sửa helper cũ (Đợt 6)                                                                  |
| D-003 / D-004 route mỏng + zod                 | 3 route đang > 100 dòng (357/303/441)                                                                  | logic mới đặt ở `lib/`, route chỉ được ngắn đi                                                                                |
| `getRoleRank` (`lib/constants/role-labels.ts`) | khái niệm "cấp bậc" trùng tên                                                                          | không dùng — chính sách dựa trên danh sách `MANAGEABLE_ROLES`, không xếp hạng                                                 |
| Plan cũ 2026-10-08 (§4)                        | `ROLE_RANK` + `ASSIGNABLE_BY`                                                                          | thay bằng `MANAGEABLE_ROLES` (gọn hơn, cùng kết quả với lựa chọn của người dùng)                                              |
| KNOWLEDGE: tests ở `lib/**/__tests__`          | —                                                                                                      | test mới đặt đúng chỗ                                                                                                         |

## 6. Decisions

- Chọn: chính sách quản lý = danh sách role được quản lý theo người gọi (`MANAGEABLE_ROLES`), dùng cho cả tạo, sửa (kể cả mật khẩu/CCCD/is_active), xoá và gán chức vụ; không tự sửa chính mình. Bác bỏ: xếp hạng `ROLE_RANK` (thêm khái niệm mà kết quả như nhau); `van_phong` quản lý rộng hơn (người dùng chọn theo plan 2026-11-15). (durable)
- Chọn: phiếu lương đã ký thì chặn sửa (409). Bác bỏ: reset chữ ký (phải xoá `signature_logs` ngoài transaction, cần RPC); giữ chữ ký (không đóng rủi ro). (durable) — người dùng chốt 2026-11-15.
- Chọn: `van_phong` thấy quân số nhưng không thấy số tiền lương phòng ban. Bác bỏ: cho xem như kế toán. (durable)
- Chọn: `nhan_vien` bị chặn hẳn GET phòng ban (chỉ dashboard trưởng phòng dùng endpoint này).
- Chọn: `admin` (từ `admin_users`) quản lý được mọi nhân viên kể cả đang mang `chuc_vu = 'admin'` — để có đường hạ quyền.
- Chọn: giữ audit lương "không chặn update khi ghi audit lỗi"; làm nguyên tử ở việc sau (cần RPC).

## 7. Plan

### S1 [sonnet] (test) Acceptance tests cho mục 3

Files: `lib/auth/__tests__/role-policy.test.ts`, `lib/employee/__tests__/employee-authorization.test.ts`, `lib/payroll/__tests__/payroll-update-service.test.ts`, `lib/department/__tests__/department-stats-access.test.ts`, `lib/validations/__tests__/admin-employee.test.ts` (thêm case)
Example: `lib/employee/__tests__/employee-update-service.test.ts:1-27` (mock audit-service, cascade, fake Supabase từ `@/lib/__fixtures__/query-recorder`); auth thật: `lib/__tests__/department-access.test.ts:1-30`.
Do:

- `role-policy`: bảng actor × target × newRole theo mục 3 (gồm tự sửa, admin hạ quyền nhân viên `chuc_vu='admin'`).
- Service nhân viên: `updateEmployee` và `removeEmployee` ném lỗi 403 cho các case mục 3 (target role đọc từ fake Supabase); case hợp lệ đi tiếp tới repository.
- `updatePayrollRecord`: phòng khác → 403; `is_signed=true` → 409; hợp lệ → gọi update + insert audit.
- Schema: `EmployeeCreateRequestSchema` với `chuc_vu: "admin"` → fail; `PayrollUpdateRequestSchema` với key lạ / số dạng chuỗi → fail.
- `redactSalaryStats("van_phong", …)` không có `totalSalary`/`averageSalary`; `"ke_toan"` giữ nguyên.
- `authenticateUser` từ chối `chuc_vu='admin'`: nếu mock quá nặng → báo `UNTESTABLE` (sẽ kiểm tay).
  Done when: test chạy được và FAIL vì thiếu hành vi; ghi `git hash-object` của từng file test.

### S2 [sonnet] Chính sách role + schema

Files: `lib/auth/role-policy.ts` (mới), `lib/validations/common.ts`, `lib/validations/admin-employee.ts`, `lib/validations/index.ts` (nếu barrel cần export)
Do:

- `role-policy.ts` theo chữ ký ở mục 4. Kiểu actor `{ role: string; employeeId: string }`, target `{ employeeId: string; role: string }`. `canManageEmployee`: `actor.role === "admin"` → true; ngược lại actor ≠ target và `target.role ∈ MANAGEABLE_ROLES[actor.role]`. `canAssignRole(actor, target, newRole)`: `newRole ∈ getManageableRoles(actor.role)` và (target null hoặc `canManageEmployee`). `canDeleteEmployee` = `canCreateEmployee(actor.role)` và `canManageEmployee`. Không comment, không `server-only`.
- `common.ts`: `EMPLOYEE_ROLES = ROLES` bỏ `"admin"` (as const), `EmployeeRoleSchema = z.enum(EMPLOYEE_ROLES, …)` với thông báo tiếng Việt cùng kiểu `RoleSchema`.
- `admin-employee.ts`: `chuc_vu` của create/update dùng `EmployeeRoleSchema`.
  Done when: test role-policy + schema ở S1 PASS; `npm run typecheck` sạch.

### S3 [sonnet] Áp chính sách ở backend nhân viên + đăng nhập

Files: `app/api/admin/employees/route.ts`, `app/api/admin/employees/[id]/route.ts`, `lib/employee/employee-update-service.ts`, `lib/employee/employee-removal-service.ts`, `lib/auth.ts`
Do:

- POST: sau `verifyEmployeeManagementAccess`, `canCreateEmployee` + `canAssignRole(actor, null, body.chuc_vu)` → sai thì 403 qua `AppError`/helper lỗi hiện có. Xoá `restrictedRoles`.
- `updateEmployee`: nhận actor `{ role, employeeId }` từ route; sau khi `findEmployeeForEdit` lấy `chuc_vu` hiện tại → `canManageEmployee`; nếu `chuc_vu` mới khác hiện tại → `canAssignRole`. Sai → `AppError` 403 "Bạn không có quyền chỉnh sửa nhân viên này" / "Bạn không có quyền gán chức vụ này". Route PUT bỏ `ROLES_NGUOI_LAP_BIEU_CANNOT_ASSIGN`, truyền actor.
- `removeEmployee`: đọc role hiện tại của target (dùng repository sẵn có), `canDeleteEmployee` → 403. Route DELETE bỏ chặn `nguoi_lap_bieu` riêng (chính sách đã bao).
- `lib/auth.ts authenticateUser`: `employee.chuc_vu === "admin"` → trả lỗi chung như sai mật khẩu, `console.warn` sự kiện. Không đổi chuỗi lỗi các nhánh khác.
- Các route chỉ được ngắn đi hoặc giữ nguyên số dòng.
  Done when: test service ở S1 PASS; `npm run lint && npm run typecheck` sạch.

### S4 [sonnet] Giao diện chọn chức vụ

Files: `app/admin/employee-management/components/EmployeeForm.tsx`, `components/EmployeeManagementModal.tsx`, `app/admin/employee-management/page.tsx`
Do:

- `EmployeeForm`: thay prop `restrictedRoles` bằng `assignableRoles: readonly string[]`; dropdown chỉ hiện `roleOptions` có trong `assignableRoles`. Khi sửa nhân viên mà chức vụ hiện tại không thuộc `assignableRoles`, vẫn hiển thị nhãn chức vụ hiện tại (disabled) để form không mất giá trị.
- `EmployeeManagementModal`: bỏ danh sách hardcode `:124-127`; `assignableRoles = getManageableRoles(userRole)`, `canCreate = canCreateEmployee(userRole)`, `canDelete = canCreateEmployee(userRole)`.
- Trang admin `employee-management`: lấy role qua `useAdminSession()`, truyền `assignableRoles`; nút "Thêm Nhân Viên" chỉ hiện khi `canCreateEmployee`.
- Không tăng `EmployeeManagementModal.tsx` (820 dòng, nợ cũ) — chỉ thay thế.
  Done when: `npm run lint && npm run typecheck` sạch; `rg -n "restrictedRoles" app components` không còn kết quả.
  Amended (S4): loại trừ `components/examples/employee-form-example.tsx` — component ví dụ riêng, không ai import, prop `restrictedRoles` của nó không liên quan `EmployeeForm`.

### S5 [sonnet] PUT lương: phòng ban, đã ký, schema chặt

Files: `lib/auth/department-scope.ts` (mới), `lib/payroll/payroll-update-service.ts` (mới), `lib/payroll/payroll-repository.ts`, `lib/validations/payroll.ts`, `app/api/admin/payroll/[id]/route.ts`
Do:

- `assertDepartmentAccess(auth, department)`: `!auth.canAccessDepartment(department)` → `AppError` 403 "Bạn không có quyền với phòng ban này".
- `PAYROLL_EDITABLE_FIELDS`: chuyển danh sách cột được sửa đang nằm trong route (`route.ts:178-219`) vào `lib/payroll/` (cạnh `payroll-field-definitions.ts` nếu hợp). `PayrollUpdateRequestSchema.updates`: object strict từ danh sách đó, `.partial()`, cột số `z.number().finite()`, cột chữ (nếu có) `z.string().max(500)`; vẫn yêu cầu ít nhất 1 key. Kiểm kiểu cột trong DB qua migration 02/15/16/17/25/28 trước khi chọn.
- Repository: hàm đọc phiếu kèm `is_signed`, `employee_id` và `employees.department` (giữ `PAYROLL_EDITABLE_SELECT` cũ cho nơi khác).
- `updatePayrollRecord(auth, payrollId, { updates, changeReason }, auditMeta)`: không thấy → 404; `assertDepartmentAccess`; `is_signed` → `AppError` 409 "Phiếu lương đã ký, không sửa được"; update; ghi audit như hiện tại (lỗi audit chỉ log). Trả kết quả cho route.
- Route PUT: csrf → verifyToken → role admin/truong_phong (giữ) → zod → service → response. Route phải ngắn đi đáng kể.
  Done when: test payroll ở S1 PASS; `npm run lint && npm run typecheck` sạch.

### S6 [sonnet] GET phòng ban

Files: `lib/department/department-stats-access.ts` (mới), `app/api/admin/departments/route.ts`
Do:

- `SALARY_STATS_ROLES = ["admin","giam_doc","ke_toan","nguoi_lap_bieu","truong_phong","to_truong"]`; `redactSalaryStats(role, departmentStats)` bỏ `totalSalary`, `averageSalary` (và trường lương tổng hợp trong `summary` nếu có) khi role ngoài danh sách.
- Route GET: `nhan_vien` → 403 (dùng `authorizeRoles` hoặc kiểm role, theo pattern route hiện có); áp `redactSalaryStats` trước khi trả. Không đổi bộ lọc phòng ban hiện tại.
  Done when: test ở S1 PASS; `npm run lint && npm run typecheck` sạch.

### S7 [opus] Kiểm thủ công + build

Files: —
Do: `npm run build`; đối chiếu lại toàn bộ mục 3 bằng đọc diff (phần không có test tự động, đặc biệt đăng nhập `chuc_vu='admin'` và UI). Vì sao orchestrator: soát phân quyền xuyên module.
Done when: build xanh; mọi tiêu chí mục 3 có test PASS hoặc ghi rõ kiểm tay.

### S_last [opus] Update brain

Orchestrator cập nhật REGISTRY, SYSTEM và các file trí nhớ khi đóng việc; tick SEC-01/02/03 trong `docs/audit/2026-11-15-security-scan-requirements.md`.

## 8. Verification

- Commands: `npm run format && npm run lint && npm run typecheck` · `npx jest --testPathPatterns="role-policy|employee-authorization|payroll-update-service|department-stats-access|admin-employee|employee-request"` (Amended S1: jest bản này dùng `--testPathPatterns`) · `npm run build`
- Kiểm tay (UNTESTABLE từ S1): `authenticateUser` từ chối `chuc_vu='admin'`; dropdown chức vụ / nút tạo-xoá theo role; mã HTTP 201/200/403 của route nhân viên và GET phòng ban (`nhan_vien` 403) — chưa có route test.
- Kiểm tay (dev): `van_phong` POST `chuc_vu: giam_doc` → 403; `truong_phong` PUT lương phòng khác → 403; nhân viên `chuc_vu='admin'` đăng nhập → thất bại; dropdown chức vụ theo role.
- Rủi ro verifier phải soi riêng (Risk high — security pass):
  - Còn đường nào sửa nhân viên bỏ qua `canManageEmployee` (ví dụ `employees/update-cccd`, cascade đổi mã) — chỉ báo, không mở rộng phạm vi.
  - Actor `employeeId` lấy từ JWT, không từ body.
  - Schema `updates` không cho ghi `is_signed`, `signed_at`, `employee_id`, `salary_month`, `payroll_type`.
  - Luồng hợp lệ của admin/van_phong/truong_phong không bị chặn nhầm.
  - 8 suite msw fail do pnpm là nợ đã biết (CLAUDE.md pitfall 4), không tính là regression.
