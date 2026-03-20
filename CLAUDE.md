# CLAUDE.md

When asked about the codebase, project structure, or to find code, always use the augment-context-engine MCP tool (codebase-retrieval) in the root workspace first before reading individual files.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

# Hệ Thống Quản Lý Lương MAY HÒA THỌ ĐIỆN BÀN

## 🔧 Môi Trường Phát Triển

### Node Version

- **Node.js**: v22.17.0+ (yêu cầu >= 20.9.0)
- **Package Manager**: npm (primary), pnpm/bun (optional)

### Commands Chính

```bash
# Development
npm run dev                    # Start dev server with Turbopack on localhost:3000

# Build & Production
npm run build                  # Build Next.js production (Turbopack enabled)
npm start                      # Start production server

# Code Quality (QUAN TRỌNG - chạy sau mỗi lần code)
npm run format                 # Format code với Prettier
npm run lint                   # Check ESLint errors (ESLint 9 Flat Config)
npm run lint:fix               # Auto-fix ESLint errors
npm run typecheck              # Check TypeScript errors

# Workflow đầy đủ sau khi viết code:
npm run format && npm run lint && npm run typecheck

# Database Migrations
node scripts/run-bulk-signature-migrations.js
```

---

## 📊 Kiến Trúc Hệ Thống

### Tech Stack

- **Frontend**: Next.js 16.2.0 App Router, React 19.2.4, TypeScript 5
- **Styling**: Tailwind CSS 3.4.17, shadcn/ui components
- **Backend**: Next.js API Routes
- **Database**: Supabase PostgreSQL với Row Level Security (RLS)
- **Authentication**: JWT-based với bcrypt hashing
- **File Processing**: xlsx, xlsx-js-style cho Excel import/export
- **Bundler**: Turbopack (default trong Next.js 16)

### Cấu Trúc Dự Án

```
app/
├── admin/              # Admin dashboard & management
├── api/                # API routes
│   ├── admin/          # Admin-only APIs
│   ├── auth/           # Authentication APIs
│   ├── payroll/        # Payroll data APIs
│   └── management-signature/  # Management signature APIs
├── employee/           # Employee self-service
├── director/           # Director dashboard
├── accountant/         # Accountant dashboard
├── reporter/           # Reporter dashboard
├── manager/            # Manager dashboard
└── supervisor/         # Supervisor dashboard

components/
├── ui/                 # shadcn/ui base components
├── admin/              # Admin-specific components
├── signature/          # Signature components
└── payroll-import/     # Import components

lib/
├── auth.ts                    # Authentication logic
├── auth-middleware.ts         # Role-based auth middleware
├── payroll-validation.ts      # Validation rules
├── advanced-excel-parser.ts   # Excel parsing engine
├── column-alias-config.ts     # Column mapping system
├── api-error-handler.ts       # Error handling utilities
└── hooks/                     # Custom React hooks

scripts/
└── supabase-setup/     # Database migration scripts
```

---

## 🔑 Hệ Thống Authentication & Authorization

### Role-Based Access Control (RBAC)

Hệ thống có 8 roles với permissions khác nhau:

1. **admin**: Full access tất cả chức năng
2. **giam_doc** (Giám Đốc): Xem và ký duyệt lương tất cả departments được phân quyền
3. **ke_toan** (Kế Toán): Xem và ký duyệt lương, quản lý tài chính
4. **nguoi_lap_bieu** (Người Lập Biểu): Tạo và ký duyệt bảng lương
5. **truong_phong** (Trưởng Phòng): Xem lương departments được phân quyền
6. **to_truong** (Tổ Trưởng): Xem lương department của mình
7. **van_phong** (Văn Phòng): Quản lý thông tin nhân viên
8. **nhan_vien** (Nhân Viên): Chỉ xem lương của mình

### Authentication Flow

- **JWT-based authentication** với `lib/auth.ts`
- **Middleware protection** tại `middleware.ts` cho protected routes
- **Role verification** thông qua `lib/auth-middleware.ts`
- **Password hashing** với bcrypt (12 rounds)
- **CCCD verification** cho employee login

### Special Authentication Rules

- Username "admin" bị block hoàn toàn (security measure)
- Admin users được lưu trong bảng `admin_users` riêng
- Employees login bằng `employee_id` + password hoặc `employee_id` + CCCD
- JWT payload bao gồm: `username`, `employee_id`, `role`, `department`, `allowed_departments`, `permissions`

---

## 🗄️ Database Schema (Supabase PostgreSQL)

