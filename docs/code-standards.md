# Chuẩn Code - Hệ Thống Quản Lý Lương MAY HÒA THỌ ĐIỆN BÀN

**Cập nhật:** 2026-03-07

---

## 1. Nguyên Tắc Chung

- **YAGNI** – Chỉ implement những gì cần thiết hiện tại
- **KISS** – Giải pháp đơn giản nhất có thể
- **DRY** – Không lặp code, tách utility/hook khi dùng lại >= 2 nơi
- Ưu tiên chức năng và khả năng đọc hơn formatting nghiêm ngặt
- Không tạo file mới "enhanced" – cập nhật file hiện có

---

## 2. Ngôn Ngữ & Công Nghệ

| Lớp | Công Nghệ | Phiên Bản |
|-----|-----------|-----------|
| Runtime | Node.js | >= 20.9.0 (dùng v22.17.0+) |
| Framework | Next.js App Router | 16.1.1 |
| UI | React | 19.2.3 |
| Ngôn ngữ | TypeScript (strict) | 5.x |
| Styling | Tailwind CSS | 3.4.17 |
| UI Components | shadcn/ui | latest |
| Database client | Supabase JS | latest |
| Bundler | Turbopack | (mặc định Next.js 16) |
| Linter | ESLint 9 Flat Config | 9.x |
| Formatter | Prettier | latest |

---

## 3. Đặt Tên File

| Loại File | Convention | Ví Dụ |
|-----------|-----------|-------|
| TypeScript/JavaScript | kebab-case | `advanced-excel-parser.ts`, `auth-middleware.ts` |
| React Component (page) | kebab-case | `page.tsx`, `layout.tsx` |
| React Component (standalone) | PascalCase | `ManagerDashboard.tsx`, `RoleBasedRouter.tsx` |
| CSS | kebab-case | `globals.css` |
| SQL migration | `NN-kebab-case.sql` | `01-create-employees-table.sql` |
| Config | kebab-case | `eslint.config.mjs`, `next.config.mjs` |

**Nguyên tắc:** Tên file phải đủ mô tả mục đích mà không cần đọc nội dung.

---

## 4. Giới Hạn Kích Thước File

- **Code file:** Tối đa 200 LOC (khuyến nghị)
- **Doc file:** Tối đa 800 LOC
- Khi vượt giới hạn: tách thành modules nhỏ hơn
- Ưu tiên composition hơn inheritance

---

## 5. TypeScript

### 5.1. Type Imports

```typescript
// Dùng "import type" cho type-only imports
import type { JWTPayload } from "@/lib/auth";
import type { NextRequest } from "next/server";

// Dùng import thường cho values
import { verifyToken } from "@/lib/auth-middleware";
```

### 5.2. Interface vs Type

```typescript
// Interface cho object shapes (API, DB records)
export interface PayrollData {
  employee_id: string;
  salary_month: string;
  tien_luong_thuc_nhan_cuoi_ky: number;
}

// Type cho unions, tuples, utility types
type SignatureRole = "giam_doc" | "ke_toan" | "nguoi_lap_bieu";
type ImportStrategy = "skip" | "overwrite" | "merge";
```

### 5.3. Strict Mode

TypeScript strict mode bật. Không dùng `any` trừ trường hợp đặc biệt có comment giải thích.

### 5.4. Path Aliases

```typescript
// Dùng @/ cho root imports – không dùng relative path dài
import { getVietnamTimestamp } from "@/lib/utils/vietnam-timezone";
import { Button } from "@/components/ui/button";
```

---

## 6. React & Next.js

### 6.1. Server vs Client Components

```typescript
// Server Component (mặc định trong App Router) – không có "use client"
export default async function Page() {
  const data = await fetchData(); // Server-side fetch
  return <div>{data}</div>;
}

// Client Component – cần "use client" khi dùng hooks, events
"use client";
import { useState } from "react";
export function InteractiveComponent() { ... }
```

### 6.2. API Route Handler Pattern

```typescript
// app/api/[route]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth-middleware";
import { createServiceClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  // 1. Verify authentication
  const auth = verifyToken(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Role check
  const allowedRoles = ["admin", "giam_doc"];
  if (!allowedRoles.includes(auth.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 3. Business logic
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.from("table").select("*");
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra" },
      { status: 500 }
    );
  }
}
```

### 6.3. Error Handling

- Luôn dùng `try/catch` trong API routes và async operations
- Log lỗi với `console.error` trước khi return error response
- Không expose chi tiết lỗi internal (stack trace, SQL) ra client
- Dùng `lib/api-error-handler.ts` cho error response chuẩn hóa

### 6.4. Data Fetching

```typescript
// Server-side (recommended)
const supabase = createServiceClient(); // Dùng service role key

// Client-side (chỉ khi cần real-time hoặc user-specific)
const supabase = createClient(); // từ @/utils/supabase/client, dùng anon key + RLS
```

---

## 7. Database & Supabase

### 7.1. Client Selection

| Context | Client | Key |
|---------|--------|-----|
| API Routes (server) | `createServiceClient()` từ `@/utils/supabase/server` | Service Role |
| Client Components | `createClient()` từ `@/utils/supabase/client` | Anon + RLS |

### 7.2. Query Pattern

```typescript
// Luôn handle error
const { data, error } = await supabase
  .from("payrolls")
  .select("employee_id, salary_month, tien_luong_thuc_nhan_cuoi_ky")
  .eq("employee_id", employeeId)
  .eq("salary_month", month)
  .single();

if (error) {
  console.error("Query error:", error);
  throw error;
}
```

