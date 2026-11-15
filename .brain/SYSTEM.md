# System map

<!-- Bản đồ sống của hệ thống. Orchestrator đọc file này trước mọi việc có đụng tới contract.
     /brain-init dựng lần đầu; /go cập nhật khi đóng việc; /sync cập nhật theo các commit không đi qua /go.
     Giữ dạng bảng, mỗi mục một dòng. Lý do nằm ở DECISIONS.md, mẹo nằm ở KNOWLEDGE.md. -->

Status: READY
Last updated: 2026-11-15 by /go F-013
Synced at commit: 3ab9f30

## Modules

| Module        | Path                                                                                                                          | Trách nhiệm (1 dòng)                                                                                               | Owner        |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------ |
| proxy         | `proxy.ts`                                                                                                                    | Middleware Next 16: chặn trang khi thiếu cookie `auth_token`, chặn trang dev ở prod, maintenance, security headers | F-001        |
| auth          | `lib/auth.ts`, `lib/auth-middleware.ts`, `lib/auth/`, `lib/employee-session.ts`, `lib/config/jwt.ts`                          | Đăng nhập admin/employee, JWT 24h, RBAC 8 role, session nhân viên 30 phút, kiểm CCCD/mật khẩu                      | F-001        |
| security      | `lib/security-middleware.ts`, `lib/constants/security.ts`                                                                     | CSRF, rate limit (in-memory), security headers, BCRYPT_ROUNDS                                                      | F-001        |
| api-client    | `lib/api/`                                                                                                                    | `apiClient`, registry `ENDPOINTS`, query client, toast mutation helper                                             | —            |
| validations   | `lib/validations/`                                                                                                            | zod schema theo domain, `parseSchema` / `createValidationErrorResponse`                                            | —            |
| employee      | `lib/employee/`                                                                                                               | Repository admin/auth/directory, tra cứu (lookup-service), cascade đổi mã NV                                       | F-002, F-005 |
| payroll       | `lib/payroll/`                                                                                                                | Repository lương (admin, self, search, export, import, signature, department), validation ±10%                     | F-003, F-004 |
| import        | `lib/import/`, `lib/advanced-excel-parser.ts`, `lib/excel-parser.ts`, `lib/cache/`, `lib/sync/`, `lib/column-alias-config.ts` | Đọc Excel, column alias, mapping configuration + cache/sync                                                        | F-003        |
| excel         | `lib/excel/`, `lib/lazy/xlsx.ts`                                                                                              | Builder XLSX xuất lương/chấm công                                                                                  | F-004, F-011 |
| signature     | `lib/signature/`, `lib/management-signature-*.ts`, `lib/signature-validation.ts`                                              | Log ký nhân viên, ký hàng loạt, ký duyệt 3 cấp                                                                     | F-006, F-007 |
| bonus         | `lib/bonus/`                                                                                                                  | Thưởng: import, danh sách, ký nhận, ký duyệt                                                                       | F-010        |
| attendance    | `lib/attendance/`, `lib/attendance-parser.ts`                                                                                 | Chấm công: parse, lưu, xuất, đăng ký tăng ca                                                                       | F-011        |
| department    | `lib/department/`                                                                                                             | Phòng ban + `department_permissions`                                                                               | F-009        |
| audit         | `lib/audit/`, `lib/audit-service.ts`                                                                                          | security_logs, employee audit qua RPC                                                                              | F-002        |
| hooks         | `lib/hooks/`                                                                                                                  | Toàn bộ TanStack Query hooks                                                                                       | —            |
| stores        | `lib/stores/`, `lib/ticker/`                                                                                                  | Zustand: ticker, mapping config                                                                                    | —            |
| supabase      | `utils/supabase/`                                                                                                             | `createServiceClient()` (service role, chỉ API), client trình duyệt (?còn dùng)                                    | —            |
| ui-admin      | `app/admin/**`, `components/admin/`, `components/patterns/`                                                                   | Khu admin (18 trang), shell/session/skeleton                                                                       | —            |
| ui-roles      | `app/{director,accountant,reporter,manager,supervisor,employee}/`, `components/RoleBasedRouter.tsx`, `components/shared/`     | Dashboard theo role + tra cứu nhân viên                                                                            | F-008, F-005 |
| db-migrations | `scripts/supabase-setup/*.sql`, `scripts/create-tables.sql`                                                                   | Migration chạy tay theo số (01…37)                                                                                 | —            |

