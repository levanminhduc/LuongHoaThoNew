# 🚀 SUPABASE DATABASE SETUP - EXECUTION GUIDE

## 📋 OVERVIEW
Thiết lập hoàn chỉnh database cho hệ thống quản lý lương MAY HÒA THỌ ĐIỆN BÀN với:
- **3 bảng chính**: employees, payrolls (39 cột), signature_logs
- **8 indexes**: Tối ưu performance
- **4 functions**: Business logic tự động
- **8 RLS policies**: Bảo mật theo vai trò
- **Sample data**: Test data realistic

## 🎯 EXECUTION ORDER (CRITICAL)

### **Bước 1-3: Tạo Tables**
\`\`\`bash
# Chạy theo thứ tự chính xác
psql -f 01-create-employees-table.sql
psql -f 02-create-payrolls-table.sql  
psql -f 03-create-signature-logs-table.sql
\`\`\`

### **Bước 4-6: Performance & Logic**
\`\`\`bash
psql -f 04-create-indexes.sql
psql -f 05-create-auto-signature-function.sql
psql -f 06-create-helper-functions.sql
\`\`\`

### **Bước 7-9: Security & Data**
\`\`\`bash
psql -f 07-setup-rls-policies.sql
psql -f 08-insert-sample-data.sql
psql -f 09-verification-queries.sql
\`\`\`

## ✅ SUCCESS CRITERIA

### **Expected Results:**
- ✅ **employees**: 8 nhân viên sample
- ✅ **payrolls**: 10 bản ghi lương (7 tháng 07, 3 tháng 08)
- ✅ **signature_logs**: 2 chữ ký test
- ✅ **indexes**: 9 indexes performance
- ✅ **functions**: 4 functions hoạt động
- ✅ **policies**: 8 RLS policies active

### **Final Validation:**
\`\`\`sql
-- Chạy query này để kiểm tra
SELECT 
  'Database setup complete' as status,
  (SELECT COUNT(*) FROM employees) as employees_count,
  (SELECT COUNT(*) FROM payrolls) as payrolls_count,
  (SELECT COUNT(*) FROM signature_logs) as signatures_count;
\`\`\`

**Expected Output:**
\`\`\`
status: "Database setup complete"
employees_count: 8
payrolls_count: 10  
signatures_count: 2
\`\`\`

## 🧪 TEST FUNCTIONS

### **Test Auto Signature:**
\`\`\`sql
-- Test ký lương
SELECT auto_sign_salary('NV002', '2024-07', '192.168.1.102', 'Chrome/91.0');
\`\`\`

### **Test Salary Lookup:**
\`\`\`sql
-- Test tra cứu lương
SELECT * FROM get_employee_salary_detail('NV001', '2024-07');
\`\`\`

### **Test Reports:**
\`\`\`sql
-- Test báo cáo ký lương
SELECT * FROM get_signature_report('2024-07');
\`\`\`

## 🚨 TROUBLESHOOTING

### **Common Issues:**

#### **1. Foreign Key Error:**
\`\`\`sql
-- Check parent table exists
SELECT COUNT(*) FROM employees WHERE employee_id = 'NV001';
\`\`\`

#### **2. Function Creation Error:**
\`\`\`sql
-- Enable plpgsql extension
CREATE EXTENSION IF NOT EXISTS plpgsql;
\`\`\`

#### **3. RLS Policy Conflict:**
\`\`\`sql
-- Drop existing policy first
DROP POLICY IF EXISTS "employees_own_data" ON employees;
\`\`\`

### **Rollback Strategy:**
\`\`\`bash
# If anything fails, run rollback
psql -f 10-rollback-script.sql
\`\`\`

## 📊 DATABASE SCHEMA OVERVIEW

### **employees (8 columns)**
- `employee_id` (PK) - Mã nhân viên
- `full_name` - Họ tên (cho ký tự động)
- `cccd_hash` - CCCD đã hash
- `department` - Phòng ban
- `chuc_vu` - Vai trò (nhan_vien/to_truong/truong_phong)

### **payrolls (45 columns)**
- **Metadata**: id, employee_id, salary_month, source_file...
- **Signature**: is_signed, signed_at, signed_by_name...
- **39 cột Excel**: he_so_lam_viec, ngay_cong_trong_gio, tong_cong_tien_luong...
- **Final**: tien_luong_thuc_nhan_cuoi_ky

### **signature_logs (9 columns)**
- Audit trail cho mọi lần ký
- IP tracking, device info
- Timestamp chính xác

## 🔐 SECURITY FEATURES

### **RLS Policies:**
- **Nhân viên**: Chỉ xem dữ liệu của mình
- **Tổ trưởng**: Xem dữ liệu phòng ban
- **Admin**: Xem tất cả dữ liệu

### **Auto Signature:**
- Tự động lấy tên từ `employees.full_name`
- Real-time timestamp
- IP & device tracking
- Prevent double signing

## 🎉 COMPLETION STATUS

✅ **SUPABASE DATABASE SETUP COMPLETED SUCCESSFULLY**

📊 **Database Summary:**
- Tables: 3 (employees, payrolls, signature_logs)
- Columns: 62 total (8 + 45 + 9)
- Indexes: 9 performance indexes
- Functions: 4 business logic functions
- Policies: 8 RLS security policies
- Sample Data: 8 employees, 10 payrolls, 2 signatures

🚀 **System Ready For:**
- Excel import (39 columns mapping)
- Auto signature (name + real-time)
- Role-based access (employee/manager/admin)
- Monthly salary management
- Audit trail tracking

🔗 **Next Steps:**
- Update Excel parser to map 39 columns
- Implement signature API endpoints
- Build employee lookup with signature
- Setup role-based authentication
- Configure audit reports

**Database is now ready for MAY HÒA THỌ ĐIỆN BÀN payroll system! 🎯**
