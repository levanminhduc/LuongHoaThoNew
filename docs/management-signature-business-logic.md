# 📋 **BUSINESS LOGIC ANALYSIS - MANAGEMENT SIGNATURE SYSTEM**

## 🎯 **OVERVIEW**

Hệ thống ký xác nhận lương cho 3 chức vụ: **Giám Đốc**, **Kế Toán**, và **Người Lập Biểu** với điều kiện bắt buộc **100% nhân viên đã ký tên**.

---

## 🔄 **WORKFLOW DESIGN**

### **Step 1: Employee Signature Phase**

```
Nhân viên ký lương → signature_logs table → Tính completion %
```

### **Step 2: 100% Completion Check**

```
Kiểm tra: signed_employees = total_active_employees
```

### **Step 3: Management Signature Phase**

```
3 chức vụ có thể ký độc lập → management_signatures table
```

### **Step 4: Complete Workflow**

```
Tất cả 3 chức vụ đã ký → Hoàn thành quy trình tháng
```

---

## 📊 **BUSINESS RULES**

### **Rule 1: 100% Employee Completion Requirement**

- **Condition**: `signed_employees = total_active_employees`
- **Validation**: Function `calculate_employee_signature_completion()`
- **Enforcement**: API level validation trước khi cho phép management ký

### **Rule 2: Role-Based Signature Authority**

- **Giám Đốc** (`giam_doc`): Ký xác nhận tổng thể
- **Kế Toán** (`ke_toan`): Ký xác nhận tài chính
- **Người Lập Biểu** (`nguoi_lap_bieu`): Ký xác nhận báo cáo

### **Rule 3: One Signature Per Role Per Month**

- **Constraint**: Unique index `(salary_month, signature_type)`
- **Behavior**: Không cho phép ký lại cùng loại trong cùng tháng
- **Override**: Chỉ admin có thể soft delete và cho phép ký lại

### **Rule 4: Independent Signature Process**

- Mỗi chức vụ ký **độc lập** với nhau
- Không có thứ tự bắt buộc giữa 3 chức vụ
- Tất cả đều phải đợi 100% employee completion

---

## 🎭 **ROLE DEFINITIONS**

### **Giám Đốc (giam_doc)**

```typescript
Role: "giam_doc";
Authority: "Ký xác nhận tổng thể lương tháng";
Access: "Toàn bộ departments";
Signature_Type: "giam_doc";
Business_Meaning: "Phê duyệt cuối cùng cho toàn bộ lương tháng";
```

### **Kế Toán (ke_toan)**

```typescript
Role: "ke_toan";
Authority: "Ký xác nhận tính chính xác tài chính";
Access: "Financial data và payroll calculations";
Signature_Type: "ke_toan";
Business_Meaning: "Xác nhận tính toán lương chính xác";
```

### **Người Lập Biểu (nguoi_lap_bieu)**

```typescript
Role: "nguoi_lap_bieu";
Authority: "Ký xác nhận báo cáo và thống kê";
Access: "Reports và data compilation";
Signature_Type: "nguoi_lap_bieu";
Business_Meaning: "Xác nhận báo cáo lương đầy đủ và chính xác";
```

---

## ⚡ **VALIDATION LOGIC**

### **Pre-Signature Validation**

```sql
-- Check 1: Employee completion
SELECT is_100_percent_complete FROM calculate_employee_signature_completion(month)

-- Check 2: Role authorization
SELECT chuc_vu FROM employees WHERE employee_id = signer_id

-- Check 3: Existing signature
SELECT COUNT(*) FROM management_signatures
WHERE salary_month = month AND signature_type = role

-- Check 4: Employee active status
SELECT is_active FROM employees WHERE employee_id = signer_id
```

### **Post-Signature Actions**

```sql
-- Action 1: Insert signature record
INSERT INTO management_signatures (...)

-- Action 2: Log audit trail
INSERT INTO audit_logs (...)

-- Action 3: Update completion status
-- Trigger automatic notifications if all 3 signatures complete
```

---

## 🔐 **SECURITY RULES**

### **Authentication Requirements**

- Valid JWT token với role trong `['giam_doc', 'ke_toan', 'nguoi_lap_bieu']`
- Employee ID trong token phải match với signer
- Token không expired và signature valid

