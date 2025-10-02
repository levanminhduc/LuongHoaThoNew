---
type: "manual"
description: "Example description"
---

# 🎯 **RULE SET 6: DOMAIN KNOWLEDGE & BUSINESS CONTEXT**

## 📋 **OVERVIEW**

Rule Set này đảm bảo AI Assistant hiểu sâu về domain business và context cụ thể của dự án hệ thống quản lý lương MAY HÒA THỌ ĐIỆN BÀN.

---

## 🏭 **RULE 6.1: HIỂU BUSINESS DOMAIN**

### **Quy tắc:**

```
✅ Luôn nhớ đây là Payroll Management System cho MAY HÒA THỌ ĐIỆN BÀN
✅ Hiểu 39-column payroll structure từ Excel imports
✅ Nắm rõ employee signature workflow với security tracking
✅ Tuân thủ Vietnamese labor law compliance (BHXH, BHTN, BHYT)
```

### **Core Business Knowledge:**

#### **Company Context:**

- **Tên công ty**: MAY HÒA THỌ ĐIỆN BÀN
- **Ngành nghề**: Sản xuất may mặc
- **Quy mô**: Nhiều nhân viên với các chức vụ khác nhau
- **Đặc điểm**: Công ty sản xuất với nhiều ca làm việc, tăng ca

#### **Payroll Structure (43 Columns - Updated 2024-07-30):**

```
📊 Metadata (5 cột):
- employee_id, salary_month, source_file, import_batch_id, import_status

🔐 Signature Tracking (5 cột):
- is_signed, signed_at, signed_by_name, signature_ip, signature_device

💰 Core Payroll Data (33 cột - bổ sung 4 cột mới):
- Hệ số và thông số cơ bản (4 cột)
- Thời gian làm việc (9 cột - bổ sung ngay_cong_chu_nhat)
- Lương sản phẩm và đơn giá (6 cột - bổ sung tien_luong_chu_nhat, luong_cnkcp_vuot)
- Thưởng và phụ cấp (6 cột - bổ sung tien_tang_ca_vuot)
- Bảo hiểm và phúc lợi (5 cột)
- Phép và lễ (2 cột)
- Tổng lương và phụ cấp khác (3 cột)

🆕 4 CỘT MỚI (Added 2024-07-30):
- ngay_cong_chu_nhat (DECIMAL(5,2)) - Ngày công chủ nhật
- tien_luong_chu_nhat (DECIMAL(15,2)) - Tiền lương chủ nhật
- luong_cnkcp_vuot (DECIMAL(15,2)) - Lương CNKCP vượt (Công nhân kỹ thuật cao phẩm vượt)
- tien_tang_ca_vuot (DECIMAL(15,2)) - Tiền tăng ca vượt định mức
```

#### **Key Business Concepts:**

- **Ngày công trong giờ**: Số ngày làm việc trong giờ hành chính
- **Hệ số làm việc**: Coefficient dựa trên performance
- **Tăng ca**: Overtime work với rate khác nhau
- **Chuyên cần**: Attendance bonus
- **BHXH/BHTN/BHYT**: Social insurance, unemployment, health insurance

---

## 👥 **RULE 6.2: USER PERSONAS & USE CASES**

### **3 User Groups chính:**

#### **👨‍💼 Admin Users:**

```
🎯 Goals:
- Import payroll data từ Excel files
- Manage employee database
- Monitor system usage và signatures
- Ensure data accuracy và compliance

🔧 Tasks:
- Upload và process Excel files (dual-file imports)
- Download employee templates
- View dashboard statistics
- Handle import errors và duplicates
- Manage user access
```

#### **👷‍♂️ Employee Users:**

```
🎯 Goals:
- Tra cứu thông tin lương cá nhân
- Hiểu chi tiết breakdown lương
- Ký nhận lương điện tử
- Verify accuracy của payroll data

🔧 Tasks:
- Login với employee_id + CCCD
- View 6 key salary components
- Review working days và coefficients
- Sign salary acknowledgment
- Check signature status
```

#### **🏢 Company Stakeholders:**

```
🎯 Goals:
- Ensure labor law compliance
- Maintain transparency với employees
- Improve payroll efficiency
- Reduce manual paperwork
- Track signature completion rates

📊 Metrics:
- Import success rates
- Employee signature completion
- System usage statistics
- Error reduction over time
```

---

## 🔐 **RULE 6.3: DATA SENSITIVITY AWARENESS**

### **Data Classification:**

#### **🔴 CRITICAL DATA (Highest Security):**

```
- CCCD numbers (always hashed với bcrypt)
- Salary amounts (all monetary fields)
- Personal information (full_name, phone_number)
- Signature tracking data (IP, device info)
- Authentication tokens (JWT)
```

#### **🟡 SENSITIVE DATA (Medium Security):**

```
- Working hours và attendance data
- Performance coefficients
- Deduction amounts
- Department information
- Employee status
```

#### **🟢 PUBLIC DATA (Low Security):**

```
- Employee ID (public identifier)
- Position titles
- Salary month periods
- System metadata (created_at, updated_at)
- File names (source_file)
```

### **Security Protocols:**

```
🔒 CCCD Hashing: Always use bcrypt, never store plain text
🔒 API Authentication: JWT tokens cho admin, CCCD verification cho employees
🔒 Token Key: ALWAYS use "admin_token" (not "adminToken") for localStorage
🔒 RLS Policies: Supabase Row Level Security cho data isolation
🔒 Audit Logging: Track all signature actions với IP + device info
🔒 Input Validation: Strict validation cho all user inputs
```

