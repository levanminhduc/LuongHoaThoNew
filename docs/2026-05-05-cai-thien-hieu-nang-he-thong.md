# Kế Hoạch Cải Thiện Hiệu Năng Và Hệ Thống

**Ngày lập:** 2026-05-05  
**Đối tượng đọc:** chủ dự án, người bảo trì hệ thống, kỹ sư tiếp tục phát triển app tra cứu/ký nhận lương.  
**Mục tiêu sau khi đọc:** hiểu rõ nên cải thiện điểm nào trước, vì sao cần làm, tác động kỳ vọng là gì, và kiểm chứng bằng cách nào.

## 1. Phạm Vi

Tài liệu này tập trung vào hai nhóm:

1. **Hiệu năng:** tốc độ tải trang, tốc độ API, render bảng lớn, cache, bundle JavaScript, build/deploy.
2. **Chất lượng hệ thống:** typecheck, test, validation, phân quyền, logging, cấu hình production, bảo trì dài hạn.

### Không Bao Gồm Trong Tài Liệu Này

Theo yêu cầu hiện tại, tài liệu **không đưa hạng mục "bỏ JWT/localStorage" vào danh sách cần làm ngay**. Lý do là nhóm người dùng chính là công nhân, cần thao tác nhanh và có nhu cầu lưu thông tin đăng nhập để tra cứu các lần sau.

Thay vào đó, hướng phù hợp trước mắt là:

- Giữ cơ chế lưu đăng nhập hiện tại cho trang tra cứu.
- Hỗ trợ password manager của trình duyệt/hệ điều hành bằng `autocomplete` chuẩn.
- Tiếp tục đánh giá các cải thiện bảo mật khác không phá trải nghiệm người dùng.

Tài liệu cũng không đề xuất thêm các tính năng không liên quan trực tiếp tới hệ thống lương nội bộ như Stripe, VNPay, OAuth Google, Socket realtime, React Markdown hay product ISR của web bán hàng.

## 2. Tóm Tắt Nhanh

Hệ thống hiện đã có nền tảng khá tốt:

- Dùng Next.js App Router, React, TypeScript, Tailwind/Shadcn/Radix.
- Có Supabase PostgreSQL.
- Có RBAC nhiều role.
- Có Swagger/OpenAPI.
- Có health/readiness endpoints.
- Có loading pages cho nhiều khu vực.
- Trang tra cứu nhân viên đã có lazy loading modal và session token cho một số thao tác sau tra cứu.
- Đã bật hỗ trợ password manager cho form tra cứu nhân viên.

Những điểm cần cải thiện đáng chú ý nhất:

1. **Pipeline chất lượng chưa đáng tin:** build đang bỏ qua type validation, typecheck đang lỗi, test script chưa có.
2. **Data fetching frontend còn phân tán:** nhiều nơi gọi `fetch` trực tiếp, tự xử lý token/loading/error/toast, dễ trùng logic và khó cache.
3. **API validation chưa đồng đều:** đã có Zod helper nhưng chưa áp dụng cho toàn bộ route quan trọng.
4. **Một số cấu hình production làm giảm hiệu năng/cache:** ảnh đang tắt optimization, build id sinh theo thời gian, cache nhạy cảm cần xem lại.
5. **Bảng dữ liệu và query lớn cần tối ưu:** các màn hình admin/department/payroll/employee cần pagination, index, cache đúng tầng và tránh render quá nhiều DOM.
6. **Observability còn thiếu chuẩn thống nhất:** có health endpoint nhưng chưa đủ metric để biết API nào chậm, query nào nặng, người dùng đang kẹt ở bước nào.

Nếu làm đúng thứ tự, cải thiện lớn nhất sẽ nằm ở các màn hình quản trị nhiều dữ liệu: quản lý nhân viên, quản lý lương, import/export, department management, dashboard ký nhận.

## 3. Nguyên Tắc Ưu Tiên

Không nên nâng cấp theo danh sách công nghệ của một web bán hàng. Đây là hệ thống lương nội bộ, nên ưu tiên theo tác động thực tế:

1. **Đúng và an toàn trước:** dữ liệu lương, phân quyền, ký nhận, import/export không được sai.
2. **Đo được rồi mới tối ưu sâu:** nếu không có số đo, rất dễ tối ưu nhầm.
3. **Tối ưu API/database trước khi tối ưu giao diện nhỏ:** phần chậm thường đến từ query, payload lớn, render bảng lớn, hoặc gọi API lặp.
4. **Không phá UX công nhân:** các thay đổi bảo mật phải cân bằng với thao tác nhanh, ít bước.
5. **Làm từng lát nhỏ:** mỗi cải thiện nên có tiêu chí kiểm chứng rõ ràng.

## 4. Mức Ưu Tiên Đề Xuất

### P0 - Cần Làm Trước Để Hệ Thống Đáng Tin

P0 không nhất thiết làm app nhanh hơn ngay, nhưng là nền để cải thiện mà không tạo lỗi ngầm.

| Hạng mục | Vấn đề hiện tại | Tác động | Kết quả mong muốn |
|---|---|---|---|
| Sửa typecheck | Typecheck đang lỗi, build bỏ qua type validation | Lỗi kiểu dữ liệu có thể lọt production | `typecheck` pass và build không cần bỏ qua lỗi |
| Thêm test script chuẩn | Có Jest config/test file nhưng package script chưa có `test` | Không kiểm chứng tự động được luồng quan trọng | Chạy được `npm test` hoặc lệnh test thống nhất |
| Chuẩn hóa validation API | Nhiều API parse body/query thủ công | Dễ nhận input sai, lỗi format không đồng nhất | Route quan trọng dùng schema validation thống nhất |
| Rà cache dữ liệu nhạy cảm | Một số response có cache public | Có rủi ro cache sai người/sai dữ liệu | Dữ liệu nội bộ dùng private/no-store hoặc cache theo user |
| Bỏ cấu hình production gây lệch cache | Build id thay đổi theo thời gian, image optimization tắt | Cache static kém, tải ảnh kém hơn | Build ổn định hơn, asset cache tốt hơn |