### Core Tables

#### 1. employees

Thông tin nhân viên

- **PK**: `employee_id` (VARCHAR, business key)
- **Important fields**: `full_name`, `cccd_hash`, `department`, `chuc_vu`, `password_hash`
- **RLS Policies**: Employees chỉ xem được data của mình, managers xem theo department

#### 2. payrolls

Dữ liệu lương với 39 cột từ Excel + metadata

- **PK**: `id` (SERIAL)
- **Unique constraint**: (`employee_id`, `salary_month`) - 1 record/employee/month
- **Signature fields**: `is_signed`, `signed_at`, `signed_by_name`, `signature_ip`, `signature_device`
- **39 salary fields**: Hệ số lương, ngày công, phụ cấp, thuế, bảo hiểm, lương thực nhận
- **Key field**: `tien_luong_thuc_nhan_cuoi_ky` - lương thực nhận final

#### 3. signature_logs

Log chi tiết ký tên

- **Unique constraint**: (`employee_id`, `salary_month`) - chỉ ký 1 lần/tháng
- **Tracking**: `signed_at`, `signature_ip`, `signature_device`, `signed_by_admin_id`

#### 4. management_signatures

Chữ ký quản lý (3 loại: giam_doc, ke_toan, nguoi_lap_bieu)

- **Unique constraint**: (`salary_month`, `signature_type`) WHERE `is_active = true` - mỗi role ký 1 lần/tháng cho tất cả loại lương
- **Vietnam timezone handling**: All timestamps use Vietnam time (+7 hours)

#### 5. department_permissions

Phân quyền department cho managers

- **Many-to-many**: employee_id <-> departments
- **Tracking**: `granted_by`, `granted_at`

#### 6. admin_bulk_signature_logs

Log bulk signature operations

- **Tracking**: batch_id, admin_id, statistics, errors, duration

#### 7. column_aliases & import_mapping_configs

Hệ thống column mapping cho Excel import (xem phần Excel System)

### Database Functions

- `auto_sign_salary()`: Ký lương tự động với timestamp tracking
- `bulk_sign_salaries()`: Bulk signature với error handling
- `get_employee_salary_detail()`: Query chi tiết lương
- `update_employee_password()`: Cập nhật password atomic

---

## 📥 Excel Import System (Core Business Logic)

### Architecture Overview

Hệ thống import Excel phức tạp với **flexible column mapping** và **alias management**:

```
Excel File → Column Detection → Auto-Mapping with Aliases → Validation → Database Import
           ↓
    Saved Configurations (import_mapping_configs)
           ↓
    Column Aliases Database (column_aliases)
```

### Key Files

- `lib/advanced-excel-parser.ts`: Core parsing engine
- `lib/column-alias-config.ts`: Alias management & mapping types
- `lib/payroll-validation.ts`: 39-field validation rules
- `components/advanced-salary-import.tsx`: Import UI component

### Column Mapping System

**3 loại mapping**:

1. **Exact match**: Tên cột Excel trùng 100% với database field
2. **Alias match**: Dùng `column_aliases` table để map tên khác nhau
3. **Manual mapping**: User chọn mapping thủ công

**Confidence scoring**:

- HIGH (≥80): Auto-apply
- MEDIUM (50-79): Suggest với confirmation
- LOW (<50): Require manual review

### Dual File Import

Hệ thống hỗ trợ import **2 files Excel cùng lúc** (File 1: thông tin chính, File 2: thông tin bổ sung):

- API endpoint: `/api/admin/import-dual-files`
- Merge logic: Combine data từ 2 files theo `employee_id`
- Duplicate strategy: skip, overwrite, merge

### Special Import Features

1. **T13 Auto-Detection**: Tự động phát hiện lương tháng 13 từ `salary_month` pattern
   - Pattern: `/^\d{4}-(13|T13)$/i` (ví dụ: "2024-13", "2024-T13")
   - Auto-set `payroll_type = "t13"` nếu match, ngược lại `payroll_type = "monthly"`
   - Không cần checkbox hay flag từ frontend
2. **Auto-fix data**: Tự động sửa lỗi format (số âm, format date, trim spaces)
3. **Duplicate detection**: Phát hiện và handle duplicates theo strategy
   - Duplicate key: `(employee_id, salary_month)` - chỉ 2 cột
   - `payroll_type` không tham gia vào duplicate check
   - Khi import lại cùng employee + month → tự động UPDATE record cũ
