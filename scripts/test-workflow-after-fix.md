# 🧪 **TEST WORKFLOW AFTER FOREIGN KEY FIX**

## 📋 **PRE-TEST CHECKLIST**

### ✅ **Đã hoàn thành:**
1. **✅ Database Analysis:** Phân tích foreign key constraints
2. **✅ Employee Data Verification:** Kiểm tra dữ liệu employees
3. **✅ API Debug Logging:** Thêm logging vào API và frontend
4. **✅ Foreign Key Fix:** Tạo admin employee và fix constraints

### 🔄 **Cần test:**
5. **🔄 Complete Workflow Testing:** Test từ đầu đến cuối

---

## 🚀 **STEP-BY-STEP TESTING GUIDE**

### **STEP 1: Chạy Database Fix Script**
```sql
-- Copy và paste vào Supabase SQL Editor:
-- Nội dung từ file: scripts/fix-foreign-key-final.sql
```

**Expected Results:**
```
✅ Admin user created: employee_id = 'admin'
✅ Foreign key constraints modified
✅ Test insert successful
```

### **STEP 2: Verify Database State**
```sql
-- Kiểm tra admin user đã được tạo
SELECT employee_id, full_name, chuc_vu FROM employees WHERE employee_id = 'admin';

-- Kiểm tra employees eligible cho permissions
SELECT employee_id, full_name, department, chuc_vu 
FROM employees 
WHERE chuc_vu IN ('truong_phong', 'to_truong') AND is_active = true;

-- Kiểm tra departments available
SELECT DISTINCT department FROM employees WHERE department IS NOT NULL;
```

### **STEP 3: Test Frontend Employee Loading**
1. **Truy cập:** `http://localhost:3001/admin/department-management/assign-permissions`
2. **Mở Developer Console** (F12)
3. **Kiểm tra logs:** Sẽ thấy API call đến `/api/admin/employees`
4. **Verify dropdown:** Employee dropdown sẽ hiển thị employees thực từ database

**Expected Console Logs:**
```
=== DEBUG FRONTEND REQUEST ===
Request data: {employee_id: "ADMIN001", department: "Phòng Sản Xuất", notes: "..."}
Token: eyJhbGciOiJIUzI1NiIsInR5...
```

### **STEP 4: Test Permission Assignment**
1. **Chọn employee:** Từ dropdown (ví dụ: ADMIN001)
2. **Chọn departments:** Check một hoặc nhiều departments
3. **Thêm notes:** (optional) "Test permission assignment"
4. **Click "Cấp Quyền"**

**Expected Console Logs (Backend):**
```
=== DEBUG DEPARTMENT PERMISSION REQUEST ===
Request data: {employee_id: "ADMIN001", department: "Phòng Sản Xuất", notes: "..."}
Auth user: {employee_id: "admin", role: "admin", ...}
Auth user employee_id: admin

=== DEBUG INSERT VALUES ===
employee_id: ADMIN001
department: Phòng Sản Xuất
granted_by: admin
notes: Test permission assignment
```

**Expected Frontend Results:**
```
✅ Kết quả cấp quyền:
Phòng Sản Xuất: Thành công
Phòng Kế Toán: Thành công
```

### **STEP 5: Verify Database Records**
```sql
-- Kiểm tra permissions đã được tạo
SELECT 
    dp.id,
    dp.employee_id,
    dp.department,
    dp.granted_by,
    dp.is_active,
    dp.notes,
    e.full_name as employee_name
FROM department_permissions dp
JOIN employees e ON dp.employee_id = e.employee_id
WHERE dp.is_active = true
ORDER BY dp.id DESC;
```

**Expected Results:**
```
id | employee_id | department      | granted_by | is_active | employee_name
1  | ADMIN001    | Phòng Sản Xuất  | admin      | true      | Hoàng Văn Admin
2  | ADMIN001    | Phòng Kế Toán   | admin      | true      | Hoàng Văn Admin
```

### **STEP 6: Test Permissions Management Page**
1. **Truy cập:** `/admin/department-management/permissions`
2. **Verify:** Hiển thị permissions vừa tạo
3. **Test filters:** Search, department filter
4. **Test revoke:** Click revoke button

### **STEP 7: Test Role-based Dashboard Access**
1. **Logout admin**
2. **Login với employee có permissions:** (ví dụ: ADMIN001/password)
3. **Verify redirect:** Đến manager dashboard
4. **Check data access:** Dashboard hiển thị data từ assigned departments

---

## 🔍 **TROUBLESHOOTING GUIDE**

### **Issue 1: Vẫn có lỗi foreign key**
```
Nguyên nhân: Admin employee chưa được tạo
Giải pháp:
1. Kiểm tra: SELECT * FROM employees WHERE employee_id = 'admin';
2. Nếu không có, chạy lại: INSERT INTO employees...
3. Hoặc drop foreign key constraints hoàn toàn
```

### **Issue 2: Employee dropdown trống**
```
Nguyên nhân: API /api/admin/employees không hoạt động
Giải pháp:
1. Kiểm tra console logs
2. Verify API endpoint exists
3. Check authentication token
```

### **Issue 3: "Chỉ có thể cấp quyền cho nhân viên có chức vụ..."**
```
Nguyên nhân: Employee không có chức vụ phù hợp
Giải pháp:
1. Kiểm tra: SELECT chuc_vu FROM employees WHERE employee_id = 'XXX';
2. Update chức vụ: UPDATE employees SET chuc_vu = 'truong_phong' WHERE...
```

### **Issue 4: Permissions không hiển thị trong dashboard**
```
Nguyên nhân: JWT token không chứa allowed_departments
Giải pháp:
1. Logout và login lại
2. Kiểm tra auth.ts có load permissions từ database
3. Verify API /api/payroll/my-departments
```

---

## 🎯 **SUCCESS CRITERIA**

### **✅ Database Level:**
- Admin employee record exists
- Foreign key constraints working
- Permissions records created successfully

### **✅ API Level:**
- No more foreign key constraint errors
- Detailed error messages when issues occur
- Proper logging for debugging

### **✅ Frontend Level:**
- Employee dropdown loads real data
- Form submission successful
- Success/error messages clear

### **✅ End-to-End:**
- Complete permission assignment workflow
- Role-based dashboard access working
- Data filtering by assigned departments

---

## 📊 **EXPECTED FINAL RESULTS**

### **Successful Permission Assignment:**
```
Kết quả cấp quyền:
Phòng Sản Xuất: Thành công
Phòng Kế Toán: Thành công
Phòng QC: Thành công
Phòng Hành Chính: Thành công
```

### **Database State:**
```sql
-- Should have records like:
SELECT COUNT(*) FROM department_permissions WHERE is_active = true;
-- Result: 4 (or number of departments assigned)

SELECT COUNT(*) FROM employees WHERE employee_id = 'admin';
-- Result: 1
```

### **Role-based Access:**
```
Manager Login → Dashboard shows multi-department data
Supervisor Login → Dashboard shows single department data
Employee Login → Dashboard shows personal data only
```

---

**🎉 Sau khi hoàn thành tất cả steps này, hệ thống phân quyền department sẽ hoạt động hoàn toàn bình thường!**

**📞 Hãy báo cáo kết quả test để tôi có thể hỗ trợ thêm nếu cần.**
