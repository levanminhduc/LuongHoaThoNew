# Hệ Thống Quản Lý Lương Nhân Viên

Ứng dụng web được xây dựng bằng Next.js và Supabase để quản lý và tra cứu thông tin lương nhân viên.

## Tính Năng

### Dành cho Admin:
- **Đăng nhập bảo mật** với JWT authentication
- **Import danh sách nhân viên từ file Excel** (trong admin dashboard)
- Upload và parse file Excel chứa dữ liệu lương
- **Xem dashboard** với thống kê tổng quan
- **Quản lý toàn bộ dữ liệu** lương và nhân viên
- **Tải file template** Excel cho import nhân viên

### Dành cho Nhân Viên:
- **Tra cứu lương** bằng mã nhân viên + số CCCD
- **Xem chi tiết thông tin lương** cá nhân
- **Ký nhận lương điện tử** với tracking đầy đủ
- **Giao diện thân thiện**, dễ sử dụng

## Cài Đặt

### 1. Clone Repository
\`\`\`bash
git clone <repository-url>
cd payroll-management-system
\`\`\`

### 2. Cài Đặt Dependencies
\`\`\`bash
npm install
\`\`\`

### 3. Cấu Hình Environment Variables
Tạo file `.env.local` từ `.env.example`:

\`\`\`bash
cp .env.example .env.local
\`\`\`

Điền thông tin Supabase:
\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
JWT_SECRET=your_jwt_secret_key
\`\`\`

### 4. Thiết Lập Supabase Database
Chạy SQL script để tạo bảng:
\`\`\`bash
# Chạy các script theo thứ tự trong thư mục scripts/supabase-setup/
psql -f scripts/supabase-setup/01-create-employees-table.sql
psql -f scripts/supabase-setup/02-create-payrolls-table.sql
# ... (tiếp tục với các script khác)
\`\`\`

### 5. Chạy Ứng Dụng
\`\`\`bash
npm run dev
\`\`\`

Truy cập: http://localhost:3000

## Cấu Trúc Dự Án

\`\`\`
├── app/
│   ├── admin/
│   │   ├── login/          # Trang đăng nhập admin
│   │   └── dashboard/      # Dashboard quản trị (có import nhân viên)
│   ├── employee/
│   │   └── lookup/         # Trang tra cứu và ký nhận lương
│   ├── api/
│   │   ├── admin/          # API routes cho admin
│   │   │   ├── import-employees/     # API import nhân viên
│   │   │   └── download-employee-template/  # API tải template
│   │   └── employee/       # API routes cho nhân viên
│   │       ├── lookup/     # API tra cứu lương
│   │       └── sign-salary/ # API ký nhận lương
│   └── page.tsx            # Trang chủ
├── components/
│   └── employee-import-section.tsx  # Component import nhân viên
├── lib/
│   ├── auth.ts             # Xử lý authentication
│   ├── excel-parser.ts     # Parse file Excel lương
│   └── employee-parser.ts  # Parse file Excel nhân viên
├── utils/supabase/         # Cấu hình Supabase clients
└── scripts/
    └── supabase-setup/     # SQL scripts tạo database
\`\`\`

## Sử Dụng

### Admin:
1. Truy cập `/admin/login`
2. Đăng nhập với: `admin` / `admin123`
3. **Trong dashboard, sử dụng các tính năng quản lý:**
   - **Import Nhân Viên**: Upload file Excel chứa dữ liệu lương
   - **Quản Lý CCCD**: Cập nhật số CCCD cho nhân viên
   - **Import/Export Lương**: Quản lý dữ liệu lương
4. Xem và quản lý dữ liệu

### Nhân Viên:
1. Truy cập `/employee/lookup`
2. Nhập mã nhân viên và số CCCD
3. Xem thông tin lương chi tiết
4. **Ký nhận lương** nếu chưa ký

## 📋 Tính Năng Import Nhân Viên

### 🔐 Bảo Mật & Quyền Truy Cập
- **Chỉ Admin được phép import**: Tính năng chỉ khả dụng trong admin dashboard
- **JWT Authentication**: Xác thực token trước mỗi request
- **CCCD được hash**: Số CCCD được mã hóa bằng bcrypt trước khi lưu database
- **Validation nghiêm ngặt**: Kiểm tra dữ liệu ở nhiều tầng

### 🎯 Cách Sử Dụng Import Nhân Viên

#### Bước 1: Truy Cập Tính Năng
1. Đăng nhập admin tại `/admin/login`
2. Vào Dashboard - tìm section "Import Danh Sách Nhân Viên"

#### Bước 2: Tải File Template
1. Click nút **"Tải File Mẫu"** để download template Excel
2. File template chứa:
   - Header chuẩn với 7 cột
   - 3 dòng dữ liệu mẫu realistic
   - Hướng dẫn chi tiết cách sử dụng
   - Validation rules và examples

#### Bước 3: Chuẩn Bị Dữ Liệu
1. Mở file template đã tải
2. **XÓA TẤT CẢ DÒNG HƯỚNG DẪN** (từ dòng 5 trở xuống)
3. **CHỈ GIỮ LẠI**: Header + dữ liệu nhân viên
4. Điền thông tin nhân viên theo format

#### Bước 4: Upload & Import
1. Click **"Chọn File"** và chọn file Excel đã chuẩn bị
2. Click **"Import Nhân Viên"** để bắt đầu
3. Xem kết quả import chi tiết

### 📊 Format File Excel Nhân Viên

#### 🔴 Các Cột Bắt Buộc (KHÔNG được để trống):
| Cột | Mô Tả | Giới Hạn | Ví Dụ |
|-----|-------|-----------|-------|
| **Mã Nhân Viên** | Mã duy nhất | Tối đa 50 ký tự | NV001, EMP001 |
| **Họ Tên** | Họ và tên đầy đủ | Tối đa 255 ký tự | Nguyễn Văn An |
| **Số CCCD** | Số căn cước công dân | Tối đa 20 ký tự | 001234567890 |
| **Phòng Ban** | Tên phòng ban | Tối đa 100 ký tự | Phòng Sản Xuất |

#### 🟡 Các Cột Tùy Chọn:
| Cột | Giá Trị Hợp Lệ | Mặc Định | Ví Dụ |
|-----|----------------|----------|-------|
| **Chức Vụ** | `nhan_vien`, `to_truong`, `truong_phong` | `nhan_vien` | to_truong |
| **Số Điện Thoại** | Số, +, -, khoảng trắng, () | Trống | 0901234567 |
| **Trạng Thái** | `true`/`false`, `có`/`không` | `true` | true |

#### 📋 Ví Dụ Dữ Liệu Chuẩn:
\`\`\`
Mã Nhân Viên | Họ Tên        | Số CCCD      | Phòng Ban      | Chức Vụ    | Số Điện Thoại | Trạng Thái
NV001        | Nguyễn Văn An | 001234567890 | Phòng Sản Xuất | nhan_vien  | 0901234567    | true
NV002        | Trần Thị Bình | 001234567891 | Phòng Kế Toán  | to_truong  | 0901234568    | true
NV003        | Lê Văn Cường | 001234567892 | Phòng QC       | truong_phong| 0901234569   | true
\`\`\`

### ⚠️ Lưu Ý Quan Trọng

#### Validation Rules:
- **Mã nhân viên**: Không được trùng lặp trong file và hệ thống
- **File format**: Chỉ chấp nhận .xlsx và .xls
- **File size**: Tối đa 10MB
- **Chức vụ**: Chỉ chấp nhận 3 giá trị: `nhan_vien`, `to_truong`, `truong_phong`

#### Xử Lý Lỗi Thường Gặp:
| Lỗi | Nguyên Nhân | Cách Khắc Phục |
|-----|-------------|----------------|
| "Mã nhân viên đã tồn tại" | Trùng với dữ liệu trong hệ thống | Thay đổi mã nhân viên khác |
| "Thiếu trường bắt buộc" | Để trống cột bắt buộc | Điền đầy đủ 4 cột bắt buộc |
| "Chức vụ không hợp lệ" | Sai format chức vụ | Chỉ dùng: nhan_vien/to_truong/truong_phong |
| "Dữ liệu quá dài" | Vượt giới hạn ký tự | Kiểm tra giới hạn từng trường |

### 📈 Báo Cáo Kết Quả Import

#### Thống Kê Tổng Quan:
- **Tổng Xử Lý**: Số dòng dữ liệu được xử lý
- **Thành Công**: Số nhân viên được import thành công (màu xanh)
- **Lỗi**: Số dòng gặp lỗi (màu đỏ)

#### Chi Tiết Kết Quả:
- **Danh sách thành công**: Hiển thị mã NV, họ tên, phòng ban
- **Chi tiết lỗi**: Từng dòng lỗi với lý do cụ thể
- **Scroll view**: Xem được nhiều kết quả trong không gian hạn chế

## 🆔 Tính Năng Quản Lý CCCD

### 🔐 Bảo Mật & Quyền Truy Cập
- **Chỉ Admin được phép cập nhật**: Tính năng chỉ khả dụng trong admin dashboard
- **JWT Authentication**: Xác thực token trước mỗi request
- **CCCD được hash**: Số CCCD mới được mã hóa bằng bcrypt trước khi lưu database
- **Validation nghiêm ngặt**: Kiểm tra định dạng CCCD (12 chữ số)

### 🎯 Cách Sử Dụng Quản Lý CCCD

#### Bước 1: Truy Cập Tính Năng
1. Đăng nhập admin tại `/admin/login`
2. Vào Dashboard - click button **"Quản Lý CCCD"** (màu xanh lá)
3. Hoặc truy cập trực tiếp: `/admin/dashboard/update-cccd`

#### Bước 2: Tìm Kiếm Nhân Viên
1. **Nhập từ khóa tìm kiếm** (ít nhất 2 ký tự):
   - Mã nhân viên (VD: NV001)
   - Tên nhân viên (VD: Nguyễn Văn A)
2. **Hệ thống tự động tìm kiếm** với debouncing
3. **Chọn nhân viên** từ danh sách kết quả

#### Bước 3: Cập Nhật CCCD
1. **Xem thông tin nhân viên** đã chọn
2. **Nhập số CCCD mới** (12 chữ số)
3. **Xác nhận số CCCD** (nhập lại để đảm bảo chính xác)
4. **Click "Cập nhật CCCD"** để thực hiện

### ✅ Validation & Bảo Mật
- **Định dạng CCCD**: Phải có đúng 12 chữ số
- **Chỉ chứa số**: Không chấp nhận chữ cái hoặc ký tự đặc biệt
- **Xác nhận kép**: Phải nhập CCCD 2 lần để tránh nhầm lẫn
- **Mã hóa bcrypt**: CCCD được hash trước khi lưu database
- **Thông báo rõ ràng**: Success/error messages chi tiết

### 🔄 Quy Trình Sau Cập Nhật
1. **Thông báo thành công**: Hiển thị message xác nhận
2. **Tự động reset form**: Quay về trang tìm kiếm sau 3 giây
3. **Nhân viên cần biết**: Thông báo cho nhân viên về CCCD mới
4. **Login mới**: Nhân viên dùng CCCD mới để tra cứu lương

### ⚠️ Lưu Ý Quan Trọng
- **Không thể hoàn tác**: Việc cập nhật CCCD sẽ thay thế hoàn toàn số cũ
- **Ảnh hưởng đăng nhập**: Nhân viên phải dùng CCCD mới để tra cứu
- **Bảo mật cao**: CCCD được mã hóa, không thể xem lại số gốc
- **Audit trail**: Mọi thay đổi được ghi log với timestamp

## Format File Excel Lương

File Excel lương cần có các cột (tên cột có thể tiếng Việt):
- Mã nhân viên / Employee ID
- Họ tên / Full Name
- CCCD / CMND
- Chức vụ / Position (tùy chọn)
- Tháng lương / Salary Month
- Tổng thu nhập / Total Income
- Khấu trừ / Deductions
- Lương thực lĩnh / Net Salary

## Bảo Mật

- **JWT token** cho admin authentication
- **API routes** được bảo vệ bằng middleware
- **Nhân viên** chỉ xem được dữ liệu của mình
- **CCCD được hash** bằng bcrypt trước khi lưu database
- **Validation đầu vào** cho tất cả API
- **Row Level Security (RLS)** cho Supabase
- **File type validation** chỉ chấp nhận Excel files
- **File size limit** tối đa 10MB

## Công Nghệ Sử Dụng

- **Frontend**: Next.js 15, React 19, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT, bcryptjs (admin_token key)
- **File Processing**: xlsx library
- **Security**: bcrypt for CCCD hashing
- **UI Components**: Lucide React icons, responsive design
- **State Management**: React hooks, localStorage
- **Deployment**: Vercel (recommended)

## Triển Khai

### Vercel:
1. Push code lên GitHub
2. Connect repository với Vercel
3. Cấu hình environment variables
4. Deploy

### Supabase:
1. Tạo project mới trên supabase.com
2. Chạy SQL script tạo bảng (scripts/supabase-setup/)
3. Lấy URL và API keys
4. Cấu hình RLS policies

## Hỗ Trợ

Nếu gặp vấn đề, vui lòng:
1. **Kiểm tra logs** trong console
2. **Xác nhận cấu hình** environment variables
3. **Đảm bảo Supabase database** đã được thiết lập đúng
4. **Kiểm tra format file Excel** theo template
5. **Xem chi tiết lỗi** trong báo cáo import

### Troubleshooting Import Nhân Viên:
- **File không đọc được**: Kiểm tra định dạng .xlsx/.xls
- **Lỗi authentication**: Đăng nhập lại admin
- **Dữ liệu không hợp lệ**: Xem chi tiết lỗi trong báo cáo
- **Import chậm**: File quá lớn, chia nhỏ file

### Troubleshooting Quản Lý CCCD:
- **Không tìm thấy nhân viên**: Kiểm tra mã NV hoặc tên chính xác
- **CCCD không hợp lệ**: Phải đúng 12 chữ số, không có ký tự khác
- **Lỗi cập nhật**: Kiểm tra kết nối database và quyền admin
- **Nhân viên không đăng nhập được**: Thông báo CCCD mới cho nhân viên

## 📡 API Endpoints

### Admin Authentication:
- `POST /api/admin/login` - Đăng nhập admin
- `GET /api/admin/dashboard-stats` - Thống kê dashboard

### Employee Management:
- `POST /api/admin/import-employees` - Import danh sách nhân viên
- `GET /api/employees/update-cccd?q={query}` - Tìm kiếm nhân viên
- `POST /api/employees/update-cccd` - Cập nhật CCCD nhân viên

### Employee Lookup:
- `POST /api/employee/lookup` - Tra cứu thông tin lương
- `POST /api/employee/sign-salary` - Ký nhận lương điện tử

## 🖊️ Tính Năng Ký Nhận Lương Điện Tử

### 🎯 Mô Tả Tính Năng
Hệ thống cho phép nhân viên ký nhận lương điện tử một cách an toàn và có thể tracking đầy đủ.

### 🔐 Bảo Mật & Xác Thực
- **Xác thực 2 lớp**: Mã nhân viên + Số CCCD (được hash bằng bcrypt)
- **IP Tracking**: Ghi lại địa chỉ IP khi ký
- **Device Info**: Lưu thông tin thiết bị và trình duyệt
- **Timestamp**: Ghi chính xác thời gian ký nhận
- **One-time signing**: Mỗi tháng lương chỉ ký được 1 lần

### 📋 Quy Trình Ký Nhận

#### Bước 1: Tra Cứu Lương
1. Nhân viên truy cập `/employee/lookup`
2. Nhập **Mã Nhân Viên** và **Số CCCD**
3. Hệ thống xác thực và hiển thị thông tin lương

#### Bước 2: Xem Chi Tiết Lương
- **Thông tin cá nhân**: Họ tên, ngày công trong giờ, chức vụ
- **Chi tiết lương**: 6 thông số quan trọng (hệ số, phụ cấp, BHXH, lương thực nhận)
- **Tháng lương**: Hiển thị rõ kỳ lương
- **Trạng thái ký**: Đã ký hoặc chưa ký

#### Bước 3: Ký Nhận Lương
- **Nếu chưa ký**: Hiển thị nút "Ký Nhận Lương Tháng X"
- **Nếu đã ký**: Hiển thị thông tin người ký và thời gian
- **Xác nhận**: Click nút ký → Hệ thống xử lý → Thông báo thành công

### 🗂️ Database & Logging

#### Bảng `signature_logs`:
```sql
- id: UUID primary key
- employee_id: Mã nhân viên
- salary_month: Tháng lương (YYYY-MM)
- signed_at: Thời gian ký (timestamp)
- signed_by_name: Tên người ký
- ip_address: Địa chỉ IP
- device_info: Thông tin thiết bị
```

#### Database Function `auto_sign_salary`:
- **Input**: employee_id, salary_month, ip_address, device_info
- **Process**: Kiểm tra duplicate, insert log, update payroll
- **Output**: Success status, signed info, error messages

### 🔧 API Endpoints

#### `/api/employee/lookup` (POST)
```json
{
  "employee_id": "NV001",
  "cccd": "001234567890"
}
```
**Response**: Thông tin lương chi tiết (6 fields) + ngày công + trạng thái ký

#### `/api/employee/sign-salary` (POST)
```json
{
  "employee_id": "NV001",
  "cccd": "001234567890",
  "salary_month": "2024-01"
}
```
**Response**: Kết quả ký nhận + thông tin tracking

### ⚠️ Validation & Error Handling

#### Validation Rules:
- **Employee exists**: Kiểm tra mã nhân viên tồn tại
- **CCCD match**: So sánh hash CCCD với database
- **Payroll exists**: Đảm bảo có dữ liệu lương tháng đó
- **Not signed yet**: Chỉ ký được 1 lần/tháng

#### Error Messages:
- `"Không tìm thấy nhân viên với mã nhân viên đã nhập"`
- `"Số CCCD không đúng"`
- `"Không tìm thấy thông tin lương cho tháng này"`
- `"Bạn đã ký nhận lương tháng này rồi"`

### 📊 Tracking & Reporting

#### Thông Tin Được Tracking:
- **Thời gian ký**: Chính xác đến giây (timezone VN)
- **IP Address**: Từ headers x-forwarded-for hoặc x-real-ip
- **Device Info**: User-Agent string
- **Employee Info**: Mã NV, tên, tháng lương

#### Hiển Thị Cho Nhân Viên:
- **Thông tin cá nhân**: Họ tên, ngày công trong giờ, chức vụ, tháng lương
- **Chi tiết lương**: 6 cards với màu sắc khác nhau (hệ số, phụ cấp, BHXH, lương thực nhận)
- **Trạng thái ký**: "Đã ký nhận lương" (màu xanh) hoặc "Chưa ký nhận lương" (màu vàng)
- **Thông tin ký**: Tên người ký + thời gian (format Việt Nam)
- **Thông báo**: Success message sau khi ký thành công

### 🎨 UI/UX Features

#### Visual Indicators:
- **🟢 Đã ký**: Card màu xanh với icon CheckCircle
- **🟡 Chưa ký**: Card màu vàng với icon Clock
- **✅ Success**: Alert màu xanh với animation
- **🔄 Loading**: Spinner khi đang xử lý

#### Responsive Design:
- **Mobile-friendly**: Hoạt động tốt trên điện thoại
- **Touch-optimized**: Nút bấm dễ chạm
- **Clear typography**: Font size và contrast phù hợp

## 📊 Chi Tiết Hiển Thị Lương Nhân Viên

### 🎯 Thông Tin Cá Nhân
Khi nhân viên tra cứu lương thành công, hệ thống hiển thị:

#### **Thông Tin Cơ Bản:**
- **Họ và Tên**: Từ bảng `employees.full_name`
- **Ngày công trong giờ**: Từ `payrolls.ngay_cong_trong_gio` (format: "X ngày")
- **Chức vụ**: Từ `employees.chuc_vu`
- **Tháng lương**: Từ `payrolls.salary_month` (format: YYYY-MM)

### 💰 Chi Tiết Lương (6 Cards)

Hệ thống hiển thị 6 thông số quan trọng trong layout grid 2 cột (desktop) / 1 cột (mobile):

#### **1. Hệ Số Làm Việc** (Card màu xanh dương)
- **Field**: `payrolls.he_so_lam_viec`
- **Format**: Số thập phân 2 chữ số (VD: 1.25)
- **Ý nghĩa**: Hệ số làm việc của nhân viên

#### **2. Hệ Số Phụ Cấp KQ** (Card màu xanh lá)
- **Field**: `payrolls.he_so_phu_cap_ket_qua`
- **Format**: Số thập phân 2 chữ số (VD: 0.75)
- **Ý nghĩa**: Hệ số phụ cấp kết quả công việc

#### **3. Tiền Khen Thưởng Chuyên Cần** (Card màu tím)
- **Field**: `payrolls.tien_khen_thuong_chuyen_can`
- **Format**: Tiền tệ VND (VD: 500.000 ₫)
- **Ý nghĩa**: Tiền thưởng chuyên cần hàng tháng

#### **4. Lương Học Việc PC** (Card màu cam)
- **Field**: `payrolls.luong_hoc_viec_pc_luong`
- **Format**: Tiền tệ VND (VD: 1.200.000 ₫)
- **Ý nghĩa**: Lương học việc và phụ cấp lương

#### **5. BHXH BHTN BHYT** (Card màu đỏ)
- **Field**: `payrolls.bhxh_bhtn_bhyt_total`
- **Format**: Tiền tệ VND (VD: 850.000 ₫)
- **Ý nghĩa**: Tổng bảo hiểm xã hội, thất nghiệp, y tế

#### **6. Lương Thực Nhận Cuối Kỳ** (Card màu xanh ngọc)
- **Field**: `payrolls.tien_luong_thuc_nhan_cuoi_ky`
- **Format**: Tiền tệ VND (VD: 8.500.000 ₫)
- **Ý nghĩa**: Số tiền lương thực tế nhận được

### 🎨 UI/UX Design

#### **Responsive Layout:**
```css
/* Mobile: 1 cột */
grid-cols-1

