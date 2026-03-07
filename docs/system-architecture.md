# Kiến Trúc Hệ Thống - MAY HÒA THỌ ĐIỆN BÀN

**Cập nhật:** 2026-03-07

---

## 1. Tổng Quan Kiến Trúc

Hệ thống theo mô hình **Fullstack Monolith** sử dụng Next.js App Router. Backend logic nằm trong API Routes cùng repo với frontend. Database được quản lý hoàn toàn bởi Supabase (PostgreSQL as a Service).

```
┌─────────────────────────────────────────────────────────┐
│                      Browser / Client                    │
│         React 19 + Tailwind CSS + shadcn/ui             │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────────┐
│               Next.js 16 App Router                      │
│  ┌──────────────────────┐  ┌───────────────────────┐    │
│  │   Server Components  │  │    API Routes          │    │
│  │   (SSR / RSC)        │  │  /api/**               │    │
│  └──────────────────────┘  └──────────┬────────────┘    │
│                                        │                  │
│  ┌─────────────────────────────────────▼──────────────┐  │
│  │              Business Logic Layer (lib/)            │  │
│  │  auth.ts | auth-middleware.ts | payroll-validation  │  │
│  │  advanced-excel-parser | column-alias-config        │  │
│  └─────────────────────────────────────┬──────────────┘  │
└────────────────────────────────────────┼─────────────────┘
                                         │ Supabase JS SDK
┌────────────────────────────────────────▼─────────────────┐
│                   Supabase (Backend-as-a-Service)         │
│  ┌─────────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │  PostgreSQL DB  │  │     RLS      │  │  Edge Funcs │ │
│  │  (primary data) │  │  (security)  │  │  (optional) │ │
│  └─────────────────┘  └──────────────┘  └─────────────┘ │
└──────────────────────────────────────────────────────────┘
```

---

## 2. Tech Stack Chi Tiết

### 2.1. Frontend

| Công nghệ | Phiên bản | Mục đích |
|-----------|-----------|---------|
| Next.js App Router | 16.1.1 | Framework fullstack, SSR/RSC |
| React | 19.2.3 | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.4.17 | Utility-first styling |
| shadcn/ui | latest | Pre-built UI components |
| Lucide React | latest | Icon library |
| Recharts | latest | Charts (salary analytics) |
| TanStack Table | latest | Data table với sorting/filtering |
| Zustand + immer | 5.x | Client state management |
| xlsx / xlsx-js-style | latest | Excel read/write |
| Turbopack | (built-in) | Bundler (dev + build) |

### 2.2. Backend (API Routes)

| Công nghệ | Mục đích |
|-----------|---------|
| Next.js API Routes | REST endpoints trong `app/api/` |
| jsonwebtoken / jose | JWT generation & verification |
| bcryptjs | Password & CCCD hashing |
| Zod | Input validation schemas |
| react-hook-form + @hookform/resolvers | Form state management |
| Supabase JS SDK | Database client |
| swagger-jsdoc + swagger-ui-react | API documentation (OpenAPI) |

### 2.3. Database & Infrastructure

| Công nghệ | Mục đích |
|-----------|---------|
| Supabase PostgreSQL | Primary database với RLS |
| Supabase Auth (chưa dùng) | Native auth (hiện dùng custom JWT) |
| Docker (standalone) | Container deployment |
| Vercel (optional) | Edge deployment |

---

## 3. Authentication & Authorization Flow

### 3.1. Login Flow

```
User → POST /api/auth/login
  → verifyAdminCredentials() hoặc verifyEmployeeCredentials()
  → bcrypt.compare(password, hash)
  → jwt.sign({ role, employee_id, department, ... })
  → Set HTTP-only cookie + return token
  → RoleBasedRouter.tsx → redirect theo role
```

### 3.2. Protected Route Flow

```
Request → middleware.ts
  → verifyToken(request) trong lib/auth-middleware.ts
  → Decode JWT → check expiry
  → Trả về { user: JWTPayload } hoặc null
  → null → 401 Unauthorized
  → Role check → không đủ quyền → 403 Forbidden
  → Pass to handler
```

### 3.3. JWT Payload Structure

