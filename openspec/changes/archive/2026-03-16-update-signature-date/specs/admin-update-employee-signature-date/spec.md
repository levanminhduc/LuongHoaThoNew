## ADDED Requirements

### Requirement: Admin can update signed_at for already-signed employee records

The system SHALL allow admin to update the `signed_at` timestamp for employee payroll records that are already signed (`is_signed = true`). The update MUST apply to both `payrolls.signed_at` and `signature_logs.signed_at` for consistency.

#### Scenario: Update all signed employees in a month with fixed date

- **WHEN** admin calls POST `/api/admin/update-signature-date` with `salary_month: "2025-02"`, `base_date: "2025-02-25"`, `random_range_days: 0`, `scope: "all"`
- **THEN** system updates `signed_at` in both `payrolls` and `signature_logs` to `2025-02-25T{random_hour}:{random_minute}:00` for ALL records where `is_signed = true` and `salary_month = "2025-02"`, and returns count of updated records

#### Scenario: Update selected employees with random date offset

- **WHEN** admin calls with `salary_month: "2025-02"`, `base_date: "2025-02-25"`, `random_range_days: 2`, `scope: "selected"`, `employee_ids: ["NV001", "NV002"]`
- **THEN** system generates a random date between 2025-02-23 and 2025-02-27 (±2 days) with random hour (0-23) and minute (0-59) for EACH employee independently, and updates both `payrolls.signed_at` and `signature_logs.signed_at`

#### Scenario: No signed records found

- **WHEN** admin calls with a `salary_month` that has no signed employee records
- **THEN** system returns `{ success: false, error: "Không có bản ghi đã ký trong tháng này" }` with status 404

#### Scenario: Non-admin access denied

- **WHEN** a non-admin user calls the endpoint
- **THEN** system returns status 403 with `{ error: "Chỉ admin mới có quyền thực hiện" }`

### Requirement: Support T13 payroll type

The system SHALL support updating signature dates for both monthly and T13 payroll types. The `is_t13` flag MUST be used to filter the correct payroll records.

#### Scenario: Update T13 payroll signatures

- **WHEN** admin calls with `salary_month: "2025-13"`, `is_t13: true`, `base_date: "2025-12-25"`, `random_range_days: 1`, `scope: "all"`
- **THEN** system updates only records where `payroll_type = "t13"` and `salary_month = "2025-13"`

### Requirement: Random timestamp generation

The system SHALL generate natural-looking timestamps by combining a base date with random offsets. Random generation MUST happen on the backend.

#### Scenario: Random with range 0 (fixed date)

- **WHEN** `random_range_days` is 0
- **THEN** all employees get the exact `base_date` with only random hour (0-23) and minute (0-59)

#### Scenario: Random with range N

- **WHEN** `random_range_days` is N (e.g., 2)
- **THEN** each employee gets `base_date + random(-N, +N)` days with random hour and minute, each generated independently

### Requirement: Updated_at tracking

The system SHALL update `payrolls.updated_at` to Vietnam current time whenever `signed_at` is modified.

#### Scenario: Updated_at reflects modification time

- **WHEN** admin updates signed_at for employee records
- **THEN** `payrolls.updated_at` is set to current Vietnam time (UTC+7), NOT to the custom signed_at value
