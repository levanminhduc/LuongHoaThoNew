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
- [ ] (bug?) Import nhân viên không kiểm `chuc_vu` theo `EMPLOYEE_ROLES` → vẫn tạo được `chuc_vu=admin` (đăng nhập đã chặn) — `app/api/admin/import-employees/route.ts:110` · Đợt 2 CHECK constraint · F-012 · 2026-11-15
- [ ] (debt) GET `/api/admin/payroll/[id]` còn hơn 100 dòng lọc role inline — `app/api/admin/payroll/[id]/route.ts` · F-012 · 2026-11-15
- [ ] (debt) `app/api/admin/departments/route.ts` 440 dòng, còn `console.log` emoji debug và comment inline; gọi verifyToken rồi authorizeRoles (verify JWT 2 lần) · F-012 · 2026-11-15
- [ ] (debt) `app/admin/employee-management/page.tsx` 708 dòng (trần 500) — tách row-actions · F-012 · 2026-11-15
- [ ] (debt) `components/examples/employee-form-example.tsx` không ai import — ứng viên xoá · F-012 · 2026-11-15
- [ ] (nit) `EmployeeManagementModal` chưa ẩn nút Sửa ở dòng của chính mình (backend đã 403) — `components/EmployeeManagementModal.tsx` · F-012 · 2026-11-15
- [ ] (nit) Kiểm tự sửa so với `currentId` trên URL thay vì `existing.employee_id` — `lib/employee/employee-update-service.ts:267`, `employee-removal-service.ts:135` · F-012 · 2026-11-15
- [ ] (nit) POST nhân viên trả 403 dạng `{error}` trong khi PUT/DELETE dạng AppError — `app/api/admin/employees/route.ts:138` · F-012 · 2026-11-15
- [ ] (nit) `findPayrollById` không còn ai gọi — `lib/payroll/payroll-repository.ts:46` · F-012 · 2026-11-15
- [ ] (nit) `parseInt` id trên path payroll không qua zod (`7abc` → 7) — `app/api/admin/payroll/[id]/route.ts:129` · F-012 · 2026-11-15
