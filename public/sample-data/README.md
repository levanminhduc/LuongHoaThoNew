# File Excel Mẫu

Thư mục này chứa các file Excel mẫu để test hệ thống quản lý lương.

## Cách tạo file Excel mẫu:

1. Chạy script tạo file:
\`\`\`bash
node scripts/generate-sample-excel.js
\`\`\`

2. Script sẽ tạo 2 file:
   - `bang-luong-thang-01-2024.xlsx` (10 nhân viên - tháng 1)
   - `bang-luong-thang-02-2024.xlsx` (7 nhân viên - tháng 2, có thêm nhân viên mới)

## Cấu trúc dữ liệu:

### File 1 (Tiếng Việt Headers):
- Mã Nhân Viên
- Họ Tên
- CCCD
- Chức Vụ
- Tháng Lương
- Tổng Thu Nhập
- Khấu Trừ
- Lương Thực Lĩnh

### File 2 (English Headers):
- Employee ID
- Full Name
- CCCD
- Position
- Salary Month
- Total Income
- Deductions
- Net Salary

## Dữ liệu test:

### Nhân viên có thể tra cứu:
1. **Nguyễn Văn An**
   - Mã NV: NV001
   - CCCD: 001234567890
   - Có dữ liệu cả 2 tháng

2. **Trần Thị Bình**
   - Mã NV: NV002
   - CCCD: 001234567891
   - Chức vụ: Trưởng phòng

3. **Lê Văn Cường**
   - Mã NV: NV003
   - CCCD: 001234567892
   - Lương thấp nhất

4. **Trương Văn Long** (chỉ có tháng 2)
   - Mã NV: NV011
   - CCCD: 001234567900
   - Nhân viên mới

## Hướng dẫn test:

1. **Upload file vào admin:**
   - Đăng nhập admin (admin/admin123)
   - Upload cả 2 file Excel
   - Kiểm tra dashboard thống kê

2. **Test tra cứu nhân viên:**
   - Vào trang tra cứu nhân viên
   - Thử các thông tin trên
   - Kiểm tra hiển thị kết quả

3. **Test case âm tính:**
   - Nhập sai mã NV hoặc CCCD
   - Kiểm tra thông báo lỗi

## Lưu ý:

- File hỗ trợ cả tiếng Việt và tiếng Anh cho header
- Dữ liệu bao gồm nhiều chức vụ khác nhau
- Có nhân viên xuất hiện ở cả 2 tháng và nhân viên mới
- Số liệu lương realistic cho thị trường Việt Nam
