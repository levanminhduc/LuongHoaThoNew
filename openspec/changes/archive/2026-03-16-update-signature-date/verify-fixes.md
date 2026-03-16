## [2026-03-16] Round 1 (from spx-apply auto-verify)

### spx-verifier
- Fixed: Dialog fetchSignedEmployees now calls signature-stats API with `include_signed_employees=true` query param, and the stats API endpoint was extended to return signed employee list with employee_id, full_name, department when that param is set

### spx-arch-verifier
- Fixed: Split UpdateSignatureDateDialog.tsx (509 lines) into 3 files under 200 lines each: main dialog shell (184), EmployeeSignatureDateForm (194), ManagementSignatureDateForm (192)
- Fixed: signed_employees field added to signature-stats API response when include_signed_employees=true is passed
- Note: management_signatures.payroll_type column already exists in production — the existing management-signature/route.ts already filters on it, confirming the column was added via a post-migration
