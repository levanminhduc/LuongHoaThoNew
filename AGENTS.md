# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Commands

```bash
npm run format && npm run lint && npm run typecheck  # Chạy sau mỗi lần code
npm test -- --testPathPattern="filename"             # Chạy single test
node scripts/run-bulk-signature-migrations.js       # Database migrations
```

## Critical Non-Obvious Rules

- **Username "admin" bị block hoàn toàn** trong `lib/auth.ts` - không bao giờ dùng cho bất kỳ account nào
- **Vietnam timezone (+7h)**: Tất cả timestamps phải dùng `getVietnamTimestamp()` từ `lib/utils/vietnam-timezone.ts`, KHÔNG dùng `new Date()`
- **T13 Auto-Detection**: Pattern `/^\d{4}-(13|T13)$/i` trong `salary_month` tự động set `payroll_type = "t13"`
- **Duplicate key chỉ gồm 2 cột**: `(employee_id, salary_month)` - `payroll_type` KHÔNG tham gia duplicate check
- **Cross-field validation có tolerance ±10%** cho tính toán lương (do làm tròn)
- **Password verification logic**: Nếu `last_password_change_at` là NULL → verify với `cccd_hash`, ngược lại → verify với `password_hash`

## Code Style

- Path alias: `@/*` maps to root (ví dụ: `@/lib/auth`, `@/components/ui/button`)
- Type-only imports: `import type { ... }` cho types
- **KHÔNG tạo comments trong code** (theo user instruction)

## Key Files

- [`lib/auth.ts`](lib/auth.ts) - Authentication logic với role-based access
- [`lib/advanced-excel-parser.ts`](lib/advanced-excel-parser.ts) - Excel parsing engine
- [`lib/utils/vietnam-timezone.ts`](lib/utils/vietnam-timezone.ts) - Vietnam time utility
- [`lib/payroll-validation.ts`](lib/payroll-validation.ts) - 39-field validation rules

## Roles (8 loại)

`admin`, `giam_doc`, `ke_toan`, `nguoi_lap_bieu`, `truong_phong`, `to_truong`, `van_phong`, `nhan_vien`

Department access: `giam_doc/ke_toan/nguoi_lap_bieu/truong_phong` → `allowed_departments[]`, `to_truong` → `department` field, `nhan_vien` → chỉ `employee_id` của mình