## Shared contracts

### HTTP APIs

Tất cả dưới `/api`. Auth: VT = verifyToken (mọi role đã đăng nhập) · VAA = verifyAdminAccess · VEM = verifyEmployeeManagementAccess (admin, van_phong, nguoi_lap_bieu) · AR = authorizeRoles · ES = employee session · EC = mã NV + CCCD/mật khẩu. `ENDPOINTS` = có trong `lib/api/endpoints.ts`. Defined by: tất cả `(legacy)`. Cột "Used by" phần lớn suy theo tên hook, chưa grep xác nhận từng dòng (?).

| Method Path                                                                                                                                                                 | Module     | Defined by | Used by                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------- | ------------------------------------------------- |
| GET /health, /health/live, /health/ready (none)                                                                                                                             | ops        | (legacy)   | Docker/CI healthcheck                             |
| POST /admin/login (none, rate limit)                                                                                                                                        | auth       | (legacy)   | `app/admin/login/admin-login-form.tsx`            |
| POST /admin/logout (CSRF)                                                                                                                                                   | auth       | (legacy)   | `use-logout`                                      |
| POST /auth/forgot-password (none)                                                                                                                                           | auth       | (legacy)   | trang quên mật khẩu                               |
| POST,GET /auth/change-password-with-cccd (EC; GET ?)                                                                                                                        | auth       | (legacy)   | ?                                                 |
| POST,GET /employee/change-password (EC; GET ?)                                                                                                                              | auth       | (legacy)   | tra cứu nhân viên                                 |
| GET /admin/password-reset-history (VT)                                                                                                                                      | auth       | (legacy)   | `app/admin/password-reset-history`                |
| GET,POST /admin/employees; GET,PUT,DELETE /admin/employees/[id] (VEM + `lib/auth/role-policy.ts`)                                                                           | employee   | (legacy)   | `use-employees`                                   |
| GET /admin/employees/[id]/audit-logs (admin)                                                                                                                                | audit      | (legacy)   | `use-employees`                                   |
| POST /admin/import-employees (VAA)                                                                                                                                          | employee   | (legacy)   | `components/employee-import-section.tsx`          |
| POST,GET /employees/update-cccd (VAA)                                                                                                                                       | employee   | (legacy)   | `use-employees`                                   |
| GET /employees/all-employees (VT)                                                                                                                                           | employee   | (legacy)   | ?                                                 |
| POST /admin/payroll-import, /admin/advanced-upload, /admin/upload (VAA)                                                                                                     | import     | (legacy)   | `use-payroll-import`, trang payroll-import-export |
| POST /admin/import-dual-files (AR admin, van_phong, nguoi_lap_bieu)                                                                                                         | import     | (legacy)   | trang payroll-import-export                       |
| GET,POST /admin/export-import-errors (VAA)                                                                                                                                  | import     | (legacy)   | `components/payroll-import/`                      |
| GET,POST,PUT /admin/column-aliases; GET,PUT,DELETE /admin/column-aliases/[id] (VAA)                                                                                         | import     | (legacy)   | `use-column-mapping`                              |
| GET,POST,PUT /admin/mapping-configurations; GET /admin/generate-import-template; POST /admin/detect-columns (VAA)                                                           | import     | (legacy)   | `use-mapping-config`                              |
| GET,POST /admin/payroll/search; GET /admin/payroll-preview; GET,POST /admin/payroll/audit/[id] (VAA)                                                                        | payroll    | (legacy)   | `use-payroll`                                     |
| GET,PUT /admin/payroll/[id] (VT + nhánh role; PUT → `payroll-update-service`)                                                                                               | payroll    | (legacy)   | `use-payroll`                                     |
| GET /admin/payroll-export (VT); POST /admin/bulk-payroll-export, GET /admin/payroll-export-template, GET /admin/sync-template (VAA)                                         | payroll    | (legacy)   | `use-bulk-export`, trang payroll-import-export    |
| GET /admin/dashboard-stats (VAA); GET,DELETE /admin/data-validation (VT)                                                                                                    | payroll    | (legacy)   | `use-dashboard`, trang data-validation            |
| GET /admin/unsigned-employees-export (VT)                                                                                                                                   | payroll    | (legacy)   | `components/UnsignedEmployeesModal.tsx`           |
| GET,POST /payroll/my-data, /payroll/my-department(s); GET …/months (VT)                                                                                                     | payroll    | (legacy)   | `use-role-payroll`, dashboard theo role           |
| GET /employee/lookup (none, CSRF + rate limit)                                                                                                                              | employee   | (legacy)   | `app/employee/lookup/use-employee-lookup.ts`      |
| GET /employee/detail (ES); POST /employee/salary-history (ES hoặc EC)                                                                                                       | employee   | (legacy)   | `use-employee-lookup.ts`                          |
| POST /employee/sign-salary (ES + EC)                                                                                                                                        | signature  | (legacy)   | `use-employee-lookup.ts`                          |
| POST /admin/bulk-sign-salary; GET /admin/bulk-signature-history (VT)                                                                                                        | signature  | (legacy)   | trang bulk-signature                              |
| POST,GET /admin/update-signature-date; POST /admin/update-management-signature-date (VT)                                                                                    | signature  | (legacy)   | `use-dashboard`                                   |
| GET /signature-history, /signature-status/[month], /signature-progress/[month], /admin/signature-stats/[month] (VT)                                                         | signature  | (legacy)   | `use-dashboard`                                   |
| POST /management-signature (VT + role = signature_type)                                                                                                                     | signature  | (legacy)   | dashboard giam_doc/ke_toan/nguoi_lap_bieu         |
| GET /bonuses, /bonuses/periods (BONUS_VIEWER_ROLES)                                                                                                                         | bonus      | (legacy)   | `use-bonus-list`                                  |
| GET /employee/bonuses (ES); POST /employee/sign-bonus (ES + EC)                                                                                                             | bonus      | (legacy)   | tra cứu nhân viên                                 |
| DELETE /admin/bonuses; POST /admin/bonus-import (VAA); GET /admin/download-bonus-template (VT)                                                                              | bonus      | (legacy)   | `use-bonus-import`                                |
| POST,GET /bonus-management-signature (BONUS_SIGNER_ROLES)                                                                                                                   | bonus      | (legacy)   | `use-bonus-signature`                             |
| GET /admin/attendance-employees; POST /admin/attendance-import, /admin/attendance-export, /admin/overtime-registration-export; GET /admin/download-attendance-template (VT) | attendance | (legacy)   | `use-attendance`                                  |
| GET,POST,PUT /admin/departments (GET: `DEPARTMENT_LIST_ROLES`); GET /admin/departments/[departmentName] (VT)                                                                | department | (legacy)   | `use-departments`                                 |
| GET,POST,DELETE /admin/department-permissions (VT)                                                                                                                          | department | (legacy)   | trang department-management/permissions           |
| GET /admin/download-employee-template, /admin/download-sample, /admin/download-multiple-samples (VAA)                                                                       | misc       | (legacy)   | ?                                                 |
| GET /api-docs/openapi (tự decode JWT + ALLOWED_ROLES)                                                                                                                       | misc       | (legacy)   | `app/api-docs`                                    |