4. **Cross-field validation**: Validate tổng lương = lương cơ bản + phụ cấp + thưởng - khấu trừ
5. **Batch processing**: Import theo batch với error tracking
6. **Rollback support**: Transaction-based import với rollback on error

### Column Alias Management

- **Storage**: `column_aliases` table với confidence_score
- **CRUD**: Full CRUD operations qua UI và API
- **Sync**: Real-time sync across browser tabs (BroadcastChannel + localStorage)
- **Import/Export**: JSON format cho backup/restore configs

### Import Validation Rules

**Required fields**:

- `employee_id`, `salary_month`

**Numeric validation**:

- Salary fields: >= 0
- Work hours: 0-744 hours/month
- Insurance: 0-100% of salary

**Cross-field validation**:

- `tong_cong_tien_luong` ≈ sum of salary components (±10% tolerance)
- `tien_luong_thuc_nhan_cuoi_ky` = gross - deductions (±10% tolerance)

---

## ✍️ Signature System (Core Business Logic)

### Employee Signature Flow

1. Employee login → View payroll → Click "Ký Nhận"
2. Call `auto_sign_salary()` function
3. Update `payrolls.is_signed = true`, `signed_at = Vietnam time`
4. Insert to `signature_logs` với tracking info
5. Return success với `signed_by_name` = employee name

### Management Signature Flow (3-tier approval)

**3 loại chữ ký quản lý** cần thiết cho mỗi tháng:

1. **giam_doc** (Giám Đốc)
2. **ke_toan** (Kế Toán)
3. **nguoi_lap_bieu** (Người Lập Biểu)

**Workflow**:

- Each role có thể ký **1 lần duy nhất** cho mỗi tháng
- Lưu vào `management_signatures` table
- Unique constraint: (`salary_month`, `signature_type`) WHERE `is_active = true`
- API: `/api/management-signature` (POST)

### Bulk Signature Operations

- **API**: `/api/admin/bulk-sign-salary` (POST)
- **Tracking**: Lưu vào `admin_bulk_signature_logs` với batch_id unique
- **Error handling**: Collect errors nhưng không rollback (best-effort approach)
- **Vietnam timezone**: Tất cả timestamps sử dụng Vietnam time (+7 hours)

---

## 🌍 Vietnam Timezone Handling

### Critical Implementation Details

**QUAN TRỌNG**: Hệ thống sử dụng Vietnam timezone (+7 hours) cho TẤT CẢ timestamps

### Database Functions

```sql
-- Tất cả functions phải sử dụng:
v_current_time := CURRENT_TIMESTAMP + INTERVAL '7 hours';
```

### Key Points

- **Signature timestamps**: `signed_at` sử dụng Vietnam time
- **Import timestamps**: `created_at`, `updated_at` sử dụng Vietnam time
- **Management signatures**: `signed_at` sử dụng Vietnam time
- **Utility function**: `getVietnamTimestamp()` trong `lib/utils/vietnam-timezone.ts`

---

## 🔒 Security Features

### Authentication Security

- **CCCD hashing**: bcrypt với 12 rounds
- **Password requirements**: Minimum 6 characters, must contain letters and numbers
- **Rate limiting**: Implemented for password reset và login attempts
- **Account lockout**: After multiple failed password recovery attempts
- **Token expiration**: JWT expires after 24 hours

### Database Security

- **Row Level Security (RLS)**: Enabled cho tất cả tables
- **Service role**: Chỉ dùng trong API routes, không expose client-side
- **Foreign key constraints**: CASCADE delete cho data integrity
- **Unique constraints**: Prevent duplicate signatures và payroll records

### API Security

- **Token verification**: Tất cả protected routes verify JWT
- **Role-based access**: `lib/auth-middleware.ts` enforces role permissions
- **IP tracking**: Track IP cho signatures và password changes
- **Device fingerprinting**: Track device info cho audit trail

---

## 🚨 Special Business Logic & Edge Cases

### 1. Username "admin" Block

**CRITICAL**: Username "admin" bị block hoàn toàn trong `lib/auth.ts`:

```typescript
if (username.toLowerCase() === "admin") {
  return { success: false, error: "Tài khoản không tồn tại" };
}
```

- Admin users phải login qua `admin_users` table
- Không bao giờ dùng username "admin" cho bất kỳ account nào

### 2. Signature Unique Constraint

- Mỗi employee chỉ ký **1 lần duy nhất** cho mỗi tháng
- Database constraint: `UNIQUE(employee_id, salary_month)` trong `signature_logs`
- Management signatures: `UNIQUE(salary_month, signature_type, is_active)`

