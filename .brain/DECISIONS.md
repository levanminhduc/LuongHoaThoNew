# Decisions — vì sao hệ thống như hiện tại

<!-- ADR rút gọn.
     GHI khi: chọn thư viện, kiến trúc hoặc pattern; có đánh đổi chủ ý; đặt quy ước mới; hoặc bác bỏ một hướng mà sau này dễ có người đề xuất lại.
     KHÔNG ghi: chi tiết triển khai, thứ đọc code là thấy.
     Trước khi thiết kế: grep file này theo module. Muốn làm trái một quyết định Active thì nêu rõ và hỏi người dùng.
     Đổi quyết định: thêm mục mới, sửa mục cũ thành "Status: Superseded by D-NNN". Không xoá.
     Ví dụ:
     ### D-001 Dùng cursor pagination cho mọi API danh sách
     Date: 2026-11-14 · Status: Active · Scope: api · From: F-012
     Why: offset chậm trên bảng orders hơn 5 triệu dòng.
     Rejected: offset/limit (chậm); keyset tự viết cho từng endpoint (không nhất quán).
-->

### D-001 Build production bằng webpack, không Turbopack

Date: (legacy) · Status: Active · Scope: build · From: CLAUDE.md Pitfall 1
Why: phải chạy được Safari/iOS 12; Turbopack không áp `browserslist` + `transpilePackages`.
Rejected: Turbopack build (bundle ES2020+ làm trắng trang máy cũ).

### D-002 Auth JWT tự viết, không dùng Supabase Auth

Date: (legacy) · Status: Active · Scope: auth · From: CLAUDE.md
Why: đăng nhập bằng mã NV + CCCD/mật khẩu và bảng `admin_users` riêng; server dùng service role.
Ref: `lib/auth.ts`, `lib/auth-middleware.ts`.

### D-003 Route mỏng, truy cập DB chỉ trong repository `lib/<domain>`

Date: 2026-08-02 · Status: Active · Scope: api · From: openspec/changes/archive/2026-08-02-thin-route-handlers
Why: route chỉ làm auth → zod → service → response; dễ test và review. Spec: `openspec/specs/server-data-access-boundary`.

### D-004 Mọi input API validate bằng zod trong `lib/validations/`

Date: 2026-08-01 · Status: Active · Scope: api · From: openspec/specs/api-input-validation
Why: thống nhất lỗi 400 và không tự viết if-check tay.

### D-005 Response API không lộ stack, đường dẫn, tên bảng, secret

Date: 2026-08-01 · Status: Active · Scope: api · From: openspec/changes/archive/2026-08-01-refactor-backend-architecture, openspec/specs/secure-api-response

### D-006 `verifyAdminAccess()` trả 403 (không 401) khi sai role; UI admin lọc theo role

Date: 2026-05-06 · Status: Active · Scope: auth, ui-admin · From: openspec/changes/archive/2026-05-06-fix-van-phong-admin-kick-to-login
Why: van_phong bị đá về login vì 401. Spec: `openspec/specs/admin-access-verification`, `role-aware-admin-ui`.

### D-007 Cập nhật ngày ký hàng loạt qua RPC `bulk_update_signature_dates()`

Date: 2026-03-16 · Status: Active · Scope: signature · From: openspec/changes/archive/2026-03-16-optimize-signature-date, 2026-03-16-update-signature-date
Why: batch 200 dòng trong Postgres + SSE tiến độ, thay vì update từng dòng từ API.

### D-008 Khoá trùng import lương = (employee_id, salary_month); validate chéo ±10%

Date: (legacy) · Status: Active · Scope: payroll · From: CLAUDE.md Pitfall 6, 8; migration 29
Why: `payroll_type` không tham gia khoá; dung sai ±10% do làm tròn và công thức khác nhau — không siết lại.

### D-009 "Duy trì đăng nhập" bằng refresh token lưu DB, 30 ngày mọi role

Date: 2026-11-15 · Status: Active (chưa triển khai — Đợt 6) · Scope: auth · From: docs/superpowers/plans/2026-11-15-security-remediation-plan.md (D1)
Why: hệ thống nội bộ, lương xem mỗi tháng một lần. Access token 15 phút trong cookie httpOnly, refresh token xoay vòng + phát hiện dùng lại; bỏ lưu mật khẩu ở localStorage.
Rejected: "Ghi nhớ mật khẩu" lưu mật khẩu mã hoá khoá tĩnh (hiện trạng); thu hồi chỉ bằng claim `pv` (plan 2026-10-08).

