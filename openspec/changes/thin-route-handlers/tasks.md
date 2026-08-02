Mỗi nhóm = 1 PR, tự đứng được, CI xanh trước khi sang nhóm sau.

Bốn gate chạy cuối mỗi nhóm, viết tắt là **GATE**: `npm run format && npm run lint && npm run typecheck` → `npm test` (7 suite fail sẵn do pnpm/msw là baseline đã biết) → `npm run build` → `git diff main --stat -- scripts/supabase-setup/ scripts/*.sql` phải rỗng (D0).

## 1. Khuôn parity test

- [x] 1.1 Viết `lib/__fixtures__/query-recorder.ts`: client giả ghi lại chuỗi gọi PostgREST (`from`, `select`, `eq`, `in`, `order`, `range`, `single`, `maybeSingle`) thành object so sánh được. Không đặt dưới `__tests__/` (jest bắt làm suite rỗng) và không đặt dưới `tests/` (bị gitignore, CI sẽ thiếu file)
- [x] 1.2 Hỗ trợ ghi cặp `{ count, head }` của `select()` — đây là thứ dễ rớt nhất
- [x] 1.3 Hỗ trợ trả dữ liệu giả theo kịch bản để test được cả nhánh lỗi PostgREST
- [x] 1.4 Viết 1 test mẫu dùng recorder trên `findEmployeeAuthRecord` (đã có sẵn) để chứng minh khuôn chạy
- [x] 1.5 Ghi cách dùng vào `.claude/rules/api-routes.md`
- [x] 1.6 GATE

## 2. import_history + import_logs — ĐỔI HƯỚNG: XOÁ CODE CHẾT

Không rút xuống repository nữa. Không tạo bảng (giữ D0).

**Lý do:** không file nào trong 57 migration `scripts/supabase-setup/` tạo `import_history` hay `import_logs`. POST của chính route tự thú trong comment "we don't have import_history table" và trả dữ liệu giả, trong khi GET/DELETE vẫn truy vấn bảng thật. `components/ImportHistoryViewer.tsx` gọi hai endpoint đó nhưng **không file nào import component này** — nó chưa từng được render, nên chưa ai gặp lỗi. Insert `import_logs` nằm trong try/catch nuốt lỗi nên hỏng im lặng.

- [x] 2.1 Xoá `app/api/admin/import-history/` (POST giả + GET/DELETE truy vấn bảng không tồn tại)
- [x] 2.2 Xoá `components/ImportHistoryViewer.tsx` (mồ côi, 0 nơi import)
- [x] 2.3 Xoá entry `importHistory` khỏi `lib/api/endpoints.ts`
- [x] 2.4 Xoá block insert `import_logs` khỏi `advanced-upload/route.ts`, dọn biến thành thừa (`admin`, `columnMappings`, `summary`) — giữ nguyên kiểm tra quyền
- [x] 2.5 Xoá `ImportSessionHistoryCreateSchema` + `ImportHistoryDeleteQuerySchema` (chỉ route vừa xoá dùng) khỏi `lib/validations/payroll.ts`, barrel và test
- [x] 2.6 GATE

## 3. security_logs + employee_security_events (5 lệnh)

- [x] 3.1 Liệt kê route bị chạm
- [x] 3.2 Fixture từ git
- [x] 3.3 Viết `lib/audit/audit-log-repository.ts` + `server-only`; kiểm tra chồng lấn với `lib/audit-service.ts` đã có, gộp nếu trùng
- [x] 3.4 Parity test
- [x] 3.5 Sửa route
- [x] 3.6 GATE

## 4. department_permissions (7 lệnh)

- [x] 4.1 Liệt kê route bị chạm
- [x] 4.2 Fixture từ git
- [x] 4.3 Viết `lib/department/department-repository.ts` + `server-only`
- [x] 4.4 Parity test
- [x] 4.5 **Test phân quyền riêng**: 8 role × truy cập phòng ban; khẳng định `van_phong` vẫn bypass filter đúng như `canAccessDepartment` hiện hành
- [x] 4.6 Sửa route
- [x] 4.7 GATE

## 5. attendance_monthly + attendance_daily (7 lệnh)

- [x] 5.1 Liệt kê route bị chạm
- [x] 5.2 Fixture từ git
- [x] 5.3 Viết `lib/attendance/attendance-repository.ts` + `server-only`
- [x] 5.4 Parity test; chú ý route export chấm công đã có parity test XLSX từ change trước — chạy lại để chắc không đụng
- [x] 5.5 Sửa route
- [x] 5.6 GATE