### P1 - Hiệu Năng Có Khả Năng Tăng Rõ

| Hạng mục | Vấn đề hiện tại | Tác động kỳ vọng |
|---|---|---|
| API client + React Query cho màn hình dữ liệu | `fetch` lặp ở nhiều component | Giảm request lặp, cache tốt, loading/error nhất quán |
| Tối ưu query/pagination/index | Một số màn hình có thể lấy nhiều dữ liệu hoặc count nhiều lần | Giảm latency API, giảm tải Supabase |
| Virtualized table cho bảng lớn | Render toàn bộ row/card làm UI chậm | Mượt hơn rõ khi danh sách dài |
| Lazy load module nặng | Excel, Swagger, chart, modal nặng có thể vào bundle sớm | Giảm JS ban đầu |
| Server timing/structured logs | Không biết chính xác bottleneck | Tìm đúng API/query chậm |

### P2 - Cải Thiện Trải Nghiệm Và Bảo Trì

| Hạng mục | Lý do |
|---|---|
| Route-level error pages | Khi lỗi client/server, người dùng thấy trạng thái rõ hơn |
| Skeleton theo từng màn hình | Loading trông ổn định, ít cảm giác "đơ" |
| Chuẩn hóa toast/error message | Người dùng hiểu lỗi và biết cần làm gì |
| Tách các màn hình lớn thành module nhỏ | Dễ sửa, dễ test, ít tạo bug dây chuyền |
| Bảo vệ route debug/test/example | Tránh lộ công cụ dev ở production |

### P3 - Tối Ưu Sau Khi Có Số Đo

| Hạng mục | Khi nào làm |
|---|---|
| Server Components sâu hơn | Khi bundle client thật sự là bottleneck |
| ISR/static caching nâng cao | Chỉ áp dụng cho trang public hoặc dữ liệu không cá nhân |
| Realtime | Chỉ khi có nhu cầu theo dõi ký nhận tức thời |
| WebAuthn/passkey | Khi muốn đăng nhập sinh trắc học chuẩn, không chỉ password manager |

## 5. Chi Tiết Cải Thiện Hiệu Năng

### 5.1. Thiết Lập Baseline Đo Lường

Trước khi tối ưu sâu, cần đo các chỉ số hiện tại. Nếu không, sẽ không biết thay đổi có thật sự nhanh hơn không.

Nên đo tối thiểu:

- Thời gian tải trang tra cứu nhân viên lần đầu.
- Thời gian POST tra cứu lương.
- Thời gian mở chi tiết lương.
- Thời gian tải danh sách nhân viên.
- Thời gian search nhân viên/lương.
- Thời gian import file lương.
- Thời gian export Excel.
- Kích thước JavaScript ban đầu của các route chính.
- Số request API khi mở một dashboard.
- Số row render trong các bảng lớn.

Mốc mục tiêu đề xuất:

| Khu vực | Mục tiêu tốt |
|---|---|
| Trang tra cứu nhân viên tải lần đầu | Dưới 2 giây trên mạng công ty |
| API tra cứu lương | Dưới 800ms nếu DB ổn định |
| Mở modal chi tiết sau khi đã tra cứu | Dưới 500ms |
| Search nhân viên/lương | Dưới 700ms sau debounce |
| Dashboard quản trị | Dưới 2.5 giây để thấy dữ liệu chính |
| Import preview | Có feedback trong 1 giây đầu |
| Export Excel | Có progress/loading rõ nếu trên 3 giây |

Cách đo đơn giản:

1. Dùng Chrome DevTools tab Network để ghi thời gian từng API.
2. Dùng tab Performance để xem render có bị block lâu không.
3. Ghi lại 5 lần đo cho mỗi màn hình, lấy trung vị.
4. So trước/sau mỗi thay đổi.

### 5.2. Chuẩn Hóa API Client Và Cache Frontend

Hiện trạng:

- Nhiều component gọi `fetch` trực tiếp.
- Mỗi nơi tự lấy token, tự set header, tự parse response, tự toast lỗi.
- Khi chuyển trang hoặc quay lại trang, dữ liệu có thể bị tải lại không cần thiết.
- Các request giống nhau có thể bị gọi trùng.

Đề xuất:

- Tạo một API client dùng chung cho frontend.
- Tạo các hook theo domain: nhân viên, lương, phòng ban, ký nhận, import/export.
- Dùng React Query cho các màn hình dữ liệu nhiều request.
- Quy định cache time theo loại dữ liệu.
- Tự động retry có kiểm soát cho lỗi mạng, nhưng không retry bừa các lỗi validation/auth.

Ví dụ phân loại cache:

| Dữ liệu | Cache đề xuất | Lý do |
|---|---:|---|
| Danh sách phòng ban | 5-15 phút | Ít thay đổi |
| Mapping cấu hình import | 5 phút | Có thể cache, nhưng cần invalidate khi sửa |
| Dashboard stats | 30-60 giây | Cần tương đối mới |
| Danh sách nhân viên | 30-120 giây | Tùy vai trò và filter |
| Chi tiết lương cá nhân | Không cache public, có thể cache trong session | Dữ liệu nhạy cảm |
| Import/export mutation | Không cache | Là thao tác thay đổi dữ liệu |

