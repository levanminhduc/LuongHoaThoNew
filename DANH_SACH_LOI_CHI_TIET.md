# DANH SÁCH CHI TIẾT CÁC LỖI CẦN SỬA

## TỔNG QUAN

- Tổng số ERRORS: ~220 lỗi (CHẶN BUILD)
- Tổng số WARNINGS: ~180 lỗi (KHÔNG CHẶN BUILD)

---

## PHẦN 1: ERRORS - ƯU TIÊN CAO (CHẶN DEPLOYMENT)

### 1. @typescript-eslint/no-explicit-any (~150 errors)

#### API Routes (60 files, ~90 lỗi)

- app/api/admin/download-employee-template/route.ts:17
- app/api/admin/download-multiple-samples/route.ts:18,25
- app/api/admin/download-sample/route.ts:17
- app/api/admin/upload/route.ts:18
- app/api/admin/sync-template/route.ts:18
- app/api/employees/update-cccd/route.ts:17
- app/api/admin/import-employees/route.ts:22
- app/api/admin/mapping-configurations/route.ts:23,317
- app/api/admin/payroll/audit/[id]/route.ts:17,141(x2)
- app/api/admin/payroll/search/route.ts:17,379
- app/api/admin/payroll/[id]/route.ts:168,169
- app/api/admin/payroll-import/route.ts:25,34,58,82,83,175,272
- app/api/admin/payroll-export/route.ts:369,387,388,389
- app/api/admin/payroll-export-template/route.ts:19,197,216,228,246,265
- app/api/payroll/my-departments/route.ts:181
- app/api/admin/import-dual-files/route.ts:24,48,49,56,59,60,88,108,109,111,154,171,223,933,934,1015,1039,1194,1216,1373,1390
- app/api/admin/generate-import-template/route.ts:81(x3),163,166,175,217(x3),218
- app/api/admin/login/route.ts:37
- app/api/auth/change-password-with-cccd/route.ts:64,69
- app/api/auth/forgot-password/route.ts:57,62,79,84
- app/api/employee/change-password/route.ts:44,178,235
- app/api/debug/batch-ids/route.ts:22(x2)
- app/api/debug/departments/route.ts:124,145,146,152
- app/api/debug/positions/route.ts:35(x2),54(x2),89(x2)
- app/api/admin/setup-new-positions/route.ts:77(x2)
- app/api/admin/import-history/route.ts:23,24,42
- app/api/signature-history/route.ts:175,176
- app/api/signature-status/[month]/route.ts:92

#### Frontend Pages (4 files, ~6 lỗi)

- app/admin/column-mapping-config/page.tsx:575
- app/admin/department-management/assign-permissions/page.tsx:143(x2)
- app/admin/payroll-management/components/PayrollEditForm.tsx:168
- app/debug/browser/page.tsx:8,47

#### Components (15 files, ~37 lỗi)

- components/AdvancedConflictResolver.tsx:40,41,68,120,142,197,198,246,247,555
- components/BatchErrorResolution.tsx:34,47,128
- components/column-mapping-manager.tsx:151
- components/debug/DepartmentDebugInfo.tsx:25,26,27,28,29,30,31
- components/department/DepartmentDetailModalRefactored.tsx:294
- components/department/EmployeeTable.tsx:158(x2)
- components/DepartmentDetailModal.tsx:262(x2)
- components/EmployeeDashboard.tsx:93
- components/EmployeeListModal.tsx:62,117
- components/ImportHistoryViewer.tsx:54,55
- components/ManagerDashboard.tsx:324
- components/payroll-import/ImportErrorModal.tsx:64
- components/RoleBasedRouter.tsx:251,254
- components/signature/ManagementSignatureForm.tsx:41
- components/signature/ResponsiveLayout.tsx:113,271
- components/SupervisorDashboard.tsx:155

#### Lib Files (10 files, ~45 lỗi)

- lib/advanced-excel-parser.ts:25,34,303,307,420,940,1033
- lib/auth-middleware.ts:89,95,101
- lib/auth.ts:167,305
- lib/cache/mapping-config-cache.ts:46,55,302,318,342
- lib/column-alias-config.ts:25,37
- lib/employee-parser.ts:38,44
- lib/enhanced-import-validation.ts:284,287,288,289,290
- lib/excel-parser.ts:27,33
- lib/management-signature-auth.ts:111,112,163(x2),169
- lib/payroll-validation.ts:17,18,35,72,98,164,288,364,427,452
- lib/security-middleware.ts:82,95,113,129(x2),143,225,252
- lib/signature-validation.ts:203

---

### 2. react/no-unescaped-entities (~35 errors)

