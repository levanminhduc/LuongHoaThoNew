## Purpose

Đặt một ranh giới kiểm chứng được giữa tầng route (`app/api/**`) và tầng truy cập dữ liệu (`lib/<domain>/*-repository.ts`): route không tự dựng truy vấn, module DAL không lọt xuống bundle client, và mỗi truy vấn chỉ có đúng một nơi định nghĩa để sửa.

## ADDED Requirements

### Requirement: Route handler không tự dựng truy vấn dữ liệu

File trong `app/api/**` SHALL NOT gọi `.from()` trên Supabase client. Mọi truy cập bảng SHALL đi qua một hàm export từ `lib/<domain>/*-repository.ts`.

Route handler SHALL chỉ giữ 4 việc: xác thực/phân quyền, validate input bằng zod, gọi repository hoặc service, và map kết quả thành response.

#### Scenario: Route đọc dữ liệu

- **WHEN** một route handler cần đọc bản ghi từ bảng bất kỳ
- **THEN** nó SHALL gọi hàm repository và truyền client tạo bởi `createServiceClient()`
- **THEN** chuỗi select và bộ lọc SHALL nằm trong file repository, không nằm trong route

#### Scenario: Lint chặn vi phạm

- **WHEN** một file dưới `app/api/**` chứa lệnh `.from(`
- **THEN** `npm run lint` SHALL báo lỗi và CI SHALL fail

#### Scenario: Route chỉ còn 4 việc

- **WHEN** đọc bất kỳ handler nào sau khi nhóm của nó hoàn thành
- **THEN** handler SHALL KHÔNG chứa chuỗi select PostgREST, tên cột DB, hay xử lý `error.code` của PostgREST

### Requirement: Module truy cập dữ liệu chặn được ở build time

Mọi file định nghĩa truy vấn DB hoặc đọc secret SHALL bắt đầu bằng `import "server-only"`.

#### Scenario: Component client lỡ import repository

- **WHEN** một file trong `components/**` hoặc `app/**/*.tsx` phía client import một module repository
- **THEN** `npm run build` SHALL fail
- **THEN** thông báo lỗi SHALL chỉ ra module server-only bị import từ client

#### Scenario: Test vẫn chạy được

- **WHEN** jest import một module repository có `server-only`
- **THEN** suite SHALL chạy bình thường, vì `next/jest` map `server-only` sang module rỗng

### Requirement: Repository nhận client qua tham số

Hàm repository SHALL nhận Supabase client làm tham số đầu tiên, kiểu `SupabaseServiceClient`. Repository SHALL NOT tự gọi `createServiceClient()`.

Lý do: giữ quyền quyết định vòng đời client ở tầng route, và cho phép test truyền client giả mà không cần mock module.

#### Scenario: Test truyền client giả

- **WHEN** một test gọi hàm repository với object giả lập chuỗi `.from().select().eq()`
- **THEN** hàm SHALL chạy được mà không cần biến môi trường Supabase

### Requirement: Rút repository không đổi hành vi endpoint

Việc di chuyển truy vấn từ route xuống repository SHALL NOT đổi: danh sách key trong JSON response, kiểu dữ liệu của từng key, mã HTTP status, hay thứ tự bản ghi.

#### Scenario: Chứng minh bằng parity test

- **WHEN** một nhóm route được rút xuống repository
- **THEN** nhóm đó SHALL kèm test so sánh truy vấn dựng ra trước và sau khi rút, trên cùng đầu vào
- **THEN** test SHALL so cả chuỗi select, danh sách bộ lọc, và thứ tự sắp xếp

#### Scenario: Truy vấn đếm giữ nguyên dạng

- **WHEN** truy vấn gốc dùng `{ count: "exact", head: true }`
- **THEN** hàm repository tương ứng SHALL giữ nguyên hai tuỳ chọn đó và SHALL NOT đổi thành truy vấn trả dòng