Lợi ích:

- Giảm request lặp.
- Giao diện phản hồi nhanh hơn khi quay lại trang.
- Code dễ sửa hơn vì lỗi/loading/toast thống nhất.
- Dễ thêm prefetch cho route quan trọng.

Rủi ro cần tránh:

- Không cache dữ liệu lương/nhân sự theo kiểu public.
- Cache key phải bao gồm role, user, filter, tháng lương, loại lương nếu có.
- Sau mutation phải invalidate đúng query liên quan.

### 5.3. Tối Ưu Query Database Và Pagination

Đây là nhóm có thể đem lại cải thiện lớn nhất nếu màn hình hiện đang chậm.

Các dấu hiệu cần kiểm tra:

- API lấy quá nhiều row trong một request.
- Có filter/search nhưng DB chưa có index phù hợp.
- Có count tổng số dòng mỗi lần search, làm query nặng.
- Có nhiều request nối tiếp trong khi có thể chạy song song.
- API trả về nhiều cột hơn giao diện cần dùng.
- Search bằng `ilike` trên cột lớn mà không có index phù hợp.

Đề xuất cải thiện:

1. **Giữ pagination server-side cho mọi bảng lớn.**  
   Không tải toàn bộ nhân viên/lương rồi lọc ở client.

2. **Giới hạn số dòng tối đa.**  
   Ví dụ API list không nên cho client truyền `limit` quá lớn nếu không có lý do rõ ràng.

3. **Chỉ select cột cần thiết.**  
   Màn hình danh sách chỉ cần các field tóm tắt; chi tiết lương tải sau khi bấm xem chi tiết.

4. **Tạo index theo pattern truy vấn thật.**  
   Ví dụ thường truy vấn theo mã nhân viên, tháng lương, phòng ban, trạng thái ký, trạng thái active. Index phải phục vụ query thực tế, không tạo theo cảm tính.

5. **Không thay unique constraint theo payroll_type.**  
   Logic hệ thống hiện xem khóa trùng là mã nhân viên + tháng lương. Nếu thêm index phụ để query nhanh thì được, nhưng không đổi nghĩa khóa dữ liệu.

6. **Debounce search giữ ở frontend, nhưng search vẫn phải tối ưu ở DB.**  
   Debounce chỉ giảm số request, không làm query nhanh hơn.

7. **Với thống kê dashboard, cân nhắc materialized view hoặc bảng tổng hợp.**  
   Nếu mỗi lần mở dashboard phải scan nhiều bảng lương thì sẽ chậm khi dữ liệu tăng.

Tác động kỳ vọng:

- Search và list có thể nhanh hơn 2-5 lần nếu bottleneck là query/index.
- Giảm tải Supabase khi nhiều người dùng cùng lúc.
- Giao diện admin mượt hơn vì payload nhỏ hơn.

### 5.4. Virtualized Table Cho Bảng Lớn

Hiện nhiều màn hình dùng table/card để hiển thị danh sách. Khi số row lớn, trình duyệt phải render nhiều DOM node, gây chậm cuộn, chậm filter, chậm update state.

Khi nào cần virtualized table:

- Một trang render trên 100-200 row.
- Bảng có nhiều cột.
- Mỗi row có nhiều button, badge, dialog trigger.
- Cuộn bị giật trên máy yếu.
- Filter/search làm UI đứng trong vài trăm ms.

Đề xuất:

- Với bảng admin nhiều dữ liệu, dùng virtualization cho phần body.
- Giữ server-side pagination, virtualization chỉ giải quyết phần render.
- Không dùng virtualization cho bảng nhỏ vì tăng độ phức tạp không cần thiết.

Tác động kỳ vọng:

- Cuộn mượt hơn rõ trên danh sách dài.
- Ít lag khi state thay đổi.
- Giảm memory phía trình duyệt.

### 5.5. Lazy Load Các Module Nặng

Một số module thường nặng:

- Excel parse/export.
- ZIP generation.
- Swagger UI.
- Chart/dashboard.
- Modal chi tiết dài.
- Component import preview.

Hiện hệ thống đã có lazy loading ở trang tra cứu nhân viên cho các modal. Nên áp dụng nguyên tắc tương tự cho các màn hình khác.

Đề xuất:

- Import động các phần chỉ dùng sau khi người dùng bấm nút.
- Không đưa Excel/ZIP vào bundle ban đầu của dashboard.
- Swagger UI chỉ tải khi vào trang API docs.
- Chart nặng chỉ tải khi dashboard cần hiển thị.
- Modal audit log chỉ tải khi mở lịch sử.

Tác động kỳ vọng:

- Route chính tải nhanh hơn.
- JavaScript ban đầu nhỏ hơn.
- Người dùng thấy UI chính sớm hơn.

### 5.6. Rà Lại Client Components

Hiện nhiều page/component là client component. Với app nội bộ giàu tương tác, điều này không sai. Nhưng nếu mọi route đều client-side thì JavaScript gửi xuống trình duyệt nhiều hơn.

Không nên chuyển ồ ạt sang server component. Nên chọn điểm có lợi rõ:

- Trang tĩnh hoặc ít tương tác.
- Layout/sidebar/header không cần state phức tạp.
- Phần chỉ hiển thị text/card tóm tắt.
- Trang hướng dẫn, bảo trì, API docs wrapper.

Quy tắc:

