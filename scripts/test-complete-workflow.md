# 🧪 **COMPLETE WORKFLOW TEST GUIDE**
## **Hướng dẫn test toàn bộ hệ thống phân quyền MAY HÒA THỌ ĐIỆN BÀN**

---

## 📋 **CHECKLIST HOÀN THÀNH**

### ✅ **Đã hoàn thành:**
1. **✅ API Department Permissions** - Tất cả endpoints hoạt động
2. **✅ Admin Dashboard Navigation** - Thêm button "Quản Lý Phân Quyền"
3. **✅ Department Management Main Page** - `/admin/department-management`
4. **✅ Permissions Management Page** - `/admin/department-management/permissions`
5. **✅ Assign Permissions Form** - `/admin/department-management/assign-permissions`

### 🔄 **Cần test:**
6. **🔄 Complete Workflow Testing** - Test từ đầu đến cuối

---

## 🚀 **WORKFLOW TEST STEPS**

### **STEP 1: Kiểm tra Admin Access**
```
1. Truy cập: http://localhost:3001/admin/login
2. Login: admin / admin123
3. Verify redirect đến: /admin/dashboard
4. Kiểm tra button "Quản Lý Phân Quyền" có hiển thị
```

### **STEP 2: Test Department Management Main Page**
```
1. Click "Quản Lý Phân Quyền" từ admin dashboard
2. Verify redirect đến: /admin/department-management
3. Kiểm tra:
   ✅ Hiển thị overview stats (departments, employees, permissions)
   ✅ Hiển thị danh sách departments với thông tin
   ✅ Buttons "Cấp Quyền Mới" và "Xem Tất Cả Quyền"
```

### **STEP 3: Test Assign Permissions**
```
1. Click "Cấp Quyền Mới"
2. Verify redirect đến: /admin/department-management/assign-permissions
3. Test form:
   ✅ Dropdown nhân viên hiển thị managers/supervisors
   ✅ Checkbox departments hiển thị đúng
   ✅ Form validation hoạt động
   ✅ Submit thành công tạo permissions
```

### **STEP 4: Test Permissions Management**
```
1. Truy cập: /admin/department-management/permissions
2. Kiểm tra:
   ✅ Hiển thị danh sách permissions
   ✅ Filters hoạt động (search, status, department)
   ✅ Summary stats đúng
   ✅ Revoke permissions hoạt động
```

### **STEP 5: Test Role-based Login**
```
1. Logout khỏi admin
2. Test login với các roles:
   
   Manager (TP001):
   - Username: TP001
   - Password: truongphong123
   - Expected: Redirect to /manager/dashboard
   - Verify: Hiển thị data từ assigned departments
   
   Supervisor (TT001):
   - Username: TT001  
   - Password: totruong123
   - Expected: Redirect to /supervisor/dashboard
   - Verify: Hiển thị data từ own department only
   
   Employee (NV001):
   - Username: NV001
   - Password: nhanvien123
   - Expected: Redirect to /employee/dashboard
   - Verify: Hiển thị personal data only
```

### **STEP 6: Verify Data Access Control**
```
Manager Dashboard:
✅ Hiển thị departments được assigned
✅ Có thể filter theo department
✅ Hiển thị employee lists và payroll data
✅ Export functions hoạt động

Supervisor Dashboard:
✅ Chỉ hiển thị own department
✅ Hiển thị team members
✅ Monthly trends và statistics

Employee Dashboard:
✅ Chỉ hiển thị personal data
✅ Payroll history và yearly summary
✅ Payslip download
```

---

## 🔧 **TROUBLESHOOTING GUIDE**

### **Issue 1: Departments không hiển thị data**
```
Nguyên nhân: Database thiếu sample data
Giải pháp:
1. Kiểm tra departments thực tế: SELECT DISTINCT department FROM employees;
2. Cập nhật test accounts trong lib/auth.ts với departments thật
3. Tạo department permissions cho test accounts
```

### **Issue 2: APIs trả về 403/401**
```
Nguyên nhân: Token hoặc role không đúng
Giải pháp:
1. Kiểm tra localStorage có admin_token và user_info
2. Verify JWT token chứa đúng role
3. Check API middleware authorization
```

### **Issue 3: Role-based redirect không hoạt động**
```
Nguyên nhân: Login form không redirect đúng theo role
Giải pháp:
1. Kiểm tra admin-login-form.tsx đã update chưa
2. Verify API response chứa user.role
3. Check switch statement trong login success handler
```

### **Issue 4: Dashboard hiển thị "No data"**
```
Nguyên nhân: Department permissions chưa được setup
Giải pháp:
1. Sử dụng admin UI để assign permissions
2. Hoặc manual insert vào department_permissions table
3. Verify allowed_departments trong JWT token
```

---

## 📊 **EXPECTED RESULTS**

### **Admin UI:**
- ✅ Complete department management interface
- ✅ Assign/revoke permissions functionality
- ✅ Real-time stats và monitoring

### **Manager Experience:**
- ✅ Multi-department access
- ✅ Comprehensive dashboard với charts
- ✅ Employee management tools

### **Supervisor Experience:**
- ✅ Single department focus
- ✅ Team overview và trends
- ✅ Payroll monitoring

### **Employee Experience:**
- ✅ Personal data access only
- ✅ Salary history và trends
- ✅ Payslip download

---

## 🎯 **SUCCESS CRITERIA**

### **Functional Requirements:**
- ✅ Admin có thể assign/revoke department permissions
- ✅ Managers chỉ thấy data từ assigned departments
- ✅ Supervisors chỉ thấy data từ own department
- ✅ Employees chỉ thấy personal data
- ✅ Role-based routing hoạt động đúng

### **Security Requirements:**
- ✅ API endpoints protected by role
- ✅ Database RLS policies enforce access control
- ✅ JWT tokens chứa đúng permission info
- ✅ UI elements hiển thị theo permissions

### **User Experience:**
- ✅ Intuitive admin interface
- ✅ Clear navigation và workflows
- ✅ Responsive design
- ✅ Error handling và feedback

---

## 🚀 **NEXT STEPS AFTER TESTING**

1. **Production Deployment:**
   - Run database migrations
   - Setup real employee data
   - Configure production environment

2. **User Training:**
   - Train admins on permission management
   - Guide managers/supervisors on new dashboards
   - Document workflows

3. **Monitoring:**
   - Setup audit logging monitoring
   - Performance monitoring
   - Security event tracking

---

**🎉 Hệ thống phân quyền MAY HÒA THỌ ĐIỆN BÀN đã sẵn sàng để test và deploy!**
