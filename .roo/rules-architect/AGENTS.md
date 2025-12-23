# Architect Mode Rules (Non-Obvious Only)

## Hidden Coupling

- `payrolls` table có 39 cột salary fields - thay đổi schema cần update `lib/payroll-validation.ts`
- `column_aliases` và `import_mapping_configs` tables liên kết chặt với Excel parser
- `management_signatures` có 3-tier approval (giam_doc, ke_toan, nguoi_lap_bieu) - mỗi role ký 1 lần/tháng

## Architectural Constraints

- **Supabase RLS enabled** - tất cả queries phải qua RLS policies hoặc dùng service role
- **JWT 24h expiration** - không có refresh token mechanism
- **Vietnam timezone hardcoded** - database functions add `+ INTERVAL '7 hours'`

## Non-Standard Patterns

- Dual password system: `cccd_hash` (initial) vs `password_hash` (after change)
- T13 salary auto-detection từ `salary_month` pattern, không cần flag riêng
- Column mapping có 3 levels: exact → alias → fuzzy match

## Database Functions

- `auto_sign_salary()` - atomic signature với timestamp
- `bulk_sign_salaries()` - batch signature với error collection
- `get_employee_salary_detail()` - optimized salary query

## Performance Considerations

- Excel import dùng batch processing với error tracking
- Column alias sync qua BroadcastChannel + localStorage