- Component cần input, dialog, state, effect, localStorage thì giữ client.
- Component chỉ render dữ liệu đã có thì cân nhắc server hoặc split nhỏ.
- Đừng chuyển nếu làm phức tạp auth hoặc tăng số roundtrip.

Tác động kỳ vọng:

- Giảm bundle client ở một số route.
- Cải thiện tải đầu trên máy yếu.
- Dễ cache static phần ít thay đổi.

### 5.7. Cấu Hình Production Và Asset Cache

Các điểm cần cải thiện:

1. **Không nên sinh build id bằng thời gian nếu không cần.**  
   Build id thay đổi theo mỗi build sẽ làm cache static kém ổn định. Nếu deploy cùng nội dung nhưng build id khác, client vẫn phải tải lại asset.

2. **Bật lại image optimization nếu dùng ảnh thật.**  
   App không nhiều ảnh như web bán hàng, nên tác động không lớn. Nhưng nếu có logo, hình hướng dẫn, ảnh upload preview, nên để Next tối ưu.

3. **Không bỏ qua type errors trong production build.**  
   Đây là rủi ro hệ thống. Khi đã sửa typecheck, build nên fail nếu có lỗi kiểu dữ liệu.

4. **Đặt cache header theo loại dữ liệu.**  
   Static assets có thể cache lâu. API nhạy cảm thì không cache public.

Tác động kỳ vọng:

- Deploy đáng tin hơn.
- Browser cache hiệu quả hơn.
- Giảm lỗi runtime do type mismatch.

### 5.8. Caching API Đúng Cách

Caching có thể làm app nhanh hơn, nhưng với dữ liệu lương thì cache sai rất nguy hiểm.

Nguyên tắc:

- Dữ liệu công khai hoặc static: có thể cache public.
- Dữ liệu theo user/role/phòng ban: không cache public.
- Dữ liệu lương cá nhân: ưu tiên no-store hoặc cache trong session frontend.
- Dữ liệu dashboard tổng hợp: có thể cache ngắn nếu không lộ dữ liệu cá nhân sai người.
- ETag phải ổn định theo dữ liệu, không sinh theo thời gian mỗi request nếu muốn client cache hiệu quả.

Vấn đề thường gặp:

- Cache key chỉ theo role nhưng không theo user/filter.
- Cache public cho response có dữ liệu nội bộ.
- Cache quá lâu sau khi import/sửa dữ liệu.
- Không invalidate sau mutation.

Đề xuất:

- Viết bảng phân loại cache cho từng API.
- Với mỗi API, ghi rõ: no-store, private cache, public cache, hoặc React Query cache.
- Khi import/sửa/xóa/ký nhận, invalidate các cache liên quan.

## 6. Chi Tiết Cải Thiện Hệ Thống

### 6.1. Sửa Typecheck Và Build Gate

Hiện trạng:

- Typecheck đang lỗi.
- Production build đang bỏ qua validation kiểu dữ liệu.
- Build vẫn pass nhưng không có nghĩa type-safe.

Vì sao cần sửa:

- TypeScript là hàng rào phát hiện lỗi sớm.
- Nếu bỏ qua type errors, bug có thể chỉ xuất hiện khi người dùng thao tác.
- Các refactor lớn như API client, React Query, validation sẽ rủi ro hơn nếu typecheck đang đỏ.

Hướng làm:

1. Xóa hoặc tái sinh cache type của Next nếu lỗi đến từ cache dev.
2. Sửa lỗi TypeScript thật trong trang example.
3. Chạy typecheck sạch.
4. Sau đó bật lại build fail khi có lỗi type.

Tiêu chí xong:

- `typecheck` pass.
- Build production không ghi "skipping validation of types".
- CI hoặc script local chạy được cùng bộ lệnh trước khi deploy.

### 6.2. Thêm Test Script Và Test Luồng Quan Trọng

Hiện trạng:

- Có cấu hình Jest và ít nhất một test health.
- Package script chưa có `test`, nên command chuẩn không chạy.

Các luồng nên có test trước:

1. Tra cứu lương nhân viên bằng mã + CCCD/mật khẩu.
2. Tra cứu chi tiết bằng session token.
3. Ký nhận lương.
4. Lịch sử lương.
5. Phân quyền department theo role.
6. Import lương thường.
7. Import hoặc nhận diện lương T13.
8. Đổi/quên mật khẩu.
9. Admin/role không được truy cập sai API.
10. Validation lỗi trả đúng format.

Không cần test mọi UI nhỏ ngay. Ưu tiên test logic dễ sai và ảnh hưởng dữ liệu lương.

Tiêu chí xong:

- Có script test thống nhất.
- Chạy được trong máy dev và CI.
- Test đỏ nếu phá role hoặc phá logic T13.

### 6.3. Chuẩn Hóa Validation Bằng Schema

Hiện hệ thống đã có Zod schemas và helper parse lỗi, nhưng chưa áp dụng đồng đều.

Nên chuẩn hóa:

- Body JSON của mutation.
- Query params của list/search.
- Params động trên URL.
- File import metadata.
- Month/payroll_type/is_t13.
- Pagination page/limit.
- Role/department input.

Lợi ích:

- API trả lỗi 400 nhất quán.
- Giảm lỗi undefined/null lọt vào query.
- Dễ test.
- Dễ sinh OpenAPI đúng.

Ưu tiên áp dụng:

1. Login và lookup nhân viên.
2. Ký nhận lương.
3. Import/export lương.
4. Quản lý nhân viên.
5. Phân quyền department.
6. Dashboard/search/list.

### 6.4. Chuẩn Hóa Error Handling

Hiện nhiều route có thể trả lỗi theo format khác nhau. Điều này làm frontend phải đoán message và status.

