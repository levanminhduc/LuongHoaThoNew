# Phân Tích Hệ Thống Tra Cứu Lương - Công Ty May Hòa Thọ Điện Bàn

## Tổng Quan Nhanh

Hệ thống cho phép nhân viên tra cứu chi tiết lương của mình bằng cách nhập **Mã nhân viên** và **Số CCCD**.

## Cách Hoạt Động

### 1. Nhân Viên Truy Cập

- **URL**: `/employee/lookup`
- Nhập 2 thông tin:
  - **Mã nhân viên**:
    - Nhân viên chính thức: `DB0` + mã số (VD: `DB01234`)
    - Nhân viên thử việc: `DBT0` + mã số (VD: `DBT01234`)
  - **Số CCCD**: Nhập vào ô password để bảo mật

### 2. Xác Thực & Bảo Mật

- CCCD được mã hóa (hash) bằng bcrypt trước khi lưu trong database
- Khi tra cứu, hệ thống so sánh CCCD nhập vào với hash đã lưu
- Nếu khớp → Hiển thị thông tin lương
- Nếu sai → Báo lỗi "Số CCCD không đúng"

### 3. Dữ Liệu Lương Hiển Thị

#### Màn Hình Chính - 6 Thông Tin Quan Trọng:

1. **Hệ Số Làm Việc**
2. **Hệ Số Phụ Cấp Kết Quả**
3. **Tiền Khen Thưởng Chuyên Cần**
4. **Lương Học Việc PC**
5. **BHXH BHTN BHYT** (số tiền khấu trừ)
6. **Lương Thực Nhận Cuối Kỳ** (số tiền cuối cùng nhân viên nhận)

#### Xem Chi Tiết Đầy Đủ - 39 Cột Dữ Liệu:

Khi click "Xem Chi Tiết Đầy Đủ", hiển thị đầy đủ 39 cột dữ liệu được chia thành 8 nhóm:

1. **Hệ Số và Thông Số Cơ Bản** (4 cột)
2. **Thời Gian Làm Việc** (5 cột)
3. **Lương Sản Phẩm và Đơn Giá** (5 cột)
4. **Thưởng và Phụ Cấp** (5 cột)
5. **Bảo Hiểm và Phúc Lợi** (5 cột)
6. **Phép và Lễ** (2 cột)
7. **Tổng Lương và Phụ Cấp Khác** (3 cột)
8. **Thuế và Khấu Trừ** (5 cột)

### 4. Ký Nhận Lương

- Nhân viên có thể ký xác nhận đã xem thông tin lương
- Hệ thống lưu lại:
  - Thời gian ký
  - IP address
  - Thông tin thiết bị
- Sau khi ký, hiển thị trạng thái "Đã ký nhận lương"

## Cấu Trúc Kỹ Thuật

### Frontend (Giao Diện)

- **Framework**: Next.js với TypeScript
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS
- **Icons**: Lucide React

### Backend (API)

- **API Routes**: Next.js App Router
- **Database**: Supabase (PostgreSQL)
- **Authentication**: bcrypt cho hash CCCD
- **Security**: Row Level Security (RLS)

### Database Tables

1. **employees**: Thông tin nhân viên
   - employee_id (mã nhân viên)
   - full_name (họ tên)
   - cccd_hash (CCCD đã mã hóa)
   - department (phòng ban)
   - chuc_vu (chức vụ)

2. **payrolls**: Dữ liệu lương
   - 39 cột dữ liệu lương từ Excel
   - Thông tin ký nhận (is_signed, signed_at, signed_by_name)
   - Metadata (salary_month, source_file)

## Đường Dẫn File Quan Trọng

### Giao Diện

- Trang tra cứu: `/app/employee/lookup/page.tsx`
- Component chính: `/app/employee/lookup/employee-lookup.tsx`
- Modal chi tiết: `/app/employee/lookup/payroll-detail-modal.tsx`

### API

- Tra cứu lương: `/app/api/employee/lookup/route.ts`
- Ký nhận lương: `/app/api/employee/sign-salary/route.ts`

### Database

- Schema employees: `/scripts/supabase-setup/01-create-employees-table.sql`
- Schema payrolls: `/scripts/supabase-setup/02-create-payrolls-table.sql`

### Utilities

- Format tiền tệ: `/lib/utils/date-formatter.ts`
- Supabase client: `/utils/supabase/server.ts`

## Tính Năng Nổi Bật

1. **Bảo mật cao**: CCCD được mã hóa, không lưu plaintext
2. **Giao diện thân thiện**: Responsive, dễ sử dụng trên mobile
3. **Đầy đủ thông tin**: Hiển thị toàn bộ 39 cột dữ liệu lương
4. **Ký số điện tử**: Xác nhận đã nhận thông tin lương
5. **Realtime**: Cập nhật trạng thái ký ngay lập tức

## Lưu Ý Quan Trọng

1. Mã nhân viên phải đúng format (DB0xxxx hoặc DBT0xxxx)
2. CCCD phải chính xác như đã đăng ký
3. Mỗi tháng chỉ cần ký nhận 1 lần
4. Dữ liệu lương được import từ file Excel hàng tháng

---

_Tài liệu này phân tích hệ thống tra cứu lương dựa trên codebase hiện tại. Để biết thêm chi tiết kỹ thuật, xem file `/docs/payroll-lookup-system-analysis.md`_
