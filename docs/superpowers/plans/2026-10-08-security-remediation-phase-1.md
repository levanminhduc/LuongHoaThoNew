# Security Remediation Phase 1 (CRITICAL + HIGH) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đóng toàn bộ 4 CRITICAL + 20 HIGH trong `vbsec-reports/scan-2026-10-08-092725.md`: auth kernel chuẩn hoá (cookie httpOnly, `aud`, `pv` revocation), chặn leo quyền qua `chuc_vu`, bỏ fallback `employee_id+cccd`, lockout + rate-limit trong Postgres, department scope cho payroll/export, whitelist cột payroll, guard upload, hardening SQL function/RLS, nâng dependency.

**Architecture:** Một kernel xác thực duy nhất trong `lib/auth-middleware.ts` (`readAuthToken` → `decodeAdminToken` (`jwt.verify` với `algorithms`/`audience` → zod `JWTPayloadSchema`), token admin chỉ sống trong cookie httpOnly, client lấy user qua `GET /api/admin/me`. Nhân viên chỉ xác thực bằng session token `aud=employee_session`. Lockout/rate-limit là RPC Postgres (`record_login_failure`, `consume_rate_limit`) để sống qua nhiều instance Vercel. Hai migration mới `36-auth-lockout-and-rate-limit.sql` và `37-harden-functions-and-rls.sql` do user chạy tay trên Supabase prod **sau khi backup**.

**Tech Stack:** Next.js 16 App Router (`proxy.ts`), React 19, TS strict, zod ^4.3.6 (`z.looseObject`, `z.partialRecord`), jsonwebtoken ^9.0.2, jest 30 (`next/jest`, jsdom mặc định; test node cần `/** @jest-environment node */`), Supabase PostgreSQL, bcryptjs, acorn (devDependency mới).

**Spec:** `docs/superpowers/specs/2026-10-08-security-remediation-design.md` (§2–§7, §8.1). Báo cáo scan gốc: `vbsec-reports/scan-2026-10-08-092725.md`.

## Global Constraints

- Toàn bộ UI, thông báo lỗi, commit message **tiếng Việt**; tên biến/hàm/file tiếng Anh.
- **KHÔNG viết comment trong code TS/TSX.** File `.sql` trong `scripts/supabase-setup/` được phép có header comment theo mẫu `-- SCRIPT NN: ...`.
- Không tạo file `*-v2`, `*-enhanced`. Sửa thẳng file hiện có.
- Trần dòng: API route 100, hook/zod/util 200, component 300, parser 500. File đã vượt từ trước (vd `use-employee-lookup.ts` ~900) không bắt buộc kéo xuống nhưng **không được tăng**; phần tách ra ở T9 là bắt buộc.
- Timestamp lưu DB dùng `getVietnamTimestamp()` từ `lib/utils/vietnam-timezone.ts`. SQL dùng `NOW()` (UTC) cho cột `TIMESTAMPTZ`.
- Bcrypt dùng `BCRYPT_ROUNDS` từ `lib/constants/security.ts` (12).
- JWT secret qua `getJwtSecret()` (`lib/config/jwt.ts`), không đọc `process.env.JWT_SECRET`.
- Input API validate bằng zod trong `lib/validations/` qua `parseSchema()` + `createValidationErrorResponse()` hoặc `parseSchemaOrThrow()`.
- Client gọi API qua `apiClient` + `ENDPOINTS` (`lib/api/`), không `fetch()` trần.
- Username `admin` bị chặn cứng trong `lib/auth.ts`; không tạo account tên này.
- Mã lỗi: 401 = không có/hết hạn token; 403 = sai role/scope.
- Sau mỗi task: `npm run format && npm run lint && npm run typecheck`. `npm test` hiện fail 8/22 suite do layout pnpm (msw/rettime) – suite thuần logic phải xanh; chỉ chạy file liên quan bằng `npm test -- --testPathPattern=<pattern>`.
- Build prod: `npm run build` (webpack). Sau T15 phải chạy `npm run verify:es2019`.
- Không xoá lockfile (npm/pnpm/bun). Không `git push`, không `rm -rf`, không drop table nếu chưa hỏi user.
- Mọi SQL chạy trên prod do **user tự chạy** sau khi backup (xem T16). Plan chỉ tạo file migration.
- Test parity dùng `createQueryRecorder()` từ `lib/__fixtures__/query-recorder.ts`; fixture để trong `__fixtures__/`, test trong `__tests__/` cạnh module.
- Deviation so với spec (đã chốt): (1) migration đánh số **36/37** thay 30/31 vì 30–35 đã tồn tại; (2) `verifyAdminAccess`, `verifyEmployeeManagementAccess`, `authorizeRoles`, `rateLimit(type)(...)` trở thành **async** vì cần query `pv`/Postgres – mọi call site thêm `await`; (3) bảng `import_configurations` trong spec §7.2 không tồn tại → migration 37 bật RLS động cho mọi bảng public còn thiếu.

## Review Focus

1. **Cookie `auth_token` chứa token nhân viên (`aud=employee_session`) gửi vào route admin** → phải 401 "Phiên đăng nhập không hợp lệ", không được coi là admin. Test tại T3 (`auth-kernel.test.ts`, case "token aud employee_session bị từ chối ở verifyToken").
2. **Token admin hợp lệ nhưng `admin_users.token_version` đã tăng (đổi mật khẩu/revoke)** → write helper phải trả 401, nhưng `verifyToken` đọc thuần vẫn parse được để route GET không query DB. Test tại T3 (`token-freshness.test.ts`, case "pv cũ hơn DB → 401").
3. **Header `x-forwarded-for: "1.1.1.1, 2.2.2.2"` do client tự chèn** → `getClientIP` phải lấy phần tử cuối (`2.2.2.2`, do proxy gắn), không phải phần tử đầu; không có header → `"unknown"` và rate-limit vẫn hoạt động theo key `unknown`. Test tại T7 (`security-middleware.test.ts`).
4. **`salary_month` của request sign-salary không khớp payroll nào** sau khi bỏ fallback CCCD → vẫn 404 "Không tìm thấy bảng lương" chứ không rò rỉ lỗi 500, và `requireEmployeeSession` chỉ query `password_version` một lần, không query lại payroll. Test tại T12 (`sign-salary-route.test.ts`).
5. **Payload `payrollData` có key lạ (`is_signed`, `__proto__`, `password_hash`)** → `AdvancedUploadRequestSchema` phải reject với lỗi zod liệt kê key, không lọt vào insert. Test tại T13 (`payroll-columns.test.ts`, case "key ngoài whitelist bị từ chối").

## File Structure (tổng quan)

| Vùng | Tạo mới | Sửa |
| --- | --- | --- |
| Role policy | `lib/auth/role-policy.ts`, `lib/auth/__tests__/role-policy.test.ts` | `lib/validations/common.ts`, `lib/validations/admin-employee.ts`, `lib/validations/index.ts` |
| Auth kernel | `lib/auth/token-freshness.ts`, `lib/validations/auth-token.ts`, `lib/__tests__/auth-kernel.test.ts`, `lib/auth/__tests__/token-freshness.test.ts` | `lib/auth-middleware.ts`, `lib/__tests__/department-access.test.ts`, 30+ route gọi helper |
| Employee session | `lib/auth/require-employee-session.ts`, `lib/auth/__tests__/require-employee-session.test.ts` | `lib/employee-session.ts` |
| Login/me | `app/api/admin/me/route.ts` | `app/api/admin/login/route.ts`, `lib/api/endpoints.ts`, `lib/auth.ts` |
| DB | `scripts/supabase-setup/36-auth-lockout-and-rate-limit.sql`, `scripts/supabase-setup/37-harden-functions-and-rls.sql`, `scripts/__tests__/create-admin-user.test.js` | `scripts/create-tables.sql`, `scripts/create-admin-user.js`, `lib/employee/cascade-update-employee.ts` |
| Rate limit / IP | `lib/__tests__/security-middleware.test.ts` | `lib/security-middleware.ts`, `lib/audit-service.ts`, `lib/bonus/bonus-signature-status.ts`, `app/api/admin/payroll/[id]/route.ts` |
| Client session | `app/employee/lookup/employee-lookup-api.ts`, `lib/api/__tests__/auth-redirect.test.ts` | `lib/api/client.ts`, `lib/auth/secure-session.ts`, `lib/api/auth-redirect.ts`, login form, provider, RoleBasedRouter, dashboards, api-docs page |
| Dept scope | `lib/auth/department-scope.ts`, `lib/auth/__tests__/department-scope.test.ts` | payroll/[id], departments, unsigned-employees-export, all-employees routes |
| Upload | `lib/validations/upload.ts`, `lib/validations/__tests__/upload.test.ts` | import-dual-files, upload, payroll-import, bonus-import routes |
| Payroll whitelist | `lib/payroll/payroll-columns.ts`, `lib/payroll/__tests__/payroll-columns.test.ts` | `lib/validations/payroll.ts`, `app/api/admin/advanced-upload/route.ts` |
| Deps | `scripts/verify-es2019.mjs` | `package.json`, `next.config.mjs` (nếu cần transpile) |

---

### Task 1: Role policy thuần (ai được gán role nào)

**Files:**
- Create: `lib/auth/role-policy.ts`
- Create: `lib/auth/__tests__/role-policy.test.ts`
- Modify: `lib/validations/common.ts` (thêm `EMPLOYEE_ROLES`, `EmployeeRoleSchema`)
- Modify: `lib/validations/index.ts` (barrel export)

**Interfaces:**
- Consumes: `JWTPayload` từ `lib/auth-middleware.ts` (hiện có: `{ employee_id, username, role, department, allowed_departments?, permissions }`).
- Produces:
  - `ROLE_RANK: Record<string, number>`
  - `ASSIGNABLE_BY: Record<string, readonly string[]>`
  - `CAN_CREATE_EMPLOYEE_ROLES = ["admin", "van_phong"] as const`
  - `canAssignRole(actor: Pick<JWTPayload, "role" | "employee_id">, target: { employee_id: string; currentRole: string | null; newRole: string }): { ok: true } | { ok: false; reason: string }`
  - `canCreateEmployee(role: string): boolean`
  - `EMPLOYEE_ROLES = ["giam_doc","ke_toan","nguoi_lap_bieu","van_phong","truong_phong","to_truong","nhan_vien"] as const`, `EmployeeRoleSchema = z.enum(EMPLOYEE_ROLES)` (không có `admin`).

- [ ] **Step 1: Đọc `RoleSchema` hiện có để đặt `EmployeeRoleSchema` ngay cạnh**

Run: `grep -n "RoleSchema\|ROLES" lib/validations/common.ts`
Expected: thấy định nghĩa `RoleSchema` (enum 8 role gồm `admin`).

- [ ] **Step 2: Viết test fail**

```ts
import { canAssignRole, canCreateEmployee, ROLE_RANK } from "@/lib/auth/role-policy";

const actor = (role: string, employee_id = "ACT01") => ({ role, employee_id });

describe("ROLE_RANK", () => {
  it("admin cao nhất, nhan_vien thấp nhất", () => {
    expect(ROLE_RANK.admin).toBeGreaterThan(ROLE_RANK.giam_doc);
    expect(ROLE_RANK.nhan_vien).toBe(0);
  });
});

describe("canAssignRole", () => {
  it("admin gán được mọi role nhân viên", () => {
    for (const role of ["giam_doc", "ke_toan", "van_phong", "nhan_vien"]) {
      expect(
        canAssignRole(actor("admin"), { employee_id: "NV01", currentRole: "nhan_vien", newRole: role }),
      ).toEqual({ ok: true });
    }
  });

  it("không ai gán được role admin", () => {
    const result = canAssignRole(actor("admin"), { employee_id: "NV01", currentRole: "nhan_vien", newRole: "admin" });
    expect(result.ok).toBe(false);
  });

  it("van_phong chỉ gán được to_truong hoặc nhan_vien", () => {
    expect(canAssignRole(actor("van_phong"), { employee_id: "NV01", currentRole: "nhan_vien", newRole: "to_truong" })).toEqual({ ok: true });
    expect(canAssignRole(actor("van_phong"), { employee_id: "NV01", currentRole: "nhan_vien", newRole: "truong_phong" }).ok).toBe(false);
    expect(canAssignRole(actor("van_phong"), { employee_id: "NV01", currentRole: "nhan_vien", newRole: "giam_doc" }).ok).toBe(false);
  });

  it("không được hạ role của người có rank cao hơn hoặc bằng mình", () => {
    const result = canAssignRole(actor("van_phong"), { employee_id: "GD01", currentRole: "giam_doc", newRole: "nhan_vien" });
    expect(result.ok).toBe(false);
  });

  it("không được tự đổi role của chính mình", () => {
    const result = canAssignRole(actor("van_phong", "VP01"), { employee_id: "VP01", currentRole: "van_phong", newRole: "nhan_vien" });
    expect(result.ok).toBe(false);
  });

  it("giữ nguyên role hiện tại luôn hợp lệ với người có quyền sửa nhân viên đó", () => {
    expect(canAssignRole(actor("van_phong"), { employee_id: "NV01", currentRole: "nhan_vien", newRole: "nhan_vien" })).toEqual({ ok: true });
  });

  it("truong_phong, to_truong, nhan_vien, ke_toan, giam_doc, nguoi_lap_bieu không gán được role nào", () => {
    for (const role of ["truong_phong", "to_truong", "nhan_vien", "ke_toan", "giam_doc", "nguoi_lap_bieu"]) {
      expect(canAssignRole(actor(role), { employee_id: "NV01", currentRole: "nhan_vien", newRole: "nhan_vien" }).ok).toBe(false);
    }
  });
});

describe("canCreateEmployee", () => {
  it("chỉ admin và van_phong", () => {
    expect(canCreateEmployee("admin")).toBe(true);
    expect(canCreateEmployee("van_phong")).toBe(true);
    expect(canCreateEmployee("giam_doc")).toBe(false);
    expect(canCreateEmployee("nguoi_lap_bieu")).toBe(false);
  });
});
```

- [ ] **Step 3: Chạy test, xác nhận fail**

Run: `npm test -- --testPathPattern="role-policy"`
Expected: FAIL `Cannot find module '@/lib/auth/role-policy'`.

- [ ] **Step 4: Thêm `EMPLOYEE_ROLES` + `EmployeeRoleSchema` vào `lib/validations/common.ts`**

Đặt ngay dưới `RoleSchema`:

```ts
export const EMPLOYEE_ROLES = [
  "giam_doc",
  "ke_toan",
  "nguoi_lap_bieu",
  "van_phong",
  "truong_phong",
  "to_truong",
  "nhan_vien",
] as const;

export type EmployeeRole = (typeof EMPLOYEE_ROLES)[number];

export const EmployeeRoleSchema = z.enum(EMPLOYEE_ROLES);
```

Trong `lib/validations/index.ts`, thêm `EMPLOYEE_ROLES`, `EmployeeRoleSchema`, `type EmployeeRole` vào block export của `./common` (giữ cùng style các export hiện có).

- [ ] **Step 5: Viết `lib/auth/role-policy.ts`**

```ts
import type { JWTPayload } from "@/lib/auth-middleware";
import { EMPLOYEE_ROLES } from "@/lib/validations/common";

export const ROLE_RANK: Record<string, number> = {
  admin: 7,
  giam_doc: 6,
  ke_toan: 5,
  nguoi_lap_bieu: 4,
  van_phong: 3,
  truong_phong: 2,
  to_truong: 1,
  nhan_vien: 0,
};

export const ASSIGNABLE_BY: Record<string, readonly string[]> = {
  admin: EMPLOYEE_ROLES,
  van_phong: ["to_truong", "nhan_vien"],
};

export const CAN_CREATE_EMPLOYEE_ROLES = ["admin", "van_phong"] as const;

type Actor = Pick<JWTPayload, "role" | "employee_id">;

interface RoleAssignment {
  employee_id: string;
  currentRole: string | null;
  newRole: string;
}

export type RoleAssignmentResult = { ok: true } | { ok: false; reason: string };

function rankOf(role: string | null): number {
  if (!role) return -1;
  return ROLE_RANK[role] ?? -1;
}

export function canCreateEmployee(role: string): boolean {
  return (CAN_CREATE_EMPLOYEE_ROLES as readonly string[]).includes(role);
}

export function canAssignRole(actor: Actor, target: RoleAssignment): RoleAssignmentResult {
  const assignable = ASSIGNABLE_BY[actor.role];
  if (!assignable) {
    return { ok: false, reason: "Vai trò của bạn không được phép thay đổi chức vụ nhân viên" };
  }
  if (actor.employee_id === target.employee_id) {
    return { ok: false, reason: "Không thể tự thay đổi chức vụ của chính mình" };
  }
  if (target.newRole === "admin") {
    return { ok: false, reason: "Không thể gán chức vụ admin" };
  }
  if (actor.role !== "admin" && rankOf(target.currentRole) >= rankOf(actor.role)) {
    return { ok: false, reason: "Không thể thay đổi chức vụ của người có cấp bậc cao hơn hoặc bằng bạn" };
  }
  if (target.currentRole === target.newRole) {
    return { ok: true };
  }
  if (!assignable.includes(target.newRole)) {
    return { ok: false, reason: `Bạn không được phép gán chức vụ ${target.newRole}` };
  }
  return { ok: true };
}
```

- [ ] **Step 6: Chạy test, xác nhận pass**

Run: `npm test -- --testPathPattern="role-policy"`
Expected: PASS (8 test).

- [ ] **Step 7: Lint/typecheck và commit**

```bash
npm run format && npm run lint && npm run typecheck
git add lib/auth/role-policy.ts lib/auth/__tests__/role-policy.test.ts lib/validations/common.ts lib/validations/index.ts
git commit -m "feat(auth): thêm role policy quy định ai được gán chức vụ nào"
```

---

### Task 2: Zod cho JWT payload và siết `chuc_vu` khi tạo/sửa nhân viên

**Files:**
- Create: `lib/validations/auth-token.ts`
- Create: `lib/validations/__tests__/auth-token.test.ts`
- Create: `lib/validations/__tests__/admin-employee-role.test.ts`
- Modify: `lib/validations/admin-employee.ts:22,45` (`chuc_vu: RoleSchema` → `EmployeeRoleSchema`)
- Modify: `lib/validations/index.ts`

**Interfaces:**
- Produces:
  - `ADMIN_TOKEN_AUDIENCE = "admin"`, `EMPLOYEE_SESSION_AUDIENCE = "employee_session"`.
  - `JWTPayloadSchema` (zod `z.looseObject`) với `employee_id`, `username`, `role: RoleSchema`, `department`, `allowed_departments?: string[]`, `permissions: string[]`, `pv: number (int ≥ 0)`, `aud: "admin"`, `iat`, `exp`.
  - `EmployeeSessionPayloadSchema` với `employee_id`, `type: "employee_session"`, `aud: "employee_session"`, `pv`, `iat`, `exp`.
  - `type VerifiedJWTPayload`, `type EmployeeSessionPayload`.

- [ ] **Step 1: Viết test fail**

```ts
import { JWTPayloadSchema, EmployeeSessionPayloadSchema } from "@/lib/validations/auth-token";

const base = {
  employee_id: "NV01",
  username: "Nguyễn Văn A",
  role: "truong_phong",
  department: "XN1",
  permissions: ["view_department_payroll"],
  pv: 0,
  aud: "admin",
  iat: 1_700_000_000,
  exp: 1_700_086_400,
};

describe("JWTPayloadSchema", () => {
  it("chấp nhận payload admin đầy đủ và giữ field lạ", () => {
    const parsed = JWTPayloadSchema.parse({ ...base, extra: 1 });
    expect(parsed.role).toBe("truong_phong");
    expect((parsed as Record<string, unknown>).extra).toBe(1);
  });

  it("từ chối thiếu pv", () => {
    const { pv: _pv, ...noPv } = base;
    expect(JWTPayloadSchema.safeParse(noPv).success).toBe(false);
  });

  it("từ chối aud khác admin", () => {
    expect(JWTPayloadSchema.safeParse({ ...base, aud: "employee_session" }).success).toBe(false);
  });

  it("từ chối role không thuộc danh sách", () => {
    expect(JWTPayloadSchema.safeParse({ ...base, role: "superadmin" }).success).toBe(false);
  });

  it("allowed_departments tuỳ chọn, phải là mảng string", () => {
    expect(JWTPayloadSchema.safeParse({ ...base, allowed_departments: ["XN1", "XN2"] }).success).toBe(true);
    expect(JWTPayloadSchema.safeParse({ ...base, allowed_departments: "XN1" }).success).toBe(false);
  });
});

describe("EmployeeSessionPayloadSchema", () => {
  it("chấp nhận session nhân viên hợp lệ", () => {
    expect(
      EmployeeSessionPayloadSchema.safeParse({
        employee_id: "NV01",
        type: "employee_session",
        aud: "employee_session",
        pv: 2,
        iat: 1,
        exp: 2,
      }).success,
    ).toBe(true);
  });

  it("từ chối token admin giả làm session nhân viên", () => {
    expect(EmployeeSessionPayloadSchema.safeParse(base).success).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `npm test -- --testPathPattern="auth-token"`
Expected: FAIL `Cannot find module '@/lib/validations/auth-token'`.

- [ ] **Step 3: Viết `lib/validations/auth-token.ts`**

```ts
import { z } from "zod";
import { RoleSchema } from "./common";

const TokenTimestampSchema = z.number().int().nonnegative();

export const ADMIN_TOKEN_AUDIENCE = "admin";
export const EMPLOYEE_SESSION_AUDIENCE = "employee_session";

export const JWTPayloadSchema = z.looseObject({
  employee_id: z.string().min(1),
  username: z.string().min(1),
  role: RoleSchema,
  department: z.string(),
  allowed_departments: z.array(z.string()).optional(),
  permissions: z.array(z.string()),
  pv: z.number().int().nonnegative(),
  aud: z.literal(ADMIN_TOKEN_AUDIENCE),
  iat: TokenTimestampSchema,
  exp: TokenTimestampSchema,
});

export type VerifiedJWTPayload = z.infer<typeof JWTPayloadSchema>;

export const EmployeeSessionPayloadSchema = z.object({
  employee_id: z.string().min(1),
  type: z.literal(EMPLOYEE_SESSION_AUDIENCE),
  aud: z.literal(EMPLOYEE_SESSION_AUDIENCE),
  pv: z.number().int().nonnegative(),
  iat: TokenTimestampSchema,
  exp: TokenTimestampSchema,
});

export type EmployeeSessionPayload = z.infer<typeof EmployeeSessionPayloadSchema>;
```

Thêm export của `./auth-token` vào `lib/validations/index.ts` theo style barrel hiện có.

- [ ] **Step 4: Đổi `chuc_vu` trong `lib/validations/admin-employee.ts`**

Dòng 22 (`EmployeeCreateRequestSchema`) và dòng 45 (`EmployeeUpdateRequestSchema`): `chuc_vu: RoleSchema` → `chuc_vu: EmployeeRoleSchema`. Import `EmployeeRoleSchema` từ `./common`. `EmployeeListQuerySchema.role: RoleSchema.optional()` giữ nguyên (filter list vẫn cần tìm admin).

- [ ] **Step 5: Thêm test cho `chuc_vu`**

```ts
import { EmployeeCreateRequestSchema, EmployeeUpdateRequestSchema } from "@/lib/validations/admin-employee";

const validCreate = {
  employee_id: "NV99",
  full_name: "Trần Thị B",
  cccd: "012345678901",
  department: "XN1",
  chuc_vu: "nhan_vien",
};

describe("chuc_vu không nhận admin", () => {
  it("create với chuc_vu=admin bị từ chối", () => {
    expect(EmployeeCreateRequestSchema.safeParse({ ...validCreate, chuc_vu: "admin" }).success).toBe(false);
  });

  it("create với chuc_vu=nhan_vien hợp lệ", () => {
    expect(EmployeeCreateRequestSchema.safeParse(validCreate).success).toBe(true);
  });

  it("update với chuc_vu=admin bị từ chối", () => {
    expect(EmployeeUpdateRequestSchema.safeParse({ chuc_vu: "admin" }).success).toBe(false);
  });
});
```

Nếu `EmployeeCreateRequestSchema` yêu cầu field khác ngoài 5 field trên (đọc lại dòng 10–30), bổ sung vào `validCreate` để case "hợp lệ" pass.

- [ ] **Step 6: Chạy test, xác nhận pass**

Run: `npm test -- --testPathPattern="auth-token|admin-employee-role"`
Expected: PASS.

- [ ] **Step 7: Lint/typecheck và commit**

```bash
npm run format && npm run lint && npm run typecheck
git add lib/validations/auth-token.ts lib/validations/__tests__/ lib/validations/admin-employee.ts lib/validations/index.ts
git commit -m "feat(validation): schema JWT payload có aud/pv và chặn gán chuc_vu admin"
```

---
### Task 3: Auth kernel — cookie-first, `aud`/`alg` pin, zod payload, `pv` freshness

**Files:**
- Create: `lib/auth/token-freshness.ts`
- Create: `lib/auth/__tests__/token-freshness.test.ts`
- Create: `lib/__tests__/auth-kernel.test.ts`
- Modify: `lib/auth.ts:9-26` (interface `JWTPayload` thêm `pv: number`)
- Modify: `lib/auth-middleware.ts` (toàn bộ phần verify; giữ `AuthContext`, `getDepartmentFilter`, `getEmployeeFilter`, `getAuditInfo`)
- Modify: `lib/__tests__/department-access.test.ts:14-30` (payload test thêm `pv`, ký với `audience: "admin"`)
- Modify: 23 file gọi `verifyAdminAccess(`, 2 file gọi `verifyEmployeeManagementAccess(`, 1 file gọi `authorizeRoles(` trong `app/api/**` → thêm `await`
- Modify: `app/api/admin/employees/[id]/audit-logs/route.ts:18`

**Interfaces:**
- Consumes: `JWTPayloadSchema`, `ADMIN_TOKEN_AUDIENCE` (T2); `getJwtSecret()`; `isProduction()` từ `lib/config/runtime.ts`; `createServiceClient()` từ `utils/supabase/server.ts`.
- Produces (tất cả export từ `lib/auth-middleware.ts` trừ khi ghi khác):
  - `readAuthToken(request: NextRequest): string | null` — cookie `auth_token` trước; Bearer chỉ khi `!isProduction()`.
  - `verifyToken(request): AuthContext | null` — **sync**, không query DB. `AuthContext` giữ shape `{ user: JWTPayload; hasPermission; canAccessDepartment; isRole }`.
  - `verifyAdminAccess(request): Promise<AdminAccessResult>` — admin + fresh.
  - `verifyEmployeeManagementAccess(request): Promise<JWTPayload | null>` — roles `["admin","van_phong","nguoi_lap_bieu"]` + fresh.
  - `authorizeRoles(request, allowedRoles: string[]): Promise<AuthContext | null>` — + fresh.
  - `verifyAuditLogsAccess(request): Promise<JWTPayload | null>` — admin + fresh (đổi kiểu trả về để sửa bug `if (!admin)` luôn truthy).
  - Xoá: `verifyAdminToken`, `requireRole`, `requirePermission`, `requireDepartmentAccess` (0 call site).
  - `lib/auth/token-freshness.ts`: `readCurrentPasswordVersion(supabase, user: Pick<JWTPayload,"role"|"employee_id"|"username">): Promise<number | null>` và `assertTokenFresh(supabase, user: Pick<JWTPayload,"role"|"employee_id"|"username"|"pv">): Promise<boolean>`.

- [ ] **Step 1: Viết test fail cho `token-freshness`**

`lib/auth/__tests__/token-freshness.test.ts`:

```ts
/**
 * @jest-environment node
 */
import { createQueryRecorder } from "@/lib/__fixtures__/query-recorder";
import { assertTokenFresh, readCurrentPasswordVersion } from "@/lib/auth/token-freshness";

const adminUser = { role: "admin", employee_id: "admin", username: "superadmin", pv: 3 };
const staffUser = { role: "truong_phong", employee_id: "NV01", username: "Nguyễn A", pv: 1 };

describe("readCurrentPasswordVersion", () => {
  it("admin đọc admin_users.token_version theo username đang active", async () => {
    const recorder = createQueryRecorder([{ data: { token_version: 3 } }]);
    const version = await readCurrentPasswordVersion(recorder.client as never, adminUser);
    expect(version).toBe(3);
    expect(recorder.calls[0]).toMatchObject({
      table: "admin_users",
      select: "token_version",
      filters: [
        { method: "eq", args: ["username", "superadmin"] },
        { method: "eq", args: ["is_active", true] },
      ],
      terminal: "maybeSingle",
    });
  });

  it("nhân viên đọc employees.password_version theo employee_id đang active", async () => {
    const recorder = createQueryRecorder([{ data: { password_version: 1 } }]);
    const version = await readCurrentPasswordVersion(recorder.client as never, staffUser);
    expect(version).toBe(1);
    expect(recorder.calls[0]).toMatchObject({
      table: "employees",
      select: "password_version",
      filters: [
        { method: "eq", args: ["employee_id", "NV01"] },
        { method: "eq", args: ["is_active", true] },
      ],
      terminal: "maybeSingle",
    });
  });

  it("không có record → null", async () => {
    const recorder = createQueryRecorder([{ data: null }]);
    expect(await readCurrentPasswordVersion(recorder.client as never, staffUser)).toBeNull();
  });

  it("lỗi DB → null", async () => {
    const recorder = createQueryRecorder([{ error: { message: "boom" } }]);
    expect(await readCurrentPasswordVersion(recorder.client as never, staffUser)).toBeNull();
  });
});

describe("assertTokenFresh", () => {
  it("pv khớp → true", async () => {
    const recorder = createQueryRecorder([{ data: { password_version: 1 } }]);
    expect(await assertTokenFresh(recorder.client as never, staffUser)).toBe(true);
  });

  it("pv cũ hơn DB → false", async () => {
    const recorder = createQueryRecorder([{ data: { password_version: 2 } }]);
    expect(await assertTokenFresh(recorder.client as never, staffUser)).toBe(false);
  });

  it("tài khoản bị khoá/xoá (null) → false", async () => {
    const recorder = createQueryRecorder([{ data: null }]);
    expect(await assertTokenFresh(recorder.client as never, adminUser)).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `npm test -- --testPathPattern="token-freshness"`
Expected: FAIL `Cannot find module '@/lib/auth/token-freshness'`.

- [ ] **Step 3: Viết `lib/auth/token-freshness.ts`**

```ts
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { JWTPayload } from "@/lib/auth";

type TokenIdentity = Pick<JWTPayload, "role" | "employee_id" | "username">;
type TokenWithVersion = TokenIdentity & Pick<JWTPayload, "pv">;

async function readAdminTokenVersion(supabase: SupabaseClient, username: string): Promise<number | null> {
  const { data, error } = await supabase
    .from("admin_users")
    .select("token_version")
    .eq("username", username)
    .eq("is_active", true)
    .maybeSingle();
  if (error || !data) return null;
  return (data as { token_version: number }).token_version;
}

async function readEmployeePasswordVersion(supabase: SupabaseClient, employeeId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from("employees")
    .select("password_version")
    .eq("employee_id", employeeId)
    .eq("is_active", true)
    .maybeSingle();
  if (error || !data) return null;
  return (data as { password_version: number }).password_version;
}

export async function readCurrentPasswordVersion(supabase: SupabaseClient, user: TokenIdentity): Promise<number | null> {
  if (user.role === "admin") {
    return readAdminTokenVersion(supabase, user.username);
  }
  return readEmployeePasswordVersion(supabase, user.employee_id);
}

export async function assertTokenFresh(supabase: SupabaseClient, user: TokenWithVersion): Promise<boolean> {
  const current = await readCurrentPasswordVersion(supabase, user);
  return current !== null && current === user.pv;
}
```

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `npm test -- --testPathPattern="token-freshness"`
Expected: PASS (7 test).

- [ ] **Step 5: Thêm `pv` vào `JWTPayload` (`lib/auth.ts`)**

Trong interface `JWTPayload` (dòng 9–26) thêm `pv: number;` ngay sau `permissions: string[];`. Giữ `iat`/`exp`. `authenticateUser` sẽ được sửa để trả `pv` ở T7; tạm thời typecheck sẽ báo lỗi ở `app/api/admin/login/route.ts:75` — sửa luôn trong task này bằng cách thêm `pv: 0` vào `tokenPayload` (T5 thay bằng giá trị thật).

- [ ] **Step 6: Viết test fail cho auth kernel**

`lib/__tests__/auth-kernel.test.ts`:

```ts
/**
 * @jest-environment node
 */
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

const assertTokenFresh = jest.fn();
jest.mock("@/lib/auth/token-freshness", () => ({
  assertTokenFresh: (...args: unknown[]) => assertTokenFresh(...args),
}));
jest.mock("@/utils/supabase/server", () => ({ createServiceClient: () => ({}) }));

const isProduction = jest.fn(() => false);
jest.mock("@/lib/config/runtime", () => ({ isProduction: () => isProduction() }));

import {
  authorizeRoles,
  readAuthToken,
  verifyAdminAccess,
  verifyAuditLogsAccess,
  verifyEmployeeManagementAccess,
  verifyToken,
} from "@/lib/auth-middleware";

const SECRET = process.env.JWT_SECRET as string;

const basePayload = {
  username: "superadmin",
  employee_id: "admin",
  role: "admin",
  department: "ALL",
  permissions: ["ALL"],
  pv: 0,
};

function signAdmin(overrides: Record<string, unknown> = {}, secret = SECRET) {
  return jwt.sign({ ...basePayload, ...overrides }, secret, { expiresIn: "1h", audience: "admin", algorithm: "HS256" });
}

function withCookie(token: string) {
  return new NextRequest("http://localhost/api/admin/x", { headers: { cookie: `auth_token=${token}` } });
}

function withBearer(token: string) {
  return new NextRequest("http://localhost/api/admin/x", { headers: { authorization: `Bearer ${token}` } });
}

beforeEach(() => {
  assertTokenFresh.mockReset();
  assertTokenFresh.mockResolvedValue(true);
  isProduction.mockReturnValue(false);
});

describe("readAuthToken", () => {
  it("ưu tiên cookie auth_token", () => {
    const request = new NextRequest("http://localhost/api/x", {
      headers: { cookie: "auth_token=cookie-token", authorization: "Bearer header-token" },
    });
    expect(readAuthToken(request)).toBe("cookie-token");
  });

  it("ngoài production chấp nhận Bearer khi không có cookie", () => {
    expect(readAuthToken(withBearer("header-token"))).toBe("header-token");
  });

  it("production bỏ qua Bearer", () => {
    isProduction.mockReturnValue(true);
    expect(readAuthToken(withBearer("header-token"))).toBeNull();
  });
});

describe("verifyToken", () => {
  it("token admin hợp lệ từ cookie → AuthContext", () => {
    const auth = verifyToken(withCookie(signAdmin()));
    expect(auth?.user.role).toBe("admin");
    expect(auth?.isRole("admin")).toBe(true);
  });

  it("token aud employee_session bị từ chối ở verifyToken", () => {
    const token = jwt.sign({ employee_id: "NV01", type: "employee_session", pv: 0 }, SECRET, {
      expiresIn: "30m",
      audience: "employee_session",
    });
    expect(verifyToken(withCookie(token))).toBeNull();
  });

  it("token không có aud bị từ chối", () => {
    const token = jwt.sign(basePayload, SECRET, { expiresIn: "1h" });
    expect(verifyToken(withCookie(token))).toBeNull();
  });

  it("token thiếu pv bị từ chối", () => {
    const { pv: _pv, ...noPv } = basePayload;
    const token = jwt.sign(noPv, SECRET, { expiresIn: "1h", audience: "admin" });
    expect(verifyToken(withCookie(token))).toBeNull();
  });

  it("token ký sai secret bị từ chối", () => {
    expect(verifyToken(withCookie(signAdmin({}, "x".repeat(40))))).toBeNull();
  });

  it("token alg HS512 bị từ chối dù secret đúng", () => {
    const token = jwt.sign(basePayload, SECRET, { expiresIn: "1h", audience: "admin", algorithm: "HS512" });
    expect(verifyToken(withCookie(token))).toBeNull();
  });

  it("token hết hạn bị từ chối", () => {
    const token = jwt.sign(basePayload, SECRET, { expiresIn: -10, audience: "admin" });
    expect(verifyToken(withCookie(token))).toBeNull();
  });
});

describe("verifyAdminAccess", () => {
  it("không token → 401", async () => {
    const result = await verifyAdminAccess(new NextRequest("http://localhost/api/x"));
    expect(result).toEqual({ ok: false, status: 401, error: "Phiên đăng nhập đã hết hạn" });
  });

  it("role khác admin → 403, không query freshness", async () => {
    const result = await verifyAdminAccess(withCookie(signAdmin({ role: "ke_toan" })));
    expect(result).toEqual({ ok: false, status: 403, error: "Không có quyền truy cập" });
    expect(assertTokenFresh).not.toHaveBeenCalled();
  });

  it("pv cũ → 401 thu hồi", async () => {
    assertTokenFresh.mockResolvedValue(false);
    const result = await verifyAdminAccess(withCookie(signAdmin()));
    expect(result).toEqual({ ok: false, status: 401, error: "Phiên đăng nhập đã bị thu hồi, vui lòng đăng nhập lại" });
  });

  it("admin hợp lệ → ok với user", async () => {
    const result = await verifyAdminAccess(withCookie(signAdmin()));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.user.username).toBe("superadmin");
  });
});

describe("verifyEmployeeManagementAccess / authorizeRoles / verifyAuditLogsAccess", () => {
  it("van_phong vào được employee management", async () => {
    expect(await verifyEmployeeManagementAccess(withCookie(signAdmin({ role: "van_phong" })))).toMatchObject({ role: "van_phong" });
  });

  it("truong_phong không vào được employee management", async () => {
    expect(await verifyEmployeeManagementAccess(withCookie(signAdmin({ role: "truong_phong" })))).toBeNull();
  });

  it("authorizeRoles trả null khi pv cũ", async () => {
    assertTokenFresh.mockResolvedValue(false);
    expect(await authorizeRoles(withCookie(signAdmin()), ["admin"])).toBeNull();
  });

  it("verifyAuditLogsAccess trả null cho non-admin", async () => {
    expect(await verifyAuditLogsAccess(withCookie(signAdmin({ role: "ke_toan" })))).toBeNull();
  });

  it("verifyAuditLogsAccess trả user cho admin", async () => {
    expect(await verifyAuditLogsAccess(withCookie(signAdmin()))).toMatchObject({ role: "admin" });
  });
});
```

- [ ] **Step 7: Chạy test, xác nhận fail**

Run: `npm test -- --testPathPattern="auth-kernel"`
Expected: FAIL (`readAuthToken` không tồn tại; các case aud/pv fail vì `jwt.verify` chưa có options).

- [ ] **Step 8: Viết lại phần verify của `lib/auth-middleware.ts`**

Thay toàn bộ nội dung từ đầu file đến hết `authorizeRoles` (dòng 1–144) bằng:

```ts
import "server-only";
import { type NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { type JWTPayload } from "@/lib/auth";
import { getJwtSecret } from "@/lib/config/jwt";
import { isProduction } from "@/lib/config/runtime";
import { assertTokenFresh } from "@/lib/auth/token-freshness";
import { ADMIN_TOKEN_AUDIENCE, JWTPayloadSchema } from "@/lib/validations/auth-token";
import { createServiceClient } from "@/utils/supabase/server";

export const AUTH_COOKIE_NAME = "auth_token";

const DEPARTMENT_SCOPED_ROLES = ["giam_doc", "ke_toan", "nguoi_lap_bieu", "truong_phong"];
const EMPLOYEE_MANAGEMENT_ROLES = ["admin", "van_phong", "nguoi_lap_bieu"];

export interface AuthContext {
  user: JWTPayload;
  hasPermission: (permission: string) => boolean;
  canAccessDepartment: (department: string) => boolean;
  isRole: (role: string) => boolean;
}

export type AdminAccessResult =
  | { ok: true; user: JWTPayload }
  | { ok: false; status: 401 | 403; error: string };

export function readAuthToken(request: NextRequest): string | null {
  const cookieToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (cookieToken) return cookieToken;
  if (isProduction()) return null;
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.substring(7);
}

export function decodeAdminToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret(), {
      algorithms: ["HS256"],
      audience: ADMIN_TOKEN_AUDIENCE,
    });
    const parsed = JWTPayloadSchema.safeParse(decoded);
    return parsed.success ? (parsed.data as JWTPayload) : null;
  } catch {
    return null;
  }
}

function buildAuthContext(user: JWTPayload): AuthContext {
  return {
    user,
    hasPermission: (permission) => user.permissions.includes("ALL") || user.permissions.includes(permission),
    canAccessDepartment: (department) => {
      if (user.role === "admin" || user.role === "van_phong") return true;
      if (DEPARTMENT_SCOPED_ROLES.includes(user.role)) {
        return user.allowed_departments?.includes(department) ?? false;
      }
      if (user.role === "to_truong") return user.department === department;
      return false;
    },
    isRole: (role) => user.role === role,
  };
}

export function verifyToken(request: NextRequest): AuthContext | null {
  const token = readAuthToken(request);
  if (!token) return null;
  const user = decodeAdminToken(token);
  return user ? buildAuthContext(user) : null;
}

async function verifyFreshRole(request: NextRequest, allowedRoles: string[]): Promise<AuthContext | null> {
  const auth = verifyToken(request);
  if (!auth || !allowedRoles.includes(auth.user.role)) return null;
  const fresh = await assertTokenFresh(createServiceClient(), auth.user);
  return fresh ? auth : null;
}

export async function verifyAdminAccess(request: NextRequest): Promise<AdminAccessResult> {
  const auth = verifyToken(request);
  if (!auth) {
    return { ok: false, status: 401, error: "Phiên đăng nhập đã hết hạn" };
  }
  if (auth.user.role !== "admin") {
    return { ok: false, status: 403, error: "Không có quyền truy cập" };
  }
  const fresh = await assertTokenFresh(createServiceClient(), auth.user);
  if (!fresh) {
    return { ok: false, status: 401, error: "Phiên đăng nhập đã bị thu hồi, vui lòng đăng nhập lại" };
  }
  return { ok: true, user: auth.user };
}

export async function verifyAuditLogsAccess(request: NextRequest): Promise<JWTPayload | null> {
  const auth = await verifyFreshRole(request, ["admin"]);
  return auth?.user ?? null;
}

export async function verifyEmployeeManagementAccess(request: NextRequest): Promise<JWTPayload | null> {
  const auth = await verifyFreshRole(request, EMPLOYEE_MANAGEMENT_ROLES);
  return auth?.user ?? null;
}

export async function authorizeRoles(request: NextRequest, allowedRoles: string[]): Promise<AuthContext | null> {
  return verifyFreshRole(request, allowedRoles);
}
```

Giữ nguyên `getDepartmentFilter`, `getEmployeeFilter`, `getAuditInfo` phía dưới nhưng **xoá các comment** `// ...` trong phần giữ lại (quy ước repo). `getAuditInfo.ip_address` sẽ chuyển sang `getClientIP` ở T7.

- [ ] **Step 9: Cập nhật `lib/__tests__/department-access.test.ts`**

Dòng 14–30, hàm `authContextFor`: thêm `pv: 0` vào `payload`, ký bằng `jwt.sign(payload, process.env.JWT_SECRET as string, { audience: "admin" })`, và tạo request bằng cookie thay vì Bearer:

```ts
  const request = new NextRequest("http://localhost/api/test", {
    headers: { cookie: `auth_token=${token}` },
  });
```

- [ ] **Step 10: Thêm `await` ở mọi call site**

```bash
grep -rl "verifyAdminAccess(" app --include=*.ts | xargs sed -i 's/= verifyAdminAccess(/= await verifyAdminAccess(/g'
grep -rl "verifyEmployeeManagementAccess(" app --include=*.ts | xargs sed -i 's/= verifyEmployeeManagementAccess(/= await verifyEmployeeManagementAccess(/g'
grep -rl "authorizeRoles(" app --include=*.ts | xargs sed -i 's/= authorizeRoles(/= await authorizeRoles(/g'
grep -rn "verifyAdminAccess(\|verifyEmployeeManagementAccess(\|authorizeRoles(" app | grep -v "await " | grep -v "import "
```

Dòng cuối phải **không in gì**. Nếu còn (vd gọi inline trong `if (`), sửa tay thêm `await`. Hàm handler route đều đã `async` (Next route handler), nếu có hàm helper nội bộ sync gọi helper này thì đổi sang `async` và `await` ở chỗ gọi.

- [ ] **Step 11: Sửa `app/api/admin/employees/[id]/audit-logs/route.ts:18`**

```ts
    const admin = await verifyAuditLogsAccess(request);
    if (!admin) {
```

Phần dưới dùng `admin.success`/`admin.user` (nếu có) đổi sang `admin.employee_id`/`admin.username` trực tiếp.

- [ ] **Step 12: Sửa `app/api/admin/login/route.ts:75-84` tạm thời để typecheck xanh**

Thêm `pv: 0,` vào object `tokenPayload`, và đổi dòng 84 thành:

```ts
    const token = jwt.sign(tokenPayload, getJwtSecret(), {
      expiresIn: "24h",
      audience: "admin",
      algorithm: "HS256",
    });
```

(T5 sẽ thay `pv: 0` bằng version thật từ DB.)

- [ ] **Step 13: Chạy test + typecheck**

Run: `npm test -- --testPathPattern="auth-kernel|department-access|token-freshness"`
Expected: PASS toàn bộ.

Run: `npm run format && npm run lint && npm run typecheck`
Expected: sạch. Lỗi typecheck còn lại gần như chắc chắn là call site thiếu `await` (truy cập `.ok`/`.user` trên Promise) → sửa tay.

- [ ] **Step 14: Commit**

```bash
git add lib/auth-middleware.ts lib/auth.ts lib/auth/token-freshness.ts lib/auth/__tests__/token-freshness.test.ts lib/__tests__/auth-kernel.test.ts lib/__tests__/department-access.test.ts app/api
git commit -m "feat(auth): kernel xác thực đọc cookie, pin HS256/aud admin, kiểm tra pv khi ghi"
```

---

### Task 4: Session nhân viên có `aud` + `pv`, helper `requireEmployeeSession`

**Files:**
- Modify: `lib/employee-session.ts` (toàn bộ, 32 dòng)
- Create: `lib/auth/require-employee-session.ts`
- Create: `lib/auth/__tests__/require-employee-session.test.ts`
- Create: `lib/__tests__/employee-session.test.ts`

**Interfaces:**
- Consumes: `EmployeeSessionPayloadSchema`, `EMPLOYEE_SESSION_AUDIENCE` (T2); `readCurrentPasswordVersion` (T3).
- Produces:
  - `createEmployeeSession(employeeId: string, passwordVersion: number): string` (**đổi chữ ký**: thêm tham số 2 — `lookup-service.ts` sửa ở T7).
  - `verifyEmployeeSession(token: string): { employee_id: string; pv: number } | null`.
  - `requireEmployeeSession(request: NextRequest, supabase: SupabaseClient): Promise<EmployeeSessionResult>` với `type EmployeeSessionResult = { ok: true; employeeId: string } | { ok: false; status: 401; error: string }`.
  - `EMPLOYEE_SESSION_EXPIRED_MESSAGE = "Phiên tra cứu đã hết hạn, vui lòng tra cứu lại"`, `EMPLOYEE_SESSION_REVOKED_MESSAGE = "Phiên tra cứu không còn hiệu lực do mật khẩu đã thay đổi, vui lòng tra cứu lại"`.

- [ ] **Step 1: Viết test fail cho `employee-session`**

`lib/__tests__/employee-session.test.ts`:

```ts
/**
 * @jest-environment node
 */
import jwt from "jsonwebtoken";
import { createEmployeeSession, verifyEmployeeSession } from "@/lib/employee-session";

const SECRET = process.env.JWT_SECRET as string;

describe("employee session", () => {
  it("tạo và verify lại được, mang pv", () => {
    const token = createEmployeeSession("NV01", 4);
    expect(verifyEmployeeSession(token)).toEqual({ employee_id: "NV01", pv: 4 });
    expect(jwt.decode(token)).toMatchObject({ aud: "employee_session", type: "employee_session" });
  });

  it("token admin không được chấp nhận làm session nhân viên", () => {
    const adminToken = jwt.sign(
      { employee_id: "admin", username: "superadmin", role: "admin", department: "ALL", permissions: ["ALL"], pv: 0 },
      SECRET,
      { expiresIn: "1h", audience: "admin" },
    );
    expect(verifyEmployeeSession(adminToken)).toBeNull();
  });

  it("token kiểu employee_session nhưng thiếu aud bị từ chối", () => {
    const legacy = jwt.sign({ employee_id: "NV01", type: "employee_session" }, SECRET, { expiresIn: "30m" });
    expect(verifyEmployeeSession(legacy)).toBeNull();
  });

  it("token hết hạn bị từ chối", () => {
    const expired = jwt.sign({ employee_id: "NV01", type: "employee_session", pv: 0 }, SECRET, {
      expiresIn: -1,
      audience: "employee_session",
    });
    expect(verifyEmployeeSession(expired)).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `npm test -- --testPathPattern="lib/__tests__/employee-session"`
Expected: FAIL (`createEmployeeSession` nhận 1 tham số, `verifyEmployeeSession` không trả `pv`, token legacy vẫn được chấp nhận).

- [ ] **Step 3: Viết lại `lib/employee-session.ts`**

```ts
import jwt from "jsonwebtoken";
import { getJwtSecret } from "@/lib/config/jwt";
import { EMPLOYEE_SESSION_AUDIENCE, EmployeeSessionPayloadSchema } from "@/lib/validations/auth-token";

const SESSION_TTL = "30m";

export interface EmployeeSessionIdentity {
  employee_id: string;
  pv: number;
}

export function createEmployeeSession(employeeId: string, passwordVersion: number): string {
  return jwt.sign(
    { employee_id: employeeId, type: EMPLOYEE_SESSION_AUDIENCE, pv: passwordVersion },
    getJwtSecret(),
    { expiresIn: SESSION_TTL, audience: EMPLOYEE_SESSION_AUDIENCE, algorithm: "HS256" },
  );
}

export function verifyEmployeeSession(token: string): EmployeeSessionIdentity | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret(), {
      algorithms: ["HS256"],
      audience: EMPLOYEE_SESSION_AUDIENCE,
    });
    const parsed = EmployeeSessionPayloadSchema.safeParse(decoded);
    if (!parsed.success) return null;
    return { employee_id: parsed.data.employee_id, pv: parsed.data.pv };
  } catch {
    return null;
  }
}
```

Typecheck sẽ báo `lib/employee/lookup-service.ts` gọi `createEmployeeSession(employee_id)` thiếu tham số → tạm truyền `employee.password_version ?? 0` sau khi thêm `password_version` vào `EMPLOYEE_AUTH_COLUMNS`/`EmployeeAuthRecord` (`lib/employee/employee-repository.ts`). T7 hoàn thiện phần lockout của repository này. Cập nhật mock `createEmployeeSession` trong `lib/employee/__tests__/lookup-service.test.ts` nếu assert số tham số.

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `npm test -- --testPathPattern="lib/__tests__/employee-session"`
Expected: PASS (4 test).

- [ ] **Step 5: Viết test fail cho `requireEmployeeSession`**

`lib/auth/__tests__/require-employee-session.test.ts`:

```ts
/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { createQueryRecorder } from "@/lib/__fixtures__/query-recorder";
import { createEmployeeSession } from "@/lib/employee-session";
import {
  EMPLOYEE_SESSION_EXPIRED_MESSAGE,
  EMPLOYEE_SESSION_REVOKED_MESSAGE,
  requireEmployeeSession,
} from "@/lib/auth/require-employee-session";

function requestWith(authorization?: string) {
  return new NextRequest("http://localhost/api/employee/sign-salary", {
    method: "POST",
    headers: authorization ? { authorization } : {},
  });
}

describe("requireEmployeeSession", () => {
  it("không có header → 401 hết hạn", async () => {
    const recorder = createQueryRecorder();
    const result = await requireEmployeeSession(requestWith(), recorder.client as never);
    expect(result).toEqual({ ok: false, status: 401, error: EMPLOYEE_SESSION_EXPIRED_MESSAGE });
    expect(recorder.calls).toHaveLength(0);
  });

  it("token rác → 401 hết hạn, không query DB", async () => {
    const recorder = createQueryRecorder();
    const result = await requireEmployeeSession(requestWith("Bearer abc.def.ghi"), recorder.client as never);
    expect(result).toEqual({ ok: false, status: 401, error: EMPLOYEE_SESSION_EXPIRED_MESSAGE });
    expect(recorder.calls).toHaveLength(0);
  });

  it("pv khớp DB → ok với employeeId, chỉ 1 query", async () => {
    const recorder = createQueryRecorder([{ data: { password_version: 2 } }]);
    const token = createEmployeeSession("NV01", 2);
    const result = await requireEmployeeSession(requestWith(`Bearer ${token}`), recorder.client as never);
    expect(result).toEqual({ ok: true, employeeId: "NV01" });
    expect(recorder.calls).toHaveLength(1);
    expect(recorder.calls[0]).toMatchObject({ table: "employees", select: "password_version" });
  });

  it("pv cũ hơn DB → 401 thu hồi", async () => {
    const recorder = createQueryRecorder([{ data: { password_version: 3 } }]);
    const token = createEmployeeSession("NV01", 2);
    const result = await requireEmployeeSession(requestWith(`Bearer ${token}`), recorder.client as never);
    expect(result).toEqual({ ok: false, status: 401, error: EMPLOYEE_SESSION_REVOKED_MESSAGE });
  });

  it("nhân viên bị vô hiệu hoá (null) → 401 thu hồi", async () => {
    const recorder = createQueryRecorder([{ data: null }]);
    const token = createEmployeeSession("NV01", 2);
    const result = await requireEmployeeSession(requestWith(`Bearer ${token}`), recorder.client as never);
    expect(result).toEqual({ ok: false, status: 401, error: EMPLOYEE_SESSION_REVOKED_MESSAGE });
  });
});
```

- [ ] **Step 6: Chạy test, xác nhận fail**

Run: `npm test -- --testPathPattern="require-employee-session"`
Expected: FAIL `Cannot find module`.

- [ ] **Step 7: Viết `lib/auth/require-employee-session.ts`**

```ts
import "server-only";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { verifyEmployeeSession } from "@/lib/employee-session";
import { readCurrentPasswordVersion } from "@/lib/auth/token-freshness";

export const EMPLOYEE_SESSION_EXPIRED_MESSAGE = "Phiên tra cứu đã hết hạn, vui lòng tra cứu lại";
export const EMPLOYEE_SESSION_REVOKED_MESSAGE =
  "Phiên tra cứu không còn hiệu lực do mật khẩu đã thay đổi, vui lòng tra cứu lại";

export type EmployeeSessionResult =
  | { ok: true; employeeId: string }
  | { ok: false; status: 401; error: string };

function readBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.substring(7);
}

export async function requireEmployeeSession(
  request: NextRequest,
  supabase: SupabaseClient,
): Promise<EmployeeSessionResult> {
  const token = readBearerToken(request);
  const session = token ? verifyEmployeeSession(token) : null;
  if (!session) {
    return { ok: false, status: 401, error: EMPLOYEE_SESSION_EXPIRED_MESSAGE };
  }
  const currentVersion = await readCurrentPasswordVersion(supabase, {
    role: "nhan_vien",
    employee_id: session.employee_id,
    username: session.employee_id,
  });
  if (currentVersion === null || currentVersion !== session.pv) {
    return { ok: false, status: 401, error: EMPLOYEE_SESSION_REVOKED_MESSAGE };
  }
  return { ok: true, employeeId: session.employee_id };
}
```

- [ ] **Step 8: Chạy test, xác nhận pass**

Run: `npm test -- --testPathPattern="require-employee-session|lib/__tests__/employee-session|lookup-service"`
Expected: PASS.

- [ ] **Step 9: Lint/typecheck và commit**

```bash
npm run format && npm run lint && npm run typecheck
git add lib/employee-session.ts lib/auth/require-employee-session.ts lib/auth/__tests__/require-employee-session.test.ts lib/__tests__/employee-session.test.ts lib/employee/lookup-service.ts lib/employee/employee-repository.ts lib/employee/__tests__/lookup-service.test.ts
git commit -m "feat(auth): session nhân viên có aud/pv và helper requireEmployeeSession"
```

---
### Task 5: Login phát token có `aud`/`pv`, không trả token trong body; thêm `GET /api/admin/me`

**Files:**
- Modify: `lib/auth.ts:30-60` (`AuthResult.user.pv`, `AdminCredentialRecord` thêm `token_version`, `ADMIN_CREDENTIAL_SELECT`), `authenticateUser` (trả `pv`)
- Modify: `app/api/admin/login/route.ts:75-110`
- Create: `app/api/admin/me/route.ts`
- Create: `lib/auth/__tests__/me-route.test.ts`
- Modify: `lib/api/endpoints.ts` (`auth.login`, `auth.me`, nhóm `employee`)

**Interfaces:**
- Consumes: `verifyToken`, `assertTokenFresh`, `createServiceClient`, `CACHE_HEADERS.sensitive`.
- Produces:
  - `AuthResult.user` có thêm `pv: number`.
  - Response `POST /api/admin/login` = `{ success: true, user: {...}, message }` — **không còn `token`**; cookie `auth_token` httpOnly như cũ.
  - `GET /api/admin/me` → 200 `{ user: { employee_id, username, role, department, allowed_departments, permissions } }`; 401 `{ error: "Phiên đăng nhập đã hết hạn" }`.
  - `ENDPOINTS.auth.login = "/api/admin/login"`, `ENDPOINTS.auth.me = "/api/admin/me"`.
  - `ENDPOINTS.employee = { lookup: "/api/employee/lookup", detail: "/api/employee/detail", salaryHistory: "/api/employee/salary-history", changePassword: "/api/employee/change-password", signSalary: "/api/employee/sign-salary", bonuses: "/api/employee/bonuses", signBonus: "/api/employee/sign-bonus" }` (hai key cuối trùng giá trị `payroll.sign`/`bonus.employeeSign` hiện có — giữ cả hai để không phải sửa hook cũ).

- [ ] **Step 1: Thêm `pv` vào `AuthResult` và lấy version từ DB (`lib/auth.ts`)**

- `AuthResult.user` thêm `pv: number;`.
- `AdminUser` thêm `token_version: number;`; `AdminCredentialRecord = Pick<AdminUser, "id" | "username" | "password_hash" | "token_version">`; `ADMIN_CREDENTIAL_SELECT = "id, username, password_hash, token_version"`.
- Trong `authenticateUser`, nhánh admin: `pv: adminRecord.token_version`.
- Nhánh nhân viên: select thêm `password_version` (chuỗi select thành `"employee_id, full_name, department, chuc_vu, cccd_hash, password_hash, last_password_change_at, password_version"`), trả `pv: employee.password_version ?? 0`.

- [ ] **Step 2: Sửa `app/api/admin/login/route.ts`**

Thay block `tokenPayload` … `response.cookies.set` bằng:

```ts
    const tokenPayload: Omit<JWTPayload, "iat" | "exp"> = {
      username: user.username,
      employee_id: user.employee_id,
      role: user.role as JWTPayload["role"],
      department: user.department,
      allowed_departments: user.allowed_departments,
      permissions: user.permissions,
      pv: user.pv,
    };

    const token = jwt.sign(tokenPayload, getJwtSecret(), {
      expiresIn: "24h",
      audience: ADMIN_TOKEN_AUDIENCE,
      algorithm: "HS256",
    });

    const response = NextResponse.json({
      success: true,
      user: {
        employee_id: user.employee_id,
        username: user.username,
        role: user.role,
        department: user.department,
        allowed_departments: user.allowed_departments,
        permissions: user.permissions,
      },
      message: "Đăng nhập thành công",
    });

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProduction(),
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });
```

Import `ADMIN_TOKEN_AUDIENCE` từ `@/lib/validations/auth-token`, `AUTH_COOKIE_NAME` từ `@/lib/auth-middleware`. Xoá comment `// Create enhanced JWT token...`. Khối swagger JSDoc giữ nguyên (swagger-jsdoc đọc). `rateLimit("login")(request)` sẽ thành `await` ở T7.

- [ ] **Step 3: Viết test fail cho `/api/admin/me`**

`lib/auth/__tests__/me-route.test.ts`:

```ts
/**
 * @jest-environment node
 */
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

const assertTokenFresh = jest.fn();
jest.mock("@/lib/auth/token-freshness", () => ({
  assertTokenFresh: (...args: unknown[]) => assertTokenFresh(...args),
}));
jest.mock("@/utils/supabase/server", () => ({ createServiceClient: () => ({}) }));

import { GET } from "@/app/api/admin/me/route";

const SECRET = process.env.JWT_SECRET as string;

function adminRequest(pvFresh: boolean) {
  assertTokenFresh.mockResolvedValue(pvFresh);
  const token = jwt.sign(
    { username: "superadmin", employee_id: "admin", role: "admin", department: "ALL", permissions: ["ALL"], pv: 1 },
    SECRET,
    { expiresIn: "1h", audience: "admin" },
  );
  return new NextRequest("http://localhost/api/admin/me", { headers: { cookie: `auth_token=${token}` } });
}

describe("GET /api/admin/me", () => {
  it("không cookie → 401 no-store", async () => {
    const response = await GET(new NextRequest("http://localhost/api/admin/me"));
    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store, max-age=0");
  });

  it("token hợp lệ → user không có pv/iat/exp", async () => {
    const response = await GET(adminRequest(true));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.user).toEqual({
      employee_id: "admin",
      username: "superadmin",
      role: "admin",
      department: "ALL",
      allowed_departments: undefined,
      permissions: ["ALL"],
    });
    expect(body.user).not.toHaveProperty("pv");
  });

  it("pv cũ → 401", async () => {
    const response = await GET(adminRequest(false));
    expect(response.status).toBe(401);
  });
});
```

- [ ] **Step 4: Chạy test, xác nhận fail**

Run: `npm test -- --testPathPattern="me-route"`
Expected: FAIL `Cannot find module '@/app/api/admin/me/route'`.

- [ ] **Step 5: Viết `app/api/admin/me/route.ts`**

```ts
import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth-middleware";
import { assertTokenFresh } from "@/lib/auth/token-freshness";
import { createServiceClient } from "@/utils/supabase/server";
import { CACHE_HEADERS } from "@/lib/utils/cache-headers";

const SESSION_EXPIRED = "Phiên đăng nhập đã hết hạn";

export async function GET(request: NextRequest) {
  const auth = verifyToken(request);
  if (!auth) {
    return NextResponse.json({ error: SESSION_EXPIRED }, { status: 401, headers: CACHE_HEADERS.sensitive });
  }
  const fresh = await assertTokenFresh(createServiceClient(), auth.user);
  if (!fresh) {
    return NextResponse.json({ error: SESSION_EXPIRED }, { status: 401, headers: CACHE_HEADERS.sensitive });
  }
  const { employee_id, username, role, department, allowed_departments, permissions } = auth.user;
  return NextResponse.json(
    { user: { employee_id, username, role, department, allowed_departments, permissions } },
    { headers: CACHE_HEADERS.sensitive },
  );
}
```

- [ ] **Step 6: Thêm endpoint vào `lib/api/endpoints.ts`**

```ts
  auth: {
    login: "/api/admin/login",
    logout: "/api/admin/logout",
    me: "/api/admin/me",
  },
  employee: {
    lookup: "/api/employee/lookup",
    detail: "/api/employee/detail",
    salaryHistory: "/api/employee/salary-history",
    changePassword: "/api/employee/change-password",
    signSalary: "/api/employee/sign-salary",
    bonuses: "/api/employee/bonuses",
    signBonus: "/api/employee/sign-bonus",
  },
```

- [ ] **Step 7: Chạy test, xác nhận pass; typecheck**

Run: `npm test -- --testPathPattern="me-route|auth-kernel"`
Expected: PASS.

Run: `npm run format && npm run lint && npm run typecheck`
Expected: sạch. Nếu `admin-login-form.tsx` báo thiếu `data.token` thì chưa phải lúc — form này được viết lại ở T9; tạm thời typecheck vẫn xanh vì form đọc `data` kiểu `any`/unknown (kiểm tra; nếu đỏ, sửa form bỏ `data.token` ngay trong task này: `saveSession(data.token, data.user)` → tạm giữ, vì `saveSession` còn tồn tại đến T9, nên chỉ cần `data.token ?? ""`).

- [ ] **Step 8: Commit**

```bash
git add lib/auth.ts app/api/admin/login/route.ts app/api/admin/me/route.ts lib/auth/__tests__/me-route.test.ts lib/api/endpoints.ts
git commit -m "feat(auth): login ký token có aud/pv chỉ qua cookie, thêm GET /api/admin/me"
```

---

### Task 6: Migration 36 — lockout, rate-limit bucket, `token_version`, CHECK `chuc_vu <> 'admin'`

**Files:**
- Create: `scripts/supabase-setup/36-auth-lockout-and-rate-limit.sql`
- Modify: `scripts/supabase-setup/README.md` (thêm dòng cho 36, 37)

**Interfaces:**
- Produces (gọi từ app qua `supabase.rpc`):
  - `record_login_failure(p_table TEXT, p_id TEXT) RETURNS JSONB` → `{ "locked": bool, "fail_count": int, "locked_until": text|null }`. Khoá sau **5** lần sai trong cửa sổ, khoá **15 phút**. `p_table ∈ ('employees','admin_users')`; `p_id` = `employee_id` hoặc `username`.
  - `record_login_success(p_table TEXT, p_id TEXT) RETURNS VOID` → reset `failed_login_attempts = 0`, `locked_until = NULL`.
  - `handle_password_reset_failure(p_employee_id VARCHAR) RETURNS JSONB` (một tham số; 5 lần / 30 phút; cùng shape JSON như trên).
  - `consume_rate_limit(p_key TEXT, p_limit INT, p_window INTERVAL) RETURNS JSONB` → `{ "allowed": bool, "remaining": int, "retry_after_seconds": int }`.
  - Bảng `rate_limit_buckets(key TEXT PK, window_start TIMESTAMPTZ, count INT)` có RLS, không policy (chỉ service role).
  - Cột mới `admin_users.token_version INT NOT NULL DEFAULT 0`, `admin_users.failed_login_attempts INT NOT NULL DEFAULT 0`, `admin_users.locked_until TIMESTAMPTZ`, `admin_users.is_active BOOLEAN NOT NULL DEFAULT true` (IF NOT EXISTS).
  - `employees.locked_until` → `TIMESTAMPTZ`; `employees.failed_login_attempts` NOT NULL DEFAULT 0.
  - Constraint `employees_chuc_vu_not_admin CHECK (chuc_vu <> 'admin')`.

- [ ] **Step 1: Viết file migration**

`scripts/supabase-setup/36-auth-lockout-and-rate-limit.sql`:

```sql
-- SCRIPT 36: LOCKOUT ĐĂNG NHẬP, RATE LIMIT TRONG POSTGRES, token_version CHO ADMIN
-- Phạm vi: khắc phục BRUTE-FORCE / MISSING-RATE-LIMIT / JWT revocation trong báo cáo vbsec 2026-10-08.
--
-- BẮT BUỘC: backup database trước khi chạy (xem docs/superpowers/plans/2026-10-08-security-remediation-phase-1.md, Task 16).
-- Chạy toàn bộ file trong SQL Editor của Supabase (một transaction). Chạy lại được (idempotent).
--
-- Deploy app có code Pha 1 CHỈ SAU KHI script này chạy xong, vì app gọi các RPC bên dưới.

BEGIN;

-- ===== BƯỚC 1: cột cho admin_users =====
ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_login_attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- ===== BƯỚC 2: chuẩn hoá cột lockout của employees =====
-- Reset trạng thái khoá cũ (tối đa 15 phút) trước khi đổi kiểu để không lệch giờ.
UPDATE employees SET locked_until = NULL, failed_login_attempts = 0
WHERE locked_until IS NOT NULL OR failed_login_attempts IS NULL OR failed_login_attempts <> 0;

ALTER TABLE employees
  ALTER COLUMN locked_until TYPE TIMESTAMPTZ USING locked_until AT TIME ZONE 'UTC',
  ALTER COLUMN failed_login_attempts SET DEFAULT 0,
  ALTER COLUMN failed_login_attempts SET NOT NULL;

-- ===== BƯỚC 3: không nhân viên nào mang chuc_vu = 'admin' =====
DO $$
DECLARE
  v_offenders TEXT;
BEGIN
  SELECT string_agg(employee_id, ', ') INTO v_offenders
  FROM employees WHERE chuc_vu = 'admin';
  IF v_offenders IS NOT NULL THEN
    RAISE EXCEPTION 'Có nhân viên mang chuc_vu = admin: %. Đổi chức vụ các mã này trước rồi chạy lại script.', v_offenders;
  END IF;
END $$;

ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_chuc_vu_not_admin;
ALTER TABLE employees ADD CONSTRAINT employees_chuc_vu_not_admin CHECK (chuc_vu <> 'admin');

-- ===== BƯỚC 4: RPC lockout dùng chung cho employees và admin_users =====
CREATE OR REPLACE FUNCTION record_login_failure(p_table TEXT, p_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  c_max_attempts CONSTANT INT := 5;
  c_lock_duration CONSTANT INTERVAL := '15 minutes';
  v_key_column TEXT;
  v_fail_count INT;
  v_locked_until TIMESTAMPTZ;
BEGIN
  IF p_table = 'employees' THEN
    v_key_column := 'employee_id';
  ELSIF p_table = 'admin_users' THEN
    v_key_column := 'username';
  ELSE
    RAISE EXCEPTION 'record_login_failure: bảng không hợp lệ %', p_table;
  END IF;

  EXECUTE format(
    'UPDATE %I SET failed_login_attempts = CASE WHEN locked_until IS NOT NULL AND locked_until <= NOW() THEN 1 ELSE failed_login_attempts + 1 END,
                    locked_until = CASE WHEN locked_until IS NOT NULL AND locked_until <= NOW() THEN NULL ELSE locked_until END
     WHERE %I = $1
     RETURNING failed_login_attempts, locked_until',
    p_table, v_key_column
  ) INTO v_fail_count, v_locked_until USING p_id;

  IF v_fail_count IS NULL THEN
    RETURN jsonb_build_object('locked', false, 'fail_count', 0, 'locked_until', NULL);
  END IF;

  IF v_fail_count >= c_max_attempts AND (v_locked_until IS NULL OR v_locked_until <= NOW()) THEN
    v_locked_until := NOW() + c_lock_duration;
    EXECUTE format('UPDATE %I SET locked_until = $1 WHERE %I = $2', p_table, v_key_column)
      USING v_locked_until, p_id;
  END IF;

  RETURN jsonb_build_object(
    'locked', v_locked_until IS NOT NULL AND v_locked_until > NOW(),
    'fail_count', v_fail_count,
    'locked_until', v_locked_until
  );
END;
$$;

CREATE OR REPLACE FUNCTION record_login_success(p_table TEXT, p_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_key_column TEXT;
BEGIN
  IF p_table = 'employees' THEN
    v_key_column := 'employee_id';
  ELSIF p_table = 'admin_users' THEN
    v_key_column := 'username';
  ELSE
    RAISE EXCEPTION 'record_login_success: bảng không hợp lệ %', p_table;
  END IF;

  EXECUTE format('UPDATE %I SET failed_login_attempts = 0, locked_until = NULL WHERE %I = $1', p_table, v_key_column)
    USING p_id;
END;
$$;

-- ===== BƯỚC 5: handle_password_reset_failure chỉ còn 1 tham số (hằng số trong DB) =====
DROP FUNCTION IF EXISTS handle_password_reset_failure(VARCHAR, INT, INTERVAL);

CREATE OR REPLACE FUNCTION handle_password_reset_failure(p_employee_id VARCHAR)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  c_max_attempts CONSTANT INT := 5;
  c_lock_duration CONSTANT INTERVAL := '30 minutes';
  v_fail_count INT;
  v_locked_until TIMESTAMPTZ;
BEGIN
  UPDATE employees
  SET recovery_fail_count = COALESCE(recovery_fail_count, 0) + 1
  WHERE employee_id = p_employee_id
  RETURNING recovery_fail_count, recovery_locked_until INTO v_fail_count, v_locked_until;

  IF v_fail_count IS NULL THEN
    RETURN jsonb_build_object('locked', false, 'fail_count', 0, 'locked_until', NULL);
  END IF;

  IF v_fail_count >= c_max_attempts THEN
    v_locked_until := NOW() + c_lock_duration;
    UPDATE employees SET recovery_locked_until = v_locked_until WHERE employee_id = p_employee_id;
  END IF;

  RETURN jsonb_build_object(
    'locked', v_locked_until IS NOT NULL AND v_locked_until > NOW(),
    'fail_count', v_fail_count,
    'locked_until', v_locked_until
  );
END;
$$;

-- ===== BƯỚC 6: rate limit bucket =====
CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  key TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL,
  count INT NOT NULL
);

ALTER TABLE rate_limit_buckets ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION consume_rate_limit(p_key TEXT, p_limit INT, p_window INTERVAL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_count INT;
  v_window_start TIMESTAMPTZ;
BEGIN
  INSERT INTO rate_limit_buckets AS b (key, window_start, count)
  VALUES (p_key, NOW(), 1)
  ON CONFLICT (key) DO UPDATE SET
    count = CASE WHEN b.window_start + p_window <= NOW() THEN 1 ELSE b.count + 1 END,
    window_start = CASE WHEN b.window_start + p_window <= NOW() THEN NOW() ELSE b.window_start END
  RETURNING count, window_start INTO v_count, v_window_start;

  IF random() < 0.01 THEN
    DELETE FROM rate_limit_buckets WHERE window_start < NOW() - INTERVAL '1 day';
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_count <= p_limit,
    'remaining', GREATEST(p_limit - v_count, 0),
    'retry_after_seconds', GREATEST(CEIL(EXTRACT(EPOCH FROM (v_window_start + p_window - NOW())))::INT, 1)
  );
END;
$$;

-- ===== BƯỚC 7: kiểm tra sau khi chạy =====
DO $$
BEGIN
  ASSERT (SELECT COUNT(*) FROM information_schema.columns
          WHERE table_name = 'admin_users' AND column_name IN ('token_version', 'failed_login_attempts', 'locked_until', 'is_active')) = 4,
    'admin_users thiếu cột lockout/token_version';
  ASSERT (SELECT data_type FROM information_schema.columns
          WHERE table_name = 'employees' AND column_name = 'locked_until') = 'timestamp with time zone',
    'employees.locked_until chưa phải TIMESTAMPTZ';
  ASSERT (SELECT COUNT(*) FROM pg_proc WHERE proname = 'handle_password_reset_failure') = 1,
    'handle_password_reset_failure phải còn đúng 1 overload';
  ASSERT (SELECT COUNT(*) FROM pg_proc WHERE proname IN ('record_login_failure', 'record_login_success', 'consume_rate_limit')) = 3,
    'thiếu RPC lockout/rate limit';
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE relname = 'rate_limit_buckets'),
    'rate_limit_buckets chưa bật RLS';
  ASSERT (SELECT (consume_rate_limit('selftest:' || gen_random_uuid()::text, 1, INTERVAL '1 minute'))->>'allowed') = 'true',
    'consume_rate_limit lần đầu phải allowed';
END $$;

DELETE FROM rate_limit_buckets WHERE key LIKE 'selftest:%';

COMMIT;
```

- [ ] **Step 2: Kiểm tra cú pháp bằng Postgres local nếu có, nếu không thì review tay**

Run (nếu có `psql` + Postgres local/Docker): `psql "$LOCAL_DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/supabase-setup/36-auth-lockout-and-rate-limit.sql`
Expected: `COMMIT` không lỗi. Nếu không có Postgres local, bỏ qua bước này và ghi rõ trong commit message rằng script chưa chạy thử; user sẽ chạy trên bản backup/staging trước prod (T16).

- [ ] **Step 3: Cập nhật `scripts/supabase-setup/README.md`**

Thêm hai dòng theo format bảng/danh sách sẵn có:
- `36-auth-lockout-and-rate-limit.sql` — lockout đăng nhập (employees + admin_users), `token_version`, rate limit bucket, CHECK `chuc_vu <> 'admin'`. Chạy TRƯỚC khi deploy Pha 1.
- `37-harden-functions-and-rls.sql` — SECURITY INVOKER + REVOKE PUBLIC cho mọi function, xoá policy `USING (true)`, bật RLS mọi bảng public. Chạy SAU 36.

- [ ] **Step 4: Commit**

```bash
git add scripts/supabase-setup/36-auth-lockout-and-rate-limit.sql scripts/supabase-setup/README.md
git commit -m "feat(db): migration 36 lockout đăng nhập, rate limit bucket, token_version và chặn chuc_vu admin"
```

---
### Task 7: Rate limit trong Postgres, `getClientIP` duy nhất, lockout khi đăng nhập/tra cứu

**Files:**
- Create: `lib/rate-limit.ts`
- Create: `lib/__tests__/rate-limit.test.ts`
- Create: `lib/__tests__/security-middleware.test.ts`
- Modify: `lib/security-middleware.ts` (xoá in-memory rate limit, `validateInput`, `sanitizeInput`, `preventSQLInjection`, `preventXSS`, `securityHeaders`, `applySecurity`, `setInterval`; export `getClientIP`, `getClientIPFromHeaders`; `csrfProtection` không nhận `http://` ở production)
- Modify: `lib/auth.ts` (`verifyAdminCredentials`, `authenticateUser` dùng lockout RPC, thông báo chung)
- Modify: `lib/employee/employee-repository.ts` (`is_active`, cột `password_version`, `locked_until`)
- Modify: `lib/employee/lookup-service.ts:136-188`
- Modify: `lib/employee/__fixtures__/legacy-employee-auth-query.ts`, `lib/employee/__tests__/employee-auth-query-parity.test.ts`, `lib/employee/__tests__/lookup-service.test.ts`
- Modify: `app/api/admin/login/route.ts:48`, `app/api/auth/change-password-with-cccd/route.ts:94`, `app/api/auth/forgot-password/route.ts:89`, `app/api/employee/change-password/route.ts:58`, `app/api/employee/lookup/route.ts:130` (import từ `@/lib/rate-limit`, `await`, truyền account key)
- Modify: `app/api/admin/payroll/[id]/route.ts:20-32` (xoá `getClientIP` local), `lib/bonus/bonus-signature-status.ts:39-45`, `lib/audit-service.ts:65-90`, `lib/auth-middleware.ts` (`getAuditInfo.ip_address`)

**Interfaces:**
- Consumes: RPC `consume_rate_limit`, `record_login_failure`, `record_login_success` (T6); `createEmployeeSession(id, pv)` (T4).
- Produces:
  - `getClientIPFromHeaders(headers: { get(name: string): string | null }): string` — `x-real-ip` → phần tử **cuối** của `x-forwarded-for` → `"unknown"`; cắt 45 ký tự.
  - `getClientIP(request: NextRequest): string` (export từ `lib/security-middleware.ts`).
  - `lib/rate-limit.ts`: `RATE_LIMITS`, `type RateLimitType`, `rateLimit(type)(request, accountKey?: string): Promise<NextResponse | null>`; 429 body `{ error: "Quá nhiều yêu cầu. Vui lòng thử lại sau.", retryAfter }` + header `Retry-After`. Lỗi RPC → **fail-open** (log `console.error`, cho qua) để DB sự cố không chặn toàn bộ đăng nhập.
  - Thông báo xác thực chung: `AUTH_FAILED_MESSAGE = "Thông tin đăng nhập không đúng"`, `ACCOUNT_LOCKED_MESSAGE = "Tài khoản tạm bị khoá do nhập sai nhiều lần, vui lòng thử lại sau 15 phút"` (export từ `lib/auth/lockout.ts`, cùng `isLocked(lockedUntil: string | null): boolean`, `recordLoginFailure(supabase, table, id)`, `recordLoginSuccess(supabase, table, id)`).
  - `EmployeeAuthRecord` thêm `password_version: number`, `locked_until: string | null`; `findEmployeeAuthRecord` chỉ trả nhân viên `is_active = true`.

- [ ] **Step 1: Viết test fail cho `getClientIP` + csrf production**

`lib/__tests__/security-middleware.test.ts`:

```ts
/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { csrfProtection, getClientIP, getClientIPFromHeaders } from "@/lib/security-middleware";

const isProduction = jest.fn(() => false);
jest.mock("@/lib/config/runtime", () => ({ isProduction: () => isProduction() }));

function requestWith(headers: Record<string, string>, method = "GET") {
  return new NextRequest("http://localhost/api/x", { method, headers });
}

describe("getClientIP", () => {
  it("ưu tiên x-real-ip", () => {
    expect(getClientIP(requestWith({ "x-real-ip": "9.9.9.9", "x-forwarded-for": "1.1.1.1, 2.2.2.2" }))).toBe("9.9.9.9");
  });

  it("x-forwarded-for lấy phần tử cuối (do proxy gắn), không lấy phần tử đầu client tự chèn", () => {
    expect(getClientIP(requestWith({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" }))).toBe("2.2.2.2");
  });

  it("không header → unknown", () => {
    expect(getClientIP(requestWith({}))).toBe("unknown");
  });

  it("bỏ qua cf-connecting-ip", () => {
    expect(getClientIP(requestWith({ "cf-connecting-ip": "8.8.8.8" }))).toBe("unknown");
  });

  it("cắt về 45 ký tự", () => {
    const long = "a".repeat(100);
    expect(getClientIPFromHeaders(new Headers({ "x-real-ip": long }))).toHaveLength(45);
  });
});

describe("csrfProtection", () => {
  beforeEach(() => isProduction.mockReturnValue(false));

  it("GET luôn qua", () => {
    expect(csrfProtection(requestWith({}, "GET"))).toBeNull();
  });

  it("POST cùng origin https qua", () => {
    expect(csrfProtection(requestWith({ host: "luong.example.vn", origin: "https://luong.example.vn" }, "POST"))).toBeNull();
  });

  it("POST origin http bị chặn ở production", async () => {
    isProduction.mockReturnValue(true);
    const response = csrfProtection(requestWith({ host: "luong.example.vn", origin: "http://luong.example.vn" }, "POST"));
    expect(response?.status).toBe(403);
  });

  it("POST origin http qua ngoài production", () => {
    expect(csrfProtection(requestWith({ host: "localhost:3000", origin: "http://localhost:3000" }, "POST"))).toBeNull();
  });

  it("POST không origin/referer bị chặn", () => {
    expect(csrfProtection(requestWith({ host: "luong.example.vn" }, "POST"))?.status).toBe(403);
  });
});
```

- [ ] **Step 2: Viết test fail cho `rateLimit`**

`lib/__tests__/rate-limit.test.ts`:

```ts
/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

const rpc = jest.fn();
jest.mock("@/utils/supabase/server", () => ({ createServiceClient: () => ({ rpc }) }));

import { rateLimit } from "@/lib/rate-limit";

function request(ip = "10.0.0.1") {
  return new NextRequest("http://localhost/api/admin/login", { method: "POST", headers: { "x-real-ip": ip } });
}

beforeEach(() => {
  rpc.mockReset();
  rpc.mockResolvedValue({ data: { allowed: true, remaining: 1, retry_after_seconds: 1 }, error: null });
});

describe("rateLimit", () => {
  it("login gọi 2 bucket: ip và account (lowercase)", async () => {
    await rateLimit("login")(request(), "SuperAdmin");
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc).toHaveBeenCalledWith("consume_rate_limit", { p_key: "login:ip:10.0.0.1", p_limit: 20, p_window: "15 minutes" });
    expect(rpc).toHaveBeenCalledWith("consume_rate_limit", { p_key: "login:acct:superadmin", p_limit: 10, p_window: "15 minutes" });
  });

  it("không có accountKey → chỉ bucket ip", async () => {
    await rateLimit("payroll")(request());
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("consume_rate_limit", { p_key: "payroll:ip:10.0.0.1", p_limit: 30, p_window: "1 minute" });
  });

  it("bucket bị chặn → 429 với Retry-After", async () => {
    rpc.mockResolvedValueOnce({ data: { allowed: true, remaining: 5, retry_after_seconds: 1 }, error: null });
    rpc.mockResolvedValueOnce({ data: { allowed: false, remaining: 0, retry_after_seconds: 540 }, error: null });
    const response = await rateLimit("login")(request(), "x");
    expect(response?.status).toBe(429);
    expect(response?.headers.get("Retry-After")).toBe("540");
    expect(await response?.json()).toEqual({ error: "Quá nhiều yêu cầu. Vui lòng thử lại sau.", retryAfter: 540 });
  });

  it("RPC lỗi → cho qua (fail-open) và log", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    rpc.mockResolvedValue({ data: null, error: { message: "db down" } });
    expect(await rateLimit("api")(request())).toBeNull();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("ip unknown vẫn có key", async () => {
    await rateLimit("admin")(new NextRequest("http://localhost/api/x"));
    expect(rpc).toHaveBeenCalledWith("consume_rate_limit", { p_key: "admin:ip:unknown", p_limit: 200, p_window: "1 minute" });
  });
});
```

- [ ] **Step 3: Chạy test, xác nhận fail**

Run: `npm test -- --testPathPattern="security-middleware|rate-limit"`
Expected: FAIL (`getClientIP` không export, module `@/lib/rate-limit` không tồn tại).

- [ ] **Step 4: Viết lại `lib/security-middleware.ts`**

Toàn bộ file (thay thế 293 dòng cũ):

```ts
import { type NextRequest, NextResponse } from "next/server";
import { getVietnamTimestamp } from "@/lib/utils/vietnam-timezone";
import { isProduction } from "@/lib/config/runtime";

const MAX_IP_LENGTH = 45;

interface HeaderReader {
  get(name: string): string | null;
}

export function getClientIPFromHeaders(headers: HeaderReader): string {
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, MAX_IP_LENGTH);
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const last = forwarded.split(",").pop()?.trim();
    if (last) return last.slice(0, MAX_IP_LENGTH);
  }
  return "unknown";
}

export function getClientIP(request: NextRequest): string {
  return getClientIPFromHeaders(request.headers);
}

function allowedOriginsFor(host: string | null): string[] {
  const origins = [`https://${host}`];
  if (!isProduction()) origins.push(`http://${host}`);
  if (process.env.NEXT_PUBLIC_APP_URL) origins.push(process.env.NEXT_PUBLIC_APP_URL);
  return origins;
}

export function csrfProtection(request: NextRequest): NextResponse | null {
  if (request.method === "GET") return null;

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const allowedOrigins = allowedOriginsFor(request.headers.get("host"));

  const isValidOrigin = Boolean(origin && allowedOrigins.includes(origin));
  const isValidReferer = Boolean(referer && allowedOrigins.some((allowed) => referer.startsWith(`${allowed}/`)));

  if (!isValidOrigin && !isValidReferer) {
    return NextResponse.json({ error: "Yêu cầu không hợp lệ (CSRF)" }, { status: 403 });
  }
  return null;
}

export async function logSecurityEvent(
  event: string,
  details: Record<string, unknown>,
  request: NextRequest,
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "MEDIUM",
) {
  const logEntry = {
    timestamp: getVietnamTimestamp(),
    event,
    severity,
    ip: getClientIP(request),
    userAgent: request.headers.get("user-agent"),
    url: request.url,
    method: request.method,
    details,
  };
  if (severity === "CRITICAL") {
    console.error("[SECURITY CRITICAL]", logEntry);
    return;
  }
  console.warn(`[SECURITY ${severity}]`, logEntry);
}

export function applySecurityHeadersTo(response: NextResponse): void {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
}
```

File này được `proxy.ts` (edge) import nên **không** import `createServiceClient`. Kiểm tra không còn ai dùng hàm đã xoá:

Run: `grep -rn "validateInput\|preventSQLInjection\|preventXSS\|applySecurity(\|securityHeaders()" app lib proxy.ts`
Expected: không có kết quả.

- [ ] **Step 5: Viết `lib/rate-limit.ts`**

```ts
import "server-only";
import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { getClientIP } from "@/lib/security-middleware";

interface BucketRule {
  limit: number;
  window: string;
}

interface RateLimitRule {
  ip: BucketRule;
  account?: BucketRule;
}

export const RATE_LIMITS = {
  login: { ip: { limit: 20, window: "15 minutes" }, account: { limit: 10, window: "15 minutes" } },
  payroll: { ip: { limit: 30, window: "1 minute" }, account: { limit: 10, window: "5 minutes" } },
  passwordReset: { ip: { limit: 5, window: "15 minutes" }, account: { limit: 3, window: "15 minutes" } },
  passwordChange: { ip: { limit: 3, window: "1 minute" } },
  api: { ip: { limit: 100, window: "1 minute" } },
  admin: { ip: { limit: 200, window: "1 minute" } },
} satisfies Record<string, RateLimitRule>;

export type RateLimitType = keyof typeof RATE_LIMITS;

interface BucketOutcome {
  allowed: boolean;
  retryAfterSeconds: number;
}

async function consumeBucket(key: string, rule: BucketRule): Promise<BucketOutcome> {
  const { data, error } = await createServiceClient().rpc("consume_rate_limit", {
    p_key: key,
    p_limit: rule.limit,
    p_window: rule.window,
  });
  if (error || !data) {
    console.error("consume_rate_limit thất bại, cho qua:", key, error?.message);
    return { allowed: true, retryAfterSeconds: 0 };
  }
  const outcome = data as { allowed: boolean; retry_after_seconds: number };
  return { allowed: outcome.allowed, retryAfterSeconds: outcome.retry_after_seconds };
}

function tooManyRequests(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    { error: "Quá nhiều yêu cầu. Vui lòng thử lại sau.", retryAfter: retryAfterSeconds },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}

export function rateLimit(type: RateLimitType) {
  const rule: RateLimitRule = RATE_LIMITS[type];
  return async (request: NextRequest, accountKey?: string): Promise<NextResponse | null> => {
    const checks = [consumeBucket(`${type}:ip:${getClientIP(request)}`, rule.ip)];
    if (rule.account && accountKey) {
      checks.push(consumeBucket(`${type}:acct:${accountKey.trim().toLowerCase()}`, rule.account));
    }
    const outcomes = await Promise.all(checks);
    const blocked = outcomes.find((outcome) => !outcome.allowed);
    return blocked ? tooManyRequests(blocked.retryAfterSeconds) : null;
  };
}
```

- [ ] **Step 6: Chạy test, xác nhận pass**

Run: `npm test -- --testPathPattern="security-middleware|rate-limit"`
Expected: PASS.

- [ ] **Step 7: Cập nhật 5 call site `rateLimit`**

Mỗi file: đổi import `rateLimit` sang `@/lib/rate-limit` (giữ `csrfProtection` từ security-middleware), thêm `await`, truyền account key **sau khi** đã parse body:

- `app/api/admin/login/route.ts`: chuyển dòng `rateLimit("login")` xuống sau `const { username, password } = parsed.data;` → `const rateLimitResult = await rateLimit("login")(request, username);`
- `app/api/employee/lookup/route.ts`: chuyển block rate limit xuống sau `try { const input = await getLookupInput(request); ... }` → `await rateLimit("payroll")(request, employee_id)`; giữ nhánh trả HTML 429.
- `app/api/auth/forgot-password/route.ts` và `app/api/auth/change-password-with-cccd/route.ts`: `await rateLimit("passwordReset")(request, parsed.data.employee_id)` đặt sau parse body (đọc file để tìm biến employee_id đã parse).
- `app/api/employee/change-password/route.ts`: `await rateLimit("passwordChange")(request)`.

Run: `grep -rn 'rateLimit("' app | grep -v await`
Expected: trống.

- [ ] **Step 8: Tạo `lib/auth/lockout.ts`**

```ts
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export const AUTH_FAILED_MESSAGE = "Thông tin đăng nhập không đúng";
export const ACCOUNT_LOCKED_MESSAGE =
  "Tài khoản tạm bị khoá do nhập sai nhiều lần, vui lòng thử lại sau 15 phút";

export type LockoutTable = "employees" | "admin_users";

export function isLocked(lockedUntil: string | null | undefined): boolean {
  if (!lockedUntil) return false;
  const until = Date.parse(lockedUntil);
  return Number.isFinite(until) && until > Date.now();
}

export async function recordLoginFailure(supabase: SupabaseClient, table: LockoutTable, id: string): Promise<void> {
  const { error } = await supabase.rpc("record_login_failure", { p_table: table, p_id: id });
  if (error) console.error("record_login_failure thất bại:", table, error.message);
}

export async function recordLoginSuccess(supabase: SupabaseClient, table: LockoutTable, id: string): Promise<void> {
  const { error } = await supabase.rpc("record_login_success", { p_table: table, p_id: id });
  if (error) console.error("record_login_success thất bại:", table, error.message);
}
```

Test `lib/auth/__tests__/lockout.test.ts`:

```ts
/**
 * @jest-environment node
 */
import { isLocked } from "@/lib/auth/lockout";

describe("isLocked", () => {
  it("null/undefined → false", () => {
    expect(isLocked(null)).toBe(false);
    expect(isLocked(undefined)).toBe(false);
  });
  it("thời điểm tương lai → true", () => {
    expect(isLocked(new Date(Date.now() + 60_000).toISOString())).toBe(true);
  });
  it("thời điểm quá khứ → false", () => {
    expect(isLocked(new Date(Date.now() - 60_000).toISOString())).toBe(false);
  });
  it("chuỗi rác → false", () => {
    expect(isLocked("không phải ngày")).toBe(false);
  });
});
```

- [ ] **Step 9: Sửa `lib/employee/employee-repository.ts`**

```ts
const EMPLOYEE_AUTH_COLUMNS =
  "employee_id, full_name, department, chuc_vu, cccd_hash, password_hash, last_password_change_at, password_version, locked_until";

export interface EmployeeAuthRecord {
  employee_id: string;
  full_name: string | null;
  department: string | null;
  chuc_vu: string | null;
  cccd_hash: string | null;
  password_hash: string | null;
  last_password_change_at: string | null;
  password_version: number;
  locked_until: string | null;
}
```

và trong `findEmployeeAuthRecord` thêm `.eq("is_active", true)` ngay sau `.eq("employee_id", employeeId)`.

- [ ] **Step 10: Cập nhật parity test để pin khác biệt có chủ đích**

Trong `lib/employee/__tests__/employee-auth-query-parity.test.ts`, thay test đầu (`toEqual(legacy)`) bằng:

```ts
describe("findEmployeeAuthRecord so với truy vấn lookup cũ", () => {
  const columnsOf = (select?: string) => (select ?? "").split(",").map((column) => column.trim());

  it("cùng bảng và terminal", async () => {
    const [legacy] = await recordLegacy(legacyLookupEmployeeQuery);
    const [current] = await recordCurrent();
    expect(current.table).toBe(legacy.table);
    expect(current.terminal).toBe(legacy.terminal);
  });

  it("thêm đúng bộ lọc is_active = true sau employee_id", async () => {
    const [legacy] = await recordLegacy(legacyLookupEmployeeQuery);
    const [current] = await recordCurrent();
    expect(current.filters).toEqual([...legacy.filters, { method: "eq", args: ["is_active", true] }]);
  });

  it("thêm đúng 2 cột password_version, locked_until", async () => {
    const [legacy] = await recordLegacy(legacyLookupEmployeeQuery);
    const [current] = await recordCurrent();
    const added = columnsOf(current.select).filter((column) => !columnsOf(legacy.select).includes(column));
    expect(added).toEqual(["password_version", "locked_until"]);
  });
});
```

Test thứ 3 của describe sign-bonus (`added toEqual(["full_name","department","chuc_vu"])`) đổi expected thành `["full_name", "department", "chuc_vu", "password_version", "locked_until"]`; test "bộ lọc không đổi" đổi thành `expect(current.filters).toEqual([...legacy.filters, { method: "eq", args: ["is_active", true] }])`. Test thứ 4 (sign-bonus route không đọc 3 cột hồ sơ) **giữ** — T12 sẽ làm route đó không còn gọi `findEmployeeAuthRecord` nữa, nên bổ sung thêm assert `expect(source).not.toMatch(/findEmployeeAuthRecord/)` (bật ở T12).

- [ ] **Step 11: Sửa `lib/employee/lookup-service.ts`**

Thay phần từ `const employee = await findEmployeeAuthRecord` đến `return { ok: false, status: 401, error: "Mật khẩu không đúng" };` bằng:

```ts
  const employee = await findEmployeeAuthRecord(supabase, employee_id);
  if (!employee) {
    return { ok: false, status: 401, error: AUTH_FAILED_MESSAGE };
  }

  if (isLocked(employee.locked_until)) {
    return { ok: false, status: 401, error: ACCOUNT_LOCKED_MESSAGE };
  }

  if (!(await verifyEmployeeCredential(employee, cccd))) {
    await recordLoginFailure(supabase, "employees", employee_id);
    return { ok: false, status: 401, error: AUTH_FAILED_MESSAGE };
  }

  await recordLoginSuccess(supabase, "employees", employee_id);
```

và dòng tạo session: `session_token: createEmployeeSession(employee_id, employee.password_version)`. Import từ `@/lib/auth/lockout`.

Cập nhật `lib/employee/__tests__/lookup-service.test.ts`:
- `makeSupabase` trả thêm `rpc: jest.fn().mockResolvedValue({ data: null, error: null })` và expose để assert: đổi thành `function makeSupabase(...) { ...; const rpc = jest.fn()...; return { client: { from, rpc } as unknown as SupabaseServiceClient, rpc }; }` rồi sửa các call site trong test.
- `employee()` thêm `password_version: 0, locked_until: null`.
- Test "không tìm thấy" expect `{ ok: false, status: 401, error: "Thông tin đăng nhập không đúng" }`.
- Test "sai mật khẩu" expect cùng message và `expect(rpc).toHaveBeenCalledWith("record_login_failure", { p_table: "employees", p_id: "NV001" })`.
- Test "không có hash" expect 401 cùng message.
- Thêm test "đang bị khoá → 401 ACCOUNT_LOCKED_MESSAGE, không gọi rpc": `employee({ locked_until: new Date(Date.now() + 60_000).toISOString() })`.
- Thêm test "thành công → gọi record_login_success và createEmployeeSession('NV001', pv)": `employee({ password_version: 3 })` → `expect(createSessionMock).toHaveBeenCalledWith("NV001", 3)`.

- [ ] **Step 12: Sửa `lib/auth.ts` — lockout cho admin và nhân viên**

`verifyAdminCredentials`:
- `ADMIN_CREDENTIAL_SELECT = "id, username, password_hash, token_version, locked_until"`; `AdminCredentialRecord` thêm `locked_until: string | null` (thêm vào `AdminUser` trước).
- Đổi kiểu trả về thành `Promise<{ ok: true; admin: AdminCredentialRecord } | { ok: false; locked: boolean }>`:
  - không tìm thấy → `{ ok: false, locked: false }`
  - `isLocked(admin.locked_until)` → `{ ok: false, locked: true }`
  - sai mật khẩu → `await recordLoginFailure(supabase, "admin_users", admin.username)` rồi `{ ok: false, locked: false }`
  - đúng → `await recordLoginSuccess(...)`, update `last_login` như cũ, `{ ok: true, admin }`.
- Xoá các comment JSDoc/inline trong hàm.

`authenticateUser`:
- Nhánh admin: `const adminResult = await verifyAdminCredentials(username, password); if (adminResult.ok) return {...pv: adminResult.admin.token_version}; if (adminResult.locked) return { success: false, error: ACCOUNT_LOCKED_MESSAGE };` rồi rơi xuống nhánh nhân viên (giữ hành vi: username có thể là mã nhân viên).
- Nhánh nhân viên: select thêm `password_version, locked_until`; `error || !employee` → `{ success: false, error: AUTH_FAILED_MESSAGE }`; `isLocked(employee.locked_until)` → `ACCOUNT_LOCKED_MESSAGE`; sai mật khẩu → `recordLoginFailure(supabase, "employees", employee.employee_id)` + `AUTH_FAILED_MESSAGE`; đúng → `recordLoginSuccess` và trả `pv: employee.password_version`.
- Giữ chặn `admin` ("Tài khoản không tồn tại" → đổi thành `AUTH_FAILED_MESSAGE` để đồng nhất).
- Kiểm tra `lib/auth/__tests__/credential-parity.test.ts` còn xanh (nó có thể pin select string của `authenticateUser` — nếu vậy cập nhật expected select thêm 2 cột và filter không đổi).

- [ ] **Step 13: Gom `getClientIP`**

- `app/api/admin/payroll/[id]/route.ts`: xoá hàm local dòng 20–32 và comment; `import { getClientIP } from "@/lib/security-middleware";`.
- `lib/bonus/bonus-signature-status.ts:39-45`: thân `resolveClientIp` → `return getClientIP(request);` (đã cắt 45 trong helper).
- `lib/audit-service.ts:65-90`: thân `getClientIP()` → `const headersList = await headers(); return getClientIPFromHeaders(headersList);`, xoá mảng `ipHeaders` và các comment.
- `lib/auth-middleware.ts` `getAuditInfo.ip_address` → `getClientIP(request)`.

Run: `grep -rn "x-forwarded-for" app lib | grep -v security-middleware.ts`
Expected: trống.

- [ ] **Step 13b: Wrapper `withCsrf` và audit route non-GET (spec §2.4)**

Thêm vào cuối `lib/security-middleware.ts`:

```ts
type RouteHandler = (request: NextRequest, context?: unknown) => Promise<NextResponse> | NextResponse;

export function withCsrf(handler: RouteHandler): RouteHandler {
  return (request, context) => {
    const rejected = csrfProtection(request);
    if (rejected) return rejected;
    return handler(request, context);
  };
}
```

Áp cho mọi route non-GET dưới `app/api/**`: `export const POST = withCsrf(async (request: NextRequest) => { ... })` (tương tự `PUT`/`PATCH`/`DELETE`), xoá block `const csrfResult = csrfProtection(request); if (csrfResult) return csrfResult;` nội tuyến. Route có `context` (`[id]`) giữ tham số thứ hai. Test trong `security-middleware.test.ts`:

```ts
describe("withCsrf", () => {
  it("chặn POST cross-origin trước khi vào handler", async () => {
    const handler = jest.fn(async () => NextResponse.json({ ok: true }));
    const response = await withCsrf(handler)(requestWith({ host: "luong.example.vn", origin: "https://khac.vn" }, "POST"));
    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });
});
```

Audit sau khi sửa:

```bash
for f in $(grep -rlE "export (async function|const) (POST|PUT|PATCH|DELETE)" app/api --include=route.ts); do grep -q "withCsrf" "$f" || echo "THIẾU withCsrf: $f"; done
```

Expected: trống (42 route hiện có `csrfProtection` inline; các route non-GET chưa có cũng phải bọc).

- [ ] **Step 14: Chạy test liên quan, lint, typecheck**

Run: `npm test -- --testPathPattern="security-middleware|rate-limit|lockout|lookup-service|employee-auth-query-parity|credential-parity|auth-kernel"`
Expected: PASS.

Run: `npm run format && npm run lint && npm run typecheck`
Expected: sạch.

- [ ] **Step 15: Commit**

```bash
git add lib/security-middleware.ts lib/rate-limit.ts lib/auth/lockout.ts lib/auth.ts lib/auth-middleware.ts lib/audit-service.ts lib/bonus/bonus-signature-status.ts lib/employee lib/__tests__ lib/auth/__tests__ app/api
git commit -m "feat(security): rate limit qua Postgres, lockout đăng nhập/tra cứu, một hàm getClientIP duy nhất"
```

---

### Task 8: Áp role policy vào API nhân viên và UI quản lý nhân viên; sửa openapi route

**Files:**
- Modify: `app/api/admin/employees/route.ts:239-272` (POST)
- Modify: `app/api/admin/employees/[id]/route.ts:16,60-68` (PUT)
- Modify: `components/EmployeeManagementModal.tsx:124-127,296,449,679`
- Modify: `app/admin/employee-management/components/EmployeeForm.tsx:45-66,86`
- Modify: `app/api/api-docs/openapi/route.ts`
- Delete: `app/api/admin/employees/[id]/audit-logs/route.txt`
- Create: `lib/auth/__tests__/role-policy-wiring.test.ts`

**Interfaces:**
- Consumes: `canAssignRole`, `canCreateEmployee`, `ASSIGNABLE_BY` (T1); `authorizeRoles` async (T3); `findAdminEmployeeRecord(supabase, id)` (có `chuc_vu` trong `ADMIN_EMPLOYEE_SELECT` — xác nhận bằng `grep -n ADMIN_EMPLOYEE_SELECT lib/employee/employee-admin-repository.ts`).
- Produces: `EmployeeForm` prop `assignableRoles: string[]` (thay `restrictedRoles`); khi rỗng, ô chức vụ bị disable và payload update **không gửi** `chuc_vu`.

- [ ] **Step 1: Viết test guard fail**

`lib/auth/__tests__/role-policy-wiring.test.ts`:

```ts
import { readFileSync } from "fs";
import { join } from "path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("route nhân viên dùng role policy thay danh sách cứng", () => {
  it("POST /api/admin/employees dùng canCreateEmployee + canAssignRole", () => {
    const source = read("app/api/admin/employees/route.ts");
    expect(source).toMatch(/canCreateEmployee\(/);
    expect(source).toMatch(/canAssignRole\(/);
    expect(source).not.toMatch(/restrictedRoles/);
  });

  it("PUT /api/admin/employees/[id] dùng canAssignRole", () => {
    const source = read("app/api/admin/employees/[id]/route.ts");
    expect(source).toMatch(/canAssignRole\(/);
    expect(source).not.toMatch(/ROLES_NGUOI_LAP_BIEU_CANNOT_ASSIGN/);
  });

  it("UI không còn restrictedRoles và không có option admin", () => {
    expect(read("components/EmployeeManagementModal.tsx")).not.toMatch(/restrictedRoles/);
    const form = read("app/admin/employee-management/components/EmployeeForm.tsx");
    expect(form).not.toMatch(/value: "admin"/);
    expect(form).toMatch(/assignableRoles/);
  });

  it("openapi route không tự verify jwt", () => {
    const source = read("app/api/api-docs/openapi/route.ts");
    expect(source).not.toMatch(/jwt\.verify/);
    expect(source).toMatch(/authorizeRoles\(/);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `npm test -- --testPathPattern="role-policy-wiring"`
Expected: FAIL 4 case.

- [ ] **Step 3: Sửa POST `app/api/admin/employees/route.ts`**

Sau `if (!admin) {...401}` thêm:

```ts
    if (!canCreateEmployee(admin.role)) {
      return NextResponse.json(
        { error: "Không có quyền tạo nhân viên" },
        { status: 403, headers: CACHE_HEADERS.sensitive },
      );
    }
```

Thay block `restrictedRoles` (dòng 266–272) bằng:

```ts
    const assignment = canAssignRole(admin, { employee_id, currentRole: null, newRole: chuc_vu });
    if (!assignment.ok) {
      return NextResponse.json(
        { error: assignment.reason },
        { status: 403, headers: CACHE_HEADERS.sensitive },
      );
    }
```

Import `canAssignRole, canCreateEmployee` từ `@/lib/auth/role-policy`.

- [ ] **Step 4: Sửa PUT `app/api/admin/employees/[id]/route.ts`**

Xoá `ROLES_NGUOI_LAP_BIEU_CANNOT_ASSIGN`. Thay block kiểm tra (dòng 60–68) bằng:

```ts
    const supabase = createServiceClient();
    if (parsedBody.data.chuc_vu !== undefined) {
      const { data: existing } = await findAdminEmployeeRecord(supabase, id);
      if (!existing) return notFound();
      const assignment = canAssignRole(admin, {
        employee_id: id,
        currentRole: existing.chuc_vu,
        newRole: parsedBody.data.chuc_vu,
      });
      if (!assignment.ok) return sensitiveJson({ error: assignment.reason }, 403);
    }

    const result = await updateEmployee(supabase, id, parsedBody.data, admin);
```

Nếu `EmployeeUpdateRequestSchema.chuc_vu` hiện là bắt buộc (không `.optional()`), đổi thành `.optional()` trong `lib/validations/admin-employee.ts` và kiểm tra `EmployeeUpdateInput` trong `employee-update-service.ts` chấp nhận thiếu `chuc_vu` (update chỉ các field có mặt).

- [ ] **Step 5: Sửa UI**

`components/EmployeeManagementModal.tsx` dòng 124–127:

```ts
  const canCreate = canCreateEmployee(userRole);
  const canDelete = userRole !== "nguoi_lap_bieu";
  const assignableRoles = [...(ASSIGNABLE_BY[userRole] ?? [])];
```

và ba chỗ `restrictedRoles={restrictedRoles}` → `assignableRoles={assignableRoles}`. Import `ASSIGNABLE_BY, canCreateEmployee` từ `@/lib/auth/role-policy`.

`app/admin/employee-management/components/EmployeeForm.tsx`:
- Xoá `{ value: "admin", label: "Admin" }` khỏi `roleOptions`.
- Prop `restrictedRoles?: string[]` → `assignableRoles: string[]`; default param bỏ.
- `const canEditRole = assignableRoles.length > 0;`
- `const filteredRoleOptions = roleOptions.filter((role) => assignableRoles.includes(role.value) || role.value === employee?.chuc_vu);`
- Select chức vụ: `disabled={!canEditRole || loading}`.
- Khi build payload update (tìm chỗ gọi `employeeMutation.mutate`), nếu `!canEditRole` thì bỏ `chuc_vu` khỏi object gửi lên: `const { chuc_vu, ...rest } = payload; mutate(canEditRole ? payload : rest)`.
- `validateForm`: chỉ bắt buộc `chuc_vu` khi `canEditRole`.

- [ ] **Step 6: Sửa `app/api/api-docs/openapi/route.ts`**

```ts
import { type NextRequest, NextResponse } from "next/server";
import { authorizeRoles } from "@/lib/auth-middleware";
import { getOpenAPISpec } from "@/lib/openapi-spec";
import { toErrorResponse } from "@/lib/errors/app-error";
import { CACHE_HEADERS } from "@/lib/utils/cache-headers";

const ALLOWED_ROLES = ["admin", "giam_doc", "ke_toan", "nguoi_lap_bieu"];

export async function GET(request: NextRequest) {
  const auth = await authorizeRoles(request, ALLOWED_ROLES);
  if (!auth) {
    return NextResponse.json(
      { error: "Bạn cần đăng nhập với quyền quản trị để xem tài liệu API" },
      { status: 401, headers: CACHE_HEADERS.sensitive },
    );
  }
  try {
    return NextResponse.json(getOpenAPISpec(), { headers: CACHE_HEADERS.sensitive });
  } catch (error) {
    console.error("Error generating OpenAPI spec:", error);
    return toErrorResponse(error, { fallbackMessage: "Không thể tạo tài liệu API" });
  }
}
```

- [ ] **Step 7: Xoá file rác**

```bash
git rm "app/api/admin/employees/[id]/audit-logs/route.txt"
```

- [ ] **Step 8: Chạy test, lint, typecheck**

Run: `npm test -- --testPathPattern="role-policy"`
Expected: PASS.

Run: `npm run format && npm run lint && npm run typecheck`
Expected: sạch.

- [ ] **Step 9: Commit**

```bash
git add app/api/admin/employees app/api/api-docs/openapi/route.ts components/EmployeeManagementModal.tsx app/admin/employee-management/components/EmployeeForm.tsx lib/auth/__tests__/role-policy-wiring.test.ts lib/validations/admin-employee.ts
git commit -m "feat(rbac): chỉ admin/van_phong tạo nhân viên và gán chức vụ theo role policy; openapi dùng authorizeRoles"
```

---
### Task 9: Client chỉ dùng cookie httpOnly — bỏ token/localStorage, bỏ nhớ mật khẩu, chống open redirect

**Files:**
- Modify: `lib/api/client.ts` (bỏ Bearer, `credentials: "same-origin"`, `keepUnauthorized`)
- Modify: `lib/api/__tests__/client.test.ts:14-28`
- Modify: `lib/auth/secure-session.ts` (viết lại, 151 → ~45 dòng)
- Modify: `lib/api/auth-redirect.ts` (+`resolveRedirectPath`)
- Create: `lib/api/__tests__/auth-redirect.test.ts`
- Modify: `components/admin/admin-session-provider.tsx`
- Modify: `app/admin/login/admin-login-form.tsx` (bỏ nhớ mật khẩu, dùng `apiClient`, redirect an toàn)
- Modify: `components/RoleBasedRouter.tsx:53,68,202`
- Modify: `app/employee/dashboard/page.tsx:5,29,59`, `app/manager/dashboard/page.tsx:5,29,58`, `app/supervisor/dashboard/page.tsx:5,28,57`
- Modify: `app/api-docs/page.tsx` (`checkAuth` → `/api/admin/me`; bỏ `requestInterceptor`)
- Modify: `app/admin/test-column-mapping/page.tsx:78` (bỏ `getSessionToken` + fetch trần)
- Modify: `components/debug/DepartmentDebugInfo.tsx:6,43`
- Modify: `components/department/DepartmentDetailModalRefactored.tsx:25,231-261` (bỏ `DepartmentCache`)
- Create: `app/employee/lookup/employee-lookup-api.ts`
- Modify: `app/employee/lookup/use-employee-lookup.ts` (bỏ remember/auto-lookup, dùng API module), `app/employee/lookup/employee-lookup.tsx:193-205` (bỏ checkbox)
- Delete: `lib/utils/client-crypto.ts`, `lib/auth/jwt-expiry.ts`, `lib/auth/__tests__/jwt-expiry.test.ts`, `utils/departmentCache.ts`, `app/test-roles/page.tsx`

**Interfaces:**
- Consumes: `GET /api/admin/me` (T5), `ENDPOINTS.auth.login/me`, `ENDPOINTS.employee.*` (T5).
- Produces:
  - `RequestOpts { signal?; headers?; keepUnauthorized?: boolean }` — khi `true`, 401 ném `ApiError` thường (không gọi `onAuthExpired`, không xoá storage).
  - `lib/auth/secure-session.ts`: `saveSessionUser(user: unknown): void`, `getSessionUser<T>(): Promise<T | null>`, `hasStoredSession(): boolean`, `clearSession(): void`. **Xoá** `saveSession`, `getSessionToken`, `getSession`.
  - `resolveRedirectPath(candidate: string | null | undefined, fallback: string): string` — chỉ nhận đường dẫn nội bộ khớp `/^\/(?![\/\\])/`.
  - `AdminSessionValue { user: AdminSessionUser; role: string }` (bỏ `token`).
  - `employee-lookup-api.ts`: `lookupPayroll(input: { employee_id: string; cccd: string; is_t13?: boolean })`, `fetchPayrollDetail(sessionToken, isT13)`, `signSalary(sessionToken, { salary_month, is_t13? })`, `fetchBonuses(sessionToken)`, `signBonus(sessionToken, { bonus_type, bonus_period })` — tất cả trả `Promise<T>` qua `apiClient` với `keepUnauthorized: true`, 401 là lỗi nghiệp vụ hiển thị cho nhân viên.

- [ ] **Step 1: Viết test fail cho `resolveRedirectPath`**

`lib/api/__tests__/auth-redirect.test.ts`:

```ts
import { resolveRedirectPath, resolveLoginPath } from "@/lib/api/auth-redirect";

describe("resolveRedirectPath", () => {
  const fallback = "/admin/dashboard";

  it.each([
    ["/admin/payroll-management", "/admin/payroll-management"],
    ["/manager/dashboard?tab=1", "/manager/dashboard?tab=1"],
  ])("nhận đường dẫn nội bộ %s", (input, expected) => {
    expect(resolveRedirectPath(input, fallback)).toBe(expected);
  });

  it.each([
    ["//evil.example", "scheme-relative"],
    ["/\\evil.example", "backslash"],
    ["https://evil.example", "absolute"],
    ["javascript:alert(1)", "scheme"],
    ["admin/dashboard", "relative"],
    ["", "empty"],
    [null, "null"],
    [undefined, "undefined"],
  ])("từ chối %s (%s) → fallback", (input) => {
    expect(resolveRedirectPath(input as string | null | undefined, fallback)).toBe(fallback);
  });
});

describe("resolveLoginPath", () => {
  it("luôn về /admin/login", () => {
    expect(resolveLoginPath("/manager/dashboard")).toBe("/admin/login");
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail; viết hàm**

Run: `npm test -- --testPathPattern="auth-redirect"`
Expected: FAIL `resolveRedirectPath is not a function`.

Thêm vào `lib/api/auth-redirect.ts`:

```ts
const INTERNAL_PATH_PATTERN = /^\/(?![\/\\])/;

export function resolveRedirectPath(candidate: string | null | undefined, fallback: string): string {
  if (typeof candidate !== "string" || !INTERNAL_PATH_PATTERN.test(candidate)) {
    return fallback;
  }
  return candidate;
}
```

Run lại: PASS.

- [ ] **Step 3: Sửa `lib/api/client.ts`**

- Xoá `import { getSessionToken } from "@/lib/auth/secure-session";`.
- `RequestOpts` thêm `keepUnauthorized?: boolean;`.
- `makeHeaders`: bỏ hoàn toàn phần `token`/`Authorization` (hàm còn `Content-Type`), có thể thành sync.
- Ba chỗ `credentials: "include"` → `credentials: "same-origin"`.
- Ba chỗ `if (response.status === 401) { handleAuthExpired(); }` → `if (response.status === 401 && !opts.keepUnauthorized) { handleAuthExpired(); }`.
- `clearAuthStorage`: giữ (xoá key legacy `admin_token`, `auth_token`, `user_info`, `admin_user`, `employee_user`).

- [ ] **Step 4: Cập nhật `lib/api/__tests__/client.test.ts`**

Thay test "attaches Bearer token..." (dòng 14–28) bằng:

```ts
  it("không gửi Authorization và dùng credentials same-origin", async () => {
    localStorage.setItem("admin_token", "tok-123");
    let capturedAuth: string | null = "unset";

    server.use(
      http.get("*/api/admin/test", ({ request }) => {
        capturedAuth = request.headers.get("Authorization");
        return HttpResponse.json({ ok: true });
      }),
    );

    await apiClient.get("http://localhost/api/admin/test");

    expect(capturedAuth).toBeNull();
  });

  it("401 với keepUnauthorized ném ApiError thường, không gọi onAuthExpired", async () => {
    const onExpired = jest.fn();
    setOnAuthExpired(onExpired);
    server.use(http.post("*/api/employee/lookup", () => HttpResponse.json({ error: "Thông tin đăng nhập không đúng" }, { status: 401 })));

    await expect(
      apiClient.post("http://localhost/api/employee/lookup", {}, { keepUnauthorized: true }),
    ).rejects.toMatchObject({ status: 401, message: "Thông tin đăng nhập không đúng" });
    expect(onExpired).not.toHaveBeenCalled();
  });