### **Authorization Matrix**

| **Action**          | **Admin** | **Giám Đốc** | **Kế Toán** | **Người Lập Biểu** | **Others** |
| ------------------- | --------- | ------------ | ----------- | ------------------ | ---------- |
| View Status         | ✅        | ✅           | ✅          | ✅                 | ❌         |
| Sign giam_doc       | ✅        | ✅           | ❌          | ❌                 | ❌         |
| Sign ke_toan        | ✅        | ❌           | ✅          | ❌                 | ❌         |
| Sign nguoi_lap_bieu | ✅        | ❌           | ❌          | ✅                 | ❌         |
| View History        | ✅        | ✅           | ✅          | ✅                 | ❌         |
| Delete Signature    | ✅        | ❌           | ❌          | ❌                 | ❌         |

### **Data Protection**

- RLS policies enforce row-level security
- Audit trail cho mọi signature actions
- IP address và device info logging
- Soft delete thay vì hard delete

---

## 📈 **COMPLETION TRACKING**

### **Employee Level Metrics**

```typescript
interface EmployeeCompletion {
  total_employees: number;
  signed_employees: number;
  completion_percentage: number;
  is_100_percent_complete: boolean;
  unsigned_employees_sample: Employee[];
}
```

### **Management Level Metrics**

```typescript
interface ManagementCompletion {
  total_signature_types: 3;
  completed_signatures: number;
  remaining_signatures: string[];
  is_fully_signed: boolean;
  employee_completion_required: boolean;
}
```

### **Overall Status**

```typescript
interface MonthStatus {
  employee_phase_complete: boolean;
  management_signatures: {
    giam_doc: SignatureRecord | null;
    ke_toan: SignatureRecord | null;
    nguoi_lap_bieu: SignatureRecord | null;
  };
  month_fully_complete: boolean;
}
```

---

## 🚨 **ERROR HANDLING**

### **Common Error Scenarios**

1. **Employee completion < 100%**
   - Error: "Chưa đủ 100% nhân viên ký tên"
   - Action: Hiển thị danh sách nhân viên chưa ký

2. **Duplicate signature attempt**
   - Error: "Đã có chữ ký cho loại này trong tháng"
   - Action: Hiển thị thông tin chữ ký hiện có

3. **Unauthorized role**
   - Error: "Chức vụ không có quyền ký loại này"
   - Action: Redirect về dashboard phù hợp

4. **Invalid month format**
   - Error: "Định dạng tháng không hợp lệ"
   - Action: Validate YYYY-MM format

### **Recovery Procedures**

- **Admin Override**: Admin có thể soft delete signature để cho phép ký lại
- **Rollback**: Soft delete thay vì hard delete để có thể recovery
- **Audit Trail**: Đầy đủ log để trace lại mọi thay đổi

---

## 🔄 **INTEGRATION POINTS**

### **Existing Systems**

- **Employee Signature System**: Reuse `signature_logs` table
- **Authentication System**: Extend existing JWT validation
- **Audit System**: Integrate với existing audit_logs
- **Department Management**: Leverage existing department data

### **New Components**

- **Management Signatures Table**: New table cho management signatures
- **Completion Calculation**: New functions cho business logic
- **Dashboard Components**: New UI cho 3 role dashboards
- **API Endpoints**: New endpoints cho signature workflow

---

## 📅 **MONTHLY WORKFLOW EXAMPLE**

### **Tháng 01/2025 Workflow:**

```
1. Nhân viên ký lương (01-31/01/2025)
2. Kiểm tra completion: 1000/1000 (100%) ✅
3. Giám Đốc ký xác nhận (02/02/2025) ✅
4. Kế Toán ký xác nhận (02/02/2025) ✅
5. Người Lập Biểu ký xác nhận (03/02/2025) ✅
6. Tháng 01/2025 hoàn thành ✅
```

### **Status Tracking:**

- Employee Phase: ✅ Complete (100%)
- Management Phase: ✅ Complete (3/3)
- Month Status: ✅ Fully Complete

---

**Business Logic Analysis hoàn thành - Ready for API Architecture Planning!** 🚀
