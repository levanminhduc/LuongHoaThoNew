# KẾ HOẠCH SỬA CHỮA TOÀN BỘ LỖI ESLINT/TYPESCRIPT

## TỔNG QUAN

- **Tổng số lỗi**: ~220+ errors và ~180+ warnings
- **Loại lỗi chính**:
  1. @typescript-eslint/no-explicit-any (~150 errors)
  2. react/no-unescaped-entities (~35 errors)
  3. prefer-const (~10 errors)
  4. @typescript-eslint/no-unused-vars (~180 warnings)
  5. react-hooks/exhaustive-deps (~30 warnings)

---

## PHẦN 1: PHÂN TÍCH CHI TIẾT CÁC LỖI ERRORS

### A. Lỗi @typescript-eslint/no-explicit-any (~150 errors)

#### Nhóm 1: API Routes - JWT Verification (8 files - DỄ)

**Giải pháp**: Thay s any s JWTPayload

1. app/api/admin/download-employee-template/route.ts (line 17)
2. app/api/admin/download-multiple-samples/route.ts (lines 18, 25)
3. app/api/admin/download-sample/route.ts (line 17)
4. app/api/admin/upload/route.ts (line 18)
5. app/api/admin/sync-template/route.ts (line 18)
6. app/api/employees/update-cccd/route.ts (line 17)
7. app/api/admin/import-employees/route.ts (line 22)
8. app/api/admin/mapping-configurations/route.ts (lines 23, 317)

#### Nhóm 2: API Routes - Payroll (7 files - TRUNG BÌNH)

**Giải pháp**: Định nghĩa interfaces cho payroll data

9. app/api/admin/payroll/audit/[id]/route.ts (3 lỗi)
10. app/api/admin/payroll/search/route.ts (2 lỗi)
11. app/api/admin/payroll/[id]/route.ts (2 lỗi)
12. app/api/admin/payroll-import/route.ts (7 lỗi)
13. app/api/admin/payroll-export/route.ts (4 lỗi)
14. app/api/admin/payroll-export-template/route.ts (6 lỗi)
15. app/api/payroll/my-departments/route.ts (1 lỗi)

#### Nhóm 3: API Routes - Import Complex (2 files - KHÓ)

**Giải pháp**: Định nghĩa nhiều interfaces phức tạp

16. **app/api/admin/import-dual-files/route.ts** (26 lỗi) - FILE LỚN NHẤT
17. app/api/admin/generate-import-template/route.ts (9 lỗi)

#### Nhóm 4: API Routes - Auth & Debug (8 files - DỄ)

**Giải pháp**: Record<string, unknown> cho generic objects

18. app/api/admin/login/route.ts (1 lỗi)
19. app/api/auth/change-password-with-cccd/route.ts (2 lỗi)
20. app/api/auth/forgot-password/route.ts (4 lỗi)
21. app/api/employee/change-password/route.ts (3 lỗi)
22. app/api/debug/batch-ids/route.ts (2 lỗi)
23. app/api/debug/departments/route.ts (4 lỗi)
24. app/api/debug/positions/route.ts (6 lỗi)
25. app/api/admin/setup-new-positions/route.ts (2 lỗi)

#### Nhóm 5: API Routes - History & Signatures (3 files - TRUNG BÌNH)

26. app/api/admin/import-history/route.ts (3 lỗi)
27. app/api/signature-history/route.ts (2 lỗi)
28. app/api/signature-status/[month]/route.ts (1 lỗi)

#### Nhóm 6: Frontend Pages (4 files - TRUNG BÌNH)

29. app/admin/column-mapping-config/page.tsx (1 lỗi)
30. app/admin/department-management/assign-permissions/page.tsx (2 lỗi)
31. app/admin/payroll-management/components/PayrollEditForm.tsx (1 lỗi)
32. app/debug/browser/page.tsx (2 lỗi)

#### Nhóm 7: Components (15 files - TRUNG BÌNH)

33. components/AdvancedConflictResolver.tsx (11 lỗi)
34. components/BatchErrorResolution.tsx (3 lỗi)
35. components/column-mapping-manager.tsx (1 lỗi)
36. components/debug/DepartmentDebugInfo.tsx (7 lỗi)
37. components/department/DepartmentDetailModalRefactored.tsx (1 lỗi)
38. components/department/EmployeeTable.tsx (2 lỗi)
39. components/DepartmentDetailModal.tsx (2 lỗi)
40. components/EmployeeDashboard.tsx (1 lỗi)
41. components/EmployeeListModal.tsx (2 lỗi)
42. components/ImportHistoryViewer.tsx (2 lỗi)
43. components/ManagerDashboard.tsx (1 lỗi)
44. components/payroll-import/ImportErrorModal.tsx (1 lỗi)
45. components/RoleBasedRouter.tsx (2 lỗi)
46. components/signature/ManagementSignatureForm.tsx (1 lỗi)
47. components/signature/ResponsiveLayout.tsx (2 lỗi)
48. components/SupervisorDashboard.tsx (1 lỗi)

#### Nhóm 8: Lib Files (10 files - KHÓ)

49. lib/advanced-excel-parser.ts (7 lỗi)
50. lib/auth-middleware.ts (3 lỗi)
51. lib/auth.ts (2 lỗi)
52. lib/cache/mapping-config-cache.ts (5 lỗi)
53. lib/column-alias-config.ts (2 lỗi)
54. lib/employee-parser.ts (2 lỗi)
55. lib/enhanced-import-validation.ts (5 lỗi)
56. lib/excel-parser.ts (2 lỗi)
57. lib/management-signature-auth.ts (5 lỗi)
58. lib/payroll-validation.ts (10 lỗi)
59. lib/security-middleware.ts (8 lỗi)
60. lib/signature-validation.ts (1 lỗi)

