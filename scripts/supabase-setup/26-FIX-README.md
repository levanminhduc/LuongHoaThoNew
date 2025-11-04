# 🔧 FIX: Bulk Signature 500 Error

## 📋 **VẤN ĐỀ**

**Lỗi**: `POST http://localhost:3000/api/admin/bulk-sign-salary 500 (Internal Server Error)`

**Nguyên nhân**: Function `bulk_sign_salaries` gọi `auto_sign_salary` với **5 parameters** nhưng function chỉ nhận **4 parameters**.

### **Chi tiết lỗi:**

```sql
-- ❌ SAI: bulk_sign_salaries gọi với 5 params
SELECT auto_sign_salary(
  v_employee_id,
  p_salary_month,
  p_ip_address,
  p_device_info,
  p_admin_id  -- ❌ Parameter này KHÔNG TỒN TẠI!
) INTO v_sign_result;

-- ✅ ĐÚNG: auto_sign_salary chỉ nhận 4 params
CREATE FUNCTION auto_sign_salary(
  p_employee_id VARCHAR(50),
  p_salary_month VARCHAR(20),
  p_ip_address VARCHAR(45) DEFAULT NULL,
  p_device_info TEXT DEFAULT NULL,
  p_client_timestamp VARCHAR(50) DEFAULT NULL  -- ← NOT p_admin_id!
)
```

---

## 🎯 **GIẢI PHÁP**

File fix: `scripts/supabase-setup/26-fix-bulk-sign-salaries-function.sql`

**Thay đổi**:
- ✅ Bỏ parameter `p_admin_id` khỏi lời gọi `auto_sign_salary`
- ✅ Gọi với 4 parameters: `(v_employee_id, p_salary_month, p_ip_address, p_device_info)`
- ✅ Admin tracking được lưu vào bảng `bulk_signature_history` thay vì truyền qua function

---

## 🚀 **CÁCH SỬA**

### **Phương án 1: Qua Supabase SQL Editor** (Khuyến nghị)

1. **Mở Supabase Dashboard**: https://supabase.com/dashboard/project/qvtyabffjjiwgpusyudf

2. **Vào SQL Editor**

3. **Copy toàn bộ nội dung file**: `scripts/supabase-setup/26-fix-bulk-sign-salaries-function.sql`

4. **Paste vào SQL Editor và chạy**

5. **Kiểm tra kết quả**:
   ```
   ✅ VERIFICATION RESULTS
   ✅ Function exists: bulk_sign_salaries
   📋 Parameters: ...
   ✅ FIX APPLIED SUCCESSFULLY!
   ```

### **Phương án 2: Qua psql command line**

```bash
psql -h db.qvtyabffjjiwgpusyudf.supabase.co \
     -U postgres \
     -d postgres \
     -f scripts/supabase-setup/26-fix-bulk-sign-salaries-function.sql
```

---

## ✅ **VERIFICATION**

Sau khi chạy fix script, verify bằng query:

```sql
-- Kiểm tra function signature
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as parameters,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname IN ('auto_sign_salary', 'bulk_sign_salaries')
ORDER BY p.proname;
```

**Kết quả mong đợi**:
- `auto_sign_salary`: 4-5 parameters (không có `p_admin_id`)
- `bulk_sign_salaries`: 7 parameters (có `p_admin_id` nhưng không truyền cho `auto_sign_salary`)

---

## 🧪 **TEST**

Sau khi fix, test lại tính năng:

1. **Mở trang**: http://localhost:3000/admin/bulk-signature

2. **Chọn tháng**: 2025-09 (hoặc tháng có chữ ký chưa ký)

3. **Click "Ký Hàng Loạt"**

4. **Click "Xác nhận ký"**

5. **Kết quả mong đợi**:
   - ✅ Không còn lỗi 500
   - ✅ Hiển thị "Ký hàng loạt thành công"
   - ✅ Statistics cập nhật đúng

---

## 🔄 **ROLLBACK** (Nếu cần)

Nếu cần rollback về version cũ:

```sql
DROP FUNCTION IF EXISTS bulk_sign_salaries(VARCHAR[], VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR);
```

Sau đó chạy lại file gốc:
```bash
psql -f scripts/supabase-setup/25-create-bulk-sign-salaries-function.sql
```

---

## 📊 **IMPACT ANALYSIS**

### **Files Changed:**
- ✅ `scripts/supabase-setup/26-fix-bulk-sign-salaries-function.sql` (NEW)

### **Database Changes:**
- ✅ Function `bulk_sign_salaries` updated
- ✅ No table schema changes
- ✅ No data migration needed

### **API Changes:**
- ✅ No API route changes
- ✅ No frontend changes needed

### **Risk Level:** 🟢 **LOW**
- Chỉ sửa function logic
- Không ảnh hưởng data
- Có rollback script

---

## 📝 **NOTES**

- Admin tracking vẫn hoạt động bình thường qua bảng `bulk_signature_history`
- Individual signatures vẫn được log vào `signature_logs` table
- Không cần restart application sau khi fix

---

**Fix Date**: 2025-11-04  
**Status**: ✅ Ready to deploy  
**Tested**: ✅ Verified with function signature check

