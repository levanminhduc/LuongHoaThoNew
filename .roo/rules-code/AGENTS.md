# Code Mode Rules (Non-Obvious Only)

## Critical Patterns

- Dùng `createServiceClient()` từ `@/utils/supabase/server` cho API routes (service role)
- Dùng `createClient()` từ `@/utils/supabase/client` cho client-side (anon key)
- Tất cả API routes phải verify JWT token qua `lib/auth-middleware.ts`
- Excel import dùng `lib/advanced-excel-parser.ts` với confidence scoring (HIGH ≥80, MEDIUM 50-79, LOW <50)

## Database Constraints

- `payrolls`: UNIQUE(`employee_id`, `salary_month`) - chỉ 1 record/employee/month
- `signature_logs`: UNIQUE(`employee_id`, `salary_month`) - chỉ ký 1 lần/tháng
- `management_signatures`: UNIQUE(`salary_month`, `signature_type`) WHERE `is_active = true`

## Import Strategies

3 strategies khi duplicate: `skip` (giữ cũ), `overwrite` (xóa cũ), `merge` (merge non-empty fields)

## Validation

- Required fields: `employee_id`, `salary_month`
- Work hours: 0-744 hours/month
- Cross-field tolerance: ±10%