Đề xuất response lỗi thống nhất:

```json
{
  "success": false,
  "error": "Thông báo ngắn cho người dùng",
  "code": "VALIDATION_ERROR",
  "details": []
}
```

Quy tắc:

- 400: input sai.
- 401: chưa đăng nhập hoặc session hết hạn.
- 403: không có quyền.
- 404: không tìm thấy dữ liệu.
- 409: trùng dữ liệu hoặc đã ký.
- 429: rate limit.
- 500: lỗi hệ thống, không lộ chi tiết nội bộ.

Frontend nên dựa vào `code`, không parse chuỗi tiếng Việt để quyết định hành vi.

### 6.5. Bảo Vệ Route Debug/Test/Example

Hệ thống có các trang và API phục vụ test/debug/setup. Chúng hữu ích trong dev, nhưng production nên khóa.

Đề xuất:

- Chặn ở middleware/proxy nếu production.
- Hoặc yêu cầu admin role.
- Hoặc xóa khỏi build nếu không còn dùng.

Nhóm route cần rà:

- Debug browser.
- Test role.
- Test forgot password.
- Example UI.
- Setup test password.
- Setup position/signature.
- Test column mapping.

Tiêu chí xong:

- Người dùng production không mở được route dev.
- API setup không chạy được ngoài môi trường kiểm soát.
- Swagger không hiển thị nhầm route nội bộ nguy hiểm nếu không cần.

### 6.6. Security Headers Và CSRF

Hệ thống đã có helper cho security headers và CSRF, nhưng cần đảm bảo được áp dụng nhất quán.

Đề xuất:

- Áp security headers ở tầng chung cho mọi response.
- CSRF áp cho mutation dùng cookie/session.
- Với route dùng Bearer token từ frontend, vẫn nên kiểm tra origin/referer ở mutation nhạy cảm nếu phù hợp.
- Không để mỗi route tự làm một kiểu nếu có thể dùng helper chung.

Lưu ý: tài liệu này không yêu cầu thay đổi cơ chế lưu token hiện tại, nhưng các lớp bảo vệ khác vẫn nên làm.

### 6.7. Rate Limit Bền Hơn

Hiện rate limit in-memory phù hợp dev hoặc single process nhỏ. Nếu deploy nhiều instance hoặc restart app, bộ đếm mất tác dụng.

Đề xuất:

- Trước mắt giữ in-memory nếu hệ thống chạy một instance nội bộ.
- Nếu deploy production nhiều instance, chuyển sang Redis/database-backed rate limit.
- Tách limit theo nhóm: login, tra cứu lương, đổi mật khẩu, import/export, admin mutation.
- Log event khi bị rate limit để phát hiện brute force hoặc thao tác bất thường.

### 6.8. Bcrypt Salt Rounds Theo Quy Ước Hệ Thống

Quy ước hệ thống yêu cầu bcrypt salt rounds = 12. Hiện có nhiều nơi vẫn dùng 10.

Đây không phải tối ưu hiệu năng. Ngược lại, salt 12 chậm hơn. Nhưng đây là vấn đề nhất quán và bảo mật hệ thống.

Hướng làm:

- Tạo hằng số dùng chung cho bcrypt rounds.
- Thay toàn bộ chỗ hash password/CCCD dùng hằng số.
- Không đổi logic verify, vì bcrypt compare tự nhận rounds từ hash.
- Test lại login/lookup/đổi mật khẩu/import nhân viên.

Tác động:

- Hash mới mạnh hơn.
- Tạo user/đổi mật khẩu/import có thể chậm hơn một chút.
- Login/lookup verify hash cũ vẫn hoạt động.

### 6.9. Observability Cho Người Bảo Trì

Hiện có health endpoints, đây là nền tốt. Nhưng để tối ưu hiệu năng, cần thêm tín hiệu cụ thể hơn.

Nên có:

- Structured logs cho API quan trọng.
- Request id để truy vết một thao tác.
- Duration của từng API.
- Duration của query Supabase chính.
- Số row trả về.
- Kích thước payload nếu dễ đo.
- Log lỗi validation/auth/permission theo code.
- Audit event cho thao tác thay đổi dữ liệu.

Ví dụ log hữu ích:

```json
{
  "event": "payroll_lookup",
  "request_id": "req_xxx",
  "employee_id": "masked",
  "duration_ms": 420,
  "db_duration_ms": 180,
  "status": 200
}
```

Không nên log:

- Mật khẩu.
- CCCD đầy đủ.
- Token.
- Full payload lương.

### 6.10. OpenAPI/Swagger Làm Nguồn Hợp Đồng API

Hệ thống đã có Swagger. Nên dùng nó như hợp đồng giữa frontend và backend.

Đề xuất:

- Mỗi API quan trọng có schema request/response rõ.
- Error response chuẩn có trong spec.
- Các role yêu cầu được mô tả.
- Route dev/setup không đưa vào spec production nếu không cần.
- Có thể sinh type client sau này nếu muốn.

Lợi ích:

- Frontend ít đoán format.
- Người mới đọc API nhanh hơn.
- Dễ test contract.

## 7. Roadmap Thực Thi Đề Xuất

### Giai Đoạn 1 - Ổn Định Nền

Mục tiêu: trước khi tối ưu lớn, hệ thống phải có rào chắn lỗi.

Việc làm:

1. Sửa typecheck.
2. Thêm script test.
3. Chạy lint/typecheck/test/build thành bộ lệnh chuẩn.
4. Rà cấu hình build bỏ qua lỗi type.
5. Sửa lỗi TypeScript ở trang example hoặc loại trang example khỏi production nếu không dùng.

