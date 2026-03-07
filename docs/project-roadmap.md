# Lộ Trình Phát Triển - MAY HÒA THỌ ĐIỆN BÀN

**Cập nhật:** 2026-03-07

---

## Trạng Thái Tổng Quan

| Phase | Tên | Trạng Thái |
|-------|-----|-----------|
| Phase 1 | Core Infrastructure | Hoàn thành |
| Phase 2 | Payroll Import System | Hoàn thành |
| Phase 3 | Signature System | Hoàn thành |
| Phase 4 | Advanced Import & Column Mapping | Hoàn thành |
| Phase 5 | Department Management | Một phần |
| Phase 6 | Performance & Optimization | Đang tiến hành |
| Phase 7 | Advanced Features | Kế hoạch |

---

## Phase 1: Core Infrastructure (Hoàn thành)

**Mục tiêu:** Nền tảng hệ thống, xác thực, RBAC.

### Đã hoàn thành
- Database schema: `employees`, `payrolls`, `signature_logs` (scripts 01-09)
- JWT authentication với bcrypt 12 rounds
- 8 roles RBAC: admin, giam_doc, ke_toan, nguoi_lap_bieu, truong_phong, to_truong, van_phong, nhan_vien
- Row Level Security (RLS) trên tất cả bảng
- Middleware bảo vệ routes
- Block username "admin" theo security policy
- CCCD verification cho employee login
- Dashboard cơ bản theo từng role
- Docker deployment (multi-stage, standalone output)
- `RoleBasedRouter.tsx` điều hướng sau đăng nhập

---

## Phase 2: Payroll Import System (Hoàn thành)

**Mục tiêu:** Import dữ liệu lương từ Excel, export template.

### Đã hoàn thành
- Import Excel với 39 trường lương
- Smart template export (chỉ export cột có dữ liệu)
- Validation 39 trường với cross-field tolerance ±10%
- 3 chiến lược duplicate: skip, overwrite, merge
- Composite key: `(employee_id, salary_month)`
- Dual-file import (`/api/admin/import-dual-files`)
- T13 auto-detection từ salary_month pattern
- Batch processing với error tracking
- Transaction rollback on error
- `advanced-salary-import.tsx` UI component

---

## Phase 3: Signature System (Hoàn thành)

**Mục tiêu:** Ký xác nhận điện tử đa cấp.

### Đã hoàn thành
- Employee signature: ký 1 lần/tháng, track IP + device
- Management signature 3-tier: giam_doc, ke_toan, nguoi_lap_bieu
- Unique constraint: 1 chữ ký/role/tháng (`is_active = true`)
- Admin bulk signature với batch logging
- `admin_bulk_signature_logs` table với batch_id
- API: `/api/management-signature`, `/api/signature-status`, `/api/signature-progress`
- `auto_sign_salary()` và `bulk_sign_salaries()` DB functions
- Vietnam timezone (+7h) cho tất cả timestamps
- Dashboard tracking % hoàn thành ký theo tháng

---

## Phase 4: Advanced Import & Column Mapping (Hoàn thành)

**Mục tiêu:** Hệ thống mapping cột Excel linh hoạt, không cần developer.

### Đã hoàn thành
- `column_aliases` table với confidence_score
- `mapping_configurations` table (saved configs)
- Auto-mapping algorithm với 5 levels (exact → alias → fuzzy)
- Confidence scoring: 100 (exact) → 40-70 (fuzzy)
- Admin UI: `/admin/column-mapping-config`
- Test interface: `/admin/test-column-mapping`
- `ColumnMappingDialog` với color-coded confidence
- Real-time sync aliases (BroadcastChannel + localStorage)
- Import/Export JSON config backup
- `EnhancedImportValidator` class
- Script 12 migration: column alias tables

---

## Phase 5: Department Management (Một phần)

**Mục tiêu:** Quản lý cấu trúc phòng ban phân cấp (Phòng → Xưởng → Tổ).

### Đã hoàn thành
- `department_permissions` table: phân quyền admin cấp department cho manager
- Admin UI: `/admin/department-management`
- `DepartmentDetailModal.tsx`, `DepartmentSummaryCards.tsx`
- Phân quyền `allowed_departments[]` trong JWT
- Filter lương theo department cho truong_phong, to_truong

### Chưa hoàn thành
- Bảng `departments` với cấu trúc cha-con (parent_code, path)
  - Thiết kế đã có trong [department-management-design.md](./department-management-design.md)
  - Cần migration script để tạo bảng và sync dữ liệu cũ
