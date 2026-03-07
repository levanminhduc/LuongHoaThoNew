# Tóm Tắt Codebase - Hệ Thống Quản Lý Lương MAY HÒA THỌ ĐIỆN BÀN

**Cập nhật:** 2026-03-07
**Tổng LOC ước tính:** ~87,000

---

## 1. Tổng Quan Cấu Trúc

```
LuongHoaThoNew/
├── app/                    # Next.js App Router
├── components/             # React components
├── lib/                    # Business logic, utilities
├── utils/supabase/         # Supabase client setup
├── types/                  # TypeScript type definitions
├── scripts/                # Build/migration scripts
│   └── supabase-setup/     # ~30 SQL migration files (01-29+)
├── hooks/                  # Root-level React hooks
├── styles/                 # Global CSS
├── public/                 # Static assets
├── docs/                   # Documentation (bạn đang đọc)
├── plans/                  # Development plans
├── Dockerfile              # Docker multi-stage build
├── compose.yml             # Docker Compose dev
├── docker-compose.prod.yml # Docker Compose production
├── next.config.mjs         # Next.js config (standalone + Turbopack)
├── tsconfig.json           # TypeScript config
├── eslint.config.mjs       # ESLint 9 Flat Config
└── CLAUDE.md               # AI coding instructions
```

---

## 2. Thư Mục `app/` - Next.js App Router

### Trang Dashboard theo Role

| Thư Mục | Role | Chức Năng Chính |
|---------|------|-----------------|
| `app/admin/` | admin | Quản trị toàn hệ thống |
| `app/director/` | giam_doc | Xem báo cáo & ký duyệt |
| `app/accountant/` | ke_toan | Quản lý tài chính & ký duyệt |
| `app/reporter/` | nguoi_lap_bieu | Lập bảng lương & ký duyệt |
| `app/manager/` | truong_phong | Xem lương phòng ban |
| `app/supervisor/` | to_truong | Xem lương tổ |
| `app/employee/` | nhan_vien | Tra cứu lương cá nhân |

### Trang Admin Chi Tiết (`app/admin/`)

```
app/admin/
├── dashboard/              # Dashboard tổng quan (admin-dashboard-v2.tsx ~493 LOC)
├── employee-management/    # Quản lý nhân viên
├── payroll-management/     # Quản lý bảng lương
├── payroll-import-export/  # Import/Export Excel
├── column-mapping-config/  # Cấu hình column mapping
├── department-management/  # Quản lý phòng ban
├── data-validation/        # Kiểm tra dữ liệu
├── bulk-signature/         # Ký hàng loạt
├── attendance-import/      # Import chấm công
├── attendance-list/        # Danh sách chấm công
├── password-reset-history/ # Lịch sử reset mật khẩu
├── test-column-mapping/    # Test column mapping (dev tool)
└── login/                  # Đăng nhập admin
```

### API Routes (`app/api/`)

```
app/api/
├── admin/                  # Admin-only APIs
│   ├── bulk-sign-salary/   # POST: Bulk ký lương
│   ├── column-aliases/     # CRUD: Column aliases
│   ├── departments/        # CRUD: Quản lý phòng ban
│   ├── department-permissions/ # Quản lý phân quyền
│   ├── employee-management/ # CRUD: Nhân viên
│   ├── import-dual-files/  # POST: Dual-file import
│   ├── mapping-configurations/ # CRUD: Mapping configs
│   ├── payroll-export-template/ # GET: Export template
│   └── payroll-import/     # POST: Import lương
├── auth/                   # Authentication
│   ├── login/              # POST: Đăng nhập
│   ├── logout/             # POST: Đăng xuất
│   └── verify/             # GET: Verify JWT
├── payroll/                # Payroll data
│   ├── my-departments/     # GET: Lương theo phòng ban
│   └── [employee_id]/      # GET: Lương nhân viên
├── management-signature/   # POST: Ký quản lý
├── signature-status/[month]/ # GET: Trạng thái ký
├── signature-progress/[month]/ # GET: Tiến độ ký
└── signature-history/      # GET: Lịch sử ký
```

---

## 3. Thư Mục `components/` - React Components

### Components Lớn (> 500 LOC)

| File | LOC | Mô Tả |
|------|-----|-------|
| `SupervisorDashboard.tsx` | ~1197 | Dashboard Tổ Trưởng |
| `ManagerDashboard.tsx` | ~1066 | Dashboard Trưởng Phòng |
| `DepartmentDetailModal.tsx` | ~983 | Modal chi tiết phòng ban |
| `column-mapping-dialog.tsx` | ~858 | Dialog mapping cột Excel |
| `EmployeeManagementModal.tsx` | ~807 | Modal quản lý nhân viên |
| `AdvancedConflictResolver.tsx` | ~749 | Giải quyết xung đột import |
| `advanced-salary-import.tsx` | ~722 | Component import lương |
| `OverviewModal.tsx` | ~671 | Modal tổng quan |
| `EmployeeDashboard.tsx` | ~623 | Dashboard Nhân Viên |

### Nhóm Components

```
components/
├── ui/                     # 59 shadcn/ui base components
│   └── (button, card, dialog, form, table, sidebar, chart...)
├── admin/                  # 13 Admin-specific components
├── signature/              # 8 Signature components
│   └── (ManagementSignatureForm, SignatureStatusBadge...)
├── department/             # 7 Department components
│   └── (DepartmentDetailModalRefactored, DepartmentSummaryCards,
│       EmployeeTable, SalaryAnalysisTab, DepartmentChartsTab, ExportTab)
├── payroll-import/         # Components import lương
├── shared/                 # 2 Shared utilities
├── patterns/               # Pattern components
└── examples/               # 3 Example components
```