## 6. employee_bonuses + bonus_management_signatures (9 lệnh)

- [x] 6.1 Liệt kê route bị chạm
- [x] 6.2 Fixture từ git
- [x] 6.3 Mở rộng `lib/bonus/bonus-repository.ts`; tách file nếu vượt 200 dòng — đã tách `bonus-signature-repository.ts` (156 + 123 dòng)
- [x] 6.4 Parity test
- [x] 6.5 Sửa route
- [x] 6.6 GATE

## 7. management_signatures + signature_logs + admin_bulk_signature_logs (18 lệnh)

- [ ] 7.1 Liệt kê route bị chạm
- [ ] 7.2 Fixture từ git
- [ ] 7.3 Viết `lib/signature/signature-repository.ts` + `server-only`; kiểm tra chồng lấn với `lib/management-signature-utils.ts` và `lib/management-signature-auth.ts`
- [ ] 7.4 Parity test; **đánh dấu riêng các truy vấn có embed `!inner`**, so nguyên văn chuỗi select
- [ ] 7.5 Sửa route
- [ ] 7.6 Chạy lại parity test ký nhận từ change trước
- [ ] 7.7 GATE

## 8. column_aliases + mapping_configurations + configuration_field_mappings (25 lệnh)

- [ ] 8.1 Liệt kê route bị chạm
- [ ] 8.2 Fixture từ git
- [ ] 8.3 Viết `lib/import/import-config-repository.ts` + `server-only`
- [ ] 8.4 Parity test
- [ ] 8.5 Sửa route; giữ nguyên hành vi cache của `lib/stores/mapping-config-store.ts`
- [ ] 8.6 Chạy lại parity test import Excel từ change trước
- [ ] 8.7 GATE

## 9. Đo lại trước hai nhóm lớn

- [ ] 9.1 Đếm lại số lệnh `.from()` còn trong `app/api/**`, so với ước tính ban đầu
- [ ] 9.2 Đếm số dòng đã giảm, số test đã thêm
- [ ] 9.3 Báo cáo kết quả và xác nhận có đi tiếp nhóm 10–11 hay dừng

## 10. payrolls (49 lệnh)

- [ ] 10.1 Liệt kê route bị chạm; chia nhỏ thành 2–3 PR nếu vượt 15 route
- [ ] 10.2 Fixture từ git
- [ ] 10.3 Mở rộng `lib/payroll/payroll-repository.ts`; tách file khi vượt 200 dòng
- [ ] 10.4 Parity test; **so cặp `{ count, head }` cho mọi truy vấn đếm** — bug đếm ở `my-department` từ change trước là tiền lệ
- [ ] 10.5 Giữ nguyên `select("*")` ở nơi đang dùng, không viết tường minh
- [ ] 10.6 Sửa route
- [ ] 10.7 Chạy lại parity test export lương từ change trước
- [ ] 10.8 GATE

## 11. employees (62 lệnh)

- [ ] 11.1 Tách `employee-repository.ts` thành `employee-repository` / `employee-auth-repository` / `employee-directory-repository` trước khi thêm truy vấn
- [ ] 11.2 Liệt kê route bị chạm; chia nhỏ thành 3–4 PR
- [ ] 11.3 Fixture từ git
- [ ] 11.4 Parity test cho từng nhóm truy vấn
- [ ] 11.5 **Test phân quyền**: 8 role, kèm trường hợp `van_phong` và `admin`
- [ ] 11.6 Tách logic nhiều bước của `admin/employees/[id]` PUT/DELETE thành `lib/employee/*-service.ts`; route còn ≤ 200 dòng
- [ ] 11.7 Chạy lại parity test đăng nhập nhân viên từ change trước
- [ ] 11.8 GATE

## 12. Chốt ranh giới

- [ ] 12.1 Xác nhận `grep -rn "\.from(" app/api | wc -l` trả về 0
- [ ] 12.2 Thêm rule ESLint cấm `.from(` trong `app/api/**`, thông báo lỗi tiếng Việt chỉ sang repository
- [ ] 12.3 Xác nhận mọi file `*-repository.ts` đều có `import "server-only"`
- [ ] 12.4 Cập nhật `docs/audit/nextjs-backend-audit.md`: Q1 và trụ "`app/` mỏng" chuyển trạng thái, ghi số đo mới
- [ ] 12.5 Promote `server-data-access-boundary` vào `openspec/specs/`
- [ ] 12.6 Archive change sang `openspec/changes/archive/`
- [ ] 12.7 GATE lần cuối
