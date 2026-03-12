# Brainstorm: Attendance Export Signing Date Logic

## Problem Statement

Khi xuất Excel kỳ công (attendance-export), cột "Ngày Ký" hiện tại hiển thị ngày ký **thật** từ `signature_logs.signed_at`. Theo quy định, ngày ký phải là **ngày 1 hoặc 2 của tháng kế tiếp** (ví dụ: kỳ công tháng 01/2026 → ngày ký phải là 01 hoặc 02/02/2026).

### Yêu cầu chi tiết:
- Ngày ký = ngày 1 hoặc 2 tháng X+1 khi xuất kỳ công tháng X
- Deterministic: cùng employee + cùng tháng → luôn ra cùng ngày
- Varied: cùng employee qua tháng khác → ngày có thể thay đổi (1↔2)
- Giờ ký lấy từ `signed_at` thật nhưng chỉ hiển thị DD/MM/YYYY
- Nhân viên chưa ký → để trống
- Phạm vi: chỉ `attendance-export`, payroll-export giữ nguyên

## Evaluated Approaches

### Approach 1: Hash-based deterministic ✅ CHOSEN
**Pros:** Zero storage, deterministic, phân bố đều ~50/50, simple code
**Cons:** Không thể override manual nếu cần

### Approach 2: Numeric seed
**Pros:** Dễ đọc
**Cons:** Phân bố kém nếu mã NV có pattern số (VD: NV001, NV002... toàn chẵn/lẻ)

### Approach 3: Lưu DB
**Pros:** Linh hoạt, có thể edit
**Cons:** Tốn thêm cột DB, thêm migration, over-engineering cho use case đơn giản

## Final Recommended Solution

### Algorithm: Hash-based deterministic day assignment

```typescript
function getSigningDay(employeeId: string, salaryMonth: string): 1 | 2 {
  const seed = `${employeeId}-${salaryMonth}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return (Math.abs(hash) % 2) + 1 as 1 | 2;
}
```

### Signing Date Generator

```typescript
function getFormattedSigningDate(
  employeeId: string,
  salaryMonth: string,  // "2026-01"
  signedAt: string | null
): string {
  if (!signedAt) return "";  // chưa ký → trống

  // Parse salary_month → next month day 1 or 2
  const [year, month] = salaryMonth.split("-").map(Number);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const day = getSigningDay(employeeId, salaryMonth);

  const dd = String(day).padStart(2, "0");
  const mm = String(nextMonth).padStart(2, "0");
  return `${dd}/${mm}/${nextYear}`;  // "01/02/2026" or "02/02/2026"
}
```

### Integration Point

File: `app/api/admin/attendance-export/route.ts`

Replace current `formatSignedAtDate(signatureLog?.signed_at || null)` calls with:
```typescript
getFormattedSigningDate(emp.employee_id, salaryMonth, signatureLog?.signed_at || null)
```

### File Changes Required

| File | Change |
|------|--------|
| `lib/utils/signing-date-generator.ts` | **NEW** — utility functions |
| `app/api/admin/attendance-export/route.ts` | Import & replace `formatSignedAtDate` calls |

## Example Output

| Employee | Tháng 01/2026 | Tháng 02/2026 | Tháng 03/2026 |
|----------|--------------|--------------|--------------|
| NV001 | 02/02/2026 | 01/03/2026 | 02/04/2026 |
| NV002 | 01/02/2026 | 02/03/2026 | 01/04/2026 |
| NV003 | 01/02/2026 | 01/03/2026 | 02/04/2026 |

## Implementation Considerations
- Hash algorithm (`djb2` variant) phân bố đều cho string inputs
- Không cần migration DB
- Backward compatible — payroll-export không bị ảnh hưởng
- Utility function tách riêng file → reusable nếu cần cho nơi khác

## Risk Assessment
- **Low risk**: Chỉ thay đổi logic format date trong export, không ảnh hưởng data
- **Edge case**: T13 salary_month ("2026-T13") → cần handle riêng hoặc exclude

## Success Metrics
- Cùng employee + cùng tháng → xuất nhiều lần luôn ra cùng ngày ký
- ~50% employees ngày 1, ~50% ngày 2 trong cùng tháng
- Nhân viên chưa ký → cột trống
- Payroll export không thay đổi
