# 🕐 HƯỚNG DẪN SỬA MÚI GIỜ VIỆT NAM (+7)

## 📋 TỔNG QUAN VẤN ĐỀ

Hiện tại hệ thống đang ghi timestamp theo UTC (chậm hơn 7 giờ so với Việt Nam). Cần sửa để:
- ✅ Database ghi đúng giờ Việt Nam (+7)
- ✅ Frontend hiển thị đúng múi giờ
- ✅ Tất cả timestamp future cũng đúng

---

## 🔧 CÁC THAY ĐỔI ĐÃ THỰC HIỆN

### **1. Frontend (Đã sửa):**
```typescript
// File: app/employee/lookup/employee-lookup.tsx
const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh"  // ← ĐÃ THÊM
  })
}
```

### **2. Database Function (Đã sửa):**
```sql
-- File: scripts/supabase-setup/05-create-auto-signature-function.sql
v_current_time := (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh');
```

### **3. Script Hoàn Chỉnh (Mới tạo):**
```sql
-- File: scripts/supabase-setup/12-fix-timezone-vietnam.sql
-- Sửa tất cả table defaults, triggers, functions
```

---

## 🚀 CÁCH TRIỂN KHAI

### **Bước 1: Chạy Script Database** 
```bash
# Trên Supabase Dashboard hoặc psql
psql -f scripts/supabase-setup/12-fix-timezone-vietnam.sql

# Hoặc copy-paste vào Supabase SQL Editor
```

### **Bước 2: Verify Kết Quả**
```sql
-- Kiểm tra múi giờ đã đúng chưa
SELECT 
  'Timezone check' as test,
  (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh') as vietnam_time,
  CURRENT_TIMESTAMP as utc_time;

-- Kết quả mong đợi: vietnam_time sẽ nhanh hơn utc_time 7 giờ
```

### **Bước 3: Test Ký Tên**
```bash
# Frontend đã được sửa, chỉ cần test:
1. Vào trang tra cứu nhân viên
2. Ký nhận lương 
3. Kiểm tra thời gian hiển thị đã đúng múi giờ Việt Nam
```

---

## 📊 CHI TIẾT THAY ĐỔI

### **Database Tables Updated:**
- ✅ `employees.created_at`, `updated_at`
- ✅ `payrolls.created_at`, `updated_at`, `signed_at`
- ✅ `signature_logs.signed_at`

### **Functions Updated:**
- ✅ `auto_sign_salary()` - Function ký tên chính
- ✅ `get_salary_by_month()` - Hiển thị lương theo tháng
- ✅ `get_employee_salary_detail()` - Chi tiết lương nhân viên
- ✅ `trigger_set_vietnam_timestamp()` - Auto-update trigger

### **Triggers Added:**
- ✅ Auto-update `updated_at` với Vietnam timezone
- ✅ Áp dụng cho `employees` và `payrolls` tables

---

## 🔍 KIỂM TRA SAU KHI DEPLOY

### **Test Cases:**
1. **Ký tên mới**: Timestamp ghi vào DB phải đúng giờ VN
2. **Hiển thị frontend**: Format datetime hiển thị đúng
3. **Import dữ liệu**: Timestamp tự động theo VN timezone
4. **Update records**: Trigger cập nhật đúng múi giờ

### **SQL Verification:**
```sql
-- Test 1: Kiểm tra function ký tên
SELECT auto_sign_salary('NV001', '2024-07', '192.168.1.1', 'Test Browser');

-- Test 2: Xem timestamp đã ghi
SELECT signed_at, signed_by_name FROM payrolls WHERE is_signed = true LIMIT 5;

-- Test 3: So sánh múi giờ
SELECT 
  signed_at as vietnam_time,
  (signed_at AT TIME ZONE 'Asia/Ho_Chi_Minh' AT TIME ZONE 'UTC') as utc_equivalent
FROM payrolls WHERE is_signed = true LIMIT 1;
```

---

## 🎯 KẾT QUẢ MONG ĐỢI

### **Trước khi sửa:**
```
Database: 2024-07-15 07:30:25 (UTC)
Display:  15/07/2024 07:30     (Sai - chậm 7h)
```

### **Sau khi sửa:**
```
Database: 2024-07-15 14:30:25 (VN Time)  
Display:  15/07/2024 14:30     (Đúng - giờ VN)
```

---

## ⚠️ LƯU Ý QUAN TRỌNG

### **Data Hiện Tại:**
- 📅 **Dữ liệu cũ**: Vẫn theo UTC, không thay đổi
- 📅 **Dữ liệu mới**: Sẽ theo Vietnam timezone
- 🔄 **Frontend**: Tự động hiển thị đúng cả dữ liệu cũ và mới

### **Production Deployment:**
1. **Backup database** trước khi chạy script
2. **Test trên staging** environment trước
3. **Deploy off-peak hours** để tránh impact user
4. **Monitor logs** sau khi deploy

---

## 🎉 HOÀN THÀNH

Sau khi chạy script, hệ thống sẽ:
- ✅ Ghi timestamp theo giờ Việt Nam (+7)
- ✅ Hiển thị đúng múi giờ trên frontend  
- ✅ Tương thích với dữ liệu cũ
- ✅ Tự động áp dụng cho dữ liệu tương lai

**Múi giờ đã được sửa thành công! 🇻🇳⏰** 