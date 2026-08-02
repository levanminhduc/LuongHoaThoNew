## Why

Change `refactor-backend-architecture` (archive 2026-08-01) đã đóng 3 BLOCKER P0 và rút được 3 repository đầu tiên, nhưng cố ý dừng ở đó. Tiêu chí **Q1 Bounded contexts** và trụ **"`app/` mỏng"** của chuẩn tham chiếu vẫn Fail.

Đo lại ngày 2026-08-02:

- **179 lệnh `.from()` nằm thẳng trong 58 route handler**, chạm 17 bảng. Hai bảng chiếm quá nửa: `employees` 62 lệnh, `payrolls` 49.
- **62/75 route tự gọi `createServiceClient()`** thay vì nhận dữ liệu từ tầng dưới.
- Route dài nhất 540 dòng (`app/api/admin/employees/[id]/route.ts`) — một file chứa cả PUT, DELETE, GET, mỗi handler tự dựng 3–5 truy vấn.
- Trung bình 16.837 dòng / 75 route = 224 dòng/route.

Hệ quả cụ thể, không phải lý thuyết: truy vấn `employees` theo `employee_id` kèm cột hash bị lặp ở nhiều route; sửa một cột phải grep toàn repo; và logic nghiệp vụ trong handler không test được nếu không dựng HTTP.

Ba repository đã có (`payroll`, `bonus`, `employee`) chứng minh khuôn làm việc được và đã có test — vấn đề là mới phủ 15/179 lệnh.

## What Changes

Rút toàn bộ truy cập dữ liệu khỏi `app/api/**` xuống `lib/<domain>/`, theo đúng khuôn 3 repository hiện có. Chia theo **bảng dữ liệu**, mỗi nhóm một PR, không big-bang.

Route sau khi rút chỉ còn: auth → validate (zod) → gọi repository/service → map response.

- Mở rộng `employee-repository` và `payroll-repository` (2 nhóm lớn nhất, 111/179 lệnh).
- Tạo mới: `signature-repository`, `import-config-repository`, `department-repository`, `attendance-repository`, `import-history-repository`, `audit-log-repository`.
- Mở rộng `bonus-repository` cho `employee_bonuses`.
- Logic nhiều bước tách thành `*-service.ts` cạnh repository, theo khuôn `lookup-service.ts` / `cascade-update-employee.ts` đã có.
- Mọi module DAL mới mang `import "server-only"`.
- ESLint thêm rule cấm `.from(` xuất hiện trong `app/api/**` sau khi nhóm cuối xong.

**Không đụng database** (ràng buộc D0 kế thừa): không migration, không đổi bảng/cột/index/RLS, không script dữ liệu. Chỉ đổi TypeScript.

Không đổi response JSON của bất kỳ endpoint nào. Đây là điều kiện nghiệm thu, không phải kỳ vọng.

## Capabilities

### New Capabilities

- `server-data-access-boundary`: ranh giới giữa tầng route và tầng truy cập dữ liệu — ai được gọi `.from()`, module DAL phải chặn build khi lọt xuống client, repository nhận client qua tham số.

### Modified Capabilities

Không có. Hành vi nhìn từ ngoài giữ nguyên tuyệt đối; thay đổi nằm hết ở vị trí code.

## Impact

- `app/api/**`: 58 route bị sửa, ước tính giảm ~4.000 dòng.
- `lib/employee/`, `lib/payroll/`, `lib/bonus/`, `lib/attendance/`: mở rộng; 6 thư mục/module DAL mới.
- `eslint.config.mjs`: thêm rule chặn `.from(` trong route.
- Không đụng `scripts/supabase-setup/`, không đụng `components/`, không đổi `lib/api/endpoints.ts`.
- Rủi ro chính: sai lệch truy vấn im lặng (đổi cột select, mất filter). Xử lý bằng parity test bắt buộc mỗi nhóm — xem `design.md`.
