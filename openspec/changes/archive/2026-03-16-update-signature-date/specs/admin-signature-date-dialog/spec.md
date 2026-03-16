## ADDED Requirements

### Requirement: Dialog with two sections for employee and management signatures
The system SHALL provide an admin dialog component with two distinct sections: one for employee signature date updates and one for management signature date operations.

#### Scenario: Dialog opens with month selector
- **WHEN** admin opens the update signature date dialog
- **THEN** dialog displays a month selector (salary_month), payroll type toggle (monthly/T13), and two sections below

### Requirement: Employee signature section with bulk and selective modes
The employee section SHALL allow admin to choose between updating all signed employees or selecting specific employees.

#### Scenario: Bulk mode selected
- **WHEN** admin selects "Tất cả NV đã ký" mode
- **THEN** section shows date picker (base_date), random range input (±N days, default 0), and submit button. No employee list shown.

#### Scenario: Selective mode with employee list
- **WHEN** admin selects "Chọn từng NV" mode
- **THEN** section fetches and displays list of signed employees for the selected month with checkboxes, date picker, random range input, and submit button

#### Scenario: Submit employee date update
- **WHEN** admin fills in base_date, random_range_days, selects scope/employees, and clicks submit
- **THEN** frontend calls POST `/api/admin/update-signature-date` with form data, displays loading state, then shows success/error result with count of updated records

### Requirement: Management signature section showing 3 signature types
The management section SHALL display the status of all 3 management signature types for the selected month.

#### Scenario: Display management signature status
- **WHEN** admin selects a month
- **THEN** section shows a table/list with 3 rows (Giám Đốc, Kế Toán, Người Lập Biểu), each showing: current status (signed/unsigned), current signed_at if signed, and action button

#### Scenario: Update existing management signature date
- **WHEN** admin clicks "Sửa ngày" on a signed management signature and picks a new date/time
- **THEN** frontend calls the API to update that signature's signed_at and refreshes the display

#### Scenario: Create management signature on behalf
- **WHEN** admin clicks "Ký luôn" on an unsigned management signature and picks a date/time
- **THEN** frontend calls the API to create the signature with the chosen date, displays success, and refreshes status to show it as signed

### Requirement: Error and loading states
The dialog SHALL display appropriate feedback for all operations.

#### Scenario: Loading state during API call
- **WHEN** an API call is in progress
- **THEN** submit buttons show loading spinner and are disabled

#### Scenario: Error display
- **WHEN** API returns an error
- **THEN** dialog shows inline error message with the error text from API response

#### Scenario: Success display
- **WHEN** API returns success
- **THEN** dialog shows success toast/message with count of affected records