/* Desktop: 2 cột */
md:grid-cols-2
```

#### **Color Scheme:**
- **Blue**: Hệ số làm việc (bg-blue-50, border-blue-200, text-blue-600/700)
- **Green**: Hệ số phụ cấp (bg-green-50, border-green-200, text-green-600/700)
- **Purple**: Tiền khen thưởng (bg-purple-50, border-purple-200, text-purple-600/700)
- **Orange**: Lương học việc (bg-orange-50, border-orange-200, text-orange-600/700)
- **Red**: BHXH (bg-red-50, border-red-200, text-red-600/700)
- **Emerald**: Lương thực nhận (bg-emerald-50, border-emerald-200, text-emerald-600/700)

#### **Format Functions:**
```typescript
// Cho hệ số (2 chữ số thập phân)
const formatNumber = (value: number) => value.toFixed(2)

// Cho tiền tệ (VND format)
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND"
  }).format(amount)
```

### 📱 Trải Nghiệm Người Dùng

#### **Workflow Hoàn Chỉnh:**
1. **Input**: Nhập mã NV + CCCD
2. **Validation**: Xác thực thông tin
3. **Display**: Hiển thị 6 cards chi tiết lương
4. **Action**: Ký nhận lương (nếu chưa ký)
5. **Confirmation**: Thông báo thành công

#### **Visual Hierarchy:**
- **Header**: Thông tin cá nhân (tên, ngày công, chức vụ)
- **Main Content**: 6 cards lương (grid layout)
- **Footer**: Trạng thái ký nhận + action button

#### **Accessibility:**
- **Icons**: Mỗi card có icon phù hợp
- **Colors**: Contrast ratio đảm bảo readability
- **Typography**: Font size và weight phân cấp rõ ràng
- **Mobile**: Touch-friendly button sizes

## 📊 Quản Lý Lương Chi Tiết (Admin)

### 🎯 Tổng Quan Tính Năng
Hệ thống quản lý lương chi tiết cho phép admin tìm kiếm, xem và theo dõi thông tin lương của tất cả nhân viên với giao diện chuyên nghiệp và audit trail đầy đủ.

### 🔍 Tính Năng Tìm Kiếm Nhân Viên

#### **Truy Cập:**
- **URL**: `/admin/payroll-management`
- **Yêu cầu**: Đăng nhập admin với JWT token
- **Navigation**: Admin Dashboard → "Quản Lý Lương Chi Tiết"

#### **Chức Năng Tìm Kiếm:**
- **Tìm theo Mã NV**: Nhập mã nhân viên (VD: NV001, EMP001)
- **Tìm theo Tên**: Nhập họ tên nhân viên (VD: Nguyễn Văn An)
- **Filter theo Tháng**: Chọn tháng lương cụ thể hoặc "Tất cả tháng"
- **Real-time Search**: Tự động tìm kiếm khi nhập (debouncing 300ms)
- **Minimum Query**: Yêu cầu ít nhất 2 ký tự để tìm kiếm

#### **Kết Quả Hiển Thị:**
```typescript
interface SearchResult {
  payroll_id: number;           // ID bản ghi lương
  employee_id: string;          // Mã nhân viên
  full_name: string;            // Họ tên đầy đủ
  department: string;           // Phòng ban
  position: string;             // Chức vụ
  salary_month: string;         // Tháng lương (YYYY-MM)
  net_salary: number;           // Lương thực nhận
  source_file: string;          // File Excel gốc
  created_at: string;           // Ngày tạo
}
```

### 📋 Giao Diện Kết Quả Tìm Kiếm

#### **Table Layout:**
| Cột | Mô Tả | Format |
|-----|-------|--------|
| **Mã NV** | employee_id | Text, bold |
| **Họ Tên** | full_name | Text |
| **Phòng Ban** | department | Badge màu xanh |
| **Chức Vụ** | position | Badge màu tím |
| **Tháng Lương** | salary_month | YYYY-MM |
| **Lương Thực Nhận** | net_salary | VND format |
| **Thao Tác** | Actions | Buttons |

#### **Action Buttons:**
- **👁️ Xem Chi Tiết**: Mở modal với 39 cột dữ liệu lương đầy đủ
- **📝 Lịch Sử Thay Đổi**: Xem audit trail của bản ghi lương
- **✏️ Chỉnh Sửa**: Sửa đổi thông tin lương (future feature)

### 🔍 Modal Xem Chi Tiết Lương

#### **Cấu Trúc Hiển Thị:**
```typescript
// 39 cột dữ liệu được nhóm thành 6 categories
interface PayrollDetail {
  // 1. THÔNG TIN CƠ BẢN
  employee_info: {
    employee_id: string;
    full_name: string;
    department: string;
    position: string;
    salary_month: string;
  };

