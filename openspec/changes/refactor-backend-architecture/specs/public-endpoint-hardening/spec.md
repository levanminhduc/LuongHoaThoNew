## Purpose

Bảo vệ các endpoint không yêu cầu JWT — `employee/lookup`, `employee/check-password-status`, `admin/login` — khỏi brute-force và khỏi việc bị dùng làm oracle dò danh sách mã nhân viên.

## ADDED Requirements

### Requirement: Endpoint công khai có rate limit

`POST /api/employee/lookup`, `POST /api/employee/check-password-status` và `POST /api/admin/login` SHALL gọi `rateLimit(...)` từ `lib/security-middleware.ts` trước khi xử lý request.

#### Scenario: Vượt ngưỡng request

- **WHEN** cùng một IP gửi vượt ngưỡng cấu hình trong cửa sổ thời gian
- **THEN** response SHALL có HTTP 429 kèm header `Retry-After`
- **THEN** SHALL NOT có lần verify bcrypt hay truy vấn DB nào được thực hiện cho request bị chặn

#### Scenario: Dưới ngưỡng

- **WHEN** số request trong cửa sổ còn dưới ngưỡng
- **THEN** handler SHALL xử lý bình thường

### Requirement: check-password-status không tiết lộ nhân viên có tồn tại

`POST /api/employee/check-password-status` SHALL trả cùng một hình dạng response cho mã nhân viên không tồn tại và cho mã tồn tại, không dùng HTTP 404 để phân biệt.

#### Scenario: Mã nhân viên không tồn tại

- **WHEN** client POST một `employee_id` không có trong DB
- **THEN** response SHALL có cùng HTTP status và cùng tập field như khi mã tồn tại
- **THEN** message SHALL NOT chứa `"Không tìm thấy nhân viên"`

#### Scenario: Endpoint vẫn dùng được cho luồng thật

- **WHEN** người dùng hợp lệ dùng luồng "quên mật khẩu" / kiểm tra trạng thái mật khẩu
- **THEN** luồng SHALL hoạt động như trước thay đổi

### Requirement: Mọi route mutate có CSRF protection

Mọi route handler có `POST`/`PUT`/`PATCH`/`DELETE` và không phải endpoint đăng nhập SHALL gọi `csrfProtection(request)` ở đầu handler và trả sớm khi nó trả về response.

#### Scenario: Request mutate thiếu CSRF token

- **WHEN** một request mutate tới route đã bổ sung mà thiếu/không khớp CSRF token
- **THEN** request SHALL bị từ chối trước khi chạm DB

#### Scenario: Client trình duyệt hiện tại không bị vỡ

- **WHEN** client gọi qua `apiClient` (`lib/api/`) từ trình duyệt cùng origin
- **THEN** mọi route mutate SHALL vẫn hoạt động, vì `csrfProtection` kiểm `Origin`/`Referer` (`lib/security-middleware.ts:63-92`) — header trình duyệt tự gắn, không cần token phía client

#### Scenario: Caller không phải trình duyệt

- **WHEN** một script/công cụ gọi route mutate mà không gửi `Origin` lẫn `Referer` hợp lệ
- **THEN** request SHALL bị từ chối với HTTP 403
- **THEN** danh sách caller kiểu này SHALL được rà trước khi bật CSRF cho từng route (xem tasks nhóm 8)