### Components Root Quan Trọng

| File | Chức Năng |
|------|-----------|
| `RoleBasedRouter.tsx` | Điều hướng theo role sau khi đăng nhập |
| `TickerGate.tsx` | Feature flag gate |
| `TopMarquee.tsx` | Thông báo chạy ngang |
| `error-boundary.tsx` | Error boundary React |
| `client-wrapper.tsx` | SSR/CSR wrapper |
| `safe-client-component.tsx` | Client component an toàn |

---

## 4. Thư Mục `lib/` - Business Logic

### Files Cốt Lõi

| File | Chức Năng |
|------|-----------|
| `auth.ts` | JWT authentication, bcrypt hashing, verifyToken |
| `auth-middleware.ts` | Role-based access control middleware |
| `advanced-excel-parser.ts` | Engine parse Excel với smart column mapping |
| `column-alias-config.ts` | TypeScript types cho column alias system |
| `payroll-validation.ts` | 39-field validation rules với ±10% tolerance |
| `api-error-handler.ts` | Centralized error handling cho API routes |
| `enhanced-import-validation.ts` | Validation nâng cao cho import |
| `management-signature-utils.ts` | Utilities cho management signature |
| `management-signature-auth.ts` | Auth middleware cho signature routes |
| `payroll-field-definitions.ts` | Định nghĩa 39 trường lương |
| `payroll-select.ts` | Optimized payroll select queries |
| `security-middleware.ts` | Rate limiting, security headers |
| `audit-service.ts` | Audit logging service |
| `notification-service.ts` | Notification system |
| `features.ts` | Feature flags |
| `maintenance.ts` | Maintenance mode |

### `lib/utils/` - Utility Functions

| File | Chức Năng |
|------|-----------|
| `vietnam-timezone.ts` | `getVietnamTimestamp()` - Vietnam time (+7h) |
| `date-formatter.ts` | Format ngày tháng hiển thị |
| `payroll-formatting.ts` | Format số tiền lương |
| `payroll-transformer.ts` | Transform payroll data |
| `header-mapping.ts` | Excel header mapping utilities |
| `high-precision-formatting.ts` | Format số thực chính xác cao |
| `browser-detection.ts` | Phát hiện browser/device |

### `lib/hooks/` - Custom React Hooks

| File | Chức Năng |
|------|-----------|
| `use-async-action.ts` | Hook cho async operations |
| `use-header-mapping.ts` | Hook quản lý header mapping |
| `useImportPreview.ts` | Hook preview import |
| `use-mapping-config.ts` | Hook quản lý mapping config |
| `useClientOnly.ts` | Hook SSR-safe client rendering |
| `useMobile.ts` | Hook responsive detection |

### `lib/validations/` - Validation Schemas (Zod)

5 schema files cho các domain: payroll, employee, signature, import, mapping.

### `lib/stores/` - State Management

2 store files (Zustand v5 + immer) cho global state management.

---

## 5. Thư Mục `scripts/supabase-setup/` - Database Migrations

55 file SQL, chạy theo thứ tự số (01-29+):

| Nhóm | Files | Nội Dung |
|------|-------|---------|
| Core tables | 01-09 | employees, payrolls, signature_logs, indexes, RLS, functions, sample data |
| Import system | 10-16 | Dual-file import, column aliases, mapping configs, audit, payroll columns |
| Advanced features | 17-53 | Management signatures, department management, timezone fixes, optimizations |

Xem chi tiết tại [database-schema-update-summary.md](./database-schema-update-summary.md).

---

## 6. `utils/supabase/` - Supabase Client Setup

| File | Chức Năng |
|------|-----------|
| `server.ts` | Server-side Supabase client (dùng service role key) |
| `client.ts` | Client-side Supabase client (dùng anon key) |
| `middleware.ts` | Supabase auth middleware integration |

---

## 7. Patterns Quan Trọng Trong Codebase

### Pattern 1: API Route Handler
```typescript
// app/api/[route]/route.ts
import { verifyToken } from "@/lib/auth-middleware";
import { createServiceClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  const auth = verifyToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  // ... business logic
}
```

### Pattern 2: Vietnam Timezone
```typescript
import { getVietnamTimestamp } from "@/lib/utils/vietnam-timezone";
const timestamp = getVietnamTimestamp(); // ISO string, Vietnam time
```

### Pattern 3: Role Check
```typescript
// Sử dụng auth-middleware
const allowedRoles = ["admin", "giam_doc"];
if (!allowedRoles.includes(auth.user.role)) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

---

## 8. Thống Kê Codebase

| Thư Mục | Số Files (ước tính) | LOC (ước tính) |
|---------|---------------------|----------------|
| `app/` | ~146 | ~37,700 |
| `components/` | ~122 | ~29,600 |
| `lib/` | ~51 | ~10,000 |
| `scripts/supabase-setup/` | ~30 | ~8,000 |
| `utils/` | 6 | ~500 |
| `types/` | 4 | ~1,000 |
| Tổng | ~359 | ~87,000 |

---

## 9. Liên Kết Tài Liệu Liên Quan

- [system-architecture.md](./system-architecture.md) - Kiến trúc chi tiết
- [code-standards.md](./code-standards.md) - Chuẩn code
- [flexible-column-mapping-system.md](./flexible-column-mapping-system.md) - Column mapping
- [payroll-import-export-system.md](./payroll-import-export-system.md) - Import/Export
- [management-signature-business-logic.md](./management-signature-business-logic.md) - Signature flow
- [department-management-design.md](./department-management-design.md) - Department design