### D-010 Nhân viên tra cứu có "Ghi nhớ trên máy này" 30 ngày, ký không hỏi lại mật khẩu

Date: 2026-11-15 · Status: Active (chưa triển khai — Đợt 6) · Scope: auth, employee · From: plan 2026-11-15 (D2), người dùng chốt
Why: giữ trải nghiệm hiện tại (nhập một lần) nhưng không lưu CCCD/mật khẩu trong trình duyệt. Cookie `employee_refresh_token` riêng, Path `/api/employee/session`.
Rejected: bắt nhập lại mật khẩu khi ký (người dùng không cần chặt hơn).

### D-011 Quyền quản lý nhân viên = danh sách role được quản lý theo người gọi (`MANAGEABLE_ROLES`)

Date: 2026-11-15 · Status: Active · Scope: auth, employee · From: F-012
Why: admin quản lý mọi role (trừ admin); van_phong → truong_phong/to_truong/nhan_vien; nguoi_lap_bieu → to_truong/nhan_vien. Áp cho tạo, sửa (kể cả mật khẩu/CCCD/is_active), xoá, gán chức vụ; chỉ admin và van_phong được tạo/xoá; không ai tự sửa chính mình. `chuc_vu: admin` bị zod chặn, admin chỉ đến từ `admin_users`. Ref: `lib/auth/role-policy.ts`.
Rejected: xếp hạng `ROLE_RANK` (thêm khái niệm, kết quả như nhau); van_phong quản lý rộng hơn.

### D-012 Phiếu lương đã ký thì chặn sửa (409)

Date: 2026-11-15 · Status: Active · Scope: payroll, signature · From: F-012 (người dùng chốt)
Why: không phải xoá `signature_logs` ngoài transaction. Update có điều kiện `is_signed = false` để chặn cả khi ký chen giữa lúc đọc và ghi. Ref: `lib/payroll/payroll-update-service.ts`.
Rejected: reset chữ ký (cần RPC); giữ chữ ký sau khi sửa (không đóng rủi ro).

### D-013 Kiểm quyền theo role luôn dùng allow-list, không chặn theo tên role

Date: 2026-11-15 · Status: Active · Scope: auth, api · From: F-012 verifier
Why: `verifyToken()` chấp nhận mọi JWT ký bằng `JWT_SECRET`, kể cả token `employee_session` không có `role` → kiểu `isRole("nhan_vien")` bị lách. Dùng `authorizeRoles(request, [...])`. van_phong xem quân số phòng ban nhưng không thấy tiền lương (`SALARY_STATS_ROLES`).

### D-014 Hardening DB quét catalog động, loại object extension, ngoại lệ khai tường minh

Date: 2026-11-15 · Status: Active · Scope: db · From: F-013
Why: DB thật có thể có hàm/bảng không nằm trong repo; danh sách tên cứng (script 36) đã sót. Script 38 lặp `pg_proc`/`pg_class`/`pg_policies` trong `public`, bỏ object có `pg_depend.deptype = 'e'`, chỉ chừa object khai trong bảng tạm `migration_38_exceptions` (mặc định rỗng); tự kiểm bằng `RAISE EXCEPTION` (không `ASSERT`) để rollback cả transaction. Chạy lại được.
Rejected: danh sách tên cứng (bỏ sót); `ALTER DEFAULT PRIVILEGES` (người dùng chưa duyệt, BACKLOG).

### D-015 RLS bật không policy — chỉ service_role truy cập DB

Date: 2026-11-15 · Status: Active · Scope: db, auth · From: F-013
Why: app chỉ dùng `createServiceClient()` (service role bypass RLS), auth JWT tự viết (D-002) nên `auth.jwt()` của Supabase không mang thông tin app. Policy `USING (true)` / `auth.jwt() IS NULL` mở dữ liệu cho anon key công khai → xoá. Không thêm policy mới; policy theo claim JWT còn sót là code chết, an toàn khi JWT Secret Supabase ≠ `JWT_SECRET`.
Rejected: viết policy theo role app (không có JWT Supabase để dựa vào).
