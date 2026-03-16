## 1. Employee Signature Date Update API

- [x] 1.1 Create API route `app/api/admin/update-signature-date/route.ts` with POST handler: auth check (admin only), validate inputs (salary_month, base_date, random_range_days, scope, employee_ids, is_t13)
- [x] 1.2 Implement random timestamp generation utility in the route: base_date ± random_range_days with random hour (0-23) and minute (0-59) for each employee
- [x] 1.3 Implement bulk mode: query all signed payrolls for the month, generate random timestamp per employee, update `payrolls.signed_at` + `payrolls.updated_at` (Vietnam current time) and `signature_logs.signed_at` ← (verify: both tables updated atomically, T13 filtering works, random range produces dates within bounds)

## 2. Management Signature Date API

- [x] 2.1 Create API route `app/api/admin/update-management-signature-date/route.ts` with POST handler: auth check, validate inputs (salary_month, signature_type, new_signed_at, action, is_t13)
- [x] 2.2 Implement update action: find active management_signature by (salary_month, signature_type, is_active=true), update signed_at
- [x] 2.3 Implement create action: auto-resolve signer from employees table by role, insert new management_signature with custom signed_at ← (verify: role resolution works for all 3 types, duplicate create returns 409, non-existent role returns 404)

## 3. Admin Signature Date Dialog UI

- [x] 3.1 Create dialog component `components/admin/UpdateSignatureDateDialog.tsx` with month selector, payroll type toggle (monthly/T13), and two sections layout
- [x] 3.2 Implement employee signature section: scope toggle (all/selected), date picker for base_date, number input for random_range_days, employee list with checkboxes (fetched from API when selective mode)
- [x] 3.3 Implement management signature section: fetch and display 3 signature types with status (signed/unsigned), current date, action buttons ("Sửa ngày" / "Ký luôn"), date-time picker for each
- [x] 3.4 Wire API calls with loading states, error display (inline), and success toast. Refresh data after successful operations ← (verify: all API integrations work, error states display correctly, loading prevents double-submit)

## 4. Integration

- [x] 4.1 Add dialog trigger button to admin dashboard page (near existing bulk signature UI) ← (verify: dialog opens/closes correctly, button visible only to admin, all flows work end-to-end from UI to DB)