  // 2. HỆ SỐ VÀ THÔNG SỐ
  coefficients: {
    he_so_lam_viec: number;
    he_so_phu_cap_ket_qua: number;
    he_so_luong_co_ban: number;
    luong_toi_thieu_cty: number;
  };

  // 3. THỜI GIAN LÀM VIỆC
  working_time: {
    ngay_cong_trong_gio: number;
    gio_cong_tang_ca: number;
    gio_an_ca: number;
    tong_gio_lam_viec: number;
    tong_he_so_quy_doi: number;
  };

  // 4. LƯƠNG SẢN PHẨM
  product_salary: {
    tong_luong_san_pham_cong_doan: number;
    don_gia_tien_luong_tren_gio: number;
    tien_luong_san_pham_trong_gio: number;
    tien_luong_tang_ca: number;
    tien_luong_30p_an_ca: number;
  };

  // 5. PHỤ CẤP VÀ THƯỞNG
  allowances: {
    tien_khen_thuong_chuyen_can: number;
    luong_hoc_viec_pc_luong: number;
    phu_cap_tien_an: number;
    phu_cap_xang_xe: number;
    phu_cap_dien_thoai: number;
    phu_cap_khac: number;
  };

  // 6. KHẤU TRỪ VÀ THỰC NHẬN
  deductions_final: {
    thue_tncn_nam_2024: number;
    tam_ung: number;
    thue_tncn: number;
    bhxh_bhtn_bhyt_total: number;
    truy_thu_the_bhyt: number;
    tien_luong_thuc_nhan_cuoi_ky: number; // FINAL AMOUNT
  };
}
```

#### **UI/UX Design:**
- **Responsive Modal**: Fullscreen trên mobile, large modal trên desktop
- **Collapsible Sections**: Mỗi category có thể thu gọn/mở rộng
- **Color Coding**: Mỗi section có màu sắc riêng biệt
- **Typography**: Font size và weight phân cấp rõ ràng
- **Currency Format**: Tất cả số tiền đều format VND
- **Number Format**: Hệ số hiển thị 2 chữ số thập phân

### 📜 Audit Trail (Lịch Sử Thay Đổi)

#### **Database Schema:**
```sql
-- Table: payroll_audit_logs
CREATE TABLE payroll_audit_logs (
  id SERIAL PRIMARY KEY,
  payroll_id INTEGER NOT NULL,           -- FK to payrolls.id
  employee_id VARCHAR(50) NOT NULL,      -- For filtering
  salary_month VARCHAR(20) NOT NULL,     -- For filtering
  changed_by VARCHAR(255) NOT NULL,      -- Admin username
  changed_at TIMESTAMP DEFAULT NOW(),    -- When changed
  change_ip VARCHAR(45),                 -- IP address
  change_reason TEXT NOT NULL,           -- Reason for change
  field_name VARCHAR(100) NOT NULL,      -- Which field changed
  old_value TEXT,                        -- Previous value
  new_value TEXT                         -- New value
);
```

#### **Audit Trail Features:**
- **Complete History**: Mọi thay đổi đều được ghi log
- **Field-Level Tracking**: Theo dõi từng field riêng biệt
- **Admin Attribution**: Biết admin nào thực hiện thay đổi
- **IP Tracking**: Ghi lại địa chỉ IP khi thay đổi
- **Reason Required**: Bắt buộc nhập lý do thay đổi
- **Grouped Display**: Nhóm các thay đổi cùng lúc
- **Chronological Order**: Sắp xếp theo thời gian mới nhất

#### **Audit Trail UI:**
```typescript
interface AuditEntry {
  id: number;
  changed_by: string;           // "admin"
  changed_at: string;           // "2024-01-15 14:30:25"
  change_ip: string;            // "192.168.1.100"
  change_reason: string;        // "Điều chỉnh lương theo quyết định"
  changes: Array<{
    field_name: string;         // "tien_luong_thuc_nhan_cuoi_ky"
    old_value: string;          // "8500000"
    new_value: string;          // "9000000"
  }>;
}
```

### 🔧 API Endpoints

#### **Search API:**
```typescript
// GET /api/admin/payroll/search?q={query}&salary_month={month}
interface SearchRequest {
  q: string;                    // Min 2 characters
  salary_month?: string;        // Optional filter
}

