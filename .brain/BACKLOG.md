# Backlog — thấy rồi nhưng chưa làm

<!-- Nguồn: dòng NOTICED của agent, NITS của verifier, Open items trong báo cáo, ý tưởng của bạn.
     Mỗi mục: - [ ] (loại) mô tả — path:line · nguồn · ngày        loại: debt | bug? | idea | nit | test | doc
     Xong hoặc bỏ: đổi [ ] thành [x] kèm ID đã xử lý, hoặc "wontfix: lý do". /sync dọn các mục [x] cũ hơn 30 ngày.
     Agent KHÔNG tự lấy việc từ đây. Chỉ làm khi bạn yêu cầu, ví dụ: /do làm các mục debt của module auth
     Ví dụ:
     - [ ] (debt) OrderService.calcTotal lặp logic với InvoiceService — src/order/service.ts:120 · F-012 verifier · 2026-11-14
-->

- [ ] (test) Chưa có test nhánh đổi mã nhân viên (cascade) bởi actor không phải admin, và route test van_phong POST `chuc_vu: giam_doc` — `lib/employee/__tests__/employee-authorization.test.ts` · F-012 · 2026-11-15
- [ ] (test) Chưa có test race: pre-check `is_signed=false` nhưng update trả 0 dòng → 409, không ghi audit (file test riêng, file S1 bị pin hash) — `lib/payroll/payroll-update-service.ts:77` · F-012 · 2026-11-15
- [ ] (bug?) SEC-02 yêu cầu ghi audit lỗi thì request lỗi; hiện lỗi audit chỉ log — `lib/payroll/payroll-update-service.ts` · F-012 · 2026-11-15
- [ ] (bug?) Nhiều route VT khác nhận token `employee_session` không role (D-013) — rà toàn bộ route chỉ gọi `verifyToken()` — `lib/auth-middleware.ts:23` · F-012 · 2026-11-15
- [x] F-013 (DB chặn bằng CHECK `employees_chuc_vu_not_admin` sau khi chạy 38; import nhận lỗi DB thay vì lỗi validate rõ ràng) (bug?) Import nhân viên không kiểm `chuc_vu` theo `EMPLOYEE_ROLES` → vẫn tạo được `chuc_vu=admin` (đăng nhập đã chặn) — `app/api/admin/import-employees/route.ts:110` · Đợt 2 CHECK constraint · F-012 · 2026-11-15
- [ ] (debt) GET `/api/admin/payroll/[id]` còn hơn 100 dòng lọc role inline — `app/api/admin/payroll/[id]/route.ts` · F-012 · 2026-11-15
- [ ] (debt) `app/api/admin/departments/route.ts` 440 dòng, còn `console.log` emoji debug và comment inline; gọi verifyToken rồi authorizeRoles (verify JWT 2 lần) · F-012 · 2026-11-15
- [ ] (debt) `app/admin/employee-management/page.tsx` 708 dòng (trần 500) — tách row-actions · F-012 · 2026-11-15
- [ ] (debt) `components/examples/employee-form-example.tsx` không ai import — ứng viên xoá · F-012 · 2026-11-15
- [ ] (nit) `EmployeeManagementModal` chưa ẩn nút Sửa ở dòng của chính mình (backend đã 403) — `components/EmployeeManagementModal.tsx` · F-012 · 2026-11-15
- [ ] (nit) Kiểm tự sửa so với `currentId` trên URL thay vì `existing.employee_id` — `lib/employee/employee-update-service.ts:267`, `employee-removal-service.ts:135` · F-012 · 2026-11-15
- [ ] (nit) POST nhân viên trả 403 dạng `{error}` trong khi PUT/DELETE dạng AppError — `app/api/admin/employees/route.ts:138` · F-012 · 2026-11-15
- [ ] (nit) `findPayrollById` không còn ai gọi — `lib/payroll/payroll-repository.ts:46` · F-012 · 2026-11-15
- [ ] (nit) `parseInt` id trên path payroll không qua zod (`7abc` → 7) — `app/api/admin/payroll/[id]/route.ts:129` · F-012 · 2026-11-15
- [ ] (bug?) `npm run migrate:bulk-signature` trỏ tới `scripts/run-bulk-signature-migrations.js` không tồn tại — package.json:22 · F-013 · 2026-11-15
- [ ] (idea) `ALTER DEFAULT PRIVILEGES` để hàm/bảng tạo sau này mặc định không cấp anon/authenticated (người dùng chưa duyệt) — scripts/supabase-setup/ · F-013 · 2026-11-15
- [ ] (debt) CCCD thật hardcode trong `scripts/create-xn11-to-truong.js` (SEC-14 / Đợt 7) · F-013 · 2026-11-15
- [ ] (debt) Policy theo claim JWT còn sót (07, 19-update-rls-policies, 19-management-signatures, 21/22) là code chết — migration dọn để "không policy" đúng nghĩa đen · F-013 verifier · 2026-11-15
- [ ] (nit) Ví dụ `ADMIN_PASSWORD="…"` inline lưu vào bash history — đổi sang `read -rs` / gỡ env sau khi chạy — README.md:209, scripts/create-admin-user.js:7 · F-013 verifier · 2026-11-15
- [ ] (nit) Script 38 khớp `auth.jwt()isnull` giả định `pg_get_expr` in tiền tố `auth.` (lọt nếu `auth` nằm trong search_path phiên) — 38 PHẦN 4/6 · F-013 verifier · 2026-11-15
- [ ] (nit) 2 script test API còn comment `// Step`, log emoji, in 20 ký tự đầu token; `fix-test-accounts-with-real-departments.sql:183` nhắc "lib/auth.ts test accounts" đã cũ · F-013 · 2026-11-15
- [ ] (debt) Placeholder hash `$2a$10$example_hash_for_…` / `samplehash…` trong supabase-setup/18, 20 và fix-test-accounts (không phải credential, nhưng gây nhầm) · F-013 verifier · 2026-11-15