- app/debug/browser/page.tsx:230
- app/employee/lookup/employee-lookup.tsx:349(x2),353(x2),356,357
- app/employee/lookup/page.tsx:15(x4)
- app/test-roles/page.tsx:157(x2)
- components/advanced-salary-import.tsx:633,634,701(x2)
- components/column-mapping-dialog.tsx:610,615,814(x2)
- components/payroll-import/ImportErrorModal.tsx:878(x4),890(x2),893,894(x2),906(x2),909,910(x2)

---

### 3. prefer-const (~10 errors)

- app/api/admin/import-dual-files/route.ts:449,476
- app/api/admin/import-history/route.ts:165
- app/api/admin/payroll-export/route.ts:208,386
- app/api/admin/payroll-export-template/route.ts:172
- app/api/employee/change-password/route.ts:178
- components/AdvancedConflictResolver.tsx:142
- components/department/DepartmentDetailModalRefactored.tsx:241
- components/SupervisorDashboard.tsx:271
- lib/management-signature-utils.ts:209

---

## PHẦN 2: WARNINGS - ƯU TIÊN THẤP (KHÔNG CHẶN BUILD)

### 1. @typescript-eslint/no-unused-vars (~180 warnings)

**Chiến lược**: Xóa hoặc prefix với \_

Danh sách file có unused vars (77 files):

- app/accountant/dashboard/page.tsx
- app/admin/column-mapping-config/page.tsx
- app/admin/dashboard/admin-dashboard.tsx
- app/admin/department-management/assign-permissions/page.tsx
- app/admin/department-management/page.tsx
- app/admin/employee-management/components/EmployeeAuditLogs.tsx
- app/admin/employee-management/page.tsx
- app/admin/login/admin-login-form.tsx
- app/admin/payroll-import-export/components/ImportPreviewSection.tsx
- app/admin/payroll-management/components/AuditTrail.tsx
- app/admin/payroll-management/components/MonthSelector.tsx
- app/admin/payroll-management/components/PayrollEditForm.tsx
- app/admin/payroll-management/page.tsx
- app/api/admin/import-dual-files/route.ts
- app/api/admin/import-employees/route.ts
- app/api/admin/import-history/route.ts
- app/api/admin/payroll/[id]/route.ts
- app/api/admin/payroll-export/route.ts
- app/api/admin/payroll-import/route.ts
- app/api/admin/setup-management-signatures/route.ts
- app/api/admin/setup-new-positions/route.ts
- app/api/admin/setup-test-passwords/route.ts
- app/api/admin/sync-template/route.ts
- app/api/auth/change-password-with-cccd/route.ts
- app/api/debug/batch-ids/route.ts
- app/api/employee/sign-salary/route.ts
- app/api/employees/all-employees/route.ts
- app/api/management-signature/route.ts
- app/api/signature-history/route.ts
- app/api/signature-progress/[month]/route.ts
- app/api/signature-status/[month]/route.ts
- app/director/dashboard/page.tsx
- app/employee/lookup/employee-lookup.tsx
- app/employee/lookup/salary-history-modal.tsx
- app/reporter/dashboard/page.tsx
- app/test-roles/page.tsx
- components/admin/HighPrecisionDemo.tsx
- components/advanced-salary-import.tsx
- components/AdvancedConflictResolver.tsx
- components/BatchErrorResolution.tsx
- components/column-mapping-dialog.tsx
- components/column-mapping-manager.tsx
- components/debug/DepartmentDebugInfo.tsx
- components/DepartmentDetailModal.tsx
- components/employee-import-section.tsx
- components/error-boundary.tsx
- components/export-configuration-dialog.tsx
- components/ImportHistoryViewer.tsx
- components/ManagerDashboard.tsx
- components/mapping-config-override-dialog.tsx
- components/OverviewModal.tsx
- components/signature/SignatureProgressCard.tsx
- components/SupervisorDashboard.tsx
- components/ui/calendar.tsx
- components/ui/chart.tsx
- components/ui/hover-dropdown-menu.tsx
- components/ui/use-toast.ts
- lib/advanced-excel-parser.ts
- lib/cache/mapping-config-cache.ts
- lib/employee-parser.ts
- lib/enhanced-import-validation.ts
- lib/hooks/use-header-mapping.ts
- lib/hooks/use-mapping-config.ts
- lib/hooks/useImportPreview.ts
- lib/management-signature-utils.ts
- lib/security-middleware.ts
- lib/stores/mapping-config-store.ts

---

### 2. react-hooks/exhaustive-deps (~30 warnings)

**Chiến lược**: Thêm dependencies hoặc disable rule

Danh sách file (30 files):