### Data (tables / collections)

| Table                                                                                | Key columns                                                       | Defined by                                                | Written by                                                                                                           | Read by                                        |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| employees                                                                            | PK id; UNIQUE employee_id                                         | 01                                                        | lib/employee/; RPC update_employee_password                                                                          | lib/employee/, lib/auth.ts                     |
| payrolls                                                                             | PK id; UNIQUE (employee_id, salary_month)                         | 02, 29                                                    | lib/payroll/, lib/employee/cascade; RPC auto_sign_salary, bulk_update_signature_dates, import_dual_files_transaction | lib/payroll/\*, lib/employee/lookup-service.ts |
| signature_logs                                                                       | UNIQUE (employee_id, salary_month)                                | 03, 29                                                    | RPC auto_sign_salary, bulk_update_signature_dates; cascade                                                           | lib/signature/signature-log-repository.ts      |
| management_signatures                                                                | PK uuid; UNIQUE (salary_month, signature_type) WHERE is_active    | 19, 29                                                    | lib/signature/management-signature-repository.ts                                                                     | lib/signature/                                 |
| admin_bulk_signature_logs                                                            | PK uuid; UNIQUE bulk_batch_id                                     | 23                                                        | lib/signature/signature-log-repository.ts                                                                            | idem                                           |
| employee_bonuses                                                                     | UNIQUE (employee_id, bonus_type, bonus_period)                    | 33                                                        | lib/bonus/bonus-repository.ts; RPC sign_bonus                                                                        | lib/bonus/                                     |
| bonus_management_signatures                                                          | UNIQUE (bonus_type, bonus_period, signature_type) WHERE is_active | 33                                                        | lib/bonus/bonus-signature-repository.ts                                                                              | idem                                           |
| attendance_daily                                                                     | UNIQUE (employee_id, work_date)                                   | 27                                                        | ? (không thấy writer)                                                                                                | lib/attendance/                                |
| attendance_monthly                                                                   | UNIQUE (employee_id, period_year, period_month)                   | 27, 30                                                    | lib/attendance/attendance-repository.ts                                                                              | idem                                           |
| department_permissions                                                               | UNIQUE (employee_id, department)                                  | 17                                                        | lib/department/                                                                                                      | lib/department/, lib/auth.ts                   |
| admin_users                                                                          | PK id; UNIQUE username; RLS bật, không policy                     | scripts/create-tables.sql (không có trong supabase-setup) | lib/auth.ts                                                                                                          | lib/auth.ts                                    |
| payroll_audit_logs                                                                   | PK id                                                             | 14                                                        | lib/payroll/payroll-repository.ts                                                                                    | idem                                           |
| employee_audit_logs                                                                  | PK uuid                                                           | 21-create-employee-audit-logs                             | RPC log_employee_change                                                                                              | RPC get_employee_audit_logs                    |
| security_logs, employee_security_events                                              | PK id                                                             | 20, 21-split                                              | lib/audit/audit-log-repository.ts                                                                                    | lib/audit/                                     |
| access_logs                                                                          | PK id                                                             | 18                                                        | RPC log_access                                                                                                       | —                                              |
| column_aliases, mapping_configurations, configuration_field_mappings                 | xem 12, 13                                                        | 12, 13                                                    | lib/import/                                                                                                          | lib/import/                                    |
| import_sessions, import_file_configs, import_column_mappings, import_mapping_history | —                                                                 | 11, 12                                                    | không dùng                                                                                                           | không dùng                                     |