interface SearchResponse {
  success: boolean;
  results: SearchResult[];
  total: number;
  message?: string;
}
```

#### **Detail API:**
```typescript
// GET /api/admin/payroll/{id}
interface DetailResponse {
  success: boolean;
  payroll: PayrollDetail;
  employee: EmployeeInfo;
}
```

#### **Audit API:**
```typescript
// GET /api/admin/payroll/audit/{id}
interface AuditResponse {
  success: boolean;
  auditTrail: AuditEntry[];
  totalChanges: number;
}
```

### 🛡️ Security & Permissions

#### **Authentication:**
- **JWT Required**: Tất cả API đều yêu cầu admin token
- **Token Validation**: Verify JWT signature và expiry
- **Role Check**: Chỉ role "admin" mới được truy cập

#### **RLS Policies:**
```sql
-- Service client có thể truy cập tất cả data
CREATE POLICY "payrolls_service_client_access" ON payrolls
  FOR ALL USING (
    auth.jwt() IS NULL OR
    auth.jwt() ->> 'role' = 'admin'
  );

-- Audit logs cũng áp dụng tương tự
CREATE POLICY "audit_logs_service_client_access" ON payroll_audit_logs
  FOR ALL USING (
    auth.jwt() IS NULL OR
    auth.jwt() ->> 'role' = 'admin'
  );
