## Purpose

Đảm bảo mọi response rời khỏi `app/api/**` không mang thông tin nội bộ (stack trace, đường dẫn file, tên bảng) hay dữ liệu nhạy cảm của người dùng (mật khẩu/CCCD vừa nhập, cột DB không cần thiết), và mọi lỗi đều đi qua một mapper chung thay vì 78 định dạng tự chế.

## ADDED Requirements

### Requirement: Error response không chứa stack trace ở production

`ApiErrorHandler.fromError()` SHALL NOT đưa `error.stack` vào giá trị trả về khi `process.env.NODE_ENV === "production"`. Stack trace SHALL được ghi bằng `console.error` phía server trong mọi môi trường. Trường `details` của `ApiError` SHALL chỉ chứa thông tin an toàn cho người dùng cuối, hoặc `undefined`.

#### Scenario: Lỗi runtime ở production

- **WHEN** một route handler ném `Error` bất kỳ và `NODE_ENV === "production"`
- **THEN** body response SHALL NOT chứa chuỗi `"at "` của stack trace, tên file `.ts`, hay đường dẫn tuyệt đối
- **THEN** server log SHALL chứa stack trace đầy đủ

#### Scenario: Lỗi runtime ở development

- **WHEN** một route handler ném `Error` và `NODE_ENV !== "production"`
- **THEN** `details` MAY chứa stack trace để debug

#### Scenario: Mã lỗi và message giữ nguyên

- **WHEN** client nhận error response sau thay đổi này
- **THEN** field `code`, `message`, `timestamp` SHALL giữ nguyên ngữ nghĩa như trước
- **THEN** hook trong `lib/hooks/` SHALL không cần sửa để đọc lỗi

### Requirement: Endpoint tra cứu lương không echo credential

Response của `POST /api/employee/lookup` SHALL NOT chứa field `cccd` (hay bất kỳ field nào mang giá trị mật khẩu/CCCD mà client vừa gửi lên). Type `LookupPayrollResponse` SHALL NOT khai báo field đó.

#### Scenario: Tra cứu thành công

- **WHEN** nhân viên POST `employee_id` + `cccd` đúng
- **THEN** response SHALL chứa dữ liệu lương và thông tin nhân viên
- **THEN** response SHALL NOT chứa key `cccd` ở bất kỳ cấp nào của JSON

#### Scenario: Chức năng phía client không đổi

- **WHEN** người dùng dùng luồng tra cứu, xem lịch sử lương, đổi mật khẩu sau khi bỏ field
- **THEN** mọi chức năng SHALL hoạt động như cũ (client giữ giá trị người dùng nhập trong state của chính nó, không đọc từ response)

### Requirement: Route trả dữ liệu lương dùng danh sách cột tường minh

Route handler SHALL NOT dùng `select("*")` khi truy vấn bảng `payrolls` hoặc `employees`. Các route SHALL dùng hằng danh sách cột trong `lib/payroll-select.ts` (hoặc module tương đương cho `employees`).

#### Scenario: Truy vấn dữ liệu lương cá nhân

- **WHEN** `GET /api/payroll/my-data` trả dữ liệu
- **THEN** query SHALL chỉ chọn cột nằm trong hằng select đã khai báo
- **THEN** response SHALL NOT chứa cột không được hằng đó liệt kê

### Requirement: Lỗi được map qua một hàm chung

Repo SHALL có `lib/errors/app-error.ts` export `AppError` và các lớp con `ValidationError`, `NotFoundError`, `ForbiddenError`, cùng hàm `toErrorResponse(error: unknown): NextResponse`. `toErrorResponse` SHALL map `AppError` sang HTTP status tương ứng (400/404/403) và mọi lỗi khác sang 500 với message chung, dùng lại `ApiErrorHandler.ErrorCodes` sẵn có.

#### Scenario: Route ném ValidationError

- **WHEN** handler ném `ValidationError` và catch block gọi `toErrorResponse(err)`
- **THEN** response SHALL có HTTP 400 và `code === "VALIDATION_ERROR"`

#### Scenario: Route ném lỗi không xác định

- **WHEN** handler ném một `Error` không phải `AppError`
- **THEN** response SHALL có HTTP 500 với message chung tiếng Việt
- **THEN** message gốc SHALL NOT bị lộ ra client ở production

#### Scenario: parseSchemaOrThrow ném lỗi có kiểu

- **WHEN** `parseSchemaOrThrow` fail validate
- **THEN** nó SHALL ném `ValidationError` thay vì `new Error(...)` trần