RPC đang được gọi: `auto_sign_salary`, `bulk_sign_salaries`, `bulk_update_signature_dates`, `sign_bonus`, `log_access`, `import_dual_files_transaction`_, `analyze_payroll_columns`_, `log_employee_change`_, `log_employee_change_failed`_, `get_employee_audit_logs`_, `update_employee_password`_, `handle_password_reset_failure`_ (_ = SECURITY DEFINER).

### Events / queues / jobs

| Name                             | Producer                          | Consumers                                  | Payload ref                                               |
| -------------------------------- | --------------------------------- | ------------------------------------------ | --------------------------------------------------------- |
| (không có cron/queue)            | —                                 | —                                          | Không có vercel.json, pg_cron hay schedule trong workflow |
| mapping-config sync (in-process) | `lib/sync/mapping-config-sync.ts` | `lib/cache/mapping-config-cache.ts`, store | —                                                         |

### Shared FE components / stores

| Name                                                       | Path                                          | Defined by | Used by                     |
| ---------------------------------------------------------- | --------------------------------------------- | ---------- | --------------------------- |
| apiClient / ENDPOINTS                                      | `lib/api/client.ts`, `lib/api/endpoints.ts`   | (legacy)   | mọi hook                    |
| AdminSessionProvider                                       | `components/admin/admin-session-provider.tsx` | (legacy)   | 12 file khu admin           |
| skeleton-patterns                                          | `components/patterns/skeleton-patterns.tsx`   | (legacy)   | 21 file                     |
| navigation-progress / navigation-pending-context           | `components/admin/`                           | (legacy)   | 8 / 3 file                  |
| admin-sidebar, admin-header, admin-nav-items, admin-layout | `components/admin/`                           | (legacy)   | khu admin                   |
| role-sidebar, role-header                                  | `components/shared/`                          | (legacy)   | 5 dashboard theo role       |
| RoleBasedRouter                                            | `components/RoleBasedRouter.tsx`              | (legacy)   | `app/page.tsx` (?)          |
| secure-session                                             | `lib/auth/secure-session.ts`                  | (legacy)   | apiClient, session provider |
| use-dashboard, use-payroll, use-employees, use-logout      | `lib/hooks/`                                  | (legacy)   | 7–9 file mỗi hook           |
| useTickerStore, useMappingConfigStore                      | `lib/stores/`                                 | (legacy)   | ticker, column mapping      |
| QueryProvider                                              | `lib/providers/query-provider.tsx`            | (legacy)   | root layout                 |
| components/ui                                              | `components/ui/`                              | shadcn     | 61 primitive                |

