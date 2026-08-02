## Context

Ba repository đã tồn tại (`payroll`, `bonus`, `employee`) đặt sẵn khuôn: hàm thuần, nhận `SupabaseServiceClient` qua tham số, test bằng client giả. Khuôn này đã có 28 test xanh. Việc còn lại là áp nó cho 164 lệnh `.from()` còn nằm trong route.

Ràng buộc kế thừa từ change trước, vẫn nguyên hiệu lực:

- **D0 — không đụng database.** Không migration, không SQL, không script dữ liệu.
- Response JSON không đổi key nào. Change trước đã phải lập `response-keys.md` để chứng minh; lần này ngưỡng chặt hơn: **không key nào được đổi**.
- File code mới < 200 dòng.
- `van_phong` bypass department filter (`canAccessDepartment`) — đừng "sửa" thành có filter khi rút truy vấn.

## Goals / Non-Goals

**Goals:**

- `app/api/**` không còn lệnh `.from()` nào, enforce bằng ESLint.
- Mỗi truy vấn có đúng một định nghĩa, đặt cạnh domain của nó.
- Mọi module DAL chặn được ở build time bằng `server-only`.
- Logic nghiệp vụ nhiều bước test được mà không dựng HTTP.

**Non-Goals:**

- **Không tạo `src/features/` hay 4 layer clean-arch đầy đủ.** Audit đã cân nhắc và loại (`docs/audit/nextjs-backend-audit.md:245`): chi phí di chuyển 430 file lớn hơn lợi ích khi repo chưa có cross-feature import nào. Ngưỡng xét lại giữ nguyên: ≥2 team cùng sửa repo, hoặc số route vượt ~120.
- **Không tạo port/interface cho repository.** Chuẩn tham chiếu đề xuất `application/ports/`, nhưng chỉ có giá trị khi thật sự đổi adapter. Repo có đúng một nguồn dữ liệu và không có kế hoạch tách service. Thêm interface bây giờ là một lớp gián tiếp không ai dùng. Xét lại khi có adapter thứ hai thật.
- Không tối ưu truy vấn, không đổi `select("*")` thành select tường minh, không gộp N+1. Rút chỗ đứng trước; tối ưu là change khác.
- Không đụng `components/` hay tầng client.

## Decisions

### Chia theo bảng, không theo route group

Một route thường chạm 2–4 bảng, nên chia theo route sẽ khiến cùng một truy vấn `employees` bị viết lại ở nhiều repository — đúng thứ đang cần dẹp. Chia theo bảng cho mỗi truy vấn một nhà duy nhất.

Đánh đổi: một PR chạm nhiều route rải rác, review khó hình dung hơn. Bù bằng việc mỗi nhóm phải liệt kê trước danh sách route bị chạm.

### Thứ tự nhóm: bảng ít lệnh trước, `employees`/`payrolls` sau cùng

`employees` (62 lệnh) và `payrolls` (49) là hai nhóm rủi ro nhất và cũng là nơi khuôn làm việc cần chín nhất. Làm 6 nhóm nhỏ trước để khuôn và bộ parity test ổn định, rồi mới động vào hai nhóm lớn.

Đánh đổi: giá trị lớn nhất đến muộn. Chấp nhận, vì rút sai `employees` là chạm dữ liệu CCCD/lương của toàn bộ nhân viên.

### Chứng minh bằng query-capture parity, không phải snapshot response

Cách chắc chắn nhất mà không cần DB thật: một client giả ghi lại toàn bộ chuỗi gọi (`.from(...).select(...).eq(...).order(...)`), chạy qua **code trước khi rút** (lấy từ git bằng `git show <sha>:<path>`, đặt trong `__fixtures__/`) và **code sau khi rút**, rồi so hai chuỗi gọi.

Đây là kỹ thuật đã dùng thành công ở change trước cho export XLSX và import Excel. Nó bắt được đúng loại lỗi nguy hiểm nhất ở đây: mất một `.eq()`, rớt `!inner`, đổi cột trong select — những thứ không làm test đỏ nếu chỉ so response trên dữ liệu mẫu.

Bốn thứ bắt buộc so: chuỗi select, danh sách filter theo thứ tự, `order`/`range`, và cặp `{ count, head }`.

### `employee-repository` phải tách file trước khi nhận thêm 62 lệnh

Giữ ngưỡng < 200 dòng bằng cách tách theo mục đích dùng, không theo cột:

- `employee-repository.ts` — CRUD hồ sơ nhân viên
- `employee-auth-repository.ts` — cột hash, phiên đăng nhập (đã có `findEmployeeAuthRecord`)
- `employee-directory-repository.ts` — tra cứu danh sách, lọc theo phòng ban

`payroll-repository.ts` (136 dòng) tách tương tự khi vượt ngưỡng, không tách trước.

### Logic nhiều bước đi vào `*-service.ts`, không nhồi vào repository

`app/api/admin/employees/[id]/route.ts` DELETE làm 4 bước có điều kiện (kiểm tra tồn tại → kiểm tra payroll liên quan → soft-update hoặc hard-delete). Đó là nghiệp vụ, không phải truy cập dữ liệu.

Khuôn đã có sẵn trong repo: `lookup-service.ts`, `bonus-signature-service.ts`, `cascade-update-employee.ts`. Service gọi repository, route gọi service.

### ESLint rule bật ở nhóm cuối, không bật sớm

Rule cấm `.from(` trong `app/api/**` chỉ có nghĩa khi lệnh cuối cùng đã rút xong. Bật sớm buộc phải `eslint-disable` rải rác rồi gỡ dần — vừa ồn vừa dễ quên gỡ.

## Risks / Trade-offs

| Rủi ro                                                                                                                | Cách chặn                                                                                               |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Rớt `!inner` khi bê chuỗi select → filter theo bảng nhúng im lặng không chạy, trả về nhiều bản ghi hơn quyền cho phép | Parity test so chuỗi select nguyên văn; nhóm có embed đánh dấu riêng trong tasks                        |
| Đổi nhầm truy vấn `{ count: "exact", head: true }` thành truy vấn trả dòng                                            | Spec ghi thành requirement riêng; parity test so cặp `{ count, head }`                                  |
| `select("*")` bị "tiện tay" viết tường minh → rớt key khỏi JSON                                                       | Non-Goal ghi rõ; review checklist mỗi PR                                                                |
| Rút truy vấn có phân quyền (`canAccessDepartment`, `van_phong` bypass) làm lệch quyền                                 | Nhóm `employees` và `department_permissions` bắt buộc kèm test phân quyền theo 8 role, không chỉ parity |
| 58 route sửa trong nhiều PR, dễ trôi giữa chừng                                                                       | Mỗi nhóm tự đứng được: merge được, CI xanh, không phụ thuộc nhóm sau                                    |
| Tổng khối lượng lớn hơn ước tính                                                                                      | Sau nhóm 3, đo lại và báo trước khi đi tiếp hai nhóm lớn                                                |
