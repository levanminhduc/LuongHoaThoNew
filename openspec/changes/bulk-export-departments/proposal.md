## Why

Admins need to export payroll data for multiple departments at once. Currently, each department requires a separate export action, making bulk operations (70 departments) tedious and time-consuming.

## What Changes

- New admin page `/admin/bulk-export` with sidebar entry "Xuất Lương Toàn Bộ"
- New API endpoint `POST /api/admin/bulk-payroll-export` that accepts a department list and month, queries all data in a single DB call, and returns a single `.xlsx` file with one flat sheet containing all employees from all selected departments
- Admin sidebar updated to include the new page link

## Capabilities

### New Capabilities

- `bulk-export-departments`: Select departments from a checklist, choose salary month and type, export all selected departments into a single XLSX file with one flat sheet (all employees combined, sorted alphabetically by department name)

### Modified Capabilities

- `admin-sidebar`: Add new navigation item "Xuất Lương Toàn Bộ" linking to `/admin/bulk-export`

## Impact

- **New files**: `app/admin/bulk-export/page.tsx`, `app/api/admin/bulk-payroll-export/route.ts`
- **Modified files**: `components/admin/admin-sidebar.tsx`
- **Dependencies**: `xlsx-js-style` (already in project), no new deps needed
- **Reuses**: PAYROLL_FIELDS, FIELD_HEADERS, HIDDEN_FIELDS constants from existing `/api/admin/payroll-export/route.ts`
