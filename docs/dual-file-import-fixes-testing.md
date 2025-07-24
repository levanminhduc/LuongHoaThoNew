# 🧪 **DUAL FILE IMPORT FIXES - TESTING GUIDE**

## 📋 **OVERVIEW**

Hướng dẫn testing toàn diện cho các fixes đã implement trong tính năng Dual File Upload với Column Mapping.

## ✅ **FIXES IMPLEMENTED**

### **Critical Issues Fixed:**
1. ✅ **Consolidated API Routes** - Loại bỏ duplicate endpoints
2. ✅ **Configurable Duplicate Handling** - User có thể chọn strategy
3. ✅ **Standardized Error Responses** - Consistent error format

### **High Priority Improvements:**
1. ✅ **Transaction Support** - Data consistency với Supabase function
2. ✅ **Enhanced Validation** - Business logic và cross-field validation
3. ✅ **Improved Error Handling** - User-friendly messages và better recovery

## 🧪 **TESTING CHECKLIST**

### **1. API Consolidation Testing**

#### **Test 1.1: Verify Old Endpoint Removed**
```bash
# Should return 404
curl -X POST http://localhost:3000/api/admin/dual-file-import \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file1=@test-file.xlsx"
```
**Expected**: 404 Not Found

#### **Test 1.2: New Endpoint Works**
```bash
# Should work correctly
curl -X POST http://localhost:3000/api/admin/import-dual-files \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file1=@test-file.xlsx" \
  -F "file1Mappings=[{...}]"
```
**Expected**: Success response with standardized format

### **2. Duplicate Handling Testing**

#### **Test 2.1: Skip Strategy (Default)**
1. Upload file với duplicate employee_id + salary_month
2. Set duplicateStrategy = "skip"
3. **Expected**: Duplicates skipped, detailed error messages

#### **Test 2.2: Overwrite Strategy**
1. Upload file với duplicate data
2. Set duplicateStrategy = "overwrite"
3. **Expected**: Existing records updated

#### **Test 2.3: Merge Strategy**
1. Upload file với partial duplicate data
2. Set duplicateStrategy = "merge"
3. **Expected**: Data merged, new values take precedence

### **3. Error Response Standardization Testing**

#### **Test 3.1: Authentication Errors**
```javascript
// Test without token
fetch('/api/admin/import-dual-files', { method: 'POST' })
.then(res => res.json())
.then(data => {
  // Expected format:
  // {
  //   success: false,
  //   error: {
  //     code: "UNAUTHORIZED",
  //     message: "Bạn cần đăng nhập để thực hiện thao tác này",
  //     timestamp: "..."
  //   }
  // }
})
```

#### **Test 3.2: Validation Errors**
```javascript
// Test with invalid data
const formData = new FormData()
formData.append('file1', invalidFile)
formData.append('duplicateStrategy', 'skip')

fetch('/api/admin/import-dual-files', {
  method: 'POST',
  headers: { Authorization: 'Bearer TOKEN' },
  body: formData
})
.then(res => res.json())
.then(data => {
  // Expected: Standardized error format with detailed errors array
})
```

### **4. Transaction Support Testing**

#### **Test 4.1: Successful Transaction**
1. Upload 2 valid files
2. **Expected**: Both files processed in single transaction
3. **Verify**: All records have same session_id
4. **Verify**: Transaction result in response

#### **Test 4.2: Transaction Rollback**
1. Upload file1 (valid) + file2 (invalid data causing DB error)
2. **Expected**: Transaction rolls back, no partial data
3. **Verify**: No records inserted from either file

#### **Test 4.3: Partial Success Handling**
1. Upload files with some valid, some invalid records
2. **Expected**: Valid records inserted, invalid ones reported
3. **Verify**: Transaction completes with detailed error report

### **5. Enhanced Validation Testing**

#### **Test 5.1: Required Field Validation**
```javascript
// Test data missing required fields
const testData = {
  // employee_id missing
  salary_month: "2024-01",
  luong_co_ban: 5000000
}
```
**Expected**: Validation error for missing employee_id

#### **Test 5.2: Business Logic Validation**
```javascript
// Test invalid salary month format
const testData = {
  employee_id: "NV001",
  salary_month: "2024/01", // Wrong format
  luong_co_ban: 5000000
}
```
**Expected**: Validation error for salary_month format