---

### B. Lỗi react/no-unescaped-entities (~35 errors - DỄ)

**Giải pháp**: Wrap strings trong template literals {\...\}

61. app/debug/browser/page.tsx (1 lỗi - line 230)
62. app/employee/lookup/employee-lookup.tsx (6 lỗi - lines 349, 353, 356, 357)
63. app/employee/lookup/page.tsx (4 lỗi - line 15)
64. app/test-roles/page.tsx (2 lỗi - line 157)
65. components/advanced-salary-import.tsx (4 lỗi - lines 633-634, 701)
66. components/column-mapping-dialog.tsx (4 lỗi - lines 610, 615, 814)
67. components/payroll-import/ImportErrorModal.tsx (16 lỗi - lines 878, 890, 893-894, 906, 909-910)

---

### C. Lỗi prefer-const (~10 errors - RẤT DỄ)

**Giải pháp**: Đổi let const

68. app/api/admin/import-dual-files/route.ts (lines 449, 476)
69. app/api/admin/import-history/route.ts (line 165)
70. app/api/admin/payroll-export/route.ts (lines 208, 386)
71. app/api/admin/payroll-export-template/route.ts (line 172)
72. app/api/employee/change-password/route.ts (line 178)
73. components/AdvancedConflictResolver.tsx (line 142)
74. components/department/DepartmentDetailModalRefactored.tsx (line 241)
75. components/SupervisorDashboard.tsx (line 271)
76. lib/management-signature-utils.ts (line 209)

---

## PHẦN 2: CHIẾN LƯỢC THỰC HIỆN

### Giai đoạn 1: Sửa lỗi ERRORS dễ (1-2 giờ)

**Bước 1.1: Sửa react/no-unescaped-entities (~35 lỗi)**

- Tìm kiếm pattern: " trong JSX
- Thay thế: Wrap trong {\...\}
- Ước tính: 30 phút

**Bước 1.2: Sửa prefer-const (~10 lỗi)**

- Tìm kiếm: let không reassign
- Thay thế: const
- Ước tính: 15 phút

**Bước 1.3: Sửa JWT verification (~15 lỗi)**

- Thay thế: s any s JWTPayload
- Ước tính: 30 phút

### Giai đoạn 2: Sửa lỗi ERRORS trung bình (2-3 giờ)

**Bước 2.1: API routes đơn giản (~30 lỗi)**

- Dùng Record<string, unknown> cho generic objects
- Định nghĩa simple interfaces
- Ước tính: 2 giờ

**Bước 2.2: Components đơn giản (~20 lỗi)**

- Props types, State types
- Event handler types
- Ước tính: 1 giờ

### Giai đoạn 3: Sửa lỗi ERRORS khó (3-4 giờ)

**Bước 3.1: import-dual-files.ts (26 lỗi)**

- Định nghĩa đầy đủ interfaces
- Ước tính: 1.5 giờ

**Bước 3.2: generate-import-template.ts (9 lỗi)**

- Định nghĩa Excel template types
- Ước tính: 1 giờ

**Bước 3.3: Lib files phức tạp (~30 lỗi)**

- advanced-excel-parser.ts
- payroll-validation.ts
- security-middleware.ts
- Ước tính: 1.5 giờ

### Giai đoạn 4: Sửa WARNINGS (Tùy chọn - 2-3 giờ)

**Bước 4.1: Xóa unused imports/variables (~180 warnings)**

- Automated với ESLint autofix
- Ước tính: 1 giờ

**Bước 4.2: Sửa exhaustive-deps (~30 warnings)**

- Review từng case
- Thêm dependencies hoặc disable rule
- Ước tính: 1-2 giờ

---

## PHẦN 3: CHECKLIST THỰC HIỆN

### Errors (Bắt buộc)

- [ ] Giai đoạn 1.1: Sửa 35 lỗi react/no-unescaped-entities
- [ ] Giai đoạn 1.2: Sửa 10 lỗi prefer-const
- [ ] Giai đoạn 1.3: Sửa 15 lỗi JWT verification
- [ ] Giai đoạn 2.1: Sửa 30 lỗi API routes đơn giản
- [ ] Giai đoạn 2.2: Sửa 20 lỗi components đơn giản
- [ ] Giai đoạn 3.1: Sửa 26 lỗi import-dual-files.ts
- [ ] Giai đoạn 3.2: Sửa 9 lỗi generate-import-template.ts
- [ ] Giai đoạn 3.3: Sửa 30 lỗi lib files phức tạp
- [ ] Chạy
      pm run lint 0 errors
- [ ] Chạy
      pm run typecheck 0 errors
- [ ] Chạy
      pm run build Success

### Warnings (Tùy chọn)

- [ ] Giai đoạn 4.1: Xóa 180 unused vars
- [ ] Giai đoạn 4.2: Sửa 30 exhaustive-deps
- [ ] Chạy
      pm run lint 0 warnings

---

## PHẦN 4: TỔNG KẾT

**Tổng thời gian ước tính**: 8-12 giờ làm việc

**Ưu tiên**:

1. Errors trước (bắt buộc để deploy)
2. Warnings sau (tùy chọn, cải thiện code quality)

**Khuyến nghị**:

- Thực hiện theo từng giai đoạn
- Commit sau mỗi giai đoạn hoàn thành
- Test kỹ trước khi deploy
- Có thể chia nhỏ thành nhiều PR

**Lợi ích**:

- Deploy thành công lên Vercel
- Code quality cao hơn
- Type safety tốt hơn
- Dễ maintain hơn
- Ít bugs hơn trong tương lai