```typescript
interface JWTPayload {
  username: string;
  employee_id: string;
  full_name?: string;
  role: "admin" | "giam_doc" | "ke_toan" | "nguoi_lap_bieu"
      | "truong_phong" | "to_truong" | "van_phong" | "nhan_vien";
  department: string;
  allowed_departments?: string[]; // cho truong_phong
  permissions: string[];
  iat: number;   // issued at
  exp: number;   // expires at (24h)
}
```

### 3.4. RBAC - Ma Trận Quyền Truy Cập

| Role | Import Lương | Xem Lương Tất Cả | Xem Lương Phòng | Xem Lương Bản Thân | Ký Quản Lý |
|------|:---:|:---:|:---:|:---:|:---:|
| admin | ✓ | ✓ | ✓ | ✓ | ✓ |
| giam_doc | — | ✓ | ✓ | ✓ | ✓ (giam_doc) |
| ke_toan | — | ✓ | ✓ | ✓ | ✓ (ke_toan) |
| nguoi_lap_bieu | ✓ | ✓ | ✓ | ✓ | ✓ (nguoi_lap_bieu) |
| truong_phong | — | — | ✓ (assigned) | ✓ | — |
| to_truong | — | — | ✓ (own dept) | ✓ | — |
| van_phong | — | — | — | ✓ | — |
| nhan_vien | — | — | — | ✓ | — |

---

## 4. Database Schema

### 4.1. Core Tables

```
employees
├── employee_id (PK, VARCHAR)
├── full_name
├── cccd_hash (bcrypt)
├── department
├── chuc_vu
├── password_hash (bcrypt)
└── timestamps

payrolls
├── id (PK, SERIAL)
├── employee_id (FK → employees)
├── salary_month (YYYY-MM)
├── payroll_type (monthly | t13)
├── [39 salary fields] (DECIMAL 15,2)
├── is_signed, signed_at, signed_by_name
├── signature_ip, signature_device
└── timestamps

signature_logs
├── id (PK, SERIAL)
├── employee_id (FK)
├── salary_month
├── signed_at (Vietnam time)
├── signature_ip, signature_device
├── signed_by_admin_id
└── UNIQUE(employee_id, salary_month)

management_signatures
├── id (PK, SERIAL)
├── salary_month
├── signature_type (giam_doc | ke_toan | nguoi_lap_bieu)
├── signed_by_id, signed_by_name
├── signed_at (Vietnam time)
├── is_active
└── UNIQUE(salary_month, signature_type) WHERE is_active = true

department_permissions
├── employee_id (FK)
├── department
├── granted_by, granted_at
└── PK(employee_id, department)

column_aliases
├── id, database_field, alias_name
├── confidence_score
└── UNIQUE(database_field, alias_name)
```

### 4.2. Database Functions

| Function | Mục đích |
|----------|---------|
| `auto_sign_salary()` | Ký lương tự động + update payrolls |
| `bulk_sign_salaries()` | Bulk signature với error collection |
| `get_employee_salary_detail()` | Query chi tiết lương |
| `update_employee_password()` | Atomic password update |
| `analyze_payroll_columns()` | Phân tích cột có dữ liệu cho export |

### 4.3. Row Level Security (RLS)

RLS bật trên tất cả bảng. Logic chính:
- `employees`: Service role bypass, anon key theo JWT claims
- `payrolls`: Employee chỉ đọc `employee_id = JWT.employee_id`; managers theo `department` + `allowed_departments`
- `signature_logs`: Chỉ xem của mình hoặc admin
- `management_signatures`: Read-all cho management roles, write theo role match

---

## 5. Excel Import Architecture

Luồng xử lý import đầy đủ:

```
Excel File (.xlsx/.xls)
  │
  ▼
advanced-excel-parser.ts
  ├── Đọc file với thư viện xlsx
  ├── Detect headers (row đầu tiên hoặc heuristic)
  └── autoMapColumnsWithAliases()
        ├── 1. Exact field name match (score 100)
        ├── 2. Exact alias match (score từ alias.confidence_score)
        ├── 3. Fuzzy alias match (score 60-80)
        ├── 4. Fuzzy field name match (score 40-70)
        └── 5. Unresolved → manual mapping required
  │
  ▼
column-mapping-dialog.tsx (UI)
  ├── Hiển thị confidence scores
  ├── Cho phép manual override
  └── Validate không trùng mapping
  │
  ▼
payroll-validation.ts
  ├── Required fields: employee_id, salary_month
  ├── Numeric range checks
  ├── Cross-field validation (±10% tolerance)
  └── T13 auto-detection
  │
  ▼
POST /api/admin/payroll-import
  ├── Batch insert/update theo strategy (skip|overwrite|merge)
  ├── Duplicate key: (employee_id, salary_month)
  ├── Transaction với rollback on error
  └── Return ImportResult với statistics + errors
```