### 7.3. Naming Convention Database

| Loại | Convention | Ví Dụ |
|------|-----------|-------|
| Tên bảng | snake_case, số nhiều | `employees`, `payrolls`, `signature_logs` |
| Tên cột | snake_case | `employee_id`, `salary_month`, `tien_luong_thuc_nhan_cuoi_ky` |
| Tên function | snake_case | `auto_sign_salary()`, `get_employee_salary_detail()` |
| Primary key | `id` (SERIAL) hoặc business key | `id`, `employee_id` |
| Foreign key | `{table_singular}_id` | `employee_id` |
| Timestamp | `created_at`, `updated_at`, `signed_at` | — |
| Boolean flags | `is_` prefix | `is_signed`, `is_active` |

---

## 8. Vietnam Timezone

**QUAN TRỌNG:** Mọi timestamp phải dùng Vietnam time (+7h).

```typescript
// ĐÚNG
import { getVietnamTimestamp } from "@/lib/utils/vietnam-timezone";
const signedAt = getVietnamTimestamp();

// SAI – không dùng new Date() trực tiếp cho timestamp lưu DB
const signedAt = new Date().toISOString(); // UTC, sai timezone
```

Trong SQL functions:
```sql
-- ĐÚNG
v_current_time := CURRENT_TIMESTAMP + INTERVAL '7 hours';

-- SAI
v_current_time := CURRENT_TIMESTAMP; -- UTC
```

---

## 9. Authentication & Security

### 9.1. JWT Token Check

```typescript
import { verifyToken } from "@/lib/auth-middleware";

const auth = verifyToken(request);
if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

// Truy cập user info
const { role, employee_id, department, allowed_departments } = auth.user;
```

### 9.2. Username "admin" Block

Username "admin" bị block hoàn toàn trong `lib/auth.ts`. Không bao giờ tạo user với username "admin".

### 9.3. Password Hashing

```typescript
import bcrypt from "bcryptjs";
const hash = await bcrypt.hash(password, 12); // 12 rounds
```

### 9.4. Input Validation

Dùng Zod cho validation input từ request:

```typescript
import { z } from "zod";

const schema = z.object({
  salary_month: z.string().regex(/^\d{4}-\d{2}$/),
  signature_type: z.enum(["giam_doc", "ke_toan", "nguoi_lap_bieu"]),
});

const result = schema.safeParse(body);
if (!result.success) {
  return NextResponse.json({ error: "Invalid input" }, { status: 400 });
}
```

---

## 10. Styling với Tailwind CSS

### 10.1. Class Order

Theo thứ tự: layout → spacing → sizing → typography → color → effects

```tsx
// Ví dụ
<div className="flex items-center gap-4 p-4 w-full text-sm font-medium text-gray-700 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
```

### 10.2. shadcn/ui Components

Luôn dùng shadcn/ui components thay vì tạo mới:

```typescript
// Dùng shadcn components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
```

### 10.3. Responsive Design

```tsx
// Mobile-first với Tailwind breakpoints
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

---

## 11. Workflow Kiểm Tra Code

Chạy sau mỗi lần code thay đổi:

```bash
npm run format        # Format với Prettier
npm run lint          # ESLint check
npm run typecheck     # TypeScript check
```

Hoặc tất cả cùng lúc:

```bash
npm run format && npm run lint && npm run typecheck
```

**Không commit** khi còn TypeScript errors hoặc syntax errors.

---

## 12. Comments & Documentation

### 12.1. Khi Nào Comment

```typescript
// Comment cho logic phức tạp, không phải code hiển nhiên
// QUAN TRỌNG: Username "admin" bị block hoàn toàn vì lý do bảo mật
if (username.toLowerCase() === "admin") {
  return { success: false, error: "Tài khoản không tồn tại" };
}

// TODO: Sẽ refactor khi có thêm cache layer
```

### 12.2. JSDoc cho Public Functions

```typescript
/**
 * Lấy timestamp theo Vietnam timezone (+7h)
 * @returns ISO string dạng Vietnam time
 */
export function getVietnamTimestamp(): string {
  const now = new Date();
  const vietnamTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return vietnamTime.toISOString();
}
```

---

## 13. Import/Export Conventions

```typescript
// Named exports cho utilities và hooks
export function getVietnamTimestamp() { ... }
export const SALARY_FIELDS = [...];

// Default export cho React components (pages và components)
export default function ManagerDashboard() { ... }

// Re-export từ index.ts của module
// lib/utils/index.ts
export { getVietnamTimestamp } from "./vietnam-timezone";
export { formatCurrency } from "./payroll-formatting";
```

---

## 14. Excel Import Specifics

### 14.1. Trường Bắt Buộc

Khi import Excel, 2 trường bắt buộc: `employee_id` và `salary_month`.

### 14.2. Validation Tolerance

Cross-field validation cho lương có tolerance ±10%:

```typescript
// lib/payroll-validation.ts
const tolerance = expected * 0.1;
if (Math.abs(actual - expected) > tolerance) {
  // Validation error
}
```

### 14.3. T13 Auto-Detection

```typescript
// Pattern nhận dạng tháng 13
const T13_PATTERN = /^\d{4}-(13|T13)$/i;
const payrollType = T13_PATTERN.test(salaryMonth) ? "t13" : "monthly";
```

### 14.4. Duplicate Key

Duplicate check chỉ dựa trên `(employee_id, salary_month)`. `payroll_type` không tham gia duplicate check.
