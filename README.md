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
3. **Trong dashboard, sử dụng tính năng Import Nhân Viên**
4. Upload file Excel chứa dữ liệu lương
5. Xem và quản lý dữ liệu

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
- **Authentication**: JWT, bcryptjs
- **File Processing**: xlsx library
- **Security**: bcrypt for CCCD hashing
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

## License

MIT License - xem file LICENSE để biết thêm chi tiết.