---

## 🇻🇳 **RULE 6.4: VIETNAMESE BUSINESS CONTEXT**

### **Labor Law Compliance:**

```
📋 Required Elements:
- BHXH (Bảo hiểm xã hội): Social insurance
- BHTN (Bảo hiểm thất nghiệp): Unemployment insurance
- BHYT (Bảo hiểm y tế): Health insurance
- Thuế TNCN: Personal income tax
- Minimum wage compliance
```

### **Cultural Considerations:**

```
🇻🇳 Language:
- Professional Vietnamese terminology
- Formal address style
- Clear, respectful communication
- Proper currency formatting (VND)

🇻🇳 Business Practices:
- Monthly salary cycles
- Signature acknowledgment importance
- Transparency in payroll breakdown
- Respect for employee privacy
```

### **Regulatory Requirements:**

```
⚖️ Compliance Areas:
- Accurate record keeping
- Employee access to salary information
- Proper deduction calculations
- Audit trail maintenance
- Data protection standards
```

---

## 📊 **RULE 6.5: TECHNICAL DOMAIN KNOWLEDGE**

### **Excel Import Patterns:**

```
📁 File Types: .xlsx, .xls only
📁 Structure: Header row + data rows
📁 Encoding: UTF-8 support cho Vietnamese characters
📁 Size Limits: 10MB maximum
📁 Validation: Comprehensive field validation
```

### **Database Design Principles:**

```
🗄️ Core Tables: employees (nhân viên), payrolls (43 cột), signature_logs
🗄️ New Config Tables: import_file_configs, mapping_configurations, payroll_audit_logs
🗄️ Normalization: Separate employees và payrolls tables
🗄️ Constraints: Foreign keys, unique constraints
🗄️ Indexing: Optimized queries cho lookups
🗄️ Audit Trail: Complete signature logging + payroll_audit_logs
🗄️ Scalability: Support cho large employee counts
🗄️ Authentication: Use "admin_token" key consistently across all components
🗄️ Column Mapping: Advanced Excel-to-database field mapping system
🗄️ Import Sessions: Track dual-file import processes với detailed logging
```

### **Performance Considerations:**

```
⚡ Mobile-First: Responsive design cho factory workers
⚡ Fast Lookups: Optimized employee search
⚡ Efficient Imports: Batch processing cho large files
⚡ Minimal Latency: Quick signature confirmation
⚡ Offline Resilience: Graceful error handling
```

---

## 🎯 **PRACTICAL APPLICATION**

### **When making decisions, consider:**

```
□ Does this align với Vietnamese labor practices?
□ Is data sensitivity properly handled?
□ Will factory workers find this intuitive?
□ Does this support compliance requirements?
□ Is the solution scalable cho company growth?
```

### **Common scenarios to anticipate:**

```
🔄 Monthly payroll cycles
🔄 Employee onboarding/offboarding
🔄 Salary adjustments và corrections
🔄 Audit requests và reporting
🔄 System maintenance và updates
```

---

## ⚠️ **COMMON PITFALLS TO AVOID**

1. **Ignoring Vietnamese business context** khi design features
2. **Underestimating data sensitivity** requirements
3. **Not considering factory worker UX** (mobile, simplicity)
4. **Missing compliance implications** của changes
5. **Overlooking audit trail** requirements

---

---

## 📊 **RULE 6.6: DATABASE SCHEMA UPDATES (2024-07-30)**

### **Recent Database Changes:**

#### **4 New Payroll Columns Added:**

```sql
-- Script 15: Add missing payroll columns (3 cột)
ALTER TABLE payrolls ADD COLUMN ngay_cong_chu_nhat DECIMAL(5,2) DEFAULT 0;
ALTER TABLE payrolls ADD COLUMN tien_luong_chu_nhat DECIMAL(15,2) DEFAULT 0;
ALTER TABLE payrolls ADD COLUMN luong_cnkcp_vuot DECIMAL(15,2) DEFAULT 0;

-- Script 16: Add overtime bonus column (1 cột)
ALTER TABLE payrolls ADD COLUMN tien_tang_ca_vuot DECIMAL(15,2) DEFAULT 0;
```

#### **New Configuration Tables:**

```sql
-- Import Configuration System (Scripts 11-12):
- import_file_configs: Store import file configurations
- import_column_mappings: Excel-to-database field mappings
- import_sessions: Track dual-file import sessions
- column_aliases: Alternative names for database fields
- mapping_configurations: Saved mapping configurations
- configuration_field_mappings: Detailed field mappings
- import_mapping_history: Learning from successful mappings

-- Audit System (Script 14):
- payroll_audit_logs: Track all payroll data changes
```

#### **Enhanced Features:**

```
🔧 Smart Column Mapping: Auto-detect Excel columns to database fields
🔧 Dual-File Import: Process multiple Excel files simultaneously
🔧 Configuration Management: Save and reuse successful mappings
🔧 Audit Trail: Complete change tracking for payroll data
🔧 Timezone Support: Vietnam timezone (Asia/Ho_Chi_Minh) for all timestamps
🔧 Advanced Validation: Business logic validation for payroll data
```

---

## 🎯 **SUCCESS CRITERIA**

- ✅ All decisions reflect understanding của business domain
- ✅ User personas drive feature design
- ✅ Data sensitivity properly classified và protected
- ✅ Vietnamese context respected throughout
- ✅ Technical solutions align với business needs
