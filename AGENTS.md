# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Commands

```bash
npm run format && npm run lint && npm run typecheck
npm test -- --testPathPattern="filename"
```

## Critical Non-Obvious Rules

- **Username "admin" bị block** trong [`lib/auth.ts`](lib/auth.ts:1) - không dùng cho bất kỳ account nào
- **Vietnam timezone (+7h)**: Dùng `getVietnamTimestamp()` từ [`lib/utils/vietnam-timezone.ts`](lib/utils/vietnam-timezone.ts:1), KHÔNG dùng `new Date()`
- **T13 Auto-Detection**: Pattern `/^\d{4}-(13|T13)$/i` trong `salary_month` tự động set `payroll_type = "t13"`
- **Duplicate key**: Chỉ `(employee_id, salary_month)` - `payroll_type` KHÔNG tham gia
- **Cross-field tolerance ±10%** cho tính toán lương (do làm tròn)
- **Password logic**: `last_password_change_at` NULL → verify với `cccd_hash`, ngược lại → `password_hash`

## Environment & Config (Fail-Fast)

- **JWT_SECRET**: Import từ [`lib/config/jwt.ts`](lib/config/jwt.ts:1) hoặc [`lib/config/env.ts`](lib/config/env.ts:1), KHÔNG dùng `process.env.JWT_SECRET` trực tiếp
- **Env validation**: Dùng `env` object từ [`lib/config/env.ts`](lib/config/env.ts:1) - app crash ngay khi thiếu env vars
- **JWT_SECRET min length**: 32 characters (validated by Zod)

## Input Validation (Zod Schemas)

- **Tất cả API input**: Validate qua schemas trong [`lib/validations/`](lib/validations/index.ts:1)
- **Parse helper**: Dùng `parseSchemaOrThrow()` để auto-throw lỗi 400 với format chuẩn
- **Error format**: `zodErrorToApiErrors()` convert Zod errors → API response format

## Code Style

- Type-only imports: `import type { ... }`
- **KHÔNG tạo comments trong code**

## Roles (8 loại)

`admin`, `giam_doc`, `ke_toan`, `nguoi_lap_bieu`, `truong_phong`, `to_truong`, `van_phong`, `nhan_vien`

Department access: `giam_doc/ke_toan/nguoi_lap_bieu/truong_phong` → `allowed_departments[]`, `to_truong` → `department`, `nhan_vien` → chỉ `employee_id` của mình

**`van_phong`** bypass department filter — access ALL departments trong [`lib/auth-middleware.ts`](lib/auth-middleware.ts:33)

## Auth & API Routes

- **API route mới**: Dùng `verifyToken()` hoặc `authorizeRoles()` từ [`lib/auth-middleware.ts`](lib/auth-middleware.ts:1), KHÔNG copy-paste inline `verifyAdminToken()`
- **Bcrypt salt rounds = 12** luôn luôn, KHÔNG dùng 10
- **Cookie token name**: `auth_token`
- **Middleware chỉ check token existence**, JWT verify xảy ra trong từng API route
- **Payroll queries**: Dùng `getPayrollSelect(isT13)` từ [`lib/payroll-select.ts`](lib/payroll-select.ts:1)
- **Error handling**: Import/payroll dùng `ApiErrorHandler` từ [`lib/api-error-handler.ts`](lib/api-error-handler.ts:1), validation dùng `parseSchemaOrThrow()`
