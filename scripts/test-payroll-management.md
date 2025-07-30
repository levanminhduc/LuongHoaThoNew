# 🧪 **PAYROLL MANAGEMENT TESTING GUIDE**

## 📋 **TESTING CHECKLIST**

### **Phase 1: Database Setup**
```sql
-- 1. Run audit table creation
-- File: scripts/supabase-setup/14-create-payroll-audit-table.sql
-- Verify: Table created with proper indexes and RLS policies
```

### **Phase 2: API Endpoints Testing**

#### **2.1 Employee Search API**
```bash
# Test search endpoint
curl -X GET "http://localhost:3000/api/admin/payroll/search?q=NV001" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Expected: List of payroll records for employee
```

#### **2.2 Payroll CRUD API**
```bash
# Get payroll details
curl -X GET "http://localhost:3000/api/admin/payroll/1" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Update payroll
curl -X PUT "http://localhost:3000/api/admin/payroll/1" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "updates": {
      "tien_luong_thuc_nhan_cuoi_ky": 5000000
    },
    "changeReason": "Điều chỉnh lương theo quyết định"
  }'
```

#### **2.3 Audit Trail API**
```bash
# Get audit trail
curl -X GET "http://localhost:3000/api/admin/payroll/audit/1" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Expected: List of all changes for payroll record
```

### **Phase 3: UI Components Testing**

#### **3.1 Employee Search Component**
- [ ] Search by employee ID works
- [ ] Search by employee name works
- [ ] Month filter works correctly
- [ ] Results display properly
- [ ] Selection works

#### **3.2 Payroll Edit Form**
- [ ] Form loads with correct data
- [ ] All 39 fields are editable
- [ ] Validation works for required fields
- [ ] Calculation summary updates
- [ ] Change reason is required
- [ ] Save functionality works

#### **3.3 Audit Trail Component**
- [ ] Displays change history
- [ ] Groups changes by timestamp
- [ ] Shows field names in Vietnamese
- [ ] Formats values correctly
- [ ] Shows admin who made changes

#### **3.4 Month Selector Component**
- [ ] Loads available months
- [ ] Displays months in Vietnamese format
- [ ] Selection updates parent component
- [ ] Handles empty state

### **Phase 4: Dashboard Integration Testing**

#### **4.1 New Button**
- [ ] "Quản Lý Lương Chi Tiết" button appears
- [ ] Button navigates to correct page
- [ ] Styling matches existing buttons

#### **4.2 Month Filter**
- [ ] Month selector appears in Data Overview
- [ ] Default state shows instruction message
- [ ] Selecting month filters data correctly
- [ ] No data message shows when appropriate
- [ ] Filtered table displays correct records

### **Phase 5: End-to-End Testing**

#### **5.1 Complete Workflow**
1. [ ] Login as admin
2. [ ] Navigate to Dashboard
3. [ ] Go to Data Overview tab
4. [ ] Select a month to view data
5. [ ] Click "Quản Lý Lương Chi Tiết"
6. [ ] Search for an employee
7. [ ] Select a payroll record
8. [ ] Edit some fields
9. [ ] Provide change reason
10. [ ] Save changes
11. [ ] Verify audit trail shows changes
12. [ ] Go back to dashboard
13. [ ] Verify data is updated

#### **5.2 Error Handling**
- [ ] Invalid employee search
- [ ] Network errors
- [ ] Authentication failures
- [ ] Validation errors
- [ ] Missing change reason

#### **5.3 Security Testing**
- [ ] Unauthenticated access blocked
- [ ] Invalid tokens rejected
- [ ] SQL injection protection
- [ ] XSS protection
- [ ] CSRF protection

### **Phase 6: Performance Testing**

#### **6.1 Load Testing**
- [ ] Search with large datasets
- [ ] Form with all 39 fields
- [ ] Audit trail with many changes
- [ ] Month filter with large data

#### **6.2 Mobile Responsiveness**
- [ ] All components work on mobile
- [ ] Forms are usable on small screens
- [ ] Tables scroll horizontally
- [ ] Buttons are touch-friendly

## 🚨 **ROLLBACK PROCEDURES**

### **If Issues Found:**

#### **Database Rollback:**
```sql
-- Remove audit table
DROP TABLE IF EXISTS payroll_audit_logs;

-- Remove helper functions
DROP FUNCTION IF EXISTS get_payroll_audit_trail;
DROP FUNCTION IF EXISTS log_payroll_change;
```

#### **API Rollback:**
```bash
# Remove API files
rm -rf app/api/admin/payroll/
```

#### **Component Rollback:**
```bash
# Remove component files
rm -rf app/admin/payroll-management/
```

#### **Dashboard Rollback:**
```bash
# Revert admin-dashboard.tsx changes
git checkout HEAD~1 app/admin/dashboard/admin-dashboard.tsx
```

## ✅ **SUCCESS CRITERIA**

### **Must Pass:**
- [ ] All API endpoints return correct responses
- [ ] All UI components render without errors
- [ ] Employee search and selection works
- [ ] Payroll editing and saving works
- [ ] Audit trail records all changes
- [ ] Dashboard integration works seamlessly
- [ ] Month filtering works correctly
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Mobile responsive

### **Performance Targets:**
- [ ] Search results < 2 seconds
- [ ] Form loading < 1 second
- [ ] Save operation < 3 seconds
- [ ] Audit trail loading < 2 seconds

### **Security Requirements:**
- [ ] All endpoints require authentication
- [ ] All changes are logged
- [ ] Input validation prevents injection
- [ ] Error messages don't leak sensitive info

## 📝 **TESTING NOTES**

### **Test Data Requirements:**
- At least 10 employees with payroll data
- Multiple months of data
- Some records with existing audit trails
- Mix of signed and unsigned records

### **Browser Testing:**
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers

### **Environment Testing:**
- Development environment
- Staging environment (if available)
- Production environment (careful!)

## 🎯 **NEXT STEPS AFTER TESTING**

1. **If all tests pass:**
   - Document the new features
   - Train admin users
   - Monitor for issues

2. **If tests fail:**
   - Fix identified issues
   - Re-run failed tests
   - Update documentation

3. **Future enhancements:**
   - Bulk edit capabilities
   - Advanced filtering
   - Export audit reports
   - Email notifications for changes
