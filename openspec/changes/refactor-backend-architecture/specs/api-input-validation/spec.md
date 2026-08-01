## Purpose

Đưa 100% boundary nhận user input của backend đi qua Zod schema tập trung ở `lib/validations/`, thay cho if-check tay và `parseInt` không chặn giá trị bất thường.

## ADDED Requirements

### Requirement: Route mutate parse body qua Zod

Mọi route handler có `POST`/`PUT`/`PATCH`/`DELETE` đọc `request.json()` SHALL parse body bằng schema từ `lib/validations/` qua `parseSchema()` + `createValidationErrorResponse()`, hoặc `parseSchemaOrThrow()`. Handler SHALL NOT tự viết if-check kiểu `if (!field) return 400`.

#### Scenario: Body thiếu field bắt buộc

- **WHEN** client POST body thiếu field bắt buộc tới một route mutate
- **THEN** response SHALL có HTTP 400
- **THEN** body SHALL theo format của `createValidationErrorResponse()` với danh sách field lỗi

#### Scenario: Body sai kiểu dữ liệu

- **WHEN** client gửi `employee_id` là số thay vì chuỗi
- **THEN** request SHALL bị từ chối trước khi chạm DB

#### Scenario: Body hợp lệ

- **WHEN** body đúng schema
- **THEN** handler SHALL chạy logic như cũ và trả response không đổi so với trước refactor

### Requirement: Query param dạng số được coerce và chặn biên

Route đọc query param dạng số (`page`, `limit`, `offset`) SHALL dùng `z.coerce.number().int().positive()` (kèm `.max()` cho `limit`) thay cho `parseInt(searchParams.get(...) || "1")`.

#### Scenario: page âm hoặc không phải số

- **WHEN** client gọi `?page=-5` hoặc `?page=abc`
- **THEN** response SHALL có HTTP 400
- **THEN** SHALL NOT có truy vấn DB nào được thực hiện

#### Scenario: limit vượt trần

- **WHEN** client gọi `?limit=100000`
- **THEN** request SHALL bị từ chối hoặc bị kẹp về trần đã khai báo trong schema, không truyền thẳng xuống DB

### Requirement: Schema Zod sống trong lib/validations

Schema dùng cho boundary API SHALL được khai báo trong `lib/validations/<domain>.ts` và export qua barrel `lib/validations/index.ts`. Route handler SHALL NOT khai báo schema inline trong file route.

#### Scenario: Thêm boundary mới

- **WHEN** một route mới cần validate input
- **THEN** schema của nó SHALL nằm trong file domain tương ứng, không nằm trong `app/api/**`
