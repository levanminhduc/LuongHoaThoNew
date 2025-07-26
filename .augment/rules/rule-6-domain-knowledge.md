---
type: "agent_requested"
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

#### **Payroll Structure (39 Columns):**
```
📊 Metadata (5 cột):
- employee_id, salary_month, source_file, import_batch_id, import_status

🔐 Signature Tracking (5 cột):
- is_signed, signed_at, signed_by_name, signature_ip, signature_device

💰 Core Payroll Data (29 cột):
- Hệ số và thông số cơ bản (4 cột)
- Thời gian làm việc (5 cột) 
- Lương sản phẩm và đơn giá (5 cột)
- Thưởng và phụ cấp (5 cột)
- Bảo hiểm và phúc lợi (5 cột)
- Phép và lễ (2 cột)
- Tổng lương và phụ cấp khác (3 cột)
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
🗄️ Normalization: Separate employees và payrolls tables
🗄️ Constraints: Foreign keys, unique constraints
🗄️ Indexing: Optimized queries cho lookups
🗄️ Audit Trail: Complete signature logging
🗄️ Scalability: Support cho large employee counts
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

## 🎯 **SUCCESS CRITERIA**

- ✅ All decisions reflect understanding của business domain
- ✅ User personas drive feature design
- ✅ Data sensitivity properly classified và protected
- ✅ Vietnamese context respected throughout
- ✅ Technical solutions align với business needs