## Architecture rules

- Route `app/api/**` mỏng: auth → zod → service/repository → response. Truy cập DB chỉ trong `lib/<domain>/*-repository.ts` (openspec `server-data-access-boundary`).
- `createServiceClient()` chỉ dùng phía server (API route / lib server-only), service role bypass RLS.
- DB (script 38, D-014/D-015): mọi bảng `public` bật RLS, không policy mở; hàm `SECURITY DEFINER` chỉ `service_role` EXECUTE; mọi hàm có `search_path = public, extensions, pg_temp`; `employees` CHECK `chuc_vu <> 'admin'`. anon key không đọc/gọi được gì.
- Client → `lib/hooks/use-*` → `apiClient` + `ENDPOINTS`; component không tự viết query.
- Verify JWT nằm trong từng route, không ở `proxy.ts`.

## Glossary (thuật ngữ nghiệp vụ)

| Term                  | Meaning                                                                         | Not to confuse with                         |
| --------------------- | ------------------------------------------------------------------------------- | ------------------------------------------- |
| chuc_vu               | Mã role của nhân viên (8 role)                                                  | `admin_users.role` (admin thật)             |
| salary_month          | Kỳ lương `YYYY-MM`; `YYYY-13`/`YYYY-T13` = lương tháng 13                       | bonus_period                                |
| T13                   | Lương tháng 13, `payroll_type = "t13"`, tự nhận từ salary_month                 | thưởng (employee_bonuses)                   |
| ký nhận               | Nhân viên xác nhận phiếu lương/thưởng (`is_signed`, `signed_at`)                | ký duyệt                                    |
| ký duyệt 3 cấp        | giam_doc, ke_toan, nguoi_lap_bieu ký cho cả tháng (`management_signatures`)     | ký nhận của nhân viên                       |
| tra cứu               | Nhân viên tự xem lương bằng mã NV + CCCD/mật khẩu                               | dashboard nhân viên (đăng nhập admin login) |
| CCCD / cccd_hash      | Căn cước; là mật khẩu mặc định khi `last_password_change_at` NULL               | password_hash                               |
| allowed_departments   | Phạm vi phòng ban của role quản lý (`department_permissions`); van_phong bỏ qua | department của chính nhân viên              |
| thưởng                | Thưởng lễ/Tết theo `bonus_type` + `bonus_period`                                | T13                                         |
| bảng công / chấm công | Dữ liệu chấm công ngày/tháng                                                    | payroll                                     |
| tiền lương thực nhận  | `tien_luong_thuc_nhan_cuoi_ky` — net nhận cuối kỳ                               | tổng thu nhập                               |
| ticker                | Dải chữ chạy đầu trang                                                          | —                                           |