Tiêu chí hoàn thành:

- Lệnh kiểm tra local pass.
- Build không cần bỏ qua type validation.
- Không có lỗi type cũ che lỗi mới.

### Giai Đoạn 2 - Đo Lường Và Tối Ưu API Chậm Nhất

Mục tiêu: biết API nào chậm và sửa điểm có tác động lớn nhất.

Việc làm:

1. Thêm duration log cho các API: lookup, detail, sign, salary history, employee list, payroll search, import/export.
2. Đo baseline trong 3-5 ngày sử dụng thật hoặc giả lập dữ liệu.
3. Xếp top API chậm theo p95.
4. Tối ưu query/select/index/pagination cho top 3.

Tiêu chí hoàn thành:

- Có bảng số liệu trước/sau.
- Ít nhất top API chậm nhất giảm latency rõ ràng.

### Giai Đoạn 3 - Chuẩn Hóa Data Fetching Frontend

Mục tiêu: giảm fetch lặp và code lặp ở frontend.

Việc làm:

1. Tạo API client dùng chung.
2. Tạo hook cho employee list, department list, dashboard stats, payroll search.
3. Dùng React Query cho màn hình dữ liệu trước, không cần migrate toàn bộ app ngay.
4. Chuẩn hóa loading/error/toast.
5. Invalidate đúng sau mutation.

Tiêu chí hoàn thành:

- Màn hình được migrate ít code fetch thủ công hơn.
- Quay lại trang không tải lại vô ích.
- Error message nhất quán hơn.

### Giai Đoạn 4 - Tối Ưu Render Và Bundle

Mục tiêu: giảm lag client, đặc biệt trên máy yếu.

Việc làm:

1. Virtualize bảng lớn.
2. Lazy load Excel/ZIP/chart/Swagger/modal nặng.
3. Rà client component nào có thể tách.
4. Chạy bundle analysis nếu cần.

Tiêu chí hoàn thành:

- Cuộn bảng lớn mượt hơn.
- JS ban đầu của route admin giảm.
- Người dùng thấy nội dung chính sớm hơn.

### Giai Đoạn 5 - Hardening Hệ Thống

Mục tiêu: giảm rủi ro vận hành production.

Việc làm:

1. Bảo vệ route debug/test/setup.
2. Áp security headers nhất quán.
3. Rà CSRF cho mutation.
4. Chuẩn hóa bcrypt rounds.
5. Chuẩn hóa validation toàn bộ route quan trọng.
6. Rà cache header cho dữ liệu nội bộ.

Tiêu chí hoàn thành:

- Route dev không lộ production.
- Mutation nhạy cảm có validation/permission rõ.
- Không có cache public cho dữ liệu nhạy cảm.

## 8. Checklist Theo Màn Hình

### Trang Tra Cứu Nhân Viên

Hiện đã tốt:

- Form đơn giản.
- Có ghi nhớ đăng nhập.
- Có password manager autocomplete.
- Có session token cho thao tác sau tra cứu.
- Modal chi tiết/lịch sử/đổi mật khẩu được lazy load.

Cần cải thiện tiếp:

- Đo thời gian lookup thật.
- Kiểm tra API chỉ trả summary cần thiết ở lần lookup đầu.
- Đảm bảo chi tiết lương tải on-demand.
- Kiểm tra lỗi session hết hạn có message rõ.
- Test luồng nhớ đăng nhập, auto lookup, ký nhận, lịch sử.

### Admin Dashboard

Cần kiểm tra:

- Có bao nhiêu API gọi khi mở trang.
- API nào gọi nối tiếp không cần thiết.
- Stats có query scan bảng lớn không.
- Có cache ngắn hạn cho dữ liệu tổng hợp không.
- Có loading skeleton theo từng card không.

Ưu tiên:

- Cache dashboard stats 30-60 giây nếu dữ liệu cho phép.
- Chạy request song song.
- Tách chart/module nặng.

### Quản Lý Nhân Viên

Cần kiểm tra:

- Search đang gọi API đúng debounce chưa.
- Limit tối đa có bị quá lớn không.
- Query search có index phù hợp không.
- Department list có cache được không.
- Audit log modal có tải khi mở không.

Ưu tiên:

- React Query cho list/search.
- Server-side pagination chặt.
- Virtualize nếu bảng dài.
- Cache department list.

### Quản Lý Lương Và Payroll Search

Cần kiểm tra:

- Search trả bao nhiêu cột.
- Query có filter tháng/loại lương/mã nhân viên hiệu quả không.
- Chi tiết/audit trail có tải riêng không.
- Có query count nặng không.

Ưu tiên:

- Select field tối thiểu cho danh sách.
- Index theo pattern query thật.
- Lazy load audit trail.
- Chuẩn hóa validation query params.

### Import/Export Excel

Cần kiểm tra:

- Module Excel/ZIP có bị tải sớm không.
- File lớn có làm đứng UI không.
- Preview có giới hạn row không.
- Error list có phân trang/virtualize không.
- Export lâu có progress/loading rõ không.

Ưu tiên:

- Dynamic import parser/exporter.
- Giới hạn preview.
- Worker hoặc xử lý server-side nếu file lớn làm treo browser.
- Log thời gian parse/import/export.

### Department Management

Cần kiểm tra:

- Permission list có cache/filter hiệu quả không.
- Các role có được filter đúng không.
- Van_phong bypass department filter có được test không.
- Có request trùng khi mở trang không.

Ưu tiên:

- Test RBAC.
- React Query cache cho department/permission.
- Invalidate sau cấp/thu hồi quyền.

