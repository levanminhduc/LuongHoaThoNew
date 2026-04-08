## ADDED Requirements

### Requirement: Department checklist loads from DB

The page SHALL fetch the list of all distinct departments from the employees table and display them as a checklist. The list SHALL be sorted alphabetically.

#### Scenario: Page loads department list

- **WHEN** admin navigates to `/admin/bulk-export`
- **THEN** system fetches distinct departments and renders each as a checkbox item sorted A-Z

#### Scenario: All departments selected by default

- **WHEN** department list finishes loading
- **THEN** all checkboxes are checked by default

#### Scenario: Select all / deselect all toggle

- **WHEN** admin clicks "Chọn Tất Cả" toggle
- **THEN** all checkboxes become checked; clicking again unchecks all

---

### Requirement: Month and payroll type selection

The page SHALL provide a month selector (format `YYYY-MM` for monthly, `YYYY-13` for T13) and a payroll type selector (`monthly` | `t13`).

#### Scenario: Default month is current month

- **WHEN** page loads
- **THEN** month selector defaults to current calendar month in `YYYY-MM` format

#### Scenario: T13 payroll type changes month format

- **WHEN** admin selects payroll type "T13"
- **THEN** month selector switches to year-only input (e.g., `2024`) and constructs `YYYY-13` internally

---

### Requirement: Export button triggers bulk download

The page SHALL have an "Xuất Excel" button. On click, the system SHALL POST to `/api/admin/bulk-payroll-export` with selected departments, month, and payroll type, then trigger a file download on success.

#### Scenario: Successful export

- **WHEN** admin selects at least one department and clicks "Xuất Excel"
- **THEN** browser downloads a file named `Luong_<month>_ToanBo.xlsx` (or `Luong13_<year>_ToanBo.xlsx` for T13)

#### Scenario: No departments selected

- **WHEN** admin clicks "Xuất Excel" with zero departments checked
- **THEN** button is disabled and shows tooltip "Vui lòng chọn ít nhất một phòng ban"

#### Scenario: Export in progress

- **WHEN** export request is pending
- **THEN** button shows loading spinner and is disabled; label changes to "Đang xuất..."

#### Scenario: Export fails

- **WHEN** API returns non-2xx status
- **THEN** system shows inline error message with status text; button re-enables

---

### Requirement: API accepts department list and returns flat XLSX

`POST /api/admin/bulk-payroll-export` SHALL accept `{ departments: string[], salary_month: string, payroll_type: "monthly" | "t13" }`, query all matching payroll records in a single DB call, and return a single XLSX binary with one sheet.

#### Scenario: Valid request returns XLSX

- **WHEN** request body contains valid `departments`, `salary_month`, and `payroll_type`
- **THEN** response is `200` with `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` and `Content-Disposition: attachment; filename="Luong_<month>_ToanBo.xlsx"`

#### Scenario: Non-admin access rejected

- **WHEN** request is made without a valid admin JWT token
- **THEN** response is `401` with `{ error: "Không có quyền truy cập" }`

#### Scenario: Empty departments array rejected

- **WHEN** request body has `departments: []`
- **THEN** response is `400` with `{ error: "Vui lòng chọn ít nhất một phòng ban" }`

#### Scenario: Missing required fields rejected

- **WHEN** `salary_month` is missing or malformed
- **THEN** response is `400` with descriptive error message

---

### Requirement: Flat sheet structure with department column

The exported XLSX SHALL contain one sheet named "Bảng Lương". The first column SHALL be "Phòng Ban" (department name). Remaining columns SHALL match the existing single-dept export (visible fields only, same headers). Rows SHALL be sorted alphabetically by department name, then by `employee_id` within each department.

#### Scenario: Department column is first

- **WHEN** XLSX is generated
- **THEN** column A is "Phòng Ban" and columns B onward are the standard payroll fields

#### Scenario: Rows sorted by department then employee

- **WHEN** multiple departments are selected
- **THEN** rows are grouped by department name (A-Z), within each group sorted by `employee_id` ascending

---

### Requirement: Empty department placeholder row

If a selected department has no payroll records for the requested month, the system SHALL insert exactly one placeholder row for that department.

#### Scenario: Department with no data gets placeholder

- **WHEN** a selected department has zero payroll records for the month
- **THEN** one row is inserted with "Phòng Ban" = dept name, "Mã Nhân Viên" = dept name, "Tháng Lương" = "Không có dữ liệu", all other fields empty

---

### Requirement: Shared XLSX builder extracted to lib

The PAYROLL_FIELDS, FIELD_HEADERS, HIDDEN_FIELDS constants and cell styling logic SHALL be extracted from `/api/admin/payroll-export/route.ts` into `lib/excel/payroll-excel-builder.ts` and reused by both the existing and new export endpoints.

#### Scenario: Both endpoints produce identical field headers

- **WHEN** single-dept export and bulk export are called for the same department/month
- **THEN** both XLSX files have identical column headers and field ordering
