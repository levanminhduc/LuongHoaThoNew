# 📊 **HỆ THỐNG IMPORT/EXPORT LƯƠNG NHÂN VIÊN**

## 📋 **OVERVIEW**

Hệ thống import/export lương nhân viên hoàn chỉnh cho MAY HÒA THỌ ĐIỆN BÀN với các tính năng:
- **Smart Template Export**: Chỉ export các cột có dữ liệu
- **Overwrite Import**: Logic ghi đè hoàn toàn dựa trên composite key
- **Employee Validation**: Kiểm tra mã nhân viên tồn tại
- **User-friendly Interface**: Giao diện trực quan với progress tracking

## 🏗️ **ARCHITECTURE**

### **Database Schema:**
```sql
-- Composite Key: employee_id + salary_month (UNIQUE)
-- Foreign Key: employee_id → employees.employee_id
-- 39 cột dữ liệu lương + metadata
```

### **API Endpoints:**
- `GET /api/admin/payroll-export-template` - Export template/data
- `POST /api/admin/payroll-import` - Import Excel file
- `GET /admin/payroll-import-export` - UI page

### **Key Components:**
- **PayrollImportExportPage** - Main UI component
- **Column Analysis Function** - Smart template generation
- **Validation System** - Business logic validation

## 🔧 **TECHNICAL IMPLEMENTATION**

### **1. Smart Template Export**

#### **Column Analysis Logic:**
```sql
-- Supabase function: analyze_payroll_columns()
-- Checks which columns have non-null, non-zero values
-- Only includes active columns in template
```

#### **Export Features:**
- **Template Mode**: Empty template với 2 rows sample data
- **Data Mode**: Export dữ liệu hiện có (all hoặc theo tháng)
- **Vietnamese Headers**: User-friendly column names
- **Auto Column Detection**: Chỉ export cột có dữ liệu

### **2. Overwrite Import Logic**

#### **Business Rules:**
```typescript
// Composite Key Check
const existingRecord = await supabase
  .from("payrolls")
  .select("id")
  .eq("employee_id", recordData.employee_id)
  .eq("salary_month", recordData.salary_month)
  .single()

if (existingRecord) {
  // OVERWRITE: Thay thế hoàn toàn record cũ
  await supabase.from("payrolls").update(recordData)
} else {
  // INSERT: Tạo record mới
  await supabase.from("payrolls").insert(recordData)
}
```

#### **Validation Rules:**
1. **Employee Validation**: Mã NV phải tồn tại trong bảng employees
2. **Format Validation**: salary_month phải format YYYY-MM
3. **Data Type Validation**: Numeric fields được convert tự động
4. **Required Fields**: employee_id và salary_month bắt buộc

### **3. Error Handling System**

#### **Error Categories:**
- **validation**: Lỗi format, required fields
- **employee_not_found**: Mã NV không tồn tại
- **duplicate**: Conflict trong composite key
- **database**: Lỗi database operations
- **format**: Lỗi parse Excel file

#### **Error Response Format:**
```typescript
interface ImportResult {
  success: boolean
  totalRecords: number
  successCount: number
  errorCount: number
  overwriteCount: number
  errors: ImportError[]
  processingTime: string
}
```

## 📊 **FIELD MAPPING**

### **Vietnamese Headers → Database Fields:**
```typescript
const HEADER_TO_FIELD = {
  "Mã Nhân Viên": "employee_id",
  "Tháng Lương": "salary_month",
  "Hệ Số Làm Việc": "he_so_lam_viec",
  "Tiền Lương Thực Nhận Cuối Kỳ": "tien_luong_thuc_nhan_cuoi_ky",
  // ... 39 fields total
}
```

### **Required vs Optional Fields:**
- **Required**: employee_id, salary_month
- **Optional**: Tất cả 39 cột lương (DEFAULT 0)
- **Auto-generated**: source_file, import_batch_id, timestamps

## 🎯 **USER WORKFLOW**

