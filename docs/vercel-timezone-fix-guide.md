# 🕐 **VERCEL TIMEZONE FIX - DEPLOYMENT GUIDE**

## 📋 **OVERVIEW**

Hướng dẫn fix vấn đề timezone khi deploy lên Vercel - thời gian ký lương bị sai +7 giờ so với thực tế.

---

## 🐛 **VẤN ĐỀ**

### **Hiện tượng:**

- **Localhost**: Thời gian ký lương hiển thị đúng
- **Vercel**: Thời gian ký lương bị +7 giờ (VD: ký lúc 14:30 nhưng hiển thị 21:30)

### **Nguyên nhân:**

1. **Vercel servers** chạy ở UTC timezone
2. **Database function** cộng thêm 7 giờ để convert sang Vietnam time
3. **Browser** lại interpret timestamp đó theo local timezone và cộng thêm 7 giờ nữa
4. **Kết quả**: Double timezone conversion → +14 giờ total

---

## ✅ **GIẢI PHÁP ĐÃ IMPLEMENT**

### **1. Client-Side Timestamp Generation**

```typescript
// Tạo timestamp theo timezone Việt Nam từ client
const vietnamTime = getVietnamTimestamp(); // "2025-01-15 14:30:00"

// Gửi lên server thay vì để server tự tạo
fetch("/api/employee/sign-salary", {
  body: JSON.stringify({
    employee_id: "NV001",
    cccd: "123456789",
    salary_month: "2025-01",
    client_timestamp: vietnamTime, // ← Key fix
  }),
});
```

### **2. Database Function Update**

```sql
-- Function nhận client timestamp và sử dụng trực tiếp
CREATE OR REPLACE FUNCTION auto_sign_salary(
  p_employee_id VARCHAR(50),
  p_salary_month VARCHAR(20),
  p_ip_address VARCHAR(45) DEFAULT NULL,
  p_device_info TEXT DEFAULT NULL,
  p_client_timestamp VARCHAR(50) DEFAULT NULL  -- ← New parameter
) RETURNS JSONB AS $$
BEGIN
  -- Sử dụng client timestamp nếu có
  IF p_client_timestamp IS NOT NULL THEN
    v_current_time := p_client_timestamp::TIMESTAMP;
  ELSE
    -- Fallback: Server time + 7 hours
    v_current_time := CURRENT_TIMESTAMP + INTERVAL '7 hours';
  END IF;
  -- ...
END;
$$
```

### **3. Utility Functions**

```typescript
// lib/utils/vietnam-timezone.ts
export function getVietnamTimestamp(): string {
  return new Date().toLocaleString("sv-SE", {
    timeZone: "Asia/Ho_Chi_Minh",
  });
}
```

---

## 🚀 **DEPLOYMENT STEPS**

### **Step 1: Database Migration**

```bash
# Chạy script update database function
psql -h your_host -U your_user -d your_database -f scripts/supabase-setup/17-fix-vercel-timezone-final.sql
```

### **Step 2: Code Deployment**

```bash
# Deploy code changes lên Vercel
git add .
git commit -m "Fix Vercel timezone issue - use client timestamp"
git push origin main

# Vercel sẽ auto-deploy
```

### **Step 3: Verification**

1. **Test trên localhost** - đảm bảo vẫn hoạt động bình thường
2. **Test trên Vercel** - verify thời gian ký đúng
3. **Check database** - verify timestamp trong signature_logs

---

## 🧪 **TESTING CHECKLIST**

### **Pre-deployment Testing:**

- [ ] Localhost: Ký lương → thời gian hiển thị đúng
- [ ] Database function: Test với client timestamp
- [ ] API endpoints: Verify Vietnam timestamp generation

### **Post-deployment Testing:**

- [ ] Vercel: Ký lương → thời gian hiển thị đúng (không +7 giờ)
- [ ] Database: Check signature_logs table cho timestamp accuracy
- [ ] Multiple timezones: Test từ các múi giờ khác nhau

