# Tổng Quan Dự Án & Yêu Cầu Phát Triển Sản Phẩm (PDR)

**Dự án:** Hệ Thống Quản Lý Lương - Công Ty May Hòa Thọ Điện Bàn
**Phiên bản tài liệu:** 1.0
**Cập nhật:** 2026-03-07

---

## 1. Tổng Quan Dự Án

### 1.1. Mô Tả

Hệ thống web quản lý lương cho Công Ty May Hòa Thọ Điện Bàn. Ứng dụng cho phép admin nhập dữ liệu lương từ file Excel, nhân viên tra cứu lương cá nhân và ký xác nhận điện tử, cùng các cấp quản lý xem báo cáo và phê duyệt theo phân quyền.

### 1.2. Bối Cảnh Nghiệp Vụ

- Công ty may mặc với nhiều phòng ban, xưởng, tổ sản xuất
- Dữ liệu lương được tổng hợp hàng tháng từ file Excel
- Quy trình duyệt lương 3 cấp: Người Lập Biểu → Kế Toán → Giám Đốc
- Nhân viên ký xác nhận đã nhận lương qua hệ thống điện tử

### 1.3. Mục Tiêu

- Số hóa quy trình quản lý và phân phối bảng lương
- Minh bạch hóa thông tin lương cho từng nhân viên
- Tự động hóa import dữ liệu từ Excel với smart column mapping
- Tạo audit trail đầy đủ cho mọi thao tác ký duyệt

---

## 2. Yêu Cầu Chức Năng (Functional Requirements)

### 2.1. Quản Lý Nhân Viên

| ID | Yêu Cầu | Ưu Tiên |
|----|---------|---------|
| FR-01 | Admin CRUD nhân viên (thêm, sửa, xóa, xem) | Cao |
| FR-02 | Import danh sách nhân viên từ file Excel | Cao |
| FR-03 | Quản lý mật khẩu nhân viên (reset, đổi) | Cao |
| FR-04 | Xác thực nhân viên bằng mã nhân viên + CCCD | Cao |
| FR-05 | Phân công phòng ban và chức vụ | Trung bình |

### 2.2. Import Dữ Liệu Lương

| ID | Yêu Cầu | Ưu Tiên |
|----|---------|---------|
| FR-10 | Import file Excel với 39 trường lương | Cao |
| FR-11 | Auto-detect và mapping tên cột Excel → database field | Cao |
| FR-12 | Quản lý column aliases qua giao diện admin | Cao |
| FR-13 | Import 2 file Excel song song (dual-file) | Cao |
| FR-14 | Phát hiện tháng 13 tự động từ pattern salary_month | Trung bình |
| FR-15 | 3 chiến lược xử lý duplicate: skip, overwrite, merge | Cao |
| FR-16 | Preview và validate trước khi import | Trung bình |
| FR-17 | Rollback transaction khi lỗi | Cao |

### 2.3. Tra Cứu & Xem Lương

| ID | Yêu Cầu | Ưu Tiên |
|----|---------|---------|
| FR-20 | Nhân viên tra cứu lương cá nhân (không cần đăng nhập quản lý) | Cao |
| FR-21 | Xem chi tiết 39 trường lương theo tháng | Cao |
| FR-22 | Quản lý cấp trên xem lương theo phòng ban được phân quyền | Cao |
| FR-23 | Export bảng lương ra Excel | Trung bình |
| FR-24 | Export template Excel rỗng với header chuẩn | Trung bình |

### 2.4. Hệ Thống Ký Xác Nhận

| ID | Yêu Cầu | Ưu Tiên |
|----|---------|---------|
| FR-30 | Nhân viên ký xác nhận nhận lương (1 lần/tháng) | Cao |
| FR-31 | Giám Đốc ký duyệt tổng (1 lần/tháng) | Cao |
| FR-32 | Kế Toán ký duyệt (1 lần/tháng) | Cao |
| FR-33 | Người Lập Biểu ký duyệt (1 lần/tháng) | Cao |
| FR-34 | Admin bulk-sign cho nhiều nhân viên cùng lúc | Cao |
| FR-35 | Xem lịch sử ký và trạng thái ký theo tháng | Trung bình |
| FR-36 | Track tiến độ ký (% hoàn thành) real-time | Trung bình |

### 2.5. Phân Quyền & Bảo Mật

| ID | Yêu Cầu | Ưu Tiên |
|----|---------|---------|
| FR-40 | RBAC với 8 vai trò: admin, giam_doc, ke_toan, nguoi_lap_bieu, truong_phong, to_truong, van_phong, nhan_vien | Cao |
| FR-41 | Phân quyền department: quản lý chỉ thấy dữ liệu phòng mình | Cao |
| FR-42 | JWT authentication với 24h expiry | Cao |
| FR-43 | Log IP và device fingerprint cho mọi thao tác ký | Trung bình |
| FR-44 | Block username "admin" cho bảo mật | Cao |

---

## 3. Yêu Cầu Phi Chức Năng (Non-Functional Requirements)

### 3.1. Hiệu Năng

| ID | Yêu Cầu | Mục Tiêu |
|----|---------|----------|
| NFR-01 | Thời gian tải trang | < 3 giây |
| NFR-02 | Import 1000 records | < 30 giây |
| NFR-03 | Import 5000 records | < 2 phút |
| NFR-04 | Export bảng lương 1000 records | < 10 giây |
| NFR-05 | API response thông thường | < 500ms |

### 3.2. Bảo Mật

