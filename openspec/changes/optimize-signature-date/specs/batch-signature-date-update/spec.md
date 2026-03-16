## ADDED Requirements

### Requirement: Bulk update signature dates via RPC
The system SHALL provide a PostgreSQL function `bulk_update_signature_dates` that accepts an array of employee IDs, a salary month, a base date, a random range in days, and a boolean is_t13 flag. The function SHALL generate an independently random timestamp per employee within the specified date range (base_date to base_date + random_range_days, hours 0-23, minutes 0-59) and update `payrolls.signed_at`, `payrolls.updated_at` (set to current Vietnam timestamp), and `signature_logs.signed_at` for each employee. Each employee's updates SHALL be wrapped in a PL/pgSQL `BEGIN...EXCEPTION...END` subtransaction block — if either table update fails or returns 0 affected rows, the subtransaction is rolled back for that employee only (both tables revert), and the employee is counted as failed.

#### Scenario: All employees updated successfully
- **WHEN** the function is called with 200 employee IDs, salary_month "2025-03", base_date "2025-03-25", random_range_days 2, is_t13 false
- **THEN** the function SHALL update `payrolls.signed_at`, `payrolls.updated_at`, and `signature_logs.signed_at` for all 200 employees with independently random timestamps between 2025-03-25 00:00 and 2025-03-27 23:59
- **THEN** the function SHALL return JSONB with `success_count: 200`, `error_count: 0`, `errors: []`

#### Scenario: Partial failure with best-effort
- **WHEN** the function is called with 200 employee IDs and 3 employees have no matching signature_logs record
- **THEN** the function SHALL rollback the subtransaction for those 3 employees (reverting their payrolls update too), continue processing remaining employees
- **THEN** the function SHALL return JSONB with `success_count: 197`, `error_count: 3`, and `errors` array containing the failed employee IDs and error messages

#### Scenario: payrolls record not updated
- **WHEN** an employee's payroll row is not found or no longer matches (0 rows affected)
- **THEN** the function SHALL count that employee as failed with error "No matching payroll record updated"

#### Scenario: signature_logs record missing
- **WHEN** an employee has a matching payroll but no `signature_logs` record for the given salary_month
- **THEN** the function SHALL count that employee as failed (subtransaction rollback reverts payrolls.signed_at change)
- **THEN** the error message SHALL indicate "No signature_logs record found"

#### Scenario: T13 payroll type filtering
- **WHEN** the function is called with is_t13 = true
- **THEN** the function SHALL only update payrolls WHERE `payroll_type = 't13'`
- **NOTE**: The salary_month parameter accepts both `YYYY-13` and `YYYY-T13` formats (preserving existing contract)

#### Scenario: Monthly payroll type filtering
- **WHEN** the function is called with is_t13 = false
- **THEN** the function SHALL only update payrolls WHERE `payroll_type = 'monthly' OR payroll_type IS NULL`

#### Scenario: Only signed payrolls are updated
- **WHEN** the function processes employee IDs
- **THEN** the function SHALL only update payrolls WHERE `is_signed = true` for the given salary_month

#### Scenario: Empty employee array
- **WHEN** the function is called with an empty employee_ids array
- **THEN** the function SHALL return JSONB with `success_count: 0`, `error_count: 0`, `errors: []`

### Requirement: Random timestamp distribution
Each employee SHALL receive an independently random timestamp generated as: base_date + random(0..random_range_days) days + random(0..23) hours + random(0..59) minutes. The `random_range_days` parameter SHALL be a non-negative integer between 0 and 30 (inclusive). The randomness MUST be per-employee (not shared across batch). Collisions (two employees getting the same timestamp) are acceptable — no uniqueness guarantee is required. All generated timestamps SHALL be treated as Vietnam timezone (UTC+7) — the RPC function generates timestamps using `base_date + INTERVAL` arithmetic without timezone conversion since the stored `signed_at` values in the database follow the project's Vietnam time convention.

#### Scenario: Single day range
- **WHEN** random_range_days is 0
- **THEN** all timestamps SHALL be on base_date with random hours (0-23) and minutes (0-59)

#### Scenario: Multi-day range
- **WHEN** random_range_days is 3
- **THEN** timestamps SHALL be distributed across base_date to base_date + 3 days with random hours and minutes
