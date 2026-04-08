## ADDED Requirements

### Requirement: Admin can update signed_at for existing management signatures

The system SHALL allow admin to update the `signed_at` timestamp for management signatures that already exist in the `management_signatures` table.

#### Scenario: Update existing management signature date

- **WHEN** admin calls POST `/api/admin/update-management-signature-date` with `salary_month: "2025-02"`, `signature_type: "giam_doc"`, `new_signed_at: "2025-02-28T10:30:00"`
- **THEN** system updates `management_signatures.signed_at` where `salary_month = "2025-02"` AND `signature_type = "giam_doc"` AND `is_active = true`

#### Scenario: Management signature not found

- **WHEN** admin calls with a signature_type that has no active record for that month
- **THEN** system returns `{ success: false, error: "Không tìm thấy chữ ký quản lý" }` with status 404

### Requirement: Admin can create management signature on behalf with custom date

The system SHALL allow admin to create a new management signature on behalf of a role holder when no active signature exists for that month and signature type. The signer MUST be auto-resolved from the `employees` table by matching role.

#### Scenario: Create management signature on behalf

- **WHEN** admin calls with `salary_month: "2025-02"`, `signature_type: "ke_toan"`, `new_signed_at: "2025-02-27T14:00:00"`, `action: "create"`
- **THEN** system queries `employees` table for first employee with role `ke_toan`, inserts new record into `management_signatures` with `signed_by_id = employee.employee_id`, `signed_by_name = employee.full_name`, `signed_at = new_signed_at`, `is_active = true`

#### Scenario: No user with matching role found

- **WHEN** admin tries to create a signature for `signature_type: "giam_doc"` but no employee has role `giam_doc`
- **THEN** system returns `{ success: false, error: "Không tìm thấy người có chức vụ Giám Đốc" }` with status 404

#### Scenario: Signature already exists when trying to create

- **WHEN** admin tries to create but an active signature already exists for that month and type
- **THEN** system returns `{ success: false, error: "Chữ ký đã tồn tại, sử dụng chức năng sửa ngày" }` with status 409

### Requirement: Support all 3 management signature types

The system SHALL support all 3 signature types: `giam_doc`, `ke_toan`, `nguoi_lap_bieu`.

#### Scenario: Invalid signature type rejected

- **WHEN** admin calls with `signature_type: "invalid_role"`
- **THEN** system returns status 400 with `{ error: "Loại chữ ký không hợp lệ" }`

### Requirement: Support T13 management signatures

The system SHALL handle T13 salary months for management signatures using the same `is_t13` flag pattern.

#### Scenario: Update T13 management signature

- **WHEN** admin calls with `salary_month: "2025-13"`, `is_t13: true`, `signature_type: "giam_doc"`, `new_signed_at: "2025-12-28T09:00:00"`
- **THEN** system updates the management signature where `salary_month = "2025-13"` and `signature_type = "giam_doc"`

### Requirement: Non-admin access denied

The system SHALL reject requests from non-admin users.

#### Scenario: Non-admin access

- **WHEN** a non-admin user calls the endpoint
- **THEN** system returns status 403 with `{ error: "Chỉ admin mới có quyền thực hiện" }`
