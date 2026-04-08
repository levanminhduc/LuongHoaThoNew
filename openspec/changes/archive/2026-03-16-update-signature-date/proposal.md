## Why

Admin needs to backdate or adjust signature timestamps for employee payroll records and management approvals to synchronize the system with actual business timelines. Currently, `signed_at` is always set to the real-time moment of signing (UTC+7), with no way to correct or adjust it after the fact. This causes mismatches when payroll records need to reflect specific signing dates within the salary month.

## What Changes

- New admin API endpoint to update `signed_at` for already-signed employee payroll records across `payrolls` and `signature_logs` tables
- New admin API endpoint to update or create management signatures (`management_signatures` table) with custom dates
- Support for bulk update (all signed employees in a month) or selective update (specific employee IDs)
- Random date generation: base date ± N days with random hour/minute (0-24h) for natural-looking timestamps
- New admin UI dialog with two sections: employee signatures and management signatures
- Management section supports both updating existing signatures and creating new ones (admin signs on behalf, using the user with the matching role from DB)

## Capabilities

### New Capabilities

- `admin-update-employee-signature-date`: Admin can update signed_at for already-signed employee payroll records. Supports bulk (all) or selective (specific employees) mode with optional random date offset ±N days and random time.
- `admin-manage-management-signature-date`: Admin can update signed_at for existing management signatures or create new ones (sign on behalf) with custom date. Covers all 3 types: giam_doc, ke_toan, nguoi_lap_bieu. Auto-resolves signer from DB by role.
- `admin-signature-date-dialog`: Admin UI dialog component with two sections — employee signatures (bulk/selective with date picker and random range) and management signatures (view status, update date, or sign on behalf).

### Modified Capabilities

None — this is a new admin-only feature that does not change existing signature flows.

## Impact

- **API**: Two new endpoints under `/api/admin/` — one for employee signature date updates, one for management signature date operations
- **Database**: Direct updates to `payrolls.signed_at`, `signature_logs.signed_at`, and `management_signatures.signed_at`/INSERT. No schema changes needed.
- **Frontend**: New dialog component in admin dashboard. No changes to existing employee or management signature flows.
- **Security**: Admin-only access. All operations logged for audit trail.
