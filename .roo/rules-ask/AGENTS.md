# Ask Mode Rules (Non-Obvious Only)

## Counterintuitive Code Organization

- `app/` chứa Next.js App Router pages, KHÔNG phải source code chính
- `lib/` chứa business logic chính, KHÔNG phải utilities đơn giản
- `components/admin/` vs `components/` - admin components tách riêng

## Key Documentation Files

- [`CLAUDE.md`](CLAUDE.md) - Chi tiết đầy đủ về hệ thống (522 dòng)
- [`docs/flexible-column-mapping-system.md`](docs/flexible-column-mapping-system.md) - Excel mapping system
- [`docs/management-signature-business-logic.md`](docs/management-signature-business-logic.md) - Signature workflow
- [`docs/timezone-fix-guide.md`](docs/timezone-fix-guide.md) - Vietnam timezone implementation

## Misleading Names

- `payroll_type` KHÔNG tham gia duplicate check (chỉ `employee_id` + `salary_month`)
- `admin_users` table riêng biệt với `employees` table
- `cccd_hash` có thể là password nếu `last_password_change_at` là NULL

## Business Context

- Hệ thống quản lý lương cho MAY HÒA THỌ ĐIỆN BÀN
- 8 roles với permissions khác nhau
- 3-tier management signature (giam_doc, ke_toan, nguoi_lap_bieu)
