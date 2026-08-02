## Purpose

Bảo vệ các endpoint không yêu cầu JWT — `employee/lookup` và `admin/login` — khỏi brute-force và khỏi việc bị dùng làm oracle dò danh sách mã nhân viên.

> `employee/check-password-status` từng nằm trong phạm vi này. Khi thực hiện, grep toàn repo cho thấy **không caller nào** gọi nó, nên endpoint đã được **xoá hẳn** thay vì vá — bỏ luôn một bề mặt tấn công không auth chạm bảng `employees`. Yêu cầu về oracle bên dưới vì vậy chuyển thành yêu cầu _không tồn tại endpoint_.

## ADDED Requirements

### Requirement: Endpoint công khai có rate limit

`POST /api/employee/lookup` và `POST /api/admin/login` SHALL gọi `rateLimit(...)` từ `lib/security-middleware.ts` trước khi xử lý request.

#### Scenario: Vượt ngưỡng request

- **WHEN** cùng một IP gửi vượt ngưỡng cấu hình trong cửa sổ thời gian
- **THEN** response SHALL có HTTP 429 kèm header `Retry-After`
- **THEN** SHALL NOT có lần verify bcrypt hay truy vấn DB nào được thực hiện cho request bị chặn

#### Scenario: Dưới ngưỡng

- **WHEN** số request trong cửa sổ còn dưới ngưỡng
- **THEN** handler SHALL xử lý bình thường

### Requirement: Không có endpoint công khai nào dò được sự tồn tại của nhân viên

Backend SHALL NOT expose endpoint không yêu cầu JWT nào cho phép phân biệt mã nhân viên tồn tại với mã không tồn tại.

#### Scenario: check-password-status đã bị gỡ

- **WHEN** client gọi `POST /api/employee/check-password-status`
- **THEN** response SHALL là HTTP 404 của Next.js vì route không còn tồn tại

#### Scenario: lookup không phân biệt bằng thông báo lỗi

- **WHEN** client POST `employee/lookup` với mã nhân viên không tồn tại
- **THEN** response SHALL có cùng HTTP status và cùng tập field như khi mã tồn tại nhưng sai mật khẩu

### Requirement: Mọi route mutate có CSRF protection

Mọi route handler có `POST`/`PUT`/`PATCH`/`DELETE` SHALL gọi `csrfProtection(request)` ở đầu handler và trả sớm khi nó trả về response.

> Ngoại lệ cho endpoint đăng nhập trong bản nháp đã bị **bỏ**: `admin/login` nay cũng có CSRF, đặt trước `rateLimit` để request sai `Origin` không tiêu một lượt hạn mức của IP.

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
