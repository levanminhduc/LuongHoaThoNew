## 1. Extract Shared XLSX Builder

- [x] 1.1 Create `lib/excel/payroll-excel-builder.ts` — move PAYROLL_FIELDS, FIELD_HEADERS, HIDDEN_FIELDS constants and cell styling helpers from `app/api/admin/payroll-export/route.ts`
- [x] 1.2 Update `app/api/admin/payroll-export/route.ts` to import from `lib/excel/payroll-excel-builder.ts`
- [x] 1.3 Verify existing single-dept export still works after refactor

## 2. Bulk Export API

- [x] 2.1 Create `app/api/admin/bulk-payroll-export/route.ts` with POST handler
- [x] 2.2 Validate request body: `departments: string[]` (min 1), `salary_month: string`, `payroll_type: "monthly" | "t13"` — return 400 on invalid input
- [x] 2.3 Verify admin JWT via `verifyToken` — return 401 if not admin
- [x] 2.4 Single Supabase query: fetch all payrolls + employees JOIN for the given month/type, filter by selected departments
- [x] 2.5 Group records by department in JS, sort alphabetically by dept name then by employee_id within each group
- [x] 2.6 Insert placeholder row for each selected dept with zero records: `{ dept_name, "Không có dữ liệu", ...empty fields }`
- [x] 2.7 Build XLSX using `payroll-excel-builder.ts` — first column "Phòng Ban", remaining columns = visible payroll fields
- [x] 2.8 Return binary response with headers

## 3. Admin Page

- [x] 3.1 Create `app/admin/bulk-export/page.tsx` with auth guard
- [x] 3.2 Fetch department list on mount from existing departments API
- [x] 3.3 Add "Chọn Tất Cả / Bỏ Chọn Tất Cả" toggle — all checked by default on load
- [x] 3.4 Month selector: `YYYY-MM` input for monthly, year input for T13
- [x] 3.5 Payroll type selector: "Tháng thường" / "Tháng 13"
- [x] 3.6 "Xuất Excel" button with loading/error states

## 4. Sidebar Integration

- [x] 4.1 Add `{ title: "Xuất Lương Toàn Bộ", icon: FileDown, href: "/admin/bulk-export" }` to `dataManagementItems`

## 5. Typecheck & Lint

- [x] 5.1 Run `npm run typecheck` — fix all TypeScript errors
- [x] 5.2 Run `npm run lint` — fix all ESLint errors
