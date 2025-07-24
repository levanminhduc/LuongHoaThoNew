# 🧪 **DUAL FILE IMPORT REFACTOR - TESTING STRATEGY**

## 📋 **OVERVIEW**
Testing strategy để verify việc refactor từ merge logic sang independent processing cho tính năng "Import Lương Từ Hai File Excel".

## 🎯 **TESTING OBJECTIVES**

### **1. Verify Independent Processing Logic**
- ✅ File 1 và File 2 được xử lý hoàn toàn độc lập
- ✅ Không có merge logic giữa hai file
- ✅ Mỗi file tạo ra separate payroll records trong database
- ✅ Employee IDs khác nhau giữa hai file được xử lý đúng

### **2. Database Operations Testing**
- ✅ File 1 records được insert với correct source tracking
- ✅ File 2 records được insert với correct source tracking
- ✅ Separate batch identifiers cho mỗi file
- ✅ No duplicate employee_id conflicts

### **3. Error Handling & Validation**
- ✅ File-level errors được track riêng biệt
- ✅ Row-level validation cho mỗi file độc lập
- ✅ Error reporting với correct file_type attribution
- ✅ Graceful handling khi chỉ có 1 file

### **4. UI/UX Verification**
- ✅ Results display reflects independent processing
- ✅ Statistics show separate file metrics
- ✅ Progress tracking works với new logic
- ✅ Error messages are clear và contextual

## 🧪 **TEST CASES**

### **Test Case 1: Two Independent Files**
**Setup:**
- File 1: 5 employees (NV001-NV005) với complete salary data
- File 2: 3 employees (NV006-NV008) với complete salary data
- No overlapping employee IDs

**Expected Results:**
- Total employees: 8
- File 1 success: 5
- File 2 success: 3
- Database: 8 separate payroll records
- No merge conflicts

### **Test Case 2: Single File Processing**
**Setup:**
- File 1 only: 4 employees
- File 2: null

**Expected Results:**
- Total employees: 4
- File 1 success: 4
- File 2 success: 0
- Database: 4 payroll records from File 1 only

### **Test Case 3: Error Handling**
**Setup:**
- File 1: 3 valid + 2 invalid records
- File 2: 2 valid + 1 invalid records

**Expected Results:**
- File 1 success: 3, errors: 2
- File 2 success: 2, errors: 1
- Total errors: 3 với correct file_type attribution
- Database: 5 valid records total

### **Test Case 4: Column Mapping Validation**
**Setup:**
- File 1: Different column mapping config
- File 2: Different column mapping config
- Test required field validation per file

**Expected Results:**
- Each file validated against its own mapping
- Independent validation errors
- Correct field mapping per configuration

## 🔧 **MANUAL TESTING STEPS**

### **Step 1: Prepare Test Data**
```bash
# Create test Excel files
- file1_salary_basic.xlsx (NV001-NV005)
- file2_salary_additional.xlsx (NV006-NV008)
- file1_with_errors.xlsx (mixed valid/invalid)
- file2_with_errors.xlsx (mixed valid/invalid)
```

### **Step 2: Test Independent Processing**
1. Navigate to Admin Dashboard → Import Nâng Cao
2. Upload File 1 only → Verify single file processing
3. Upload File 2 only → Verify single file processing
4. Upload both files → Verify independent processing
5. Check database records → Verify separate inserts

### **Step 3: Verify UI Updates**
1. Check statistics display → Should show File 1/File 2 metrics
2. Verify progress indicators → Should track each file separately
3. Check error reporting → Should attribute errors to correct file
4. Verify success rate calculation → Should be based on total processed

### **Step 4: Database Verification**
```sql
-- Check separate records
SELECT employee_id, source_file, import_batch_id 
FROM payrolls 
WHERE import_batch_id = 'DUAL_[session_id]'
ORDER BY employee_id;

-- Verify no duplicates
SELECT employee_id, COUNT(*) 
FROM payrolls 
WHERE import_batch_id = 'DUAL_[session_id]'
GROUP BY employee_id
HAVING COUNT(*) > 1;
```

## 📊 **SUCCESS CRITERIA**

### **✅ Functional Requirements**
- [ ] Two files processed independently
- [ ] No merge logic executed
- [ ] Separate database records created
- [ ] Correct source file tracking
- [ ] Independent error handling

### **✅ Performance Requirements**
- [ ] Processing time reasonable for large files
- [ ] Memory usage efficient (no merge overhead)
- [ ] Database operations optimized

### **✅ UI/UX Requirements**
- [ ] Clear independent processing feedback
- [ ] Accurate statistics display
- [ ] Intuitive error reporting
- [ ] Responsive progress tracking

## 🚨 **POTENTIAL ISSUES TO WATCH**

### **1. Data Integrity**
- Ensure no accidental data merging
- Verify correct employee_id handling
- Check source file attribution

### **2. Error Handling**
- File-level vs row-level error distinction
- Correct error attribution to file type
- Graceful handling of partial failures

### **3. Performance**
- Memory usage with large files
- Database insert performance
- UI responsiveness during processing

### **4. Backward Compatibility**
- Existing import sessions still readable
- Configuration compatibility
- API response format consistency

## 📝 **TEST EXECUTION CHECKLIST**

- [ ] Unit tests for DualFileImportParser
- [ ] Integration tests for API route
- [ ] UI component testing
- [ ] Database operation verification
- [ ] Error scenario testing
- [ ] Performance testing
- [ ] User acceptance testing

## 🎯 **ROLLBACK PLAN**

If issues are discovered:
1. Revert parser logic changes
2. Restore merge functionality
3. Update UI to previous state
4. Verify existing functionality
5. Document lessons learned