- app/accountant/dashboard/page.tsx
- app/admin/column-mapping-config/page.tsx
- app/admin/dashboard/admin-dashboard.tsx
- app/admin/data-validation/page.tsx
- app/admin/department-management/assign-permissions/page.tsx
- app/admin/department-management/page.tsx
- app/admin/department-management/permissions/page.tsx
- app/admin/employee-management/components/EmployeeAuditLogs.tsx
- app/admin/employee-management/page.tsx
- app/admin/password-reset-history/page.tsx
- app/admin/payroll-management/components/AuditTrail.tsx
- app/admin/payroll-management/components/EmployeeSearch.tsx
- app/admin/payroll-management/components/MonthSelector.tsx
- app/director/dashboard/page.tsx
- app/employee/dashboard/page.tsx
- app/employee/lookup/salary-history-modal.tsx
- app/manager/dashboard/page.tsx
- app/reporter/dashboard/page.tsx
- app/supervisor/dashboard/page.tsx
- components/column-mapping-dialog.tsx
- components/department/DepartmentDetailModalRefactored.tsx
- components/DepartmentDetailModal.tsx
- components/EmployeeDashboard.tsx
- components/ImportHistoryViewer.tsx
- components/ManagerDashboard.tsx
- components/OverviewModal.tsx
- components/RoleBasedRouter.tsx
- components/signature/MonthSelector.tsx
- components/SupervisorDashboard.tsx
- lib/sync/mapping-config-sync.ts

---

## PHẦN 3: THỐNG KÊ THEO FILE

### Top 10 files có nhiều lỗi nhất:

1. **app/api/admin/import-dual-files/route.ts** - 26 errors + 14 warnings = 40 lỗi
2. **lib/payroll-validation.ts** - 10 errors
3. **components/AdvancedConflictResolver.tsx** - 11 errors + 3 warnings = 14 lỗi
4. **app/api/admin/generate-import-template/route.ts** - 9 errors
5. **lib/security-middleware.ts** - 8 errors + 1 warning = 9 lỗi
6. **components/payroll-import/ImportErrorModal.tsx** - 17 errors (16 quotes + 1 any)
7. **lib/advanced-excel-parser.ts** - 7 errors + 3 warnings = 10 lỗi
8. **components/debug/DepartmentDebugInfo.tsx** - 7 errors + 2 warnings = 9 lỗi
9. **app/api/admin/payroll-import/route.ts** - 7 errors + 1 warning = 8 lỗi
10. **app/api/admin/payroll-export-template/route.ts** - 6 errors

---

## PHẦN 4: HƯỚNG DẪN SỬA TỪNG LOẠI LỖI

### A. Sửa @typescript-eslint/no-explicit-any

**Pattern 1: JWT Verification**
\\\ ypescript
// TRƯỚC:
const decoded = jwt.verify(token, JWT_SECRET) as any;

// SAU:
import { type JWTPayload } from "@/lib/auth";
const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
\\\

**Pattern 2: Generic Objects**
\\\ ypescript
// TRƯỚC:
const data: any = await request.json();

// SAU:
const data: Record<string, unknown> = await request.json();
\\\

**Pattern 3: Specific Interfaces**
\\\ ypescript
// TRƯỚC:
interface AutoFixResult {
fixedValue: any;
}

// SAU:
interface AutoFixResult {
fixedValue: string | number | Date | null;
}
\\\

### B. Sửa react/no-unescaped-entities

\\\ sx
// TRƯỚC:

<p>Nhập "Mã số nhân viên" hoặc "Họ và tên"</p>

// SAU:

<p>{\Nhập "Mã số nhân viên" hoặc "Họ và tên"\}</p>
\\\

### C. Sửa prefer-const

\\\ ypescript
// TRƯỚC:
let confidence = "high";

// SAU:
const confidence = "high";
\\\

### D. Sửa @typescript-eslint/no-unused-vars

\\\ ypescript
// TRƯỚC:
const [error, setError] = useState<string | null>(null);

// SAU (nếu không dùng):
// Xóa hoàn toàn

// SAU (nếu cần giữ lại):
const [_error, setError] = useState<string | null>(null);
\\\

### E. Sửa react-hooks/exhaustive-deps

\\\ ypescript
// TRƯỚC:
useEffect(() => {
fetchData();
}, []);

// SAU (Option 1 - Thêm dependency):
useEffect(() => {
fetchData();
}, [fetchData]);

// SAU (Option 2 - Disable rule):
useEffect(() => {
fetchData();
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
\\\

---

## KẾT LUẬN

**Tổng số lỗi cần sửa**: ~400 lỗi (220 errors + 180 warnings)

**Ưu tiên**:

1. **CAO**: Sửa 220 ERRORS (bắt buộc để deploy)
2. **THẤP**: Sửa 180 WARNINGS (tùy chọn, cải thiện code quality)

**Thời gian ước tính**:

- Errors: 8-10 giờ
- Warnings: 2-3 giờ
- **Tổng**: 10-13 giờ làm việc