```

### 🐛 Troubleshooting

#### **Common Issues:**

| Lỗi | Nguyên Nhân | Giải Pháp |
|-----|-------------|-----------|
| "Lỗi khi tìm kiếm dữ liệu lương" | RLS policy block | Chạy `scripts/fix-audit-trail-rls.sql` |
| "Lỗi khi lấy lịch sử thay đổi" | Audit table missing | Chạy `scripts/supabase-setup/14-create-payroll-audit-table.sql` |
| "Không có quyền truy cập" | Token expired/invalid | Đăng nhập lại admin |
| "Chưa có dữ liệu lương" | Empty database | Import dữ liệu lương trước |

#### **Debug Scripts:**
- `scripts/debug-database-access.sql` - Kiểm tra database access
- `scripts/fix-audit-trail-rls.sql` - Fix RLS policies
- `scripts/test-audit-trail.sql` - Test audit functionality

### 📈 Performance Considerations

#### **Database Optimization:**
- **Indexes**: Tạo index cho employee_id, salary_month, created_at
- **Query Limit**: Giới hạn 20 kết quả mỗi lần search
- **Debouncing**: 300ms delay cho search input
- **Pagination**: Future feature cho large datasets

#### **Frontend Optimization:**
- **Lazy Loading**: Modal content chỉ load khi cần
- **Memoization**: Cache search results
- **Responsive Images**: Optimize cho mobile
- **Bundle Splitting**: Separate admin chunks

## License

MIT License - xem file LICENSE để biết thêm chi tiết.