```

(Suite này phụ thuộc msw — local có thể fail vì layout pnpm; CI với `npm ci` phải xanh. Ghi rõ trong commit nếu không chạy được local.)

- [ ] **Step 5: Viết lại `lib/auth/secure-session.ts`**

```ts
const USER_KEY = "user_info";
const LEGACY_KEYS = ["admin_token", "auth_token"] as const;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function saveSessionUser(user: unknown): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    return;
  }
}

export async function getSessionUser<T>(): Promise<T | null> {
  if (!isBrowser()) return null;
  const stored = localStorage.getItem(USER_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as T;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function hasStoredSession(): boolean {
  return isBrowser() && localStorage.getItem(USER_KEY) !== null;
}

export function clearSession(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(USER_KEY);
  for (const key of LEGACY_KEYS) localStorage.removeItem(key);
}
```

Xoá file: `git rm lib/utils/client-crypto.ts lib/auth/jwt-expiry.ts lib/auth/__tests__/jwt-expiry.test.ts`.

- [ ] **Step 6: Viết lại `components/admin/admin-session-provider.tsx`**

- `AdminSessionValue { user: AdminSessionUser; role: string }`.
- Effect:

```ts
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const data = await apiClient.get<{ user: AdminSessionUser }>(ENDPOINTS.auth.me, { keepUnauthorized: true });
        if (cancelled) return;
        saveSessionUser(data.user);
        setSession({ user: data.user, role: data.user.role || "admin" });
      } catch {
        if (cancelled) return;
        clearSession();
        const redirect = encodeURIComponent(pathname || "/admin/dashboard");
        router.replace(`/admin/login?redirect=${redirect}`);
      } finally {
        if (!cancelled) setChecked(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, pathname]);
```

Import `apiClient` từ `@/lib/api/client`, `ENDPOINTS` từ `@/lib/api/endpoints`, `saveSessionUser, clearSession` từ `@/lib/auth/secure-session`.

- [ ] **Step 7: Viết lại `app/admin/login/admin-login-form.tsx`**

Xoá toàn bộ cơ chế nhớ mật khẩu: các helper/const dòng 21–89, state dòng 109–110, effect khôi phục 119–129, logic lưu 162–168 và 223–237, checkbox UI 356–384. Thay:

- Effect auto-redirect (131–147):

```ts
  useEffect(() => {
    let cancelled = false;
    void apiClient
      .get<{ user: { role?: string } }>(ENDPOINTS.auth.me, { keepUnauthorized: true })
      .then((data) => {
        if (cancelled) return;
        saveSessionUser(data.user);
        router.replace(resolveRedirectPath(searchParams.get("redirect"), getDefaultRedirect(data.user.role ?? "")));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);
```

- Submit:

```ts
      const data = await apiClient.post<{ user: { role: string } }>(
        ENDPOINTS.auth.login,
        { username: username.trim(), password },
        { keepUnauthorized: true },
      );
      saveSessionUser(data.user);
      router.push(resolveRedirectPath(searchParams.get("redirect"), getDefaultRedirect(data.user.role)));
```

Lỗi: `catch (error) { setError(error instanceof ApiError ? error.message : "Có lỗi xảy ra khi đăng nhập"); }` (`ApiError` từ `@/lib/api/errors`). Giữ `getDefaultRedirect(role)` map hiện có. Sau sửa, file phải ≤ 300 dòng.

- [ ] **Step 8: Đổi consumer còn lại của `secure-session`**

- `components/RoleBasedRouter.tsx`: dòng 53 `const session = await getSession<User>(); if (!session?.user)` → `const userData = await getSessionUser<User>(); if (!userData)`, bỏ `const userData = session.user;`. Import bỏ `getSession`. Dòng 68 `clearSession()` giữ.
- `app/employee|manager|supervisor/dashboard/page.tsx`: tương tự, `getSession<User>()` → `getSessionUser<User>()`, dùng trực tiếp `user` thay `session.user`.
- `components/debug/DepartmentDebugInfo.tsx:43`: `getSession<Record<string, unknown>>()` → `getSessionUser<Record<string, unknown>>()`; hiển thị `user` thay `session.user`, bỏ mọi chỗ hiển thị `token`.
- `app/admin/test-column-mapping/page.tsx:78`: thay block `getSessionToken()` + `fetch(...)` bằng `const data = await apiClient.get<{ aliases?: unknown[] }>(\`${ENDPOINTS.columnAliases.list}?limit=200&is_active=true\`);` (giữ cách đọc `data` như code hiện tại).
- `components/admin/admin-command-menu.tsx:41`, `lib/stores/mapping-config-store.ts`, `lib/sync/mapping-config-sync.ts`: giữ (API không đổi).
- `app/api-docs/page.tsx`: `checkAuth` → `const data = await apiClient.get<{ user: { role: string; username?: string } }>(ENDPOINTS.auth.me, { keepUnauthorized: true });` rồi set user từ `data.user`; xoá phần parse `document.cookie` và prop `requestInterceptor` của `<SwaggerUI>` (dòng 177–189) — cookie httpOnly tự đi kèm vì cùng origin.

Run: `grep -rn "getSession\b\|getSessionToken\|saveSession(" app components lib --include=*.ts --include=*.tsx`
Expected: trống.

- [ ] **Step 9: Bỏ `DepartmentCache` và trang test-roles**

`components/department/DepartmentDetailModalRefactored.tsx`: xoá import dòng 25 và các lời gọi `DepartmentCache.getCacheData/clearCache/setCacheData` (231–261) — luôn fetch; xoá comment đi kèm. Sau đó:

```bash
git rm utils/departmentCache.ts app/test-roles/page.tsx
```

- [ ] **Step 10: Tạo `app/employee/lookup/employee-lookup-api.ts`**

```ts
import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";

const asSessionRequest = (sessionToken: string) => ({
  headers: { Authorization: `Bearer ${sessionToken}` },
  keepUnauthorized: true,
});

export interface LookupPayrollInput {
  employee_id: string;
  cccd: string;
  is_t13?: boolean;
}

export interface SignSalaryInput {
  salary_month: string;
  is_t13?: boolean;
}

export interface SignBonusInput {
  bonus_type: string;
  bonus_period: string;
}

export function lookupPayroll<T>(input: LookupPayrollInput): Promise<T> {
  return apiClient.post<T>(ENDPOINTS.employee.lookup, input, { keepUnauthorized: true });
}

export function fetchPayrollDetail<T>(sessionToken: string, isT13: boolean): Promise<T> {
  const query = isT13 ? "?is_t13=true" : "";
  return apiClient.get<T>(`${ENDPOINTS.employee.detail}${query}`, asSessionRequest(sessionToken));
}

export function signSalary<T>(sessionToken: string, input: SignSalaryInput): Promise<T> {
  return apiClient.post<T>(ENDPOINTS.employee.signSalary, input, asSessionRequest(sessionToken));
}

export function fetchBonuses<T>(sessionToken: string): Promise<T> {
  return apiClient.get<T>(ENDPOINTS.employee.bonuses, asSessionRequest(sessionToken));
}

export function signBonus<T>(sessionToken: string, input: SignBonusInput): Promise<T> {
  return apiClient.post<T>(ENDPOINTS.employee.signBonus, input, asSessionRequest(sessionToken));
}
```

- [ ] **Step 11: Sửa `app/employee/lookup/use-employee-lookup.ts`**

- Xoá dòng 14–89 (crypto/remember helpers, `autoLookupInFlight`), state `rememberPassword`/`hasSavedCredentials`, action `SET_REMEMBER`/`RESTORE_CREDENTIALS`/`CLEAR_CREDENTIALS` và các case reducer, `handleClearSavedCredentials`, tham số `rememberPassword` của `runLookup`, effect auto-lookup (504–527), các nhánh `if (rememberPassword) saveCredentials...` (473–476, 575–578), `getAuthHeaders`.
- Thay từng `fetch`:
  - 453: `const data = await lookupPayroll<LookupResponse>({ employee_id: employeeId.trim(), cccd: password.trim() });` (kiểu `LookupResponse` = kiểu đang dùng cho `data` tại chỗ đó); nhánh `response.ok` → chạy thẳng; nhánh lỗi → `catch (error)` dispatch `LOOKUP_ERROR` với `error instanceof ApiError ? error.message : "Có lỗi xảy ra khi tra cứu"`.
  - 557: `lookupPayroll({ ...., is_t13: true })`.
  - 603/677: `signSalary(state.sessionToken, { salary_month, is_t13 })` — nếu `!state.sessionToken` thì dispatch lỗi "Phiên tra cứu đã hết hạn, vui lòng tra cứu lại" và return; **không** gửi `employee_id`/`cccd`/`client_timestamp`.
  - 743: `fetchPayrollDetail(state.sessionToken, isT13)`.
  - 791: `fetchBonuses(sessionToken)`.
  - 833: `signBonus(state.sessionToken, { bonus_type, bonus_period })`.
- Kiểu dữ liệu `data.*` giữ như cũ (generic `T` truyền tại chỗ gọi).
- `app/employee/lookup/employee-lookup.tsx:193-205`: xoá khối `<Checkbox id="remember" ...>` + label; xoá nút/handler `handleClearSavedCredentials` nếu có trong JSX.
- File hook sau sửa phải **ngắn hơn 894 dòng** (kỳ vọng ~700).

Run: `grep -rn "fetch(" app/employee/lookup`
Expected: trống.

- [ ] **Step 12: Test, lint, typecheck**

Run: `npm test -- --testPathPattern="auth-redirect|client"`
Expected: `auth-redirect` PASS; `client` PASS trên CI (local có thể fail vì msw/pnpm).

Run: `npm run format && npm run lint && npm run typecheck`
Expected: sạch.

- [ ] **Step 13: Commit**

```bash
git add -A lib/api lib/auth/secure-session.ts components/admin/admin-session-provider.tsx app/admin/login/admin-login-form.tsx components/RoleBasedRouter.tsx app/employee app/manager app/supervisor app/api-docs/page.tsx app/admin/test-column-mapping/page.tsx components/debug/DepartmentDebugInfo.tsx components/department/DepartmentDetailModalRefactored.tsx
git add -u lib/utils/client-crypto.ts lib/auth/jwt-expiry.ts lib/auth/__tests__/jwt-expiry.test.ts utils/departmentCache.ts app/test-roles/page.tsx
git commit -m "feat(client): phiên admin chỉ qua cookie httpOnly, bỏ nhớ mật khẩu và cache lương ở localStorage, chặn open redirect"
```

---
### Task 10: Department scope cho payroll/[id], departments, unsigned-export, all-employees

**Files:**
- Create: `lib/auth/department-scope.ts`
- Create: `lib/auth/__tests__/department-scope.test.ts`
- Modify: `app/api/admin/payroll/[id]/route.ts` (GET 60–85, PUT 110–125 + 225–258)
- Modify: `app/api/admin/departments/route.ts:210-225`
- Modify: `app/api/admin/unsigned-employees-export/route.ts:30-62`
- Modify: `app/api/employees/all-employees/route.ts:53-90,150-175,218-226`

**Interfaces:**
- Consumes: `AuthContext` (`auth.user`, `auth.canAccessDepartment`), `getDepartmentFilter(auth)` từ `lib/auth-middleware.ts`.
- Produces (`lib/auth/department-scope.ts`, pure, không DB):
  - `isDepartmentUnrestricted(auth: AuthContext): boolean` — `admin`, `van_phong`.
  - `scopeDepartmentParam(auth: AuthContext, requested: string | null): { ok: true; departments: string[] | null } | { ok: false }` — `null` = không giới hạn; mảng = chỉ các phòng ban được phép; `ok:false` khi yêu cầu phòng ban ngoài scope hoặc role có scope nhưng không có phòng ban nào.
  - `assertDepartmentAccess(auth: AuthContext, department: string | null): boolean` — wrapper `canAccessDepartment` với `null` → `false` trừ unrestricted.
  - `SALARY_VISIBLE_ROLES = ["admin", "giam_doc", "ke_toan"]`, `canViewSalaryAmounts(role: string): boolean`.
- `EmployeeListFilters.department` vẫn `string | null`; để lọc theo nhiều phòng ban thêm field `departments?: string[] | null` vào `EmployeeListFilters` và áp `.in("department", departments)` trong `buildAllEmployeesListQuery`, `buildAllEmployeesCountQuery`, `buildAllEmployeesDepartmentStatsQuery`, `buildUnsignedEmployeesExportQuery` (`lib/employee/employee-list-repository.ts`).

- [ ] **Step 1: Viết test fail**

`lib/auth/__tests__/department-scope.test.ts`:

```ts
/**
 * @jest-environment node
 */
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth-middleware";
import {
  assertDepartmentAccess,
  canViewSalaryAmounts,
  isDepartmentUnrestricted,
  scopeDepartmentParam,
} from "@/lib/auth/department-scope";

jest.mock("@/utils/supabase/server", () => ({ createServiceClient: () => ({}) }));

function authFor(role: string, extra: Record<string, unknown> = {}) {
  const token = jwt.sign(
    { username: "u", employee_id: "NV1", role, department: "Tổ May 1", permissions: [], pv: 0, ...extra },
    process.env.JWT_SECRET as string,
    { audience: "admin" },
  );
  const auth = verifyToken(new NextRequest("http://localhost/api/x", { headers: { cookie: `auth_token=${token}` } }));
  if (!auth) throw new Error("token phải hợp lệ");
  return auth;
}

describe("scopeDepartmentParam", () => {
  it("admin/van_phong: không giới hạn, giữ param yêu cầu", () => {
    expect(scopeDepartmentParam(authFor("admin"), "Tổ May 9")).toEqual({ ok: true, departments: ["Tổ May 9"] });
    expect(scopeDepartmentParam(authFor("van_phong"), null)).toEqual({ ok: true, departments: null });
  });

  it("truong_phong không yêu cầu phòng ban → toàn bộ allowed_departments", () => {
    const auth = authFor("truong_phong", { allowed_departments: ["Tổ May 1", "Tổ May 2"] });
    expect(scopeDepartmentParam(auth, null)).toEqual({ ok: true, departments: ["Tổ May 1", "Tổ May 2"] });
  });

  it("truong_phong yêu cầu phòng ban trong scope → chỉ phòng ban đó", () => {
    const auth = authFor("ke_toan", { allowed_departments: ["Tổ May 1", "Tổ May 2"] });
    expect(scopeDepartmentParam(auth, "Tổ May 2")).toEqual({ ok: true, departments: ["Tổ May 2"] });
  });

  it("yêu cầu phòng ban ngoài scope → ok:false", () => {
    const auth = authFor("giam_doc", { allowed_departments: ["Tổ May 1"] });
    expect(scopeDepartmentParam(auth, "Tổ May 2")).toEqual({ ok: false });
  });

  it("role có scope nhưng không có phòng ban nào → ok:false", () => {
    expect(scopeDepartmentParam(authFor("nguoi_lap_bieu", { allowed_departments: [] }), null)).toEqual({ ok: false });
  });

  it("to_truong → đúng phòng ban của mình", () => {
    expect(scopeDepartmentParam(authFor("to_truong"), null)).toEqual({ ok: true, departments: ["Tổ May 1"] });
    expect(scopeDepartmentParam(authFor("to_truong"), "Tổ May 2")).toEqual({ ok: false });
  });

  it("nhan_vien → ok:false", () => {
    expect(scopeDepartmentParam(authFor("nhan_vien"), null)).toEqual({ ok: false });
  });
});

describe("assertDepartmentAccess / isDepartmentUnrestricted / canViewSalaryAmounts", () => {
  it("department null chỉ qua với role không giới hạn", () => {
    expect(assertDepartmentAccess(authFor("admin"), null)).toBe(true);
    expect(assertDepartmentAccess(authFor("truong_phong", { allowed_departments: ["Tổ May 1"] }), null)).toBe(false);
  });

  it("truong_phong chỉ qua phòng ban được phép", () => {
    const auth = authFor("truong_phong", { allowed_departments: ["Tổ May 1"] });
    expect(assertDepartmentAccess(auth, "Tổ May 1")).toBe(true);
    expect(assertDepartmentAccess(auth, "Tổ May 2")).toBe(false);
  });

  it("isDepartmentUnrestricted đúng cho admin và van_phong", () => {
    expect(isDepartmentUnrestricted(authFor("van_phong"))).toBe(true);
    expect(isDepartmentUnrestricted(authFor("ke_toan"))).toBe(false);
  });

  it("chỉ admin/giam_doc/ke_toan thấy số tiền lương", () => {
    expect(canViewSalaryAmounts("ke_toan")).toBe(true);
    expect(canViewSalaryAmounts("nguoi_lap_bieu")).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail; viết module**

Run: `npm test -- --testPathPattern="department-scope"`
Expected: FAIL `Cannot find module`.

`lib/auth/department-scope.ts`:

```ts
import { type AuthContext, getDepartmentFilter } from "@/lib/auth-middleware";

const UNRESTRICTED_ROLES = ["admin", "van_phong"];
export const SALARY_VISIBLE_ROLES = ["admin", "giam_doc", "ke_toan"];

export type DepartmentScope = { ok: true; departments: string[] | null } | { ok: false };

export function isDepartmentUnrestricted(auth: AuthContext): boolean {
  return UNRESTRICTED_ROLES.includes(auth.user.role);
}

export function canViewSalaryAmounts(role: string): boolean {
  return SALARY_VISIBLE_ROLES.includes(role);
}

export function assertDepartmentAccess(auth: AuthContext, department: string | null): boolean {
  if (isDepartmentUnrestricted(auth)) return true;
  if (!department) return false;
  return auth.canAccessDepartment(department);
}

export function scopeDepartmentParam(auth: AuthContext, requested: string | null): DepartmentScope {
  if (isDepartmentUnrestricted(auth)) {
    return { ok: true, departments: requested ? [requested] : null };
  }
  if (auth.user.role === "nhan_vien") return { ok: false };
  const allowed = getDepartmentFilter(auth).filter(Boolean);
  if (allowed.length === 0) return { ok: false };
  if (!requested) return { ok: true, departments: allowed };
  return allowed.includes(requested) ? { ok: true, departments: [requested] } : { ok: false };
}
```

Run lại: PASS.

- [ ] **Step 3: Thêm `departments` vào `EmployeeListFilters` và 4 builder**

Trong `lib/employee/employee-list-repository.ts`: `EmployeeListFilters` thêm `departments?: string[] | null;`. Trong `buildAllEmployeesListQuery`, `buildAllEmployeesCountQuery`, `buildAllEmployeesDepartmentStatsQuery`, `buildUnsignedEmployeesExportQuery`, ngay sau chỗ áp `filters.department` thêm:

```ts
  if (filters.departments && filters.departments.length > 0) {
    query = query.in("department", filters.departments);
  }
```

Cập nhật test parity của repository này (nếu có trong `lib/employee/__tests__/employee-list-repository*.test.ts`) bằng cách thêm case "departments → .in('department', [...])".

- [ ] **Step 4: `app/api/admin/payroll/[id]/route.ts`**

GET: thay block role-based filtering (dòng 60–85) bằng:

```ts
    const scope = scopeDepartmentParam(auth, null);
    if (!scope.ok && auth.user.role !== "nhan_vien") {
      return NextResponse.json(
        { error: "Không có quyền truy cập dữ liệu này" },
        { status: 403, headers: CACHE_HEADERS.sensitive },
      );
    }
    let query = buildPayrollDetailQuery(supabase, payrollId);
    if (scope.ok && scope.departments) {
      query = query.in("employees.department", scope.departments);
    }
    if (auth.user.role === "nhan_vien") {
      query = query.eq("employee_id", auth.user.employee_id);
    }
```

PUT: sau khi lấy `currentData`, thêm kiểm tra phòng ban (truong_phong chỉ sửa trong phòng ban mình):

```ts
    const { data: owner } = await supabase
      .from("employees")
      .select("department")
      .eq("employee_id", currentData.employee_id)
      .maybeSingle();
    if (!assertDepartmentAccess(auth, (owner as { department: string | null } | null)?.department ?? null)) {
      return NextResponse.json(
        { error: "Không có quyền chỉnh sửa lương của phòng ban này" },
        { status: 403, headers: CACHE_HEADERS.sensitive },
      );
    }
```

Chuyển câu select này vào `lib/payroll/payroll-repository.ts` dưới tên `findPayrollOwnerDepartment(supabase, employeeId)` để route gọi một dòng (route này đã > 100 dòng từ trước; không được dài thêm).

Reset chữ ký khi sửa sau ký: `PAYROLL_EDITABLE_SELECT` thêm `is_signed`; sau vòng lặp `validatedUpdates`, trước `validatedUpdates.updated_at`:

```ts
    if (currentData.is_signed) {
      validatedUpdates.is_signed = false;
      validatedUpdates.signed_at = null;
      validatedUpdates.signed_by_name = null;
      auditLogs.push({
        payroll_id: payrollId,
        employee_id: currentData.employee_id,
        salary_month: currentData.salary_month,
        changed_by: auth.user.username,
        change_ip: clientIP,
        change_reason: "Sửa sau khi ký - yêu cầu ký lại",
        field_name: "is_signed",
        old_value: "true",
        new_value: "false",
      });
    }
```

Xoá các comment trong route. Tách danh sách `editableFields` sang `lib/payroll/payroll-columns.ts` ở T13 (`PAYROLL_EDITABLE_COLUMNS`) — tại task này giữ nguyên.

- [ ] **Step 5: `app/api/admin/departments/route.ts:210-225`**

Thay block lọc bằng:

```ts
    const scope = scopeDepartmentParam(auth, null);
    if (!scope.ok || auth.user.role === "to_truong") {
      return NextResponse.json(
        { error: "Không có quyền xem thống kê phòng ban" },
        { status: 403, headers: CACHE_HEADERS.sensitive },
      );
    }
    const filteredStats = scope.departments
      ? validDepartmentStats.filter((dept) => dept && scope.departments!.includes(dept.name))
      : validDepartmentStats;
```

(`nhan_vien` trước đây nhận toàn bộ → giờ 403; `to_truong` cũng 403 theo spec §6 — thống kê phòng ban chỉ cho cấp quản lý.) Xoá các `console.log("🔍 ...")` trong hàm.

- [ ] **Step 6: `app/api/admin/unsigned-employees-export/route.ts`**

Sau khi đọc `department` từ query:

```ts
    const scope = scopeDepartmentParam(auth, department);
    if (!scope.ok) {
      return NextResponse.json(
        { error: "Không có quyền xuất dữ liệu phòng ban này" },
        { status: 403, headers: CACHE_HEADERS.sensitive },
      );
    }
```

và truyền `{ search, department: null, departments: scope.departments, restrictToIds: null }` vào `buildUnsignedEmployeesExportQuery`.

- [ ] **Step 7: `app/api/employees/all-employees/route.ts`**

- Sau khi parse query: `const scope = scopeDepartmentParam(auth, department); if (!scope.ok) return 403 "Không có quyền xem danh sách nhân viên của phòng ban này"`.
- `listFilters = { search, department: null, departments: scope.departments, restrictToIds: ... }`.
- `includePayrollData` chỉ có hiệu lực khi `canViewSalaryAmounts(auth.user.role)`: `const canIncludePayroll = includePayrollData && canViewSalaryAmounts(auth.user.role);` dùng biến này ở điều kiện dòng 150; với role khác vẫn trả `has_payroll`/`is_signed` nhưng **không** gắn `payroll_data` và `salary_amount` (dùng `findPayrollSignedFlagsForMonth` để lấy cờ).
- Thay 2 dòng header cache (218–226) bằng `headers: CACHE_HEADERS.sensitive` trong `NextResponse.json(..., { headers })`, bỏ `ETag`, bỏ `cached_until` trong `metadata`. Import `CACHE_HEADERS`.
- Xoá các comment dòng 1, 23, 27, 35, 52, 198.

- [ ] **Step 8: Test, lint, typecheck**

Run: `npm test -- --testPathPattern="department-scope|department-access|employee-list-repository"`
Expected: PASS.

Run: `npm run format && npm run lint && npm run typecheck`
Expected: sạch.

- [ ] **Step 9: Commit**

```bash
git add lib/auth/department-scope.ts lib/auth/__tests__/department-scope.test.ts lib/employee/employee-list-repository.ts lib/payroll/payroll-repository.ts "app/api/admin/payroll/[id]/route.ts" app/api/admin/departments/route.ts app/api/admin/unsigned-employees-export/route.ts app/api/employees/all-employees/route.ts lib/employee/__tests__
git commit -m "fix(rbac): áp department scope cho chi tiết/sửa lương, thống kê phòng ban, export chưa ký và danh sách nhân viên"
```

---

### Task 11: Guard upload Excel, role + rate limit cho import, reset chữ ký khi ghi đè

**Files:**
- Create: `lib/validations/upload.ts`
- Create: `lib/validations/__tests__/upload.test.ts`
- Modify: `app/api/admin/import-dual-files/route.ts:84-110`
- Modify: `app/api/admin/upload/route.ts:19-30`
- Modify: `app/api/admin/payroll-import/route.ts:119-125,348-352`
- Modify: `app/api/admin/bonus-import/route.ts:35,66-80,218-224`
- Modify: `lib/validations/index.ts`

**Interfaces:**
- Produces:
  - `MAX_UPLOAD_BYTES = 10 * 1024 * 1024`, `EXCEL_EXTENSIONS = [".xlsx", ".xls"]`.
  - `assertExcelUpload(file: unknown, fieldName: string): Promise<File>` — ném `ValidationError` (từ `lib/errors/app-error.ts`, status 400) với thông điệp tiếng Việt khi: không phải `File`, rỗng, > 10 MB, đuôi sai, magic bytes sai (`50 4B 03 04` cho xlsx, `D0 CF 11 E0` cho xls).
  - `SIGNATURE_RESET_FIELDS = { is_signed: false, signed_at: null, signed_by_name: null } as const`.

- [ ] **Step 1: Viết test fail**

`lib/validations/__tests__/upload.test.ts`:

```ts
/**
 * @jest-environment node
 */
import { assertExcelUpload, MAX_UPLOAD_BYTES } from "@/lib/validations/upload";

const XLSX_MAGIC = Uint8Array.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
const XLS_MAGIC = Uint8Array.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1]);

function fileOf(bytes: Uint8Array, name: string) {
  return new File([bytes], name, { type: "application/octet-stream" });
}

describe("assertExcelUpload", () => {
  it("xlsx đúng magic → trả về File", async () => {
    const file = fileOf(XLSX_MAGIC, "luong.xlsx");
    await expect(assertExcelUpload(file, "file")).resolves.toBe(file);
  });

  it("xls đúng magic → trả về File", async () => {
    await expect(assertExcelUpload(fileOf(XLS_MAGIC, "luong.XLS"), "file")).resolves.toBeInstanceOf(File);
  });

  it("không phải File → lỗi 400", async () => {
    await expect(assertExcelUpload("abc", "file")).rejects.toMatchObject({ status: 400, message: "Thiếu file file" });
  });

  it("đuôi sai → lỗi", async () => {
    await expect(assertExcelUpload(fileOf(XLSX_MAGIC, "luong.csv"), "file")).rejects.toMatchObject({
      status: 400,
      message: "File file phải có định dạng .xlsx hoặc .xls",
    });
  });

  it("đuôi đúng nhưng nội dung không phải Excel → lỗi", async () => {
    await expect(assertExcelUpload(fileOf(Uint8Array.from([0x3c, 0x68, 0x74, 0x6d, 0x6c]), "x.xlsx"), "file")).rejects.toMatchObject({
      status: 400,
      message: "Nội dung file file không phải Excel hợp lệ",
    });
  });

  it("file rỗng → lỗi", async () => {
    await expect(assertExcelUpload(fileOf(new Uint8Array(), "x.xlsx"), "file")).rejects.toMatchObject({ status: 400 });
  });

  it("quá 10 MB → lỗi", async () => {
    const big = new File([new Uint8Array(MAX_UPLOAD_BYTES + 1)], "x.xlsx");
    await expect(assertExcelUpload(big, "file")).rejects.toMatchObject({
      status: 400,
      message: "File file vượt quá 10 MB",
    });
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail; viết module**

Run: `npm test -- --testPathPattern="validations/__tests__/upload"`
Expected: FAIL `Cannot find module`.

`lib/validations/upload.ts`:

```ts
import { ValidationError } from "@/lib/errors/app-error";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const EXCEL_EXTENSIONS = [".xlsx", ".xls"] as const;

const XLSX_MAGIC = [0x50, 0x4b, 0x03, 0x04];
const XLS_MAGIC = [0xd0, 0xcf, 0x11, 0xe0];

export const SIGNATURE_RESET_FIELDS = {
  is_signed: false,
  signed_at: null,
  signed_by_name: null,
} as const;

function hasExcelExtension(name: string): boolean {
  const lower = name.toLowerCase();
  return EXCEL_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

function startsWith(bytes: Uint8Array, magic: number[]): boolean {
  return magic.every((value, index) => bytes[index] === value);
}

export async function assertExcelUpload(file: unknown, fieldName: string): Promise<File> {
  if (!(file instanceof File)) {
    throw new ValidationError(`Thiếu file ${fieldName}`);
  }
  if (file.size === 0) {
    throw new ValidationError(`File ${fieldName} rỗng`);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ValidationError(`File ${fieldName} vượt quá 10 MB`);
  }
  if (!hasExcelExtension(file.name)) {
    throw new ValidationError(`File ${fieldName} phải có định dạng .xlsx hoặc .xls`);
  }
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  if (!startsWith(head, XLSX_MAGIC) && !startsWith(head, XLS_MAGIC)) {
    throw new ValidationError(`Nội dung file ${fieldName} không phải Excel hợp lệ`);
  }
  return file;
}
```

Kiểm tra chữ ký `ValidationError` trong `lib/errors/app-error.ts` (constructor nhận `message`, status 400); nếu constructor cần thêm `details`, truyền `undefined`. Export module từ `lib/validations/index.ts`.

Run lại: PASS.

- [ ] **Step 3: `app/api/admin/import-dual-files/route.ts`**

Thay block dòng 84–106 (check Bearer + `authorizeRoles`) bằng:

```ts
    const auth = await authorizeRoles(request, ["admin", "nguoi_lap_bieu"]);
    if (!auth) {
      const apiError = ApiErrorHandler.createError(
        ApiErrorHandler.ErrorCodes.ACCESS_DENIED,
        "Không có quyền truy cập chức năng này",
      );
      return NextResponse.json(ApiErrorHandler.createErrorResponse(apiError), { status: 403 });
    }

    const rateLimitResult = await rateLimit("admin")(request, auth.user.employee_id);
    if (rateLimitResult) return rateLimitResult;
```

Xoá hằng `IMPORT_MANAGEMENT_ROLES` nếu không còn dùng. Sau `const file1Raw = formData.get("file1")` (và file2): `const file1 = await assertExcelUpload(file1Raw, "file1");` (tương tự file2 nếu bắt buộc; nếu file2 tuỳ chọn thì chỉ assert khi `file2Raw !== null`). `ValidationError` ném ra được `toErrorResponse` ở `catch` chuyển thành 400 — xác nhận route này dùng `toErrorResponse`; nếu không, bọc `try { } catch (error) { if (error instanceof ValidationError) return NextResponse.json({ error: error.message }, { status: 400 }); throw error; }`.

- [ ] **Step 4: `app/api/admin/upload/route.ts`**

Vòng lặp thu file: `files.push(await assertExcelUpload(value, key));` thay `files.push(value)`; bỏ `value instanceof File` (assert đã kiểm). Xoá comment. Giới hạn số file: nếu `files.length > 10` → 400 "Tối đa 10 file mỗi lần upload".

- [ ] **Step 5: `app/api/admin/payroll-import/route.ts`**

Dòng 119: `const file = await assertExcelUpload(formData.get("file"), "file");` (xoá kiểm tra `instanceof File` cũ phía dưới nếu có). Overwrite (dòng 348–352):

```ts
          const updateData = {
            ...recordData,
            ...SIGNATURE_RESET_FIELDS,
            updated_at: getVietnamTimestamp(),
          };
```

- [ ] **Step 6: `app/api/admin/bonus-import/route.ts`**

Thay `MAX_FILE_SIZE_BYTES` + kiểm tra dòng 66–80 bằng `const file = await assertExcelUpload(formData.get("file"), "file");`. Ở `bonusRecord` (dòng 218–224) thêm `...SIGNATURE_RESET_FIELDS` (bảng `employee_bonuses` có `is_signed`, `signed_at`, `signed_by_name` — xác nhận bằng `grep -n "is_signed\|signed_by_name" scripts/supabase-setup/*bonus*.sql`; nếu tên cột khác, dùng đúng tên cột đó).

- [ ] **Step 7: Test, lint, typecheck**

Run: `npm test -- --testPathPattern="validations/__tests__/upload"`
Expected: PASS.

Run: `npm run format && npm run lint && npm run typecheck && grep -rn "formData.get(\"file" app/api | grep -v assertExcelUpload`
Expected: lệnh grep cuối trống (mọi file upload đều qua guard).

- [ ] **Step 8: Commit**

```bash
git add lib/validations/upload.ts lib/validations/__tests__/upload.test.ts lib/validations/index.ts app/api/admin/import-dual-files/route.ts app/api/admin/upload/route.ts app/api/admin/payroll-import/route.ts app/api/admin/bonus-import/route.ts
git commit -m "feat(import): kiểm tra file Excel (10 MB, đuôi, magic bytes), siết role + rate limit import, reset chữ ký khi ghi đè"
```

---
### Task 12: Route nhân viên chỉ nhận session token; lockout cho đổi mật khẩu; forgot-password không lộ thông tin

**Files:**
- Modify: `app/api/employee/sign-salary/route.ts` (toàn bộ)
- Modify: `app/api/employee/sign-bonus/route.ts:1-150`
- Modify: `app/api/employee/salary-history/route.ts:40-100`
- Modify: `app/api/employee/change-password/route.ts` (POST 1–120, 170–262; xoá GET ở 261)
- Modify: `app/api/auth/change-password-with-cccd/route.ts:120-180,230-240` (xoá GET)
- Modify: `app/api/auth/forgot-password/route.ts:150-215`
- Modify: `lib/validations/employee.ts` (`EmployeeSignSalaryRequestSchema`, `EmployeeSignBonusRequestSchema`, `SalaryHistoryActionRequestSchema`)
- Modify: `lib/employee/employee-lookup-repository.ts` (xoá `findEmployeeCredentialProfile`, `findEmployeeLookupRecord`)
- Modify: `lib/employee/__tests__/employee-lookup-repository.parity.test.ts`
- Create: `app/api/employee/__tests__/sign-salary-route.test.ts`

**Interfaces:**
- Consumes (T4): `requireEmployeeSession(request, supabase): Promise<EmployeeSessionResult>` với `EmployeeSessionResult = { ok: true; employeeId: string } | { ok: false; status: 401; error: string }`; `EMPLOYEE_SESSION_EXPIRED_MESSAGE`, `EMPLOYEE_SESSION_REVOKED_MESSAGE` từ `lib/auth/require-employee-session.ts`.
- Consumes (T7): `isLocked(lockedUntil: string | null): boolean`, `AUTH_FAILED_MESSAGE`, `ACCOUNT_LOCKED_MESSAGE` từ `lib/auth/lockout.ts`; `rateLimit("passwordChange")` / `rateLimit("passwordReset")` từ `lib/rate-limit.ts`.
- Consumes (T6): RPC `record_login_failure(p_table text, p_id text)`, `record_login_success(p_table text, p_id text)`, `handle_password_reset_failure(p_employee_id text)` (1 tham số).
- Produces: schema mới

```ts
export const EmployeeSignSalaryRequestSchema = z.object({
  salary_month: SalaryMonthSchema,
});
export const EmployeeSignBonusRequestSchema = z.object({
  bonus_id: z.string().uuid("ID thưởng không hợp lệ"),
});
export const SalaryHistoryActionRequestSchema = z.object({
  action: z.enum(["view", "sign"]),
  salary_month: SalaryMonthSchema.optional(),
});
```

(giữ đúng tên trường hiện có của từng schema ngoài `employee_id`/`cccd`; nếu `SalaryHistoryActionRequestSchema` hiện có trường khác `action`, giữ nguyên trường đó và chỉ bỏ `employee_id`, `cccd`).

- [ ] **Step 1: Viết test route sign-salary (Review Focus #4)**

`app/api/employee/__tests__/sign-salary-route.test.ts`:

```ts
/**
 * @jest-environment node
 */
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import { EMPLOYEE_SESSION_AUDIENCE } from "@/lib/validations/auth-token";

const rpcMock = jest.fn();
const fromMock = jest.fn();

jest.mock("@/utils/supabase/server", () => ({
  createServiceClient: () => ({ from: fromMock, rpc: rpcMock }),
}));
jest.mock("@/lib/rate-limit", () => ({ rateLimit: () => async () => null }));

import { POST } from "@/app/api/employee/sign-salary/route";

function sessionToken(payload: Record<string, unknown>) {
  return jwt.sign(payload, process.env.JWT_SECRET as string, { audience: EMPLOYEE_SESSION_AUDIENCE, expiresIn: "10m" });
}

function post(body: unknown, token?: string) {
  return POST(
    new NextRequest("http://localhost/api/employee/sign-salary", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    }),
  );
}

function tableReturning(rows: Record<string, { data: unknown; error: null }>) {
  fromMock.mockImplementation((table: string) => {
    const result = rows[table] ?? { data: null, error: null };
    const chain: Record<string, jest.Mock> = {};
    for (const method of ["select", "eq", "update", "is", "maybeSingle", "single"]) {
      chain[method] = jest.fn(() => (method === "maybeSingle" || method === "single" ? Promise.resolve(result) : chain));
    }
    return chain;
  });
}

beforeEach(() => {
  rpcMock.mockReset();
  fromMock.mockReset();
});

describe("POST /api/employee/sign-salary", () => {
  it("không có Bearer → 401, không gọi DB", async () => {
    const response = await post({ salary_month: "2026-09" });
    expect(response.status).toBe(401);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("body có employee_id/cccd nhưng không có token → 401 (fallback đã bị gỡ)", async () => {
    const response = await post({ employee_id: "NV1", cccd: "012345678901", salary_month: "2026-09" });
    expect(response.status).toBe(401);
  });

  it("token hợp lệ nhưng pv lệch → 401 thu hồi", async () => {
    tableReturning({ employees: { data: { password_version: 2 }, error: null } });
    const response = await post({ salary_month: "2026-09" }, sessionToken({ employee_id: "NV1", pv: 1 }));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining("thu hồi") });
  });

  it("salary_month không khớp payroll nào → 404, không 500 (Review Focus #4)", async () => {
    tableReturning({
      employees: { data: { password_version: 1 }, error: null },
      payrolls: { data: null, error: null },
    });
    const response = await post({ salary_month: "2026-01" }, sessionToken({ employee_id: "NV1", pv: 1 }));
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ error: "Không tìm thấy bảng lương" });
    const employeesQueries = fromMock.mock.calls.filter(([table]) => table === "employees");
    expect(employeesQueries.length).toBeLessThanOrEqual(2);
  });

  it("token hợp lệ → employee_id lấy từ token, không từ body", async () => {
    tableReturning({
      employees: { data: { password_version: 1 }, error: null },
      payrolls: { data: { id: "p1", employee_id: "NV1", is_signed: false }, error: null },
    });
    const response = await post({ employee_id: "NV-KHAC", salary_month: "2026-09" }, sessionToken({ employee_id: "NV1", pv: 1 }));
    expect(response.status).not.toBe(401);
    const eqCalls = fromMock.mock.results.flatMap((result) => (result.value.eq as jest.Mock).mock.calls);
    expect(eqCalls).toContainEqual(["employee_id", "NV1"]);
    expect(eqCalls).not.toContainEqual(["employee_id", "NV-KHAC"]);
  });
});
```

Run: `npm test -- --testPathPattern="sign-salary-route"`
Expected: FAIL (test 2 và 4 — route hiện vẫn chấp nhận employee_id+cccd).

- [ ] **Step 2: Sửa 3 schema**

`lib/validations/employee.ts`: xoá `employee_id`, `cccd` khỏi `EmployeeSignSalaryRequestSchema`, `EmployeeSignBonusRequestSchema`, `SalaryHistoryActionRequestSchema` theo khối Interfaces. Chạy `npm run typecheck` để liệt kê chỗ còn dùng `.employee_id`/`.cccd` từ các schema này (route + test).

- [ ] **Step 3: `app/api/employee/sign-salary/route.ts`**

Khung mới (giữ phần kiểm tra payroll, ghi `is_signed`, audit hiện có):

```ts
import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { requireEmployeeSession } from "@/lib/auth/require-employee-session";
import { rateLimit } from "@/lib/rate-limit";
import { EmployeeSignSalaryRequestSchema } from "@/lib/validations";
import { createValidationErrorResponse, parseSchema } from "@/lib/validations/errors";
import { getVietnamTimestamp } from "@/lib/utils/vietnam-timezone";
import { CACHE_HEADERS } from "@/lib/utils/cache-headers";

export async function POST(request: NextRequest) {
  const rateLimited = await rateLimit("api")(request);
  if (rateLimited) return rateLimited;

  const supabase = createServiceClient();
  const session = await requireEmployeeSession(request, supabase);
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status, headers: CACHE_HEADERS.sensitive });
  }

  const parsed = parseSchema(EmployeeSignSalaryRequestSchema, await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(createValidationErrorResponse(parsed.errors), { status: 400 });
  }

  const employeeId = session.employeeId;
  const { salary_month } = parsed.data;
  ...phần tìm payroll theo (employeeId, salary_month), kiểm tra is_signed, update is_signed/signed_at/signed_by_name giữ như hiện tại...
}
```

Không tìm thấy payroll theo `(employeeId, salary_month)` → `NextResponse.json({ error: "Không tìm thấy bảng lương" }, { status: 404, headers: CACHE_HEADERS.sensitive })`; đã ký → 409 "Bảng lương này đã được ký nhận". Xoá: mọi gọi `findEmployeeCredentialProfile`, `bcrypt.compare` với `cccd_hash`, nhánh "fallback employee_id + cccd", comment. Tên người ký (`signed_by_name`) lấy từ bảng `employees.full_name` theo `employeeId` (một query `select("full_name")`), không lấy từ body.

`CACHE_HEADERS` ở `lib/utils/cache-headers.ts`; `parseSchema`/`createValidationErrorResponse` ở `lib/validations/errors.ts` (`parsed.errors` là mảng `ApiError`).

- [ ] **Step 4: `app/api/employee/sign-bonus/route.ts`, `salary-history/route.ts`**

Cùng khung Step 3: `requireEmployeeSession` → `session.employeeId`; xoá nhánh fallback `employee_id`+`cccd`, xoá gọi `findEmployeeAuthRecord`/`findEmployeeLookupRecord`/`bcrypt`; `salary-history` lọc `.eq("employee_id", session.employeeId)` và với `action: "sign"` dùng cùng logic ký như sign-salary (gọi chung một hàm `signPayrollForEmployee(supabase, employeeId, salaryMonth)` đặt trong `lib/payroll/payroll-signing.ts` để hai route không lặp code; hàm trả `{ ok: true; signedAt: string } | { ok: false; status: 404 | 409; message: string }`).

- [ ] **Step 5: Xoá repository function không còn dùng + sửa parity test**

`lib/employee/employee-lookup-repository.ts`: xoá `findEmployeeCredentialProfile`, `findEmployeeLookupRecord` và các type chỉ chúng dùng. Trong `employee-lookup-repository.parity.test.ts`: xoá các `describe` tương ứng; thêm:

```ts
describe("route nhân viên không còn tra credential theo body", () => {
  const routes = [
    "app/api/employee/sign-salary/route.ts",
    "app/api/employee/sign-bonus/route.ts",
    "app/api/employee/salary-history/route.ts",
  ];
  it.each(routes)("%s dùng requireEmployeeSession và không gọi findEmployeeAuthRecord/cccd", (routePath) => {
    const source = fs.readFileSync(path.join(process.cwd(), routePath), "utf8");
    expect(source).toMatch(/requireEmployeeSession\(/);
    expect(source).not.toMatch(/findEmployeeAuthRecord|findEmployeeCredentialProfile|findEmployeeLookupRecord|cccd/);
  });
});
```

(import `fs`, `path` ở đầu file nếu chưa có.)

Run: `npm test -- --testPathPattern="sign-salary-route|employee-lookup-repository"`
Expected: PASS.

- [ ] **Step 6: `app/api/employee/change-password/route.ts`**

Luồng POST mới (thay đoạn verify mật khẩu cũ ở 60–120 và cập nhật ở 170–230):

```ts
  const rateLimited = await rateLimit("passwordChange")(request, parsed.data.employee_id);
  if (rateLimited) return rateLimited;

  const employee = await findEmployeeAuthRecord(supabase, parsed.data.employee_id);
  if (!employee || isLocked(employee.locked_until)) {
    return NextResponse.json(
      { error: employee && isLocked(employee.locked_until) ? ACCOUNT_LOCKED_MESSAGE : AUTH_FAILED_MESSAGE },
      { status: 401, headers: CACHE_HEADERS.sensitive },
    );
  }

  const currentHash = employee.last_password_change_at ? employee.password_hash : employee.cccd_hash;
  const currentValid = currentHash ? await bcrypt.compare(parsed.data.current_password, currentHash) : false;
  if (!currentValid) {
    await supabase.rpc("record_login_failure", { p_table: "employees", p_id: employee.employee_id });
    return NextResponse.json({ error: AUTH_FAILED_MESSAGE }, { status: 401, headers: CACHE_HEADERS.sensitive });
  }

  const newHash = await bcrypt.hash(parsed.data.new_password, BCRYPT_ROUNDS);
  const now = getVietnamTimestamp();
  const { error: updateError } = await supabase
    .from("employees")
    .update({
      password_hash: newHash,
      last_password_change_at: now,
      password_version: employee.password_version + 1,
      updated_at: now,
    })
    .eq("employee_id", employee.employee_id);
  if (updateError) {
    return NextResponse.json({ error: "Không thể cập nhật mật khẩu, vui lòng thử lại" }, { status: 500 });
  }
  await supabase.rpc("record_login_success", { p_table: "employees", p_id: employee.employee_id });
```

`findEmployeeAuthRecord` (T7) đã trả `password_version`, `locked_until`, `cccd_hash`, `password_hash`, `last_password_change_at`. Nếu route hiện dùng RPC `update_employee_password`, thay bằng update trực tiếp như trên để chắc chắn `password_version` tăng (RPC cũ không tăng cột này). Response thành công **không** trả token mới; FE sau đổi mật khẩu phải đăng nhập lại (các token cũ bị thu hồi vì `pv` lệch — đúng chủ ý spec §3). Xoá handler `GET` ở dòng 261 (trả thông tin không cần xác thực).

- [ ] **Step 7: `app/api/auth/change-password-with-cccd/route.ts`**

- Dòng 120–180: cùng khuôn Step 6 — kiểm `isLocked` trước, so CCCD với `cccd_hash`; sai → `record_login_failure("employees", id)` + `AUTH_FAILED_MESSAGE`; đúng → update `password_hash`, `last_password_change_at`, `password_version + 1`, `record_login_success`. Mọi nhánh sai (không tìm thấy nhân viên / sai CCCD / sai mã) đều trả cùng `AUTH_FAILED_MESSAGE` và 401.
- Rate limit: `await rateLimit("passwordReset")(request, parsed.data.employee_id)`.
- Dòng 230–240: xoá handler `GET`.

- [ ] **Step 8: `app/api/auth/forgot-password/route.ts:150-215`**

Thứ tự mới:
1. `rateLimit("passwordReset")(request, parsed.data.employee_id)`.
2. Tìm nhân viên; không có → trả 401 `AUTH_FAILED_MESSAGE` (không nói "không tồn tại").
3. `isLocked(locked_until)` → 401 `ACCOUNT_LOCKED_MESSAGE`.
4. So CCCD với `cccd_hash`; sai → `supabase.rpc("handle_password_reset_failure", { p_employee_id: employee.employee_id })` rồi 401 `AUTH_FAILED_MESSAGE`.
5. **Sau khi** CCCD đúng mới kiểm tra "đã đổi mật khẩu trong 24h": nếu vi phạm → 429 với thông điệp chung "Không thể đặt lại mật khẩu lúc này, vui lòng thử lại sau" (không nêu mốc thời gian).
6. Đặt lại: `password_hash` mới, `last_password_change_at = now`, `password_version + 1`, `record_login_success`.

Mọi `supabase.rpc("handle_password_reset_failure", ...)` trong repo chỉ còn dạng 1 tham số (`grep -rn "handle_password_reset_failure" app lib` để xác nhận).

- [ ] **Step 9: Test, lint, typecheck**

Run: `npm test -- --testPathPattern="sign-salary-route|employee-lookup-repository|require-employee-session"`
Expected: PASS.

Run: `npm run format && npm run lint && npm run typecheck`
Expected: sạch. `grep -rn "cccd" app/api/employee` chỉ còn khớp trong `change-password` (so `cccd_hash`).

- [ ] **Step 10: Commit**

```bash
git add lib/validations/employee.ts lib/employee app/api/employee app/api/auth/change-password-with-cccd/route.ts app/api/auth/forgot-password/route.ts lib/payroll/payroll-signing.ts
git commit -m "fix(employee-auth): route nhân viên chỉ nhận session token, khoá tài khoản khi đổi/đặt lại mật khẩu sai nhiều lần, gỡ GET không xác thực"
```

---

### Task 13: Whitelist cột payroll cho advanced-upload và database_field

**Files:**
- Create: `lib/payroll/payroll-columns.ts`
- Create: `lib/payroll/__tests__/payroll-columns.test.ts`
- Modify: `lib/validations/payroll.ts:63-69,186,211,260`
- Modify: `app/api/admin/advanced-upload/route.ts`
- Modify: `app/api/admin/payroll/[id]/route.ts` (thay `editableFields` bằng `PAYROLL_EDITABLE_COLUMNS`)

**Interfaces:**
- Consumes: `PAYROLL_FIELD_DEFINITIONS` từ `lib/payroll/payroll-field-definitions.ts`; type `PayrollRecord` (grep `export interface PayrollRecord` để lấy đúng file).
- Produces:

```ts
export const PAYROLL_COLUMNS: readonly string[];
export type PayrollColumn = (typeof PAYROLL_COLUMNS)[number];
export const PayrollColumnSchema: z.ZodEnum<...>;
export const PAYROLL_EDITABLE_COLUMNS: readonly PayrollColumn[];
export const PAYROLL_PROTECTED_COLUMNS = ["id", "employee_id", "salary_month", "is_signed", "signed_at", "signed_by_name", "created_at", "import_batch_id", "import_status", "payroll_type"] as const;
export const AdvancedUploadRowSchema: z.ZodType<Record<PayrollColumn, unknown>>;
```

- [ ] **Step 1: Viết test fail**

`lib/payroll/__tests__/payroll-columns.test.ts`:

```ts
import { PAYROLL_FIELD_DEFINITIONS } from "@/lib/payroll/payroll-field-definitions";
import {
  AdvancedUploadRowSchema,
  PAYROLL_COLUMNS,
  PAYROLL_EDITABLE_COLUMNS,
  PAYROLL_PROTECTED_COLUMNS,
  PayrollColumnSchema,
} from "@/lib/payroll/payroll-columns";
import { AdvancedUploadRequestSchema, PayrollSearchRequestSchema } from "@/lib/validations/payroll";

describe("PAYROLL_COLUMNS", () => {
  it("chứa mọi database_field trong PAYROLL_FIELD_DEFINITIONS", () => {
    for (const field of PAYROLL_FIELD_DEFINITIONS) {
      expect(PAYROLL_COLUMNS).toContain(field.database_field);
    }
  });

  it("không chứa cột nhạy cảm/không thuộc payrolls", () => {
    for (const forbidden of ["password_hash", "cccd_hash", "__proto__", "constructor", "role"]) {
      expect(PayrollColumnSchema.safeParse(forbidden).success).toBe(false);
    }
  });

  it("cột editable không giao với cột protected", () => {
    for (const column of PAYROLL_EDITABLE_COLUMNS) {
      expect(PAYROLL_PROTECTED_COLUMNS).not.toContain(column);
    }
  });
});

describe("AdvancedUploadRowSchema", () => {
  it("chấp nhận dòng chỉ có cột hợp lệ", () => {
    const result = AdvancedUploadRowSchema.safeParse({ employee_id: "NV1", salary_month: "2026-09", luong_co_ban: 5000000 });
    expect(result.success).toBe(true);
  });

  it("từ chối dòng có cột ngoài whitelist", () => {
    for (const row of [
      { employee_id: "NV1", salary_month: "2026-09", is_signed: true },
      { employee_id: "NV1", salary_month: "2026-09", __proto__: { polluted: true } },
      { employee_id: "NV1", salary_month: "2026-09", password_hash: "x" },
    ]) {
      expect(AdvancedUploadRowSchema.safeParse(JSON.parse(JSON.stringify(row))).success).toBe(false);
    }
  });

  it("từ chối dòng thiếu employee_id hoặc salary_month", () => {
    expect(AdvancedUploadRowSchema.safeParse({ salary_month: "2026-09" }).success).toBe(false);
    expect(AdvancedUploadRowSchema.safeParse({ employee_id: "NV1" }).success).toBe(false);
  });

  it("AdvancedUploadRequestSchema từ chối payrollData rỗng", () => {
    expect(AdvancedUploadRequestSchema.safeParse({ payrollData: [], ...minimalAdvancedUploadBody() }).success).toBe(false);
  });

  it("database_field trong PayrollSearchRequestSchema chỉ nhận cột whitelist", () => {
    expect(PayrollSearchRequestSchema.safeParse({ ...minimalSearchBody(), database_field: "is_signed" }).success).toBe(true);
    expect(PayrollSearchRequestSchema.safeParse({ ...minimalSearchBody(), database_field: "password_hash" }).success).toBe(false);
    expect(PayrollSearchRequestSchema.safeParse({ ...minimalSearchBody(), database_field: "employees.cccd_hash" }).success).toBe(false);
  });
});

function minimalAdvancedUploadBody() {
  return {};
}

function minimalSearchBody() {
  return {};
}
```

Trước khi chạy, mở `lib/validations/payroll.ts` dòng 63–69 và 180–215 để điền `minimalAdvancedUploadBody()`/`minimalSearchBody()` với các trường bắt buộc hiện có của hai schema (ví dụ `sessionId`, `fileName`, `sort`...), và sửa tên `PayrollSearchRequestSchema` theo tên schema thật có trường `database_field` ở dòng 186/211/260 (có thể là 3 schema → thêm 3 assert tương tự).

Run: `npm test -- --testPathPattern="payroll-columns"`
Expected: FAIL `Cannot find module`.

- [ ] **Step 2: Viết module**

`lib/payroll/payroll-columns.ts`:

```ts
import { z } from "zod";
import type { PayrollRecord } from "@/lib/types/payroll";

type PayrollRecordColumn = keyof PayrollRecord;

const PAYROLL_RECORD_COLUMNS = [
  ...liệt kê TẤT CẢ key của PayrollRecord theo đúng thứ tự khai báo trong interface...
] as const satisfies readonly PayrollRecordColumn[];

const PAYROLL_META_COLUMNS = ["created_at", "updated_at", "import_batch_id", "import_status"] as const;

export const PAYROLL_COLUMNS = [...PAYROLL_RECORD_COLUMNS, ...PAYROLL_META_COLUMNS] as const;
export type PayrollColumn = (typeof PAYROLL_COLUMNS)[number];
export const PayrollColumnSchema = z.enum(PAYROLL_COLUMNS);

export const PAYROLL_PROTECTED_COLUMNS = [
  "id",
  "employee_id",
  "salary_month",
  "is_signed",
  "signed_at",
  "signed_by_name",
  "created_at",
  "import_batch_id",
  "import_status",
  "payroll_type",
] as const satisfies readonly PayrollColumn[];

export const PAYROLL_EDITABLE_COLUMNS = PAYROLL_COLUMNS.filter(
  (column): column is Exclude<PayrollColumn, (typeof PAYROLL_PROTECTED_COLUMNS)[number]> =>
    !(PAYROLL_PROTECTED_COLUMNS as readonly string[]).includes(column),
);

const requiredRowKeys: PayrollColumn[] = ["employee_id", "salary_month"];

export const AdvancedUploadRowSchema = z
  .partialRecord(PayrollColumnSchema, z.unknown())
  .refine((row) => requiredRowKeys.every((key) => typeof row[key] === "string" && row[key].length > 0), {
    message: "Mỗi dòng phải có employee_id và salary_month",
  });
```

`import type { PayrollRecord }` phải trỏ đúng file khai báo (grep). Sửa `satisfies` nếu TS báo key thiếu/thừa — mục tiêu là compile-time đảm bảo danh sách khớp interface (thiếu key → không bắt được; vì vậy thêm test: `expectTypeOf` không có trong jest → thay bằng kiểm tra runtime so với `PAYROLL_FIELD_DEFINITIONS` ở Step 1 là đủ cho Pha 1).

`z.partialRecord` (zod ≥ 4) từ chối key ngoài enum; `JSON.parse(JSON.stringify(row))` trong test biến `__proto__` thành own-property nên bị từ chối như key lạ.

Run: `npm test -- --testPathPattern="payroll-columns"`
Expected: PASS phần module; phần `AdvancedUploadRequestSchema`/`database_field` còn FAIL tới Step 3.

- [ ] **Step 3: `lib/validations/payroll.ts`**

- Dòng 63–69: `payrollData: z.array(AdvancedUploadRowSchema).min(1, "Không có dữ liệu lương để import")`.
- Dòng 186, 211, 260: mỗi `database_field: z.string()...` → `database_field: PayrollColumnSchema`.
- Import `AdvancedUploadRowSchema`, `PayrollColumnSchema` từ `@/lib/payroll/payroll-columns`. Kiểm tra vòng import (`payroll-columns` không import gì từ `lib/validations`).

Run: `npm test -- --testPathPattern="payroll-columns|validations"`
Expected: PASS.

- [ ] **Step 4: `app/api/admin/advanced-upload/route.ts`**

Dữ liệu đã qua `AdvancedUploadRequestSchema` nên `row` chỉ còn key whitelist. Trước khi insert/upsert, loại cột protected khỏi từng dòng (trừ `employee_id`, `salary_month`):

```ts
function toImportableRow(row: z.infer<typeof AdvancedUploadRowSchema>) {
  const importable: Partial<Record<PayrollColumn, unknown>> = {};
  for (const [key, value] of Object.entries(row) as [PayrollColumn, unknown][]) {
    if (key === "employee_id" || key === "salary_month" || !PAYROLL_PROTECTED_COLUMNS.includes(key as never)) {
      importable[key] = value;
    }
  }
  return { ...importable, ...SIGNATURE_RESET_FIELDS };
}
```

Đặt hàm này trong `lib/payroll/payroll-columns.ts` (export `toImportableRow`) để route giữ mỏng; `SIGNATURE_RESET_FIELDS` import từ `lib/validations/upload` (T11). Thêm `await authorizeRoles(request, ["admin", "nguoi_lap_bieu"])` nếu route hiện chỉ `verifyAdminAccess`, và `rateLimit("payroll")(request, auth.user.employee_id)`. Xoá comment.

- [ ] **Step 5: `payroll/[id]/route.ts` dùng `PAYROLL_EDITABLE_COLUMNS`; dropdown mapping**

Dropdown `database_field` trong `components/column-mapping-manager.tsx` đã build từ `PAYROLL_FIELD_DEFINITIONS`; test Step 1 đảm bảo mọi giá trị đó ∈ `PAYROLL_COLUMNS` nên không cần sửa UI. Chỉ cần xác nhận không có ô nhập tự do cho `database_field` (`grep -n "<Input" components/column-mapping-manager.tsx`); nếu có, thay bằng `<Select>` từ `PAYROLL_FIELD_DEFINITIONS`.


Thay mảng `editableFields` nội tuyến bằng `PAYROLL_EDITABLE_COLUMNS` import từ `lib/payroll/payroll-columns.ts`; giữ nguyên vòng lặp so sánh `currentData` vs body.

- [ ] **Step 6: Test, lint, typecheck**

Run: `npm test -- --testPathPattern="payroll-columns|validations|payroll"`
Expected: PASS.

Run: `npm run format && npm run lint && npm run typecheck`
Expected: sạch.

- [ ] **Step 7: Commit**

```bash
git add lib/payroll/payroll-columns.ts lib/payroll/__tests__/payroll-columns.test.ts lib/validations/payroll.ts app/api/admin/advanced-upload/route.ts "app/api/admin/payroll/[id]/route.ts"
git commit -m "fix(payroll): whitelist cột payrolls cho advanced-upload, database_field và sửa lương"
```

---
### Task 14: Migration 37 — SECURITY INVOKER, REVOKE anon, RLS; dọn script seed admin

**Files:**
- Create: `scripts/supabase-setup/37-harden-functions-and-rls.sql`
- Modify: `scripts/supabase-setup/README.md` (thêm dòng 37)
- Modify: `scripts/create-admin-user.js` (viết lại toàn bộ)
- Modify: `scripts/create-tables.sql:29-31` (xoá seed `admin`/`admin123`)
- Delete: `scripts/create-xn11-to-truong.js`, `scripts/quick-fix-rls-disable.sql`, `scripts/test-department-permissions-api.js`
- Create: `scripts/__tests__/create-admin-user.test.js`

**Interfaces:**
- Consumes: migration 36 (T6) đã chạy (bảng `rate_limit_buckets`, function `consume_rate_limit`, `record_login_*`, `handle_password_reset_failure(text)`).
- Produces: mọi function trong schema `public` là `SECURITY INVOKER`, `EXECUTE` bị thu hồi khỏi `PUBLIC` và `anon`, cấp cho `service_role`; mọi bảng `public` có RLS bật; không còn policy `USING (true)`. App chỉ dùng `service_role` qua `createServiceClient()` nên bypass RLS — đây là hàng rào chống truy cập trực tiếp bằng anon key, không đổi hành vi app.

- [ ] **Step 1: Pre-check — xác nhận không có truy vấn bằng anon key ngoài auth**

Run:

```bash
grep -rn "createClient(\|createBrowserClient(\|createServerClient(" app lib utils components --include=*.ts --include=*.tsx | grep -v "createServiceClient\|__tests__"
grep -n "from(\|rpc(" utils/supabase/middleware.ts
```

Expected: dòng thứ hai trống (`updateSession` chỉ refresh cookie Supabase, không query bảng). Nếu dòng thứ nhất liệt kê client anon có `.from(` bảng nghiệp vụ → ghi lại file đó vào phần "Ghi chú" của commit và chuyển sang `createServiceClient()` trong API route trước khi chạy 37 (RLS bật sẽ làm client anon nhận mảng rỗng).

- [ ] **Step 2: Viết migration 37**

`scripts/supabase-setup/37-harden-functions-and-rls.sql`:

```sql
-- 37: Siết quyền function/bảng public: SECURITY INVOKER, REVOKE anon, bật RLS, xoá policy USING(true)
-- Chạy SAU 36. Idempotent. Yêu cầu backup trước khi chạy.

BEGIN;

DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
  LOOP
    EXECUTE format('ALTER FUNCTION %s SECURITY INVOKER', fn.signature);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', fn.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn.signature);
  END LOOP;
END $$;

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (qual = 'true' OR with_check = 'true')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

DO $$
DECLARE
  tbl record;
BEGIN
  FOR tbl IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND NOT c.relrowsecurity
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl.relname);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION rename_employee_id(p_old TEXT, p_new TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  affected JSONB := '{}'::jsonb;
  n INTEGER;
BEGIN
  IF p_new !~ '^[A-Za-z0-9]+$' THEN
    RAISE EXCEPTION 'Mã nhân viên mới không hợp lệ (chỉ chữ và số)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM employees WHERE employee_id = p_old) THEN
    RAISE EXCEPTION 'Nhân viên cũ không tồn tại';
  END IF;
  IF EXISTS (SELECT 1 FROM employees WHERE employee_id = p_new) THEN
    RAISE EXCEPTION 'Mã nhân viên mới đã tồn tại';
  END IF;

  UPDATE employees SET employee_id = p_new, updated_at = NOW() + INTERVAL '7 hours' WHERE employee_id = p_old;
  affected := affected || jsonb_build_object('employees', 1);

  UPDATE payrolls SET employee_id = p_new, updated_at = NOW() + INTERVAL '7 hours' WHERE employee_id = p_old;
  GET DIAGNOSTICS n = ROW_COUNT; affected := affected || jsonb_build_object('payrolls', n);
  UPDATE payrolls SET signed_by_admin_id = p_new WHERE signed_by_admin_id = p_old;
  GET DIAGNOSTICS n = ROW_COUNT; affected := affected || jsonb_build_object('payrolls_signed_by_admin', n);

  UPDATE signature_logs SET employee_id = p_new WHERE employee_id = p_old;
  GET DIAGNOSTICS n = ROW_COUNT; affected := affected || jsonb_build_object('signature_logs', n);
  UPDATE signature_logs SET signed_by_admin_id = p_new WHERE signed_by_admin_id = p_old;
  GET DIAGNOSTICS n = ROW_COUNT; affected := affected || jsonb_build_object('signature_logs_signed_by_admin', n);

  UPDATE department_permissions SET employee_id = p_new WHERE employee_id = p_old;
  GET DIAGNOSTICS n = ROW_COUNT; affected := affected || jsonb_build_object('department_permissions', n);
  UPDATE department_permissions SET granted_by = p_new WHERE granted_by = p_old;
  GET DIAGNOSTICS n = ROW_COUNT; affected := affected || jsonb_build_object('department_permissions_granted_by', n);

  UPDATE management_signatures SET signed_by_id = p_new WHERE signed_by_id = p_old;
  GET DIAGNOSTICS n = ROW_COUNT; affected := affected || jsonb_build_object('management_signatures', n);

  UPDATE access_logs SET employee_accessed = p_new WHERE employee_accessed = p_old;
  GET DIAGNOSTICS n = ROW_COUNT; affected := affected || jsonb_build_object('access_logs_employee_accessed', n);
  UPDATE access_logs SET user_id = p_new WHERE user_id = p_old;
  GET DIAGNOSTICS n = ROW_COUNT; affected := affected || jsonb_build_object('access_logs_user_id', n);

  UPDATE payroll_audit_logs SET employee_id = p_new WHERE employee_id = p_old;
  GET DIAGNOSTICS n = ROW_COUNT; affected := affected || jsonb_build_object('payroll_audit_logs', n);

  UPDATE employee_bonuses SET employee_id = p_new WHERE employee_id = p_old;
  GET DIAGNOSTICS n = ROW_COUNT; affected := affected || jsonb_build_object('employee_bonuses', n);

  RETURN affected;
END;
$$;

REVOKE EXECUTE ON FUNCTION rename_employee_id(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rename_employee_id(TEXT, TEXT) TO service_role;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

DO $$
DECLARE
  leftover_definer integer;
  leftover_open_policy integer;
  leftover_no_rls integer;
BEGIN
  SELECT count(*) INTO leftover_definer
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.prokind = 'f' AND p.prosecdef;
  SELECT count(*) INTO leftover_open_policy
  FROM pg_policies WHERE schemaname = 'public' AND (qual = 'true' OR with_check = 'true');
  SELECT count(*) INTO leftover_no_rls
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity;
  ASSERT leftover_definer = 0, format('Còn %s function SECURITY DEFINER', leftover_definer);
  ASSERT leftover_open_policy = 0, format('Còn %s policy USING(true)', leftover_open_policy);
  ASSERT leftover_no_rls = 0, format('Còn %s bảng chưa bật RLS', leftover_no_rls);
END $$;

COMMIT;

-- Khối dưới CHẠY RIÊNG, SAU KHI đã tạo admin thay thế bằng scripts/create-admin-user.js
-- và đăng nhập thử thành công bằng tài khoản mới:
-- DELETE FROM admin_users WHERE username = 'admin';
```

Danh sách bảng trong `rename_employee_id` lấy từ `lib/employee/cascade-update-employee.ts` (dòng 95–151) cộng `employee_bonuses` (bảng thưởng, migration 33). Trước khi chốt, chạy `grep -n "employee_id\|signed_by" scripts/supabase-setup/33-create-bonus-tables.sql` để lấy đúng tên cột tham chiếu nhân viên trong các bảng thưởng; bảng nào có FK `ON UPDATE CASCADE` sẽ tự cập nhật — vẫn giữ `UPDATE` (idempotent, ROW_COUNT = 0). Vì `rename_employee_id` được tạo sau vòng lặp ALTER/REVOKE ở đầu file nên có cặp REVOKE/GRANT riêng ngay dưới nó.

Lưu ý triển khai: Supabase tạo sẵn một số function trong `public` (ví dụ `handle_new_user` nếu có) — vòng lặp 1 vẫn áp cho chúng; các migration cũ (10, 13, 21...) có khai `SECURITY DEFINER` nhưng app chỉ gọi chúng bằng `service_role` nên đổi sang INVOKER không đổi hành vi; nếu một function cần `SECURITY DEFINER` thật sự, thêm `AND p.proname NOT IN (...)` kèm lý do trong header SQL.

- [ ] **Step 2b: `cascadeUpdateEmployeeId` gọi RPC một transaction**

Viết lại `lib/employee/cascade-update-employee.ts` (564 dòng → < 80), giữ kiểu trả về để `employee-update-service.ts` không đổi:

```ts
import { createServiceClient } from "@/utils/supabase/server";

interface CascadeUpdateResult {
  success: boolean;
  message: string;
  affectedTables: Record<string, number>;
  error?: string;
}

export async function cascadeUpdateEmployeeId(
  oldEmployeeId: string,
  newEmployeeId: string,
): Promise<CascadeUpdateResult> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("rename_employee_id", {
    p_old: oldEmployeeId,
    p_new: newEmployeeId,
  });
  if (error) {
    return { success: false, message: error.message, affectedTables: {}, error: error.message };
  }
  return {
    success: true,
    message: `Đã đổi mã nhân viên ${oldEmployeeId} → ${newEmployeeId}`,
    affectedTables: (data ?? {}) as Record<string, number>,
  };
}
```

`employee-update-service.ts:180` hiện truyền thêm `adminUserId`, `adminUserName` → bỏ hai đối số đó ở call site (audit log đã được service ghi riêng ở dòng 200–220). `lib/employee/__tests__/employee-update-service.test.ts` mock `cascadeUpdateEmployeeId` giữ nguyên. Thêm `lib/employee/__tests__/cascade-update-employee.test.ts`:

```ts
/**
 * @jest-environment node
 */
const rpcMock = jest.fn();
jest.mock("@/utils/supabase/server", () => ({ createServiceClient: () => ({ rpc: rpcMock }) }));

import { cascadeUpdateEmployeeId } from "@/lib/employee/cascade-update-employee";

describe("cascadeUpdateEmployeeId", () => {
  it("gọi RPC rename_employee_id với p_old/p_new và trả affectedTables", async () => {
    rpcMock.mockResolvedValue({ data: { employees: 1, payrolls: 12 }, error: null });
    const result = await cascadeUpdateEmployeeId("NV1", "NV2");
    expect(rpcMock).toHaveBeenCalledWith("rename_employee_id", { p_old: "NV1", p_new: "NV2" });
    expect(result).toEqual({
      success: true,
      message: "Đã đổi mã nhân viên NV1 → NV2",
      affectedTables: { employees: 1, payrolls: 12 },
    });
  });

  it("RPC lỗi → success false, giữ thông điệp từ Postgres", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "Mã nhân viên mới đã tồn tại" } });
    const result = await cascadeUpdateEmployeeId("NV1", "NV2");
    expect(result.success).toBe(false);
    expect(result.message).toBe("Mã nhân viên mới đã tồn tại");
  });
});
```

Run: `npm test -- --testPathPattern="cascade-update-employee|employee-update-service"`
Expected: PASS.

- [ ] **Step 3: README**

`scripts/supabase-setup/README.md`: thêm sau dòng 36:

```
| 37 | 37-harden-functions-and-rls.sql | SECURITY INVOKER + REVOKE anon cho mọi function public, bật RLS mọi bảng, xoá policy USING(true), RPC rename_employee_id. Chạy sau 36, sau khi backup. Khối DELETE admin seed chạy tay riêng. |
```

(khớp định dạng bảng/danh sách hiện có của README.)

- [ ] **Step 4: Test cho `create-admin-user.js`**

`scripts/__tests__/create-admin-user.test.js`:

```js
/**
 * @jest-environment node
 */
const { parseArgs, validateCredentials } = require("../create-admin-user");

describe("parseArgs", () => {
  it("đọc --username và --password", () => {
    expect(parseArgs(["--username", "ketoan01", "--password", "MatKhauRatDai!2026"])).toEqual({
      username: "ketoan01",
      password: "MatKhauRatDai!2026",
    });
  });

  it("thiếu tham số → undefined", () => {
    expect(parseArgs(["--username", "x"]).password).toBeUndefined();
  });
});

describe("validateCredentials", () => {
  it("chặn username admin (mọi kiểu hoa thường)", () => {
    expect(validateCredentials({ username: "Admin", password: "MatKhauRatDai!2026" })).toBe(
      "Không được dùng username 'admin'",
    );
  });

  it("mật khẩu dưới 12 ký tự bị từ chối", () => {
    expect(validateCredentials({ username: "ketoan01", password: "ngan" })).toBe("Mật khẩu phải có ít nhất 12 ký tự");
  });

  it("hợp lệ → null", () => {
    expect(validateCredentials({ username: "ketoan01", password: "MatKhauRatDai!2026" })).toBeNull();
  });
});
```

Kiểm tra `jest.config.js` `testMatch` có bao `scripts/__tests__/**/*.test.js`; nếu không, thêm pattern `"<rootDir>/scripts/__tests__/**/*.test.js"` vào `testMatch`.

Run: `npm test -- --testPathPattern="create-admin-user"`
Expected: FAIL (`parseArgs is not a function`).

- [ ] **Step 5: Viết lại `scripts/create-admin-user.js`**

```js
const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 12;

function loadEnvFile() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(envPath, "utf8")
      .split("\n")
      .map((line) => line.split("="))
      .filter(([key, ...rest]) => key && rest.length > 0)
      .map(([key, ...rest]) => [key.trim(), rest.join("=").trim()]),
  );
}

function parseArgs(argv) {
  const read = (flag) => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  return { username: read("--username"), password: read("--password") };
}

function validateCredentials({ username, password }) {
  if (!username || !password) return "Cần --username và --password";
  if (username.toLowerCase() === "admin") return "Không được dùng username 'admin'";
  if (password.length < MIN_PASSWORD_LENGTH) return `Mật khẩu phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự`;
  return null;
}

async function createAdminUser(credentials) {
  const env = { ...loadEnvFile(), ...process.env };
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const password_hash = await bcrypt.hash(credentials.password, BCRYPT_ROUNDS);
  const { error } = await supabase.from("admin_users").upsert(
    {
      username: credentials.username,
      password_hash,
      role: "admin",
      is_active: true,
      token_version: 0,
      failed_login_attempts: 0,
      locked_until: null,
    },
    { onConflict: "username" },
  );
  if (error) throw new Error(error.message);
}

async function main() {
  const credentials = parseArgs(process.argv.slice(2));
  const problem = validateCredentials(credentials);
  if (problem) {
    console.error(problem);
    console.error("Cách dùng: node scripts/create-admin-user.js --username <tên> --password <mật khẩu ≥ 12 ký tự>");
    process.exit(1);
  }
  await createAdminUser(credentials);
  console.log(`Đã tạo/cập nhật admin '${credentials.username}'. Hãy đổi mật khẩu sau lần đăng nhập đầu.`);
}

module.exports = { parseArgs, validateCredentials };

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
```

Tên cột `token_version`, `failed_login_attempts`, `locked_until` phải khớp migration 36 (T6). Không in mật khẩu ra console.

Run: `npm test -- --testPathPattern="create-admin-user"`
Expected: PASS.

- [ ] **Step 6: Dọn seed và script cũ**

- `scripts/create-tables.sql:29-31`: xoá `INSERT INTO admin_users ... 'admin' ...`; thay bằng dòng comment `-- Tạo admin bằng: node scripts/create-admin-user.js --username <tên> --password <mật khẩu>` và thêm `ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;` ngay sau `CREATE TABLE`.
- `git rm scripts/create-xn11-to-truong.js scripts/quick-fix-rls-disable.sql scripts/test-department-permissions-api.js`.
- `grep -rn "admin123\|superadmin" scripts docs README.md` → xoá mọi mật khẩu mẫu còn lại (thay bằng `<mật khẩu>`).

- [ ] **Step 7: Lint, commit**

Run: `npm run format && npm run lint && npm test -- --testPathPattern="create-admin-user"`
Expected: sạch, PASS.

```bash
git add scripts/supabase-setup/37-harden-functions-and-rls.sql scripts/supabase-setup/README.md scripts/create-admin-user.js scripts/create-tables.sql scripts/__tests__/create-admin-user.test.js jest.config.js lib/employee/cascade-update-employee.ts lib/employee/__tests__ lib/employee/employee-update-service.ts
git commit -m "feat(db): migration 37 siết SECURITY INVOKER/RLS/quyền anon, RPC rename_employee_id một transaction; script tạo admin bắt buộc mật khẩu mạnh, gỡ seed admin123"
```

---

### Task 15: Cập nhật dependency có CVE và kiểm tra bundle ES2019

**Files:**
- Modify: `package.json:72,88` (+ devDependencies, scripts)
- Create: `scripts/verify-es2019.mjs`
- Modify: `next.config.mjs` (`transpilePackages` nếu cần)
- Modify: `.github/workflows/ci.yml` (thêm bước `verify:es2019` sau `next build`)

**Interfaces:**
- Produces: npm script `verify:es2019` — parse mọi `.next/static/chunks/**/*.js` bằng acorn `ecmaVersion: 2019`; exit 1 kèm tên file + vị trí nếu có cú pháp mới hơn.

- [ ] **Step 1: Viết `scripts/verify-es2019.mjs`**

```js
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import * as acorn from "acorn";

const CHUNKS_DIR = join(process.cwd(), ".next", "static", "chunks");

function listJsFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return listJsFiles(full);
    return full.endsWith(".js") ? [full] : [];
  });
}

const failures = [];
for (const file of listJsFiles(CHUNKS_DIR)) {
  try {
    acorn.parse(readFileSync(file, "utf8"), { ecmaVersion: 2019, sourceType: "script", allowHashBang: true });
  } catch (error) {
    failures.push(`${file}: ${error.message}`);
  }
}

if (failures.length > 0) {
  console.error(`Có ${failures.length} chunk dùng cú pháp mới hơn ES2019 (vỡ Safari 12):`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log("Toàn bộ chunk parse được ở ES2019.");
```

- [ ] **Step 2: `package.json`**

- `"next": "^16.3.8"` (dòng 72). Kiểm tra bản mới nhất 16.x: `npm view next@16 version --json | tail -3`; nếu có bản 16.x cao hơn chứa fix CVE, dùng bản đó.
- `"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"` (dòng 88). `xlsx-js-style` giữ nguyên (dòng 89) — chỉ dùng cho builder XLSX phía server, không parse input người dùng; ghi nhận trong commit.
- devDependencies: `"acorn": "^8.14.0"`.
- scripts: `"verify:es2019": "node scripts/verify-es2019.mjs"`.

Run: `npm install` (repo đang có 3 lockfile — **chỉ** cập nhật `package-lock.json`, không xoá `pnpm-lock.yaml`/`bun.lock`; nếu `node_modules` hiện là pnpm layout thì chạy `npm ci` sau khi lockfile cập nhật để test msw chạy được).

Run: `npm audit --omit=dev --json | node -e "const r=JSON.parse(require('fs').readFileSync(0));console.log(Object.entries(r.vulnerabilities).map(([k,v])=>k+':'+v.severity).join('\n'))"`
Expected: không còn `next` và `xlsx`. Nếu `swagger-ui-react`/`swagger-jsdoc` còn HIGH: thử `npm install swagger-ui-react@latest`; nếu vẫn còn, bọc `app/api-docs/page.tsx`: `if (isProduction()) notFound();` (import `isProduction` từ `@/lib/config/runtime`, `notFound` từ `next/navigation`) và route `app/api/openapi/route.ts` trả 404 trong production.

- [ ] **Step 3: Build webpack + kiểm tra ES2019**

Run:

```bash
rm -rf .next/cache && npm run build && npm run verify:es2019
```

Expected: build thành công; `verify:es2019` in "Toàn bộ chunk parse được ở ES2019." Nếu fail: tên package trong chunk lỗi (xem đường dẫn trong thông điệp acorn, hoặc `grep -l "<cú pháp lỗi>" .next/static/chunks/*.js` rồi tìm module) → thêm vào `transpilePackages` trong `next.config.mjs`, xoá `.next/cache`, build lại.

- [ ] **Step 4: CI**

`.github/workflows/ci.yml`: sau bước `next build` thêm:

```yaml
      - name: Kiểm tra bundle ES2019 (Safari 12)
        run: npm run verify:es2019
```

- [ ] **Step 5: Test, typecheck, commit**

Run: `npm run typecheck && npm test -- --testPathPattern="use-payroll|excel"`
Expected: PASS (xlsx 0.20 giữ API `read`/`utils.sheet_to_json`; nếu typecheck báo lỗi type ở `lib/excel/` hoặc `lib/advanced-excel-parser.ts`, sửa import type theo `@types` đi kèm tgz).

```bash
git add package.json package-lock.json scripts/verify-es2019.mjs next.config.mjs .github/workflows/ci.yml app/api-docs/page.tsx app/api/openapi/route.ts
git commit -m "chore(deps): nâng next 16.3.8, xlsx 0.20.3 (SheetJS CDN), thêm kiểm tra bundle ES2019 vào CI"
```

---

### Task 16: Kiểm tra toàn bộ, runbook triển khai và tái quét

**Files:**
- Create: `docs/superpowers/runbooks/2026-10-08-security-phase-1-deploy.md` (gitignored → `git add -f`)
- Modify: `.gitignore` (thêm `vbsec-reports/`)

**Interfaces:**
- Consumes: toàn bộ T1–T15 đã commit; migration 36, 37.
- Produces: branch sạch (format/lint/typecheck/test/build/verify:es2019), runbook thủ công, báo cáo re-scan.

- [ ] **Step 1: Kiểm tra toàn bộ**

Run:

```bash
npm run format && npm run lint && npm run typecheck && npm test && npm run build && npm run verify:es2019
```

Expected: tất cả xanh. `npm test` phải xanh đủ 22+ suite sau `npm ci` (T15); nếu suite msw vẫn fail vì layout pnpm → chạy `npm ci` rồi chạy lại, không sửa `transformIgnorePatterns`.

Kiểm tra không còn dấu vết cũ:

```bash
grep -rn "verifyAdminToken\|requirePermission\|requireDepartmentAccess\|localStorage.getItem(\"admin_token\|client-crypto\|jwt-expiry" app lib components --include=*.ts --include=*.tsx
grep -rn "process.env.JWT_SECRET" app lib components --include=*.ts --include=*.tsx | grep -v "lib/config"
grep -rn "bcrypt.hash(" app lib scripts --include=*.ts --include=*.js | grep -v BCRYPT_ROUNDS
```

Expected: cả 3 lệnh trống.

- [ ] **Step 2: Viết runbook**

`docs/superpowers/runbooks/2026-10-08-security-phase-1-deploy.md`:

```markdown
# Runbook triển khai Pha 1 bảo mật (2026-10-08)

Người thực hiện: admin có quyền SQL trên Supabase prod. Làm đúng thứ tự, không bỏ bước.

## 0. Trước khi bắt đầu
- [ ] Backup DB: Supabase Dashboard → Database → Backups → "Create backup" (hoặc `pg_dump` qua connection string). Ghi lại tên backup và giờ.
- [ ] Thông báo admin ngừng import lương trong 30 phút.
- [ ] Chuẩn bị `JWT_SECRET` mới (≥ 32 ký tự ngẫu nhiên: `openssl rand -base64 48`).

## 1. Migration (SQL Editor, chạy từng file, kiểm tra không lỗi)
- [ ] `scripts/supabase-setup/36-auth-lockout-and-rate-limit.sql`
- [ ] `scripts/supabase-setup/37-harden-functions-and-rls.sql` (KHÔNG chạy khối DELETE cuối lúc này)
- [ ] Kiểm tra: `SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prosecdef;` → 0

## 2. Tạo admin thay thế
- [ ] `node scripts/create-admin-user.js --username <tên-mới> --password <mật khẩu ≥ 12 ký tự>` (chạy từ máy có `.env` prod)
- [ ] Giữ mật khẩu trong trình quản lý mật khẩu, không gửi qua chat.

## 3. Deploy
- [ ] Đặt `JWT_SECRET` mới trên Vercel (cả 2 project) — mọi phiên đăng nhập hiện tại sẽ bị đăng xuất, đây là chủ ý.
- [ ] Merge/push `main` → Vercel auto-deploy. Workflow "Deploy SSH" fail là bình thường (thiếu secret).

## 4. Smoke test (trên prod, sau deploy)
- [ ] Đăng nhập admin mới → vào dashboard → F12 Application: có cookie `auth_token` HttpOnly, `localStorage` không có token.
- [ ] Đăng nhập sai 5 lần với một admin khác → lần 6 nhận "Tài khoản tạm thời bị khoá".
- [ ] Nhân viên tra cứu lương + ký nhận bằng mã NV + mật khẩu → OK; gọi `/api/employee/sign-salary` không kèm Bearer → 401.
- [ ] Đổi mật khẩu nhân viên → token cũ bị từ chối (401 "thu hồi").
- [ ] truong_phong xem chi tiết lương phòng khác → 403.
- [ ] Import file Excel hợp lệ → OK; đổi tên `.txt` thành `.xlsx` → 400.
- [ ] Mở trang trên iPhone/iPad iOS 12 (hoặc Safari 12 giả lập) → không trắng trang.

## 5. Sau smoke test
- [ ] Chạy khối cuối của 37: `DELETE FROM admin_users WHERE username = 'admin';`
- [ ] Đổi mật khẩu cho mọi admin còn lại trong `admin_users` (hoặc đặt `is_active=false` với tài khoản không dùng).
- [ ] Nhân viên DB00694: CCCD từng xuất hiện trong `scripts/check-employee-db00694.js` → yêu cầu đổi mật khẩu; xoá script này khỏi repo (`git rm`).
- [ ] Xoay Supabase anon key nếu từng lộ (Dashboard → Settings → API → Regenerate).
- [ ] Thông báo admin: cần đăng nhập lại, import đã mở lại.

## 6. Rollback (nếu smoke test fail)
- Code: Vercel → Deployments → Promote bản trước.
- DB: 36/37 không xoá dữ liệu; nếu cần quay lại, restore backup ở bước 0. Riêng RLS/REVOKE không ảnh hưởng app (dùng service_role).
```

- [ ] **Step 3: `.gitignore` + commit**

Thêm dòng `vbsec-reports/` vào `.gitignore` (cuối file).

```bash
git add .gitignore
git add -f docs/superpowers/runbooks/2026-10-08-security-phase-1-deploy.md
git commit -m "docs: runbook triển khai Pha 1 bảo mật; bỏ theo dõi vbsec-reports"
```

- [ ] **Step 4: Tái quét**

Run `/vbs-scan-security` (toàn repo). Expected: 0 CRITICAL, 0 HIGH. Với finding còn lại: nếu thuộc §2–§7/§8.1 của spec → sửa ngay trong task tương ứng (tạo commit `fix:` riêng); nếu thuộc Pha 2/3 → ghi vào đầu plan Pha 2 (`docs/superpowers/plans/2026-10-08-security-remediation-phase-2.md`, chưa viết).

- [ ] **Step 5: Bàn giao**

Báo người dùng: branch sẵn sàng, runbook ở đường dẫn trên, nhắc bước 0 (backup) trước mọi SQL. Không push/deploy khi chưa được đồng ý.

---

## Ghi chú cho người thực thi

- Thứ tự bắt buộc: T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 → T9; T10–T13 độc lập với nhau nhưng cần T3/T4/T7; T14 cần T6; T15 độc lập; T16 cuối.
- Mỗi task kết thúc bằng `npm run format && npm run lint && npm run typecheck` sạch và commit riêng. Không gộp task vào một commit.
- Không chạy SQL lên prod trong lúc thực thi plan — migration chỉ được viết, việc chạy thuộc runbook T16 do người dùng làm sau backup.
