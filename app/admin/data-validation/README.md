# 📊 Data Validation Page - Kiểm Tra Dữ Liệu Lương

## 🎯 Mục Đích

Trang **Data Validation** được thiết kế để so sánh danh sách nhân viên trong bảng `employees` với dữ liệu lương trong bảng `payrolls` cho từng tháng cụ thể, giúp phát hiện những nhân viên chưa có dữ liệu lương.

## 🚀 Tính Năng Chính

### 1. **Bộ Lọc Tháng/Năm**
- Dropdown chọn tháng với 13 tùy chọn (tháng hiện tại + 12 tháng trước)
- Mặc định hiển thị tháng hiện tại
- Format: MM/YYYY (hiển thị) → YYYY-MM (API)

### 2. **Thống Kê Tổng Quan**
- **Tổng Nhân Viên**: Số nhân viên đang hoạt động trong hệ thống
- **Có Dữ Liệu Lương**: Số nhân viên đã có lương trong tháng được chọn
- **Thiếu Dữ Liệu**: Số nhân viên chưa có lương (missing employees)
- **Tỷ Lệ Hoàn Thành**: Phần trăm nhân viên đã có dữ liệu lương

### 3. **Danh Sách Nhân Viên Thiếu Dữ Liệu**
- Bảng chi tiết những nhân viên chưa có lương
- Thông tin: Mã NV, Họ tên, Phòng ban, Chức vụ, Trạng thái
- Hiển thị thông báo "Hoàn Hảo!" nếu không có nhân viên nào thiếu dữ liệu

### 4. **Hệ Thống Cache 24h**
- Cache dữ liệu trong 24 giờ để tối ưu hiệu suất
- Hiển thị timestamp của cache
- Nút "Làm mới" để force refresh cache

## 🔧 Cấu Trúc Kỹ Thuật

### **API Endpoint**
```
GET /api/admin/data-validation?month=YYYY-MM&force_refresh=true
DELETE /api/admin/data-validation?month=YYYY-MM (clear cache)
```

### **Database Tables**
- **employees**: employee_id, full_name, department, chuc_vu, is_active
- **payrolls**: employee_id, salary_month (YYYY-MM format)

### **Authentication**
- Chỉ admin có quyền truy cập
- Sử dụng JWT token với key "admin_token"
- Tích hợp với RLS policies hiện có

## 📱 Giao Diện

### **Responsive Design**
- Mobile-first với Tailwind CSS
- Grid layout cho statistics cards
- Responsive table cho danh sách nhân viên

### **Color Coding**
- 🟢 **Xanh lá**: Tỷ lệ ≥ 95% (Hoàn hảo)
- 🟡 **Vàng**: Tỷ lệ 80-94% (Cần chú ý)
- 🔴 **Đỏ**: Tỷ lệ < 80% (Cần hành động)

### **Icons & Components**
- Lucide React icons
- shadcn/ui components
- Consistent với design system hiện có

## 🔗 Navigation

### **Truy Cập Trang**
1. **Dashboard Admin** → Menu "Quản Lý Hệ Thống" → "Kiểm Tra Dữ Liệu"
2. **Direct URL**: `/admin/data-validation`

### **Hành Động Tiếp Theo**
- 📁 **Nhập Dữ Liệu Lương**: Link đến `/admin/payroll-import-export`
- 📊 **Quản Lý Lương**: Link đến `/admin/payroll-management`
- 🏠 **Về Dashboard**: Link đến `/admin/dashboard`

## ⚡ Performance

### **Caching Strategy**
- **Cache Duration**: 24 giờ
- **Cache Key**: `validation_{month}`
- **Force Refresh**: Query parameter `force_refresh=true`
- **Auto Cleanup**: Cache tự động xóa khi hết hạn

### **Query Optimization**
- Chỉ query nhân viên đang hoạt động (`is_active = true`)
- Sử dụng Set() để tối ưu việc so sánh employee IDs
- Index trên `salary_month` và `employee_id`

## 🛡️ Security

### **Access Control**
- Chỉ admin role có quyền truy cập
- JWT token verification
- RLS policies enforcement

### **Input Validation**
- Validate month format (YYYY-MM)
- Sanitize query parameters
- Error handling cho invalid requests

## 📊 Use Cases

### **Trường Hợp Sử Dụng**
1. **Kiểm tra sau khi import**: Xác nhận tất cả nhân viên đã có lương
2. **Audit hàng tháng**: Đảm bảo không bỏ sót nhân viên nào
3. **Troubleshooting**: Tìm nguyên nhân khi có khiếu nại về lương
4. **Báo cáo cho lãnh đạo**: Thống kê tỷ lệ hoàn thành dữ liệu

### **Workflow Đề Xuất**
1. Chọn tháng cần kiểm tra
2. Xem thống kê tổng quan
3. Nếu có nhân viên thiếu → Kiểm tra danh sách chi tiết
4. Thực hiện import bổ sung nếu cần
5. Refresh để xác nhận kết quả

## 🔄 Maintenance

### **Cache Management**
- Cache tự động expire sau 24h
- Admin có thể force refresh bất kỳ lúc nào
- DELETE endpoint để clear cache thủ công

### **Monitoring**
- Log errors trong console
- Track API response times
- Monitor cache hit/miss rates

---

**Trang Data Validation giúp đảm bảo tính toàn vẹn dữ liệu lương và phát hiện sớm các vấn đề trong quá trình import! 🚀**