#### **Test 5.3: Cross-Field Validation**
```javascript
// Test salary calculation inconsistency
const testData = {
  employee_id: "NV001",
  salary_month: "2024-01",
  luong_co_ban: 5000000,
  tong_luong_truoc_thue: 10000000, // Inconsistent
  tien_luong_thuc_nhan_cuoi_ky: 8000000
}
```
**Expected**: Warning about salary calculation mismatch

#### **Test 5.4: Auto-Fix Testing**
```javascript
// Test numeric auto-fix
const testData = {
  employee_id: "NV001",
  salary_month: "2024-01",
  luong_co_ban: "5,000,000" // String with commas
}
```
**Expected**: Auto-fix to 5000000, reported in autoFixes array

### **6. UI/UX Testing**

#### **Test 6.1: Duplicate Strategy Selector**
1. Navigate to Dual File Upload
2. **Verify**: Duplicate strategy dropdown visible
3. **Test**: All options (skip, overwrite, merge) selectable
4. **Verify**: Default is "skip"

#### **Test 6.2: Enhanced Error Display**
1. Upload file with errors
2. **Verify**: Detailed error cards displayed
3. **Verify**: Error categorization (validation, duplicate, etc.)
4. **Verify**: User-friendly error messages

#### **Test 6.3: Auto-Fix Display**
1. Upload file with auto-fixable issues
2. **Verify**: Auto-fixes displayed in separate card
3. **Verify**: Original vs fixed values shown
4. **Verify**: Confidence level displayed

#### **Test 6.4: Transaction Results Display**
1. Upload files successfully
2. **Verify**: Transaction details shown
3. **Verify**: File1/File2 insert counts displayed
4. **Verify**: Session ID displayed

## 🔧 **MANUAL TESTING SCENARIOS**

### **Scenario 1: Complete Workflow**
1. Open admin dashboard
2. Navigate to "Dual Import v2" tab
3. Configure File 1 mapping
4. Configure File 2 mapping (or skip)
5. Select duplicate strategy
6. Upload and process
7. **Verify**: All results displayed correctly

### **Scenario 2: Error Recovery**
1. Upload invalid file
2. **Verify**: Clear error messages
3. Fix file and re-upload
4. **Verify**: Success after fix

### **Scenario 3: Large File Handling**
1. Upload large Excel files (>1000 rows)
2. **Verify**: Progress indicators work
3. **Verify**: Memory usage reasonable
4. **Verify**: Transaction completes successfully

## 📊 **PERFORMANCE TESTING**

### **Test P.1: Memory Usage**
- Upload files with 5000+ rows
- Monitor memory consumption
- **Expected**: No memory leaks

### **Test P.2: Processing Time**
- Measure processing time for various file sizes
- **Expected**: Reasonable performance (< 30s for 1000 rows)

### **Test P.3: Database Performance**
- Monitor database connections
- Check transaction lock duration
- **Expected**: No long-running locks

## 🚨 **ROLLBACK TESTING**

### **Rollback Scenario 1: API Issues**
If API issues occur:
1. Revert to previous API endpoint
2. Update UI to use old endpoint
3. Test basic functionality

### **Rollback Scenario 2: Database Issues**
If transaction function issues:
1. Disable transaction function
2. Revert to individual inserts
3. Test data consistency

## ✅ **ACCEPTANCE CRITERIA**

### **Must Pass:**
- [ ] All API endpoints return standardized responses
- [ ] Duplicate handling works for all strategies
- [ ] Transaction ensures data consistency
- [ ] Validation catches all business rule violations
- [ ] UI displays errors clearly and helpfully
- [ ] No breaking changes to existing functionality

### **Performance Criteria:**
- [ ] Processing time < 30s for 1000 rows
- [ ] Memory usage < 500MB for large files
- [ ] No database deadlocks or long locks

### **User Experience Criteria:**
- [ ] Clear error messages in Vietnamese
- [ ] Intuitive duplicate strategy selection
- [ ] Comprehensive result display
- [ ] Easy error recovery workflow

## 🎯 **TESTING COMPLETION**

When all tests pass:
1. ✅ Mark testing task as complete
2. ✅ Document any remaining issues
3. ✅ Provide final rollback instructions
4. ✅ Confirm system ready for production use

**Testing Status**: 🔄 In Progress
**Last Updated**: 2024-01-XX
**Tested By**: Augment AI Assistant