### 3. Department Permissions Logic

**Quan trọng**: Department permissions quyết định data access:

- `giam_doc`, `ke_toan`, `nguoi_lap_bieu`, `truong_phong`: Access theo `allowed_departments[]`
- `to_truong`: Chỉ access department của mình (`department` field)
- `nhan_vien`: Chỉ access data của mình (`employee_id`)
- `admin`: Access tất cả (no filter)

### 4. Excel Column Mapping Priority

**Mapping resolution order**:

1. **Saved configuration** (nếu có) → highest priority
2. **Exact match** → database field name = Excel column name
3. **Alias match** → từ `column_aliases` table
4. **Fuzzy match** → similarity algorithm
5. **Manual mapping** → user selection

### 5. Payroll Import Duplicate Strategy

3 strategies khi gặp duplicate `(employee_id, salary_month)`:

- **skip**: Bỏ qua record mới, giữ record cũ
- **overwrite**: Xóa record cũ, thêm record mới
- **merge**: Merge non-empty fields từ record mới vào record cũ

### 6. Cross-Field Validation Tolerance

**Important**: Validation có tolerance ±10% cho tính toán lương:

```typescript
// lib/payroll-validation.ts
Math.abs(actual - expected) > expected * 0.1; // 10% tolerance
```

Lý do: Làm tròn và công thức tính khác nhau có thể gây sai lệch nhỏ

### 7. Vietnam Time Implementation

**CRITICAL**: Supabase database ở UTC timezone, cần convert:

```typescript
// lib/utils/vietnam-timezone.ts
export function getVietnamTimestamp(): string {
  const now = new Date();
  const vietnamTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return vietnamTime.toISOString();
}
```

- Tất cả API responses include Vietnam time
- Database functions add `+ INTERVAL '7 hours'` cho timestamps

---

## 🛠️ Development Workflow

### Path Aliases

- **@/**: Root directory alias (configured trong `tsconfig.json`)
- Examples: `@/lib/auth`, `@/components/ui/button`

### Type Safety

- **TypeScript strict mode enabled**
- Run `npm run typecheck` after code changes
- Import types: `import type { ... }` cho type-only imports

### Common Issues & Solutions

#### Issue: TypeScript errors về Supabase types

**Solution**: Check `utils/supabase/server.ts` và `utils/supabase/client.ts` cho correct client initialization

#### Issue: JWT token expired

**Solution**: Token expires sau 24h, user cần login lại

#### Issue: Import fails với "Column not found"

**Solution**:

1. Check column aliases trong database
2. Verify mapping configuration
3. Review `lib/advanced-excel-parser.ts` detection logic

#### Issue: Timezone mismatch trong signatures

**Solution**: Đảm bảo sử dụng `getVietnamTimestamp()` function thay vì `new Date()`

---

## 📝 Testing

### Test Structure

- **Test files**: `__tests__/` folders hoặc `*.test.ts` files
- **Test framework**: Jest + Testing Library
- **Run tests**: `npm test` (if configured)

### Key Test Areas

1. **Authentication**: Login, password reset, CCCD verification
2. **Role permissions**: Verify access control for each role
3. **Excel import**: Column mapping, validation, error handling
4. **Signature flow**: Employee signatures, management signatures
5. **Timezone handling**: Verify Vietnam time conversion

---

## 🚀 Deployment

### Environment Variables

Required in `.env.local` (see `.env.example`):

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
JWT_SECRET=your_jwt_secret_key_change_this_in_production
NODE_ENV=production
```

### Build Configuration

- **next.config.mjs**:
  - `output: 'standalone'` for Docker deployment
  - `turbopack: {}` - Turbopack enabled by default
  - `typescript.ignoreBuildErrors: true`
- **ESLint**: Sử dụng ESLint 9 Flat Config (`eslint.config.mjs`)
- **Docker support**: `Dockerfile` và `compose.yml` available

### Database Migrations

Run scripts trong `scripts/supabase-setup/` theo thứ tự số:

```bash
01-create-employees-table.sql
02-create-payrolls-table.sql
03-create-signature-logs-table.sql
# ... continue in order
```

---

## 📚 Key Documentation Files

- **README.md**: Overview và setup instructions
- **docs/flexible-column-mapping-system.md**: Chi tiết Excel mapping system
- **docs/management-signature-business-logic.md**: Management signature workflow
- **docs/timezone-fix-guide.md**: Vietnam timezone implementation
- **analysis.md**: System analysis và architecture decisions