### **Test Cases:**

```typescript
// Test case 1: Normal signature
{
  employee_id: "NV001",
  cccd: "123456789",
  expected_time: "14:30 15/01/2025", // Thời gian thực tế
  actual_time: "??:?? ??/??/????"   // Verify này
}

// Test case 2: Management signature
{
  role: "giam_doc",
  expected_time: "09:15 16/01/2025",
  actual_time: "??:?? ??/??/????"
}
```

---

## 📊 **MONITORING & DEBUGGING**

### **Debug Information:**

```typescript
// Thêm vào API response để debug
{
  success: true,
  data: {
    signed_at: "2025-01-15 14:30:00",
    timezone_source: "client_device", // hoặc "server_plus_7"
    debug_info: {
      client_timestamp: "2025-01-15 14:30:00",
      server_utc: "2025-01-15 07:30:00",
      final_timestamp: "2025-01-15 14:30:00"
    }
  }
}
```

### **Database Queries để Check:**

```sql
-- Kiểm tra signature logs gần đây
SELECT
  employee_id,
  signed_at,
  signed_at + INTERVAL '7 hours' as signed_at_plus_7,
  signature_ip,
  signature_device
FROM signature_logs
ORDER BY signed_at DESC
LIMIT 10;

-- So sánh với payrolls table
SELECT
  p.employee_id,
  p.signed_at as payroll_signed_at,
  sl.signed_at as log_signed_at,
  p.signed_at = sl.signed_at as timestamps_match
FROM payrolls p
JOIN signature_logs sl ON p.employee_id = sl.employee_id
  AND p.salary_month = sl.salary_month
WHERE p.is_signed = true
ORDER BY p.signed_at DESC
LIMIT 5;
```

---

## 🔄 **ROLLBACK PLAN**

### **Nếu có vấn đề:**

```sql
-- Rollback database function về version cũ
CREATE OR REPLACE FUNCTION auto_sign_salary(
  p_employee_id VARCHAR(50),
  p_salary_month VARCHAR(20),
  p_ip_address VARCHAR(45) DEFAULT NULL,
  p_device_info TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_current_time TIMESTAMP;
BEGIN
  -- Rollback: Sử dụng server timezone conversion
  v_current_time := (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh');
  -- ... rest of original function
END;
$$ LANGUAGE plpgsql;
```

### **Code Rollback:**

```bash
# Revert code changes
git revert HEAD
git push origin main
```

---

## 📈 **EXPECTED RESULTS**

### **Before Fix:**

- Localhost: 14:30 ✅
- Vercel: 21:30 ❌ (+7 hours wrong)

### **After Fix:**

- Localhost: 14:30 ✅
- Vercel: 14:30 ✅ (correct time)

### **Database:**

```sql
-- signature_logs table
employee_id | signed_at           | signature_ip
NV001      | 2025-01-15 14:30:00 | 1.2.3.4
NV002      | 2025-01-15 09:15:00 | 5.6.7.8
```

---

## 🎯 **SUCCESS CRITERIA**

- [ ] **Vercel deployment**: Thời gian ký lương hiển thị chính xác
- [ ] **Database consistency**: signature_logs và payrolls có cùng timestamp
- [ ] **No regression**: Localhost vẫn hoạt động bình thường
- [ ] **User experience**: Nhân viên thấy thời gian ký đúng với thực tế

---

## 📞 **SUPPORT**

### **Nếu vẫn có vấn đề:**

1. **Check Vercel logs**: Xem có error gì không
2. **Database query**: Verify timestamp trong signature_logs
3. **Browser console**: Check API response debug info
4. **Rollback**: Sử dụng rollback plan nếu cần thiết

### **Contact:**

- **Technical Issue**: Check GitHub issues
- **Database Issue**: Verify Supabase connection
- **Deployment Issue**: Check Vercel dashboard

---

**📝 Note**: Sau khi deploy thành công, monitor trong 24-48 giờ để đảm bảo không có side effects khác.