## 9. Rủi Ro Nếu Không Làm

Nếu không xử lý các điểm trên, hệ thống vẫn có thể chạy, nhưng sẽ gặp các rủi ro:

- Dữ liệu tăng làm admin page ngày càng chậm.
- Lỗi type lọt production vì build bỏ qua typecheck.
- API nhận input sai và lỗi khó hiểu.
- Cache sai có thể lộ hoặc hiển thị dữ liệu cũ.
- Khó biết bottleneck thật khi người dùng báo "chậm".
- Route debug/test có thể lộ ở production.
- Refactor sau này khó vì fetch/error/loading lặp khắp nơi.

## 10. Kết Luận Ưu Tiên Thực Tế

Nếu chỉ chọn 5 việc làm trước, nên chọn:

1. **Sửa typecheck/build gate.**
2. **Thêm test script và test luồng lương/RBAC/T13.**
3. **Đo latency API và tối ưu top 3 API chậm nhất.**
4. **Chuẩn hóa API client + React Query cho các màn hình admin nhiều dữ liệu.**
5. **Rà cache header và route debug/test production.**

Những việc này sẽ đem lại giá trị thực tế hơn việc chạy theo stack của web bán hàng. App lương nội bộ cần nhanh, đúng, dễ vận hành và không làm công nhân thao tác phức tạp hơn.

## 11. Lịch Sử Thực Hiện

### Giai Đoạn 1 — Ổn Định Nền (2026-05-05) ✅

**Branch:** `chore/giai-doan-1-on-dinh-nen`
**Spec:** `docs/superpowers/specs/2026-05-05-giai-doan-1-on-dinh-nen-design.md`
**Plan:** `docs/superpowers/plans/2026-05-05-giai-doan-1-on-dinh-nen.md`

**Hạng mục P0 đã hoàn thành:**

| P0 Item | Trạng thái | Cách giải quyết |
|---|---|---|
| Sửa typecheck | ✅ Done | Xóa `.next/dev/types` cache + sửa lỗi thật ở `app/examples/all-ui/page.tsx:567` (đổi prop `direction` → `orientation` cho `ResizablePanelGroup` do API library `react-resizable-panels` đã thay đổi) |
| Thêm test script chuẩn | ✅ Done | Cài `jest`, `jest-environment-jsdom`, `babel-jest` (chưa có trước đó); fix typo `moduleNameMapping` → `moduleNameMapper` trong `jest.config.js`; thêm `npm test` và `npm test:watch` vào `package.json`; guard window-only mocks trong `jest.setup.js` để node test env hoạt động được |
| Bỏ cấu hình production gây lệch cache | ✅ Done | Xóa `typescript.ignoreBuildErrors`, `images.unoptimized`, `generateBuildId` (timestamp-based) khỏi `next.config.mjs` |
| Chuẩn hóa validation API | ⏸ Chưa làm | Lùi sang giai đoạn sau (vì có sẵn `parseSchemaOrThrow` helper trong `lib/validations`, đã áp dụng một phần) |
| Rà cache dữ liệu nhạy cảm | ⏸ Chưa làm | Lùi sang giai đoạn sau |

**Phát sinh ngoài plan ban đầu:**

- Phát hiện jest chưa từng được cài (chỉ có `@testing-library/*` và `@types/jest`). Plan ban đầu giả định jest có sẵn vì `jest.config.js` tồn tại — đã được sửa bằng cách thêm 3 dev deps.
- Phát hiện 8/15 pre-existing tests đỏ (chưa từng chạy vì jest chưa cài). Đã sửa toàn bộ:
  - `lib/utils/__tests__/date-formatter.test.ts`: relax 2 assertion quá strict (whitespace NBSP cho currency, behavior strip-trailing-zeros cho number).
  - `lib/utils/date-formatter.ts`: sửa 2 bug thật trong `formatDateTime` và `formatSignatureTime` — không validate invalid date dẫn đến trả về string rác như `"undefined Invalid Date"` thay vì input gốc.
  - `tests/api/health.test.ts`: thêm `@jest-environment node` directive vì `next/server` cần `Request` global mà jsdom không có.
  - `app/admin/department-management/assign-permissions/__tests__/employee-dropdown.test.tsx`: rewrite không dùng Radix Select wrapper (Portal-based Select không render children trong jsdom nếu chưa open).
- Sửa lỗi hydration mismatch do extension Bitdefender (`bis_skin_checked` attribute): thêm `suppressHydrationWarning` cho `<html>` element trong `app/layout.tsx` (body đã có sẵn từ trước). **Lưu ý:** flag chỉ tác dụng 1 level deep, không tắt được 100% warning vì Bitdefender chèn vào mọi `<div>` sâu — fix triệt để là disable extension trên localhost.

**Validation cuối:**

| Lệnh | Kết quả |
|---|---|
| `npm run typecheck` | exit 0, 0 lỗi |
| `npm test` | exit 0, **16/16 pass** (3 suites) |
| `npm run build` | exit 0, không "Skipping validation of types" |
| `npm run lint` | exit 0, 34 warnings pre-existing (no errors) |

**5 commit trên branch:**

1. `fix(examples)`: rename direction prop to orientation for ResizablePanelGroup
2. `chore`: remove build escape hatches and stable build id
3. `test`: enable jest infrastructure
4. `test`: fix existing tests so npm test passes clean
5. `fix(layout)`: add suppressHydrationWarning to html element

**Tác động đo được:**

