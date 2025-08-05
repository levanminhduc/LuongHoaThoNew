# 🧪 **EMPLOYEE LIST MODAL - TESTING GUIDE**

## 📋 **OVERVIEW**

Hướng dẫn testing tính năng xem danh sách nhân viên cho 3 chức danh: Giám Đốc, Kế Toán, Người Lập Biểu.

---

## 🔑 **TEST ACCOUNTS**

### **1. Giám Đốc (giam_doc)**
- **Username**: `GD001`
- **Password**: `giamdoc123`
- **Dashboard**: `/director/dashboard`
- **Permissions**: Xem toàn bộ nhân viên tất cả phòng ban

### **2. Kế Toán (ke_toan)**
- **Username**: `KT001`
- **Password**: `ketoan123`
- **Dashboard**: `/accountant/dashboard`
- **Permissions**: Xem toàn bộ nhân viên tất cả phòng ban

### **3. Người Lập Biểu (nguoi_lap_bieu)**
- **Username**: `NLB001`
- **Password**: `nguoilapbieu123`
- **Dashboard**: `/reporter/dashboard`
- **Permissions**: Xem toàn bộ nhân viên tất cả phòng ban

---

## 🧪 **TEST SCENARIOS**

### **SCENARIO 1: Basic Modal Functionality**

#### **Test Steps:**
1. **Login** với một trong 3 test accounts
2. **Navigate** đến dashboard tương ứng
3. **Locate** card "Tổng Nhân Viên" (hoặc "Tổng Dữ Liệu" cho Reporter)
4. **Click** vào card để mở modal
5. **Verify** modal hiển thị đúng

#### **Expected Results:**
- ✅ Modal mở thành công
- ✅ Hiển thị danh sách nhân viên
- ✅ Có pagination nếu > 50 nhân viên
- ✅ Hiển thị đúng tháng được chọn
- ✅ Loading state hoạt động

---

### **SCENARIO 2: Search Functionality**

#### **Test Steps:**
1. **Open** Employee List Modal
2. **Type** mã nhân viên (VD: "NV001") vào search box
3. **Wait** 500ms cho debouncing
4. **Verify** kết quả tìm kiếm
5. **Clear** search và test với tên nhân viên

#### **Expected Results:**
- ✅ Search theo mã NV hoạt động
- ✅ Search theo tên nhân viên hoạt động
- ✅ Debouncing 500ms hoạt động
- ✅ Kết quả hiển thị chính xác
- ✅ Clear search reset về danh sách đầy đủ

---

### **SCENARIO 3: Department Filter**

#### **Test Steps:**
1. **Open** Employee List Modal
2. **Click** dropdown "Phòng ban"
3. **Select** một phòng ban cụ thể
4. **Verify** danh sách được filter
5. **Test** "Tất cả phòng ban" option

#### **Expected Results:**
- ✅ Dropdown hiển thị tất cả phòng ban
- ✅ Filter theo phòng ban hoạt động
- ✅ Số lượng nhân viên mỗi phòng ban hiển thị đúng
- ✅ "Tất cả phòng ban" reset filter

---

### **SCENARIO 4: Pagination**

#### **Test Steps:**
1. **Open** Employee List Modal với > 50 nhân viên
2. **Verify** pagination controls hiển thị
3. **Click** "Sau" để chuyển trang
4. **Click** "Trước" để quay lại
5. **Test** với search/filter + pagination

#### **Expected Results:**
- ✅ Pagination hiển thị khi cần thiết
- ✅ Navigation buttons hoạt động
- ✅ Page numbers chính xác
- ✅ Pagination reset khi search/filter

---

### **SCENARIO 5: Data Display & Formatting**

#### **Test Steps:**
1. **Open** Employee List Modal
2. **Verify** table headers và columns
3. **Check** data formatting (salary, status, badges)
4. **Test** responsive design trên mobile
5. **Verify** payroll data integration

#### **Expected Results:**
- ✅ Table headers hiển thị đúng
- ✅ Salary formatting (VND currency)
- ✅ Status badges (Đã ký/Chưa ký)
- ✅ Chức vụ badges với màu sắc phù hợp
- ✅ Responsive design hoạt động

---

### **SCENARIO 6: Caching Performance**

#### **Test Steps:**
1. **Open** Employee List Modal lần đầu
2. **Note** loading time
3. **Close** modal và mở lại
4. **Verify** cache hoạt động (load nhanh hơn)
5. **Wait** 60 phút và test cache expiry

#### **Expected Results:**
- ✅ Lần đầu: API call + loading
- ✅ Lần 2: Load từ cache (nhanh)
- ✅ Cache 60 phút hoạt động
- ✅ Cache expiry sau 60 phút

---

### **SCENARIO 7: Role-based Access Control**

#### **Test Steps:**
1. **Test** với cả 3 roles (GD001, KT001, NLB001)
2. **Verify** tất cả đều xem được toàn bộ nhân viên
3. **Test** với roles khác (TP001, TT001) - should not have access
4. **Verify** API returns 403 cho unauthorized roles

#### **Expected Results:**
- ✅ 3 roles mới: Full access
- ✅ Truong_phong: Chỉ phòng được phân quyền
- ✅ To_truong: Chỉ phòng của mình
- ✅ API security hoạt động đúng

---

## 🐛 **COMMON ISSUES & TROUBLESHOOTING**

### **Issue 1: Modal không mở**
- **Check**: Console errors
- **Verify**: User authentication
- **Solution**: Refresh token hoặc re-login

### **Issue 2: Empty data**
- **Check**: API response trong Network tab
- **Verify**: Database có dữ liệu nhân viên
- **Solution**: Run sample data scripts

### **Issue 3: Search không hoạt động**
- **Check**: Debouncing timing
- **Verify**: API endpoint `/api/employees/all-employees`
- **Solution**: Check search parameters

### **Issue 4: Cache issues**
- **Check**: Browser cache và localStorage
- **Verify**: Cache timestamps
- **Solution**: Clear cache hoặc hard refresh

---

## 📊 **PERFORMANCE BENCHMARKS**

### **Expected Performance:**
- **First Load**: < 2 seconds
- **Cached Load**: < 200ms
- **Search Response**: < 500ms
- **Pagination**: < 300ms

### **Data Limits:**
- **Max per page**: 50 employees
- **Cache duration**: 60 minutes
- **Search min length**: 2 characters
- **Debounce delay**: 500ms

---

## ✅ **TESTING CHECKLIST**

### **Functional Testing:**
- [ ] Modal opens/closes correctly
- [ ] Search functionality works
- [ ] Department filter works
- [ ] Pagination works
- [ ] Data displays correctly
- [ ] Responsive design works

### **Security Testing:**
- [ ] Role-based access control
- [ ] API authentication
- [ ] Unauthorized access blocked
- [ ] Data privacy maintained

### **Performance Testing:**
- [ ] Caching works (60 minutes)
- [ ] Loading times acceptable
- [ ] Debouncing prevents spam
- [ ] Memory usage reasonable

### **User Experience:**
- [ ] Intuitive navigation
- [ ] Clear visual feedback
- [ ] Error messages helpful
- [ ] Mobile-friendly interface

---

## 🚀 **DEPLOYMENT VERIFICATION**

### **Pre-deployment:**
1. Run all test scenarios
2. Verify performance benchmarks
3. Check security controls
4. Test on multiple devices

### **Post-deployment:**
1. Smoke test with production data
2. Monitor API performance
3. Check error logs
4. Verify user feedback

---

**📝 Note**: Tài liệu này sẽ được cập nhật khi có thay đổi về tính năng hoặc phát hiện issues mới.
