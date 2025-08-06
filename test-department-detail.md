# 🧪 **TEST PLAN CHO CHỨC NĂNG XEM CHI TIẾT DEPARTMENT**

## 📋 **OVERVIEW**

Test plan này đảm bảo chức năng "Xem Chi Tiết Department" hoạt động đúng và mượt mà trong Dashboard Trưởng Phòng.

---

## 🎯 **TEST SCENARIOS**

### **1. Functional Testing**

#### **1.1 Modal Opening & Closing**
- [ ] Click "Xem Chi Tiết" button mở modal đúng cách
- [ ] Modal hiển thị đúng department name và month
- [ ] Click X button hoặc outside modal để đóng
- [ ] ESC key đóng modal
- [ ] Modal state reset khi mở lại

#### **1.2 Data Loading**
- [ ] Loading skeleton hiển thị khi fetch data
- [ ] API call với đúng department name và month
- [ ] Error handling khi API fail
- [ ] Retry functionality khi có lỗi
- [ ] Empty state khi không có data

#### **1.3 Summary Cards**
- [ ] Hiển thị đúng 4 metrics: Tổng NV, Tỷ lệ ký, Tổng lương, Lương TB
- [ ] Format số liệu đúng (VND, %, K, M)
- [ ] Icons hiển thị đúng
- [ ] Responsive trên mobile

### **2. Employee List Tab Testing**

#### **2.1 Search Functionality**
- [ ] Search by employee ID
- [ ] Search by full name
- [ ] Case insensitive search
- [ ] Real-time search (no submit button)
- [ ] Clear search resets results

#### **2.2 Filter Functionality**
- [ ] Filter "Tất cả" shows all employees
- [ ] Filter "Đã ký" shows only signed
- [ ] Filter "Chưa ký" shows only unsigned
- [ ] Filter combines with search correctly

#### **2.3 Sort Functionality**
- [ ] Sort by name (A-Z, Z-A)
- [ ] Sort by employee ID
- [ ] Sort by salary (high-low, low-high)
- [ ] Sort by position
- [ ] Sort by status (signed first/last)
- [ ] Sort order toggle button works

#### **2.4 Pagination**
- [ ] Shows 10 items per page
- [ ] Pagination controls appear when > 10 items
- [ ] Previous/Next buttons work
- [ ] Page numbers clickable
- [ ] Current page highlighted
- [ ] Page resets when filters change

### **3. Analysis Tab Testing**

#### **3.1 Salary Distribution**
- [ ] Shows correct salary ranges
- [ ] Progress bars reflect actual data
- [ ] Numbers match employee count

#### **3.2 Monthly Trends**
- [ ] Shows last 6 months data
- [ ] Average salary calculated correctly
- [ ] Signed percentage accurate

### **4. Charts Tab Testing**

#### **4.1 Bar Chart**
- [ ] Salary distribution chart renders
- [ ] Correct data mapping
- [ ] Tooltips show proper values
- [ ] Responsive on different screen sizes

#### **4.2 Pie Chart**
- [ ] Signed/Unsigned ratio correct
- [ ] Colors distinct and accessible
- [ ] Tooltips functional

#### **4.3 Trend Chart**
- [ ] Monthly data displays correctly
- [ ] Multiple metrics on same chart
- [ ] Legend clear and helpful

### **5. Export Tab Testing**

#### **5.1 Export Functionality**
- [ ] Export button triggers download
- [ ] Loading state during export
- [ ] Error handling for failed exports
- [ ] File naming convention correct
- [ ] Excel file opens properly

#### **5.2 Quick Actions**
- [ ] "Xem nhân viên chưa ký" filters correctly
- [ ] "Sắp xếp theo lương cao nhất" sorts correctly
- [ ] "Xem nhân viên đã ký" filters correctly
- [ ] Actions switch to Employee tab

---

## 🔧 **PERFORMANCE TESTING**

### **6.1 Loading Performance**
- [ ] Modal opens within 500ms
- [ ] API response under 2 seconds
- [ ] Smooth scrolling in modal
- [ ] No lag when typing in search

### **6.2 Large Dataset Testing**
- [ ] Test with 100+ employees
- [ ] Pagination performance
- [ ] Search performance with large data
- [ ] Chart rendering with many data points

---

## 📱 **RESPONSIVE TESTING**

### **7.1 Mobile (320px - 768px)**
- [ ] Modal fits screen properly
- [ ] Tabs stack vertically if needed
- [ ] Search/filter controls stack
- [ ] Tables scroll horizontally
- [ ] Charts remain readable

### **7.2 Tablet (768px - 1024px)**
- [ ] Layout adapts properly
- [ ] All controls accessible
- [ ] Charts optimal size

### **7.3 Desktop (1024px+)**
- [ ] Full layout displays correctly
- [ ] All features accessible
- [ ] Optimal use of screen space

---

## 🛡️ **SECURITY TESTING**

### **8.1 Authorization**
- [ ] Only truong_phong can access
- [ ] Department access restricted to allowed_departments
- [ ] API returns 403 for unauthorized access

### **8.2 Data Validation**
- [ ] Department name properly encoded in URL
- [ ] Month parameter validated
- [ ] No sensitive data exposed in client

---

## 🐛 **ERROR HANDLING TESTING**

### **9.1 Network Errors**
- [ ] Offline state handled gracefully
- [ ] Timeout errors show proper message
- [ ] Retry mechanism works

### **9.2 Data Errors**
- [ ] Empty department handled
- [ ] Invalid month parameter
- [ ] Malformed API response

---

## ✅ **ACCEPTANCE CRITERIA**

### **Must Have:**
- [ ] All functional tests pass
- [ ] Performance under 2s load time
- [ ] Mobile responsive
- [ ] Error handling works
- [ ] Security checks pass

### **Nice to Have:**
- [ ] Smooth animations
- [ ] Advanced filtering options
- [ ] Export customization
- [ ] Keyboard navigation

---

## 🚀 **DEPLOYMENT CHECKLIST**

- [ ] All tests passed
- [ ] Code reviewed
- [ ] Performance optimized
- [ ] Documentation updated
- [ ] User training materials ready

---

**Test Status:** 🟡 In Progress
**Last Updated:** 2025-01-08
**Tester:** Augment Code AI Assistant