- Mật khẩu hash bcrypt 12 rounds
- CCCD hash bcrypt để bảo vệ dữ liệu nhạy cảm
- Row Level Security (RLS) trên tất cả bảng Supabase
- JWT token 24h expiry
- Parameterized queries chống SQL injection
- Input sanitization toàn bộ
- Không expose service role key phía client

### 3.3. Tính Khả Dụng

- Ứng dụng web responsive (desktop + mobile)
- Hỗ trợ Chrome, Firefox, Safari mới nhất
- Uptime mục tiêu: 99.5%

### 3.4. Dữ Liệu

- Timezone: Vietnam (+7h) cho mọi timestamp
- Số liệu lương lưu DECIMAL(15,2)
- Backup Supabase tự động theo lịch

---

## 4. Kiến Trúc Hệ Thống (Tóm Tắt)

Xem chi tiết tại [system-architecture.md](./system-architecture.md).

**Tech Stack chính:**
- Frontend/Backend: Next.js 16.1.1 App Router + React 19.2.3
- Database: Supabase PostgreSQL với RLS
- Auth: JWT + bcrypt
- Deploy: Docker (standalone) hoặc Vercel

---

## 5. Database Schema Tóm Tắt

Xem chi tiết tại [database-schema-update-summary.md](./database-schema-update-summary.md).

**Bảng cốt lõi:**

| Bảng | Mô Tả | Bản Ghi Điển Hình |
|------|-------|-------------------|
| `employees` | Thông tin nhân viên | employee_id, full_name, cccd_hash, department, role |
| `payrolls` | Dữ liệu lương (39 cột + metadata) | composite key: (employee_id, salary_month) |
| `signature_logs` | Log ký nhân viên | 1 bản ghi/employee/tháng |
| `management_signatures` | Ký quản lý 3 cấp | unique: (salary_month, signature_type, is_active) |
| `department_permissions` | Phân quyền phòng ban | nhiều-nhiều: employee ↔ departments |
| `admin_bulk_signature_logs` | Log bulk ký | batch_id, statistics |
| `column_aliases` | Alias tên cột Excel | database_field ↔ alias_name |
| `import_mapping_configs` | Cấu hình mapping đã lưu | config_name, field_mappings |

---

## 6. API Domains

Xem chi tiết:
- [management-signature-api-architecture.md](./management-signature-api-architecture.md) - Signature APIs
- [payroll-import-export-system.md](./payroll-import-export-system.md) - Import/Export APIs
- [flexible-column-mapping-system.md](./flexible-column-mapping-system.md) - Column mapping APIs

**Routes prefix:**
- `/api/admin/*` - Admin-only operations
- `/api/auth/*` - Authentication
- `/api/payroll/*` - Payroll data (protected)
- `/api/management-signature` - Management approval
- `/api/signature-*` - Signature tracking

---

## 7. Giao Diện Người Dùng

### Các Trang Chính

| URL | Vai Trò | Chức Năng |
|-----|---------|-----------|
| `/` | Tất cả | Trang chủ, điều hướng đăng nhập |
| `/admin/login` | Admin/Manager | Đăng nhập hệ thống |
| `/admin/dashboard` | Admin | Dashboard tổng quan |
| `/admin/employee-management` | Admin | Quản lý nhân viên |
| `/admin/payroll-management` | Admin | Quản lý bảng lương |
| `/admin/payroll-import-export` | Admin | Import/Export Excel |
| `/admin/column-mapping-config` | Admin | Cấu hình column mapping |
| `/admin/department-management` | Admin | Quản lý phòng ban |
| `/admin/bulk-signature` | Admin | Ký hàng loạt |
| `/employee/lookup` | Nhân viên | Tra cứu lương cá nhân |
| `/director` | Giám Đốc | Dashboard và ký duyệt |
| `/accountant` | Kế Toán | Dashboard và ký duyệt |
| `/reporter` | Người Lập Biểu | Dashboard và ký duyệt |
| `/manager` | Trưởng Phòng | Xem lương phòng ban |
| `/supervisor` | Tổ Trưởng | Xem lương tổ |

---

## 8. Ràng Buộc Kỹ Thuật

- Node.js >= 20.9.0 (sử dụng v22.17.0+)
- Next.js App Router (không dùng Pages Router)
- Turbopack làm bundler mặc định
- TypeScript strict mode
- ESLint 9 Flat Config
- Supabase làm backend-as-a-service (không self-host database)

---

## 9. Tiêu Chí Chấp Nhận Nghiệm Thu

### 9.1. Import Dữ Liệu Lương
- Import file Excel 1000 dòng trong < 30 giây
- Tỷ lệ auto-mapping chính xác >= 90% với aliases đã cấu hình
- Detect và report đúng tất cả validation errors

### 9.2. Ký Xác Nhận
- Nhân viên không thể ký lại sau khi đã ký tháng đó
- Unique constraint đảm bảo 1 chữ ký/role/tháng cho management
- Timestamp luôn là Vietnam time (+7h)

### 9.3. Phân Quyền
- Nhân viên chỉ xem được dữ liệu của chính mình
- Trưởng Phòng chỉ xem được dữ liệu phòng được phân quyền
- Admin có full access, không bị giới hạn

### 9.4. Bảo Mật
- Password không bao giờ lưu plain text
- JWT validation trên mọi protected route
- CCCD không lưu raw value

---

_Tài liệu này được tạo từ phân tích codebase thực tế. Cập nhật khi có thay đổi yêu cầu._