- Recursive department tree queries (CTE)
- `WorkshopManagerDashboard` (Dashboard Quản Đốc)
- Drill-down view: Trưởng Phòng → Xưởng → Tổ
- RLS với `get_accessible_department_codes()` function

---

## Phase 6: Performance & Optimization (Đang tiến hành)

**Mục tiêu:** Tối ưu hiệu năng query và UX.

### Đã hoàn thành
- `payroll-select.ts`: Optimized select queries (chỉ lấy cột cần)
- Script 04: Database indexes cho common queries
- `payroll-audit-logs` table cho change tracking
- `audit-service.ts`: Centralized audit logging
- Payroll select optimization (theo [payroll-select-optimization-plan.md](./payroll-select-optimization-plan.md))
- Payroll type filter (monthly/T13) implementation — hoàn thành 2025-12-22
  (theo [payroll-type-filter-implementation-plan.md](./payroll-type-filter-implementation-plan.md))

### Đang thực hiện
- Cache layer cho repeated queries (`lib/cache/`)
- Pagination cho danh sách lớn

### Kế hoạch
- Query result caching (Redis hoặc in-memory)
- Lazy loading cho dashboard components
- Virtual scrolling cho bảng nhiều dòng

---

## Phase 7: Advanced Features (Kế hoạch)

**Mục tiêu:** Tính năng nâng cao theo yêu cầu nghiệp vụ tương lai.

### Backlog

#### 7.1. Báo Cáo & Phân Tích
- [ ] Biểu đồ xu hướng lương theo thời gian
- [ ] So sánh lương giữa các phòng ban
- [ ] Export báo cáo PDF (bảng lương có chữ ký)
- [ ] Dashboard analytics cho Giám Đốc

#### 7.2. Thông Báo
- [ ] Email notification khi upload lương mới
- [ ] In-app notification cho nhân viên chưa ký
- [ ] Alert khi sắp hết hạn deadline ký
- [ ] `notification-service.ts` đã có skeleton

#### 7.3. Import Nâng Cao
- [ ] Bulk import danh sách nhân viên từ Excel
- [ ] Import chấm công tự động link với lương
  (skeleton đã có: `attendance-import/`, `attendance-parser.ts`)
- [ ] Machine learning cho auto-improvement column mapping
- [ ] Bulk alias import từ Excel

#### 7.4. Quản Lý Nâng Cao
- [ ] Lịch sử thay đổi thông tin nhân viên
- [ ] Quản lý đa công ty / chi nhánh
- [ ] API integration với hệ thống chấm công bên ngoài

---

## Metrics Theo Dõi

| Chỉ số | Mục tiêu | Hiện tại |
|--------|---------|---------|
| Import 1000 records | < 30 giây | Đạt |
| Import 5000 records | < 2 phút | Đạt |
| API response thông thường | < 500ms | Đạt |
| Auto-mapping accuracy | >= 90% | ~90% (với aliases) |
| Trang tải | < 3 giây | Đạt |

---

## Dependency & Risk

| Risk | Mức Độ | Mitigation |
|------|--------|-----------|
| Supabase service outage | Trung bình | Monitor uptime, có fallback message |
| Excel format thay đổi | Cao | Column alias system tự xử lý |
| JWT secret lộ | Cao | Rotate định kỳ, không commit .env |
| Data volume tăng nhanh | Thấp | Pagination + indexes đã có |
| Phase 5 dept refactor | Trung bình | Migration script cần test kỹ |

---

## Lịch Sử Phiên Bản

| Phiên bản | Ngày | Thay Đổi |
|-----------|------|---------|
| 1.0 | 2024-07 | Core system, basic import, employee auth |
| 1.1 | 2024-07-30 | +4 payroll columns, column alias system |
| 1.2 | 2024-08 | Management signature 3-tier |
| 1.3 | 2024-09 | Dual-file import, timezone fix |
| 1.4 | 2025-01 | Department management UI, bulk signature |
| 1.5 | 2026-03 | Performance optimizations, payroll type filter |

---

## Tài Liệu Liên Quan

- [project-overview-pdr.md](./project-overview-pdr.md) - Yêu cầu sản phẩm
- [system-architecture.md](./system-architecture.md) - Kiến trúc kỹ thuật
- [department-management-design.md](./department-management-design.md) - Thiết kế Phase 5
- [payroll-type-filter-implementation-plan.md](./payroll-type-filter-implementation-plan.md) - Kế hoạch Phase 6
- [payroll-select-optimization-plan.md](./payroll-select-optimization-plan.md) - Tối ưu query