### **Export Workflow:**
1. **Chọn Export Type**: Template hoặc Data
2. **Chọn Tháng** (nếu export data): Optional filter
3. **Download File**: Excel file với smart columns
4. **Edit Data**: Sử dụng template để nhập liệu

### **Import Workflow:**
1. **Upload File**: Chọn Excel file (.xlsx/.xls)
2. **Auto Validation**: System validate format và data
3. **Processing**: Import với overwrite logic
4. **Results Display**: Summary + detailed errors
5. **Error Resolution**: Fix errors và re-import

## 🔍 **BUSINESS LOGIC**

### **Overwrite Strategy:**
```
IF (employee_id + salary_month) EXISTS:
  → OVERWRITE hoàn toàn record cũ
ELSE:
  → INSERT record mới
```

### **Data Integrity:**
- **Foreign Key**: employee_id phải tồn tại
- **Unique Constraint**: (employee_id, salary_month) unique
- **Data Types**: Auto-convert numeric fields
- **Defaults**: NULL/empty → 0 cho numeric fields

### **Performance Optimization:**
- **Batch Processing**: Process multiple rows efficiently
- **Memory Management**: Stream large files
- **Progress Tracking**: Real-time progress updates
- **Error Limiting**: Limit error display for performance

## 🧪 **TESTING SCENARIOS**

### **Template Export Testing:**
1. **Empty Database**: Should export minimal columns
2. **Partial Data**: Should export only active columns
3. **Full Data**: Should export all 39 columns
4. **Month Filter**: Should filter by salary_month

### **Import Testing:**
1. **Valid Data**: Should import successfully
2. **Duplicate Records**: Should overwrite existing
3. **Invalid Employee**: Should reject with error
4. **Format Errors**: Should validate and report
5. **Large Files**: Should handle 5000+ rows

### **Error Handling Testing:**
1. **Missing Headers**: Should reject file
2. **Invalid Format**: Should provide clear errors
3. **Database Errors**: Should handle gracefully
4. **Network Issues**: Should retry/recover

## 📈 **PERFORMANCE METRICS**

### **Expected Performance:**
- **Template Export**: < 5 seconds
- **Data Export (1000 records)**: < 10 seconds
- **Import (1000 records)**: < 30 seconds
- **Import (5000 records)**: < 2 minutes

### **Memory Usage:**
- **Template Generation**: < 50MB
- **File Processing**: < 200MB for 5000 rows
- **Error Handling**: Limit to 50 errors in response

## 🔒 **SECURITY CONSIDERATIONS**

### **Authentication:**
- **JWT Token**: Required for all operations
- **Admin Only**: Chỉ admin có quyền import/export
- **Session Validation**: Token expiry handling

### **Data Protection:**
- **File Validation**: Strict file type checking
- **SQL Injection**: Parameterized queries
- **Data Sanitization**: Clean input data
- **Error Information**: Không expose sensitive data

## 🚀 **DEPLOYMENT NOTES**

### **Database Setup:**
1. Run `13-payroll-column-analysis.sql`
2. Verify payrolls table structure
3. Test column analysis function

### **File Permissions:**
- **Upload Directory**: Writable permissions
- **Temp Files**: Auto cleanup
- **File Size Limits**: Configure server limits

### **Monitoring:**
- **Error Logs**: Monitor import failures
- **Performance**: Track processing times
- **Usage**: Monitor file sizes và frequency

## 📋 **MAINTENANCE**

### **Regular Tasks:**
- **Column Analysis**: Update as data grows
- **Error Log Review**: Weekly error analysis
- **Performance Monitoring**: Monthly performance review
- **Template Updates**: Update headers if schema changes

### **Troubleshooting:**
- **Import Failures**: Check employee data first
- **Template Issues**: Verify column analysis function
- **Performance Issues**: Check file sizes và server resources
- **UI Issues**: Verify authentication và network connectivity

**System Status**: ✅ Production Ready
**Last Updated**: 2024-01-XX
**Version**: 1.0.0