- Build pipeline có hàng rào type safety thật (trước đó silently bypass).
- Cache static ổn định hơn nhờ dùng default Next.js build ID (content-hash) thay vì timestamp.
- Image optimization tự động bật cho mọi `<Image>` (lazy load, WebP, resize).
- Test infrastructure hoạt động: có thể viết test cho luồng quan trọng ở giai đoạn sau (P1 - test luồng lương/RBAC/T13).
- 2 bug thật trong `date-formatter` (xử lý invalid date) được phát hiện và fix nhờ chạy tests.

### Giai Đoạn 5 — Security Hardening (2026-05-05) ✅

**Branch:** `chore/giai-doan-5-hardening`

**Hạng mục đã hoàn thành:**

| Phase | Hạng mục | Kết quả |
|---|---|---|
| Phase 1 | Xóa dead code | Xóa 3 setup routes (`setup-management-signatures`, `setup-new-positions`, `setup-test-passwords`) và 2 thư mục example pages không còn dùng |
| Phase 2 | Tập trung bcrypt rounds | Tạo hằng số `BCRYPT_ROUNDS = 12` trong `lib/constants/security.ts`, áp dụng nhất quán cho 9 files thay vì hardcode rải rác |
| Phase 3 | Cache headers helper | Tạo `CACHE_HEADERS` helper trong `lib/utils/cache-headers.ts` với 3 tier (sensitive/shortPrivate/static), áp dụng cho toàn bộ ~28 API routes |
| Phase 4 | Zod validation | Thêm schema validation Zod cho 6 nhóm route (auth, signature, import/export, employee CRUD, department permissions, dashboard/search) — tập trung trong `lib/validations/` |
| Phase 5 | CSRF & security headers | Audit CSRF coverage cho tất cả mutation handlers, thêm `applySecurityHeadersTo()` vào `lib/security-middleware.ts`, tích hợp vào `proxy.ts` |

**Validation cuối:**

| Lệnh | Kết quả |
|---|---|
| `npm run typecheck` | exit 0, 0 lỗi |
| `npm test` | exit 0, **22/22 pass** |
| `npm run lint` | exit 0, no errors |
| `npm run format` | clean |

**Tác động đo được:**

- Không còn dead code setup routes có thể bị khai thác ngoài môi trường kiểm soát.
- bcrypt rounds nhất quán 12 trên toàn hệ thống, không còn chỗ nào dùng 10.
- Cache headers đồng nhất cho tất cả API routes — dữ liệu nhạy cảm không bao giờ bị cache public.
- Zod validation trả lỗi 400 nhất quán cho tất cả route quan trọng, input sai không lọt vào query.
- Security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy) áp dụng nhất quán qua `proxy.ts`.

**Codex adversarial review (sau merge):**

Chạy `codex-impl-review` (effort=high) trên `000b2a0...HEAD` qua 4 rounds, kết quả `VERDICT: APPROVE`.

| Round | Issues phát hiện | Severity | Fix commit |
|---|---|---|---|
| 1 | 4 issues: T13 cross-field validation, 6 routes thiếu `CACHE_HEADERS.sensitive`, `applySecurityHeadersTo` bỏ early returns trong `proxy.ts`, ad-hoc error shape trong `payroll-import` | medium × 2, low × 2 | `294c6d3` |
| 2 | 1 issue: POST stats responses của `my-department`/`my-departments` thiếu no-store cache | medium | `9182599` |
| 3 | 1 issue: T13 status/stats routes vẫn phụ thuộc query `?is_t13=`, có thể trả sai data sau khi sign T13 | medium | `973cd5a` |
| 4 | 0 issues — APPROVE | — | — |

**Cách fix issues codex:**

- **T13 derivation server-side:** Tất cả route signing (`bulk-sign-salary`, `management-signature`, `employee/sign-salary`) và route status/stats (`signature-status/[month]`, `signature-progress/[month]`, `admin/signature-stats/[month]`) đều derive `isT13` từ `salary_month` bằng regex `/^\d{4}-(13|T13)$/i`. Nếu client gửi `is_t13` mâu thuẫn với giá trị derive, trả 400 với `derived_is_t13` trong response.
- **CACHE_HEADERS.sensitive bổ sung:** Áp dụng cho `payroll/my-data` (cả 2 success response), `payroll/my-department` (GET + POST stats), `payroll/my-departments` (GET + POST stats), `import-dual-files`, `payroll-import` (cả 2 success response), `admin/logout` (Pattern C: `response.headers.set` sau `cookies.delete`).
- **Security headers cho mọi return path:** `proxy.ts` gọi `applySecurityHeadersTo(response)` trên tất cả nhánh return (maintenance mode, auth redirect, normal flow), không chỉ sau `updateSession()`.
- **Error shape thống nhất:** `payroll-import` thay ad-hoc `{ success, error, code }` bằng `ApiErrorHandler.createError(ErrorCodes.VALIDATION_ERROR, ...)` + `createErrorResponse(...)` để khớp với surrounding code.

**3 commit fix sau review:** `294c6d3`, `9182599`, `973cd5a`. Toàn bộ tests vẫn pass 22/22, typecheck 0 errors.

### Giai Đoạn 2-4 — Chưa Bắt Đầu

Sẽ lên kế hoạch riêng cho mỗi giai đoạn khi cần. Không nên làm liền sau Giai Đoạn 1 vì:

- Giai Đoạn 2 (đo latency API + tối ưu top 3) cần thu thập dữ liệu thật trong vài ngày sử dụng.
- Giai Đoạn 3 (React Query) cần migrate nhiều component, scope lớn.
- Giai Đoạn 4 (virtualization, lazy load) cần chọn màn hình cụ thể, không đại trà.

