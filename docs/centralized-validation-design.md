# Centralized Input Validation Layer (Zod)

## Overview

Muc tieu: thong nhat validation cho tat ca API routes trong `app/api` bang cac schema tap trung, dung [Zod](lib/config/env.ts:1) va format loi thong nhat theo [ApiErrorHandler](lib/api-error-handler.ts:35).

Pham vi: toan bo routes duoc dinh danh trong `app/api`, uu tien cac endpoints da tu validate nhu [app/api/management-signature/route.ts](app/api/management-signature/route.ts:6), [app/api/admin/bulk-sign-salary/route.ts](app/api/admin/bulk-sign-salary/route.ts:6), [app/api/employee/sign-salary/route.ts](app/api/employee/sign-salary/route.ts:9), [app/api/employee/salary-history/route.ts](app/api/employee/salary-history/route.ts:10), [app/api/signature-status/[month]/route.ts](app/api/signature-status/[month]/route.ts:6), [app/api/admin/signature-stats/[month]/route.ts](app/api/admin/signature-stats/[month]/route.ts:5).

## Options

1. Folder validations tap trung, schema theo domain, co helpers map loi [Zod](lib/config/env.ts:1) -> [ApiErrorHandler](lib/api-error-handler.ts:35).

- Uu diem: giam lap lai, test de, quy chuan loi thong nhat.
- Nhuoc diem: can refactor toan bo routes.

2. Validation gan vao tung route, chi chia se common fields.

- Uu diem: thay doi nho, it phu thuoc.
- Nhuoc diem: khong dat muc tieu centralization, kho bao tri.

3. Middleware validate theo method (POST/GET) voi registry.

- Uu diem: tu dong hoa cao, dong bo loi.
- Nhuoc diem: can dau tu co che mapping route -> schema.

Khuyen nghi: chon (1) de dap ung audit va de mo rong. (3) co the lam buoc sau neu can tu dong hoa.

## Architecture

### Folder structure (de xuat)

- `lib/validations/fields/` (schema level field)
- `lib/validations/requests/` (schema request theo route)
- `lib/validations/errors/` (chuan hoa map loi)
- `lib/validations/index.ts` (export tap trung)
- `lib/validations/parse.ts` (helper parse body/query/params)

Lien he voi schema hien co: hop nhat hoac thay the [lib/signature-validation.ts](lib/signature-validation.ts:1) vao `lib/validations/fields` va `lib/validations/requests`.

## Data flow

1. Route doc body/query/params.
2. Goi helper parse de validate schema.
3. Neu fail, tra ve format loi tu [ApiErrorHandler](lib/api-error-handler.ts:35).
4. Neu pass, route tiep tuc xu ly nghiep vu.

## API contracts

### Common field schemas (core)

- `employee_id`: string trim, not empty, max length theo hien tai trong [lib/signature-validation.ts](lib/signature-validation.ts:13).
- `salary_month`: ho tro pattern thang luong thuong va T13, ke thua quy uoc trong [lib/import-error-collector.ts](lib/import-error-collector.ts:69) va quy tac T13 trong [AGENTS.md](AGENTS.md:1).
- `department`: string trim, not empty, phu hop logic access trong [lib/auth-middleware.ts](lib/auth-middleware.ts:33).
- `role`: enum 8 roles trong [AGENTS.md](AGENTS.md:1).
- `signature_type`: enum theo [lib/signature-validation.ts](lib/signature-validation.ts:3).
- `is_t13`: boolean optional, chi dinh che do T13.
- `pagination`: limit/offset optional cho list endpoints (neu can).

### Request schemas (uu tien)

- Management signature: body cho [app/api/management-signature/route.ts](app/api/management-signature/route.ts:6).
- Bulk sign salary: body cho [app/api/admin/bulk-sign-salary/route.ts](app/api/admin/bulk-sign-salary/route.ts:6).
- Employee sign salary: body cho [app/api/employee/sign-salary/route.ts](app/api/employee/sign-salary/route.ts:9).
- Employee salary history: body cho [app/api/employee/salary-history/route.ts](app/api/employee/salary-history/route.ts:10).
- Signature status: params/query cho [app/api/signature-status/[month]/route.ts](app/api/signature-status/[month]/route.ts:6).
- Admin signature stats: params/query cho [app/api/admin/signature-stats/[month]/route.ts](app/api/admin/signature-stats/[month]/route.ts:5).
- Import history create: body cho [app/api/admin/import-history/route.ts](app/api/admin/import-history/route.ts:32).
- Admin payroll import: body/query cho [app/api/admin/payroll-import/route.ts](app/api/admin/payroll-import/route.ts:1).
- Admin data validation: body/query cho [app/api/admin/data-validation/route.ts](app/api/admin/data-validation/route.ts:1).

## Data model

Khong thay doi schema DB. Layer validation chi anh huong input ve API.

## Error message format (tieng Viet)

Dung format cua [ApiErrorHandler](lib/api-error-handler.ts:35).

- `code`: "VALIDATION_ERROR"
- `message`: thong bao tieng Viet ro rang, uu tien message tu schema.
- `field`: duong dan field, theo path cua [Zod](lib/config/env.ts:1).
- `details`: thong tin bo sung neu can (vd: regex/pattern).
- `timestamp`: tu [ApiErrorHandler](lib/api-error-handler.ts:48).

Mapping de xuat:

- Zod issue -> 1 [ApiErrorHandler](lib/api-error-handler.ts:35) per issue.
- Tra ve [ApiErrorHandler](lib/api-error-handler.ts:92) cho nhieu loi.

## Security

- Khong thay doi auth/role, tiep tuc kiem tra theo [lib/auth-middleware.ts](lib/auth-middleware.ts:22).
- Dam bao validation truoc khi goi DB/RPC, nhat la cac route sign va import.
- Theo quy tac T13 va duplicate key tu [AGENTS.md](AGENTS.md:1).

## Observability

- Log validation fail theo code "VALIDATION_ERROR"; thong ke theo route.
- Khong log data nhay cam (CCCD, password) trong thong diep loi.

## Rollout/Migration

1. Tao validation layer moi (chua wired vao routes).
2. Di chuyen tung route sang schema moi, uu tien routes ky luong.
3. So sanh response format voi format cu; chi thay doi noi dung message khi can.
4. Deprecate helper cu nhu [lib/signature-validation.ts](lib/signature-validation.ts:1) neu da thay the.

## Testing

- Unit test schema: input hop le/khong hop le.
- Integration test cho cac route chinh.
- Dam bao thong diep loi tieng Viet khong thay doi ngoai y muon.

## Example usage

- Route POST doc body, goi helper parse trong `lib/validations/parse.ts` (de xuat).
- Helper tra ve `data` da parse hoac response error tu [ApiErrorHandler](lib/api-error-handler.ts:35).
- Schema duoc import tu `lib/validations/requests/*`.

## Risks & open questions

- Can thong nhat duong dan field trong loi (path) de map vao UI.
- Kich thuoc toi da cho employee_id, department co can dieu chinh?
- Co can schema cho query search/pagination cho toan bo list endpoints?

## Implementation plan (de xuat, uoc luong)

1. Dinh nghia schema field core trong `lib/validations/fields` (4-6h, Code mode).
2. Dinh nghia schema request theo route trong `lib/validations/requests` (6-8h, Code mode).
3. Xay dung helper parse + mapping loi [Zod](lib/config/env.ts:1) -> [ApiErrorHandler](lib/api-error-handler.ts:35) (4-6h, Code mode).
4. Cap nhat routes de dung schema moi (8-12h, Code mode).
5. Viet test schema + route (6-10h, Code mode).