### 5.1. Dual-File Import

`POST /api/admin/import-dual-files` xử lý 2 file cùng lúc:
- File 1: Dữ liệu chính
- File 2: Dữ liệu bổ sung
- Merge theo `employee_id` trước khi insert

---

## 6. Signature System Architecture

### 6.1. Employee Signature Flow

```
Employee → GET /employee/lookup (CCCD verification)
  → View payroll data
  → Click "Ký Nhận"
  → POST /api/payroll/[employee_id] (sign action)
  → DB: auto_sign_salary() function
      ├── UPDATE payrolls SET is_signed=true, signed_at=Vietnam_time
      └── INSERT signature_logs
  → Return { success, signed_by_name, signed_at }
```

### 6.2. Management Signature Flow (3-tier)

```
Manager Login → Dashboard
  → POST /api/management-signature
    Body: { salary_month, signature_type, notes?, device_info? }
  → management-signature-auth.ts: verify role matches signature_type
  → INSERT management_signatures (UNIQUE constraint prevents re-sign)
  → Return { success, signature, updated_status }

Status check: GET /api/signature-status/[month]
  → Returns completion % (employee) + 3 management signature states
```

### 6.3. Bulk Signature (Admin)

```
Admin → POST /api/admin/bulk-sign-salary
  → DB: bulk_sign_salaries() function
  → Best-effort: collect errors, không rollback
  → Log to admin_bulk_signature_logs với batch_id
  → Return { success_count, error_count, errors[] }
```

---

## 7. Data Flow: Timezone

```
Client request với action cần timestamp
  │
  ▼
lib/utils/vietnam-timezone.ts → getVietnamTimestamp()
  toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" })
  → ISO string: "2026-03-07T14:30:00" (represents VN time)
  │
  ▼
Lưu vào DB field (TIMESTAMPTZ hoặc TEXT)
  │
  ▼
Hiển thị lại: đọc trực tiếp, không cần convert thêm
```

**Lưu ý:** Supabase chạy UTC. Mọi timestamp phải được cộng +7h trước khi lưu.

---

## 8. Deployment Architecture

### 8.1. Docker (Production)

```
docker-compose.prod.yml
  │
  ▼
Multi-stage Dockerfile
  ├── Stage 1: base (Node 20.18.1 Alpine)
  ├── Stage 2: deps (npm ci --legacy-peer-deps)
  ├── Stage 3: builder (next build → standalone)
  └── Stage 4: runner (~200MB, non-root user nextjs:nodejs)
  │
  ▼
Container port 3000
  ├── Healthcheck: GET / (30s interval)
  ├── Resources: 2 CPU / 1GB RAM (limits)
  └── Security: read_only, no-new-privileges
```

Chi tiết deploy Docker xem [Docker.md](./Docker.md).

### 8.2. Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=       # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Supabase anon key (client-safe)
SUPABASE_SERVICE_ROLE_KEY=      # Service role (server-only, không expose)
JWT_SECRET=                     # JWT signing secret
NODE_ENV=                       # development | production
```

Xem chi tiết tại [vercel-timezone-fix-guide.md](./vercel-timezone-fix-guide.md) cho Vercel config.

---

## 9. Tài Liệu Liên Quan

| Tài liệu | Nội dung |
|----------|---------|
| [codebase-summary.md](./codebase-summary.md) | Cấu trúc thư mục chi tiết |
| [flexible-column-mapping-system.md](./flexible-column-mapping-system.md) | Column mapping deep-dive |
| [management-signature-api-architecture.md](./management-signature-api-architecture.md) | Signature API design |
| [management-signature-business-logic.md](./management-signature-business-logic.md) | Signature business rules |
| [payroll-import-export-system.md](./payroll-import-export-system.md) | Import/Export system |
| [department-management-design.md](./department-management-design.md) | Department hierarchy design |
| [database-schema-update-summary.md](./database-schema-update-summary.md) | DB schema history |
| [timezone-fix-guide.md](./timezone-fix-guide.md) | Vietnam timezone implementation |
| [Docker.md](./Docker.md) | Docker deployment guide |
