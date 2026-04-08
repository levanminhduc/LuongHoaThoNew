# Security Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 5 HIGH + 2 MEDIUM security vulnerabilities: JWT secret hardening, CSRF wiring, rate limiter consolidation, debug info removal, sensitive log cleanup, and debug route deletion.

**Architecture:** Modify `lib/config/jwt.ts` to throw on missing secret; wire `csrfProtection()` into admin mutation routes; consolidate 3 inline rate limiters into centralized `lib/security-middleware.ts`; strip `debug:` fields and sensitive `console.log` from API responses; delete `app/api/debug/` directory.

**Tech Stack:** Next.js 16, Supabase JS Client, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-29-security-remediation-phases-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `lib/config/jwt.ts` | Replace static export with lazy getter that throws |
| Modify | `lib/auth-middleware.ts` | Update JWT_SECRET → getJwtSecret() |
| Modify | `lib/employee-session.ts` | Update JWT_SECRET → getJwtSecret() |
| Modify | `lib/security-middleware.ts` | Add passwordReset + passwordChange rate limit configs |
| Modify | 22 admin/api route files | Update JWT_SECRET → getJwtSecret() |
| Modify | 26 admin route files | Wire csrfProtection() into POST/PUT/DELETE handlers |
| Modify | `app/api/auth/forgot-password/route.ts` | Remove inline rate limiter, use centralized |
| Modify | `app/api/auth/change-password-with-cccd/route.ts` | Remove inline rate limiter, use centralized |
| Modify | `app/api/employee/change-password/route.ts` | Remove inline rate limiter, use centralized |
| Modify | `app/api/admin/payroll/search/route.ts` | Remove debug fields + sensitive console.logs |
| Modify | `app/api/admin/payroll-export/route.ts` | Remove debug fields |
| Modify | `app/api/admin/payroll/audit/[id]/route.ts` | Remove debug fields |
| Delete | `app/api/debug/` (5 files) | Remove debug API routes |

---

## Task 1: JWT Secret — Throw If Empty

**Files:**
- Modify: `lib/config/jwt.ts`

- [ ] **Step 1: Replace static export with lazy getter**

Change `lib/config/jwt.ts` from:

```typescript
export const JWT_SECRET: string = process.env.JWT_SECRET || "";
```

To:

```typescript
let _cached: string | null = null;

export function getJwtSecret(): string {
  if (_cached) return _cached;
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("FATAL: JWT_SECRET environment variable is not set");
  }
  _cached = secret;
  return secret;
}
```

- [ ] **Step 2: Verify file compiles**

Run: `npx tsc --noEmit lib/config/jwt.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add lib/config/jwt.ts
git commit -m "fix(security): throw on missing JWT_SECRET instead of empty fallback"
```

---

## Task 2: Update JWT_SECRET Imports Across Codebase

**Files:**
- Modify: `lib/auth-middleware.ts`
- Modify: `lib/employee-session.ts`
- Modify: 22 files under `app/api/`

All 24 files follow the same pattern. Apply this transformation to **every** file:

```diff
- import { JWT_SECRET } from "@/lib/config/jwt";
+ import { getJwtSecret } from "@/lib/config/jwt";
```

And every usage:

```diff
- jwt.verify(token, JWT_SECRET)
+ jwt.verify(token, getJwtSecret())

- jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" })
+ jwt.sign(payload, getJwtSecret(), { expiresIn: "24h" })
```

- [ ] **Step 1: Update `lib/auth-middleware.ts`**

Line 4: `import { JWT_SECRET } from "@/lib/config/jwt"` → `import { getJwtSecret } from "@/lib/config/jwt"`
Line 22: `jwt.verify(token, JWT_SECRET)` → `jwt.verify(token, getJwtSecret())`

- [ ] **Step 2: Update `lib/employee-session.ts`**

Line 2: `import { JWT_SECRET } from "@/lib/config/jwt"` → `import { getJwtSecret } from "@/lib/config/jwt"`
Line 25: `jwt.verify(token, JWT_SECRET)` → `jwt.verify(token, getJwtSecret())`

- [ ] **Step 3: Update all 22 API route files**

Apply the same import + usage change to each:

1. `app/api/admin/login/route.ts` (import line 4, usage line 73 — this is `jwt.sign`, not verify)
2. `app/api/admin/payroll/search/route.ts` (import line 5, usage line 23)
3. `app/api/admin/payroll/audit/[id]/route.ts` (import line 5, usage line 40)
4. `app/api/admin/advanced-upload/route.ts` (import line 5, usage line 16)
5. `app/api/admin/column-aliases/route.ts` (import line 10, usage line 20)
6. `app/api/admin/column-aliases/[id]/route.ts` (import line 6, usage line 17)
7. `app/api/admin/dashboard-stats/route.ts` (import line 5, usage line 15)
8. `app/api/admin/detect-columns/route.ts` (import line 5, usage line 15)
9. `app/api/admin/download-employee-template/route.ts` (import line 5, usage line 16)
10. `app/api/admin/download-multiple-samples/route.ts` (import line 6, usage line 17)
11. `app/api/admin/download-sample/route.ts` (import line 5, usage line 16)
12. `app/api/admin/export-import-errors/route.ts` (import line 5, usage line 9)
13. `app/api/admin/import-dual-files/route.ts` (import line 7, usage line 91)
14. `app/api/admin/import-employees/route.ts` (import line 10, usage line 21)
15. `app/api/admin/import-history/route.ts` (import line 6, usages lines 45, 103, 247 — 3 occurrences)
16. `app/api/admin/mapping-configurations/route.ts` (import line 11, usage line 22)
17. `app/api/admin/payroll-export-template/route.ts` (import line 6, usage line 17)
18. `app/api/admin/payroll-import/route.ts` (import line 15, usage line 41)
19. `app/api/admin/sync-template/route.ts` (import line 6, usage line 17)
20. `app/api/admin/upload/route.ts` (import line 6, usage line 17)
21. `app/api/api-docs/openapi/route.ts` (import line 5, usage line 22)
22. `app/api/employees/update-cccd/route.ts` (import line 7, usage line 18)

- [ ] **Step 4: Verify compiles**

Run: `npx tsc --noEmit`
Expected: No new errors from our changes

- [ ] **Step 5: Commit**

```bash
git add lib/auth-middleware.ts lib/employee-session.ts app/api/
git commit -m "fix(security): migrate JWT_SECRET to getJwtSecret() across 24 files"
```

---

## Task 3: Add Rate Limit Configs to Centralized Middleware

**Files:**
- Modify: `lib/security-middleware.ts`

- [ ] **Step 1: Add new rate limit configs**

In `lib/security-middleware.ts`, find `RATE_LIMITS` object (line 8-13):

```typescript
const RATE_LIMITS = {
  login: { requests: 5, windowMs: 15 * 60 * 1000 },
  api: { requests: 100, windowMs: 60 * 1000 },
  payroll: { requests: 50, windowMs: 60 * 1000 },
  admin: { requests: 200, windowMs: 60 * 1000 },
};
```

Replace with:

```typescript
const RATE_LIMITS = {
  login: { requests: 5, windowMs: 15 * 60 * 1000 },
  api: { requests: 100, windowMs: 60 * 1000 },
  payroll: { requests: 50, windowMs: 60 * 1000 },
  admin: { requests: 200, windowMs: 60 * 1000 },
  passwordReset: { requests: 5, windowMs: 15 * 60 * 1000 },
  passwordChange: { requests: 3, windowMs: 60 * 1000 },
};
```

- [ ] **Step 2: Verify compiles**

Run: `npx tsc --noEmit lib/security-middleware.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add lib/security-middleware.ts
git commit -m "feat(security): add passwordReset and passwordChange rate limit configs"
```

---

## Task 4: Consolidate Inline Rate Limiter — forgot-password

**Files:**
- Modify: `app/api/auth/forgot-password/route.ts`

- [ ] **Step 1: Add centralized import**

Add at top of file:

```typescript
import { rateLimit } from "@/lib/security-middleware";
```

- [ ] **Step 2: Remove inline rate limiter code**

Delete these items (lines 7-55):
- `const rateLimitMap = new Map<...>()` (line 7)
- `const MAX_ATTEMPTS = 5` (line 9)
- `const LOCKOUT_DURATION = 30 * 60 * 1000` (line 10)
- `const RATE_LIMIT_WINDOW = 15 * 60 * 1000` (line 11)
- `const RATE_LIMIT_MAX = 5` (line 12)
- Entire `function checkRateLimit(...)` (lines 30-55)

Keep `hashIp()` and `shrinkUA()` functions — they're used for security logging, not rate limiting.

- [ ] **Step 3: Replace inline rate limit call**

Find the inline rate limit check (around line 134):

```typescript
    const rateLimit = checkRateLimit(`forgot-pw:${ip}:${employee_code}`);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: rateLimit.message }, { status: 429 });
    }
```

Replace with:

```typescript
    const rateLimitResult = rateLimit("passwordReset")(request);
    if (rateLimitResult) return rateLimitResult;
```

- [ ] **Step 4: Verify compiles**

Run: `npx tsc --noEmit app/api/auth/forgot-password/route.ts`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add app/api/auth/forgot-password/route.ts
git commit -m "refactor(security): use centralized rate limiter in forgot-password"
```

---

## Task 5: Consolidate Inline Rate Limiter — change-password-with-cccd

**Files:**
- Modify: `app/api/auth/change-password-with-cccd/route.ts`

- [ ] **Step 1: Add centralized import**

```typescript
import { rateLimit } from "@/lib/security-middleware";
```

- [ ] **Step 2: Remove inline rate limiter code**

Delete same items as Task 4 (lines 8-55):
- `const rateLimitMap = new Map<...>()` (line 8)
- `const MAX_ATTEMPTS = 5` (line 11)
- `const LOCKOUT_DURATION = 30 * 60 * 1000` (line 12)
- `const RATE_LIMIT_WINDOW = 15 * 60 * 1000` (line 13)
- `const RATE_LIMIT_MAX = 5` (line 14)
- Entire `function checkRateLimit(...)` (lines 36-55)

Keep `hashIp()` and `shrinkUA()`.

- [ ] **Step 3: Replace inline rate limit call**

Find (around line 137):

```typescript
    const rateLimit = checkRateLimit(`pw-reset:${ip}:${employee_code}`);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: rateLimit.message }, { status: 429 });
    }
```

Replace with:

```typescript
    const rateLimitResult = rateLimit("passwordReset")(request);
    if (rateLimitResult) return rateLimitResult;
```

- [ ] **Step 4: Verify compiles**

Run: `npx tsc --noEmit app/api/auth/change-password-with-cccd/route.ts`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add app/api/auth/change-password-with-cccd/route.ts
git commit -m "refactor(security): use centralized rate limiter in change-password-with-cccd"
```

---

## Task 6: Consolidate Inline Rate Limiter — change-password

**Files:**
- Modify: `app/api/employee/change-password/route.ts`

- [ ] **Step 1: Add centralized import**

```typescript
import { rateLimit } from "@/lib/security-middleware";
```

- [ ] **Step 2: Remove inline rate limiter code**

Delete (lines 7-41):
- `const rateLimitMap = new Map<...>()` (line 7)
- `const MAX_ATTEMPTS = 5` (line 10)
- `const LOCKOUT_DURATION = 15 * 60 * 1000` (line 11)
- `const RATE_LIMIT_WINDOW = 60 * 1000` (line 12)
- `const RATE_LIMIT_MAX = 3` (line 13)
- Entire `function checkRateLimit(...)` (lines 16-41)

- [ ] **Step 3: Replace inline rate limit call**

Find (around line 77):

```typescript
    const rateLimit = checkRateLimit(`change-pwd:${ip}:${employee_id}`);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: rateLimit.message }, { status: 429 });
    }
```

Replace with:

```typescript
    const rateLimitResult = rateLimit("passwordChange")(request);
    if (rateLimitResult) return rateLimitResult;
```

- [ ] **Step 4: Verify compiles**

Run: `npx tsc --noEmit app/api/employee/change-password/route.ts`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add app/api/employee/change-password/route.ts
git commit -m "refactor(security): use centralized rate limiter in change-password"
```

---

## Task 7: Wire CSRF Protection Into Admin Mutation Routes

**Files:**
- Modify: 26 admin route files (all POST/PUT/DELETE handlers except login/logout)

- [ ] **Step 1: Add CSRF import and check to each mutation handler**

For each file below, add the import at top:

```typescript
import { csrfProtection } from "@/lib/security-middleware";
```

And add at the start of each POST/PUT/DELETE function body (after `try {`):

```typescript
    const csrfResult = csrfProtection(request);
    if (csrfResult) return csrfResult;
```

**Files and handlers (26 files, 35 handlers):**

1. `app/api/admin/advanced-upload/route.ts` — POST
2. `app/api/admin/attendance-export/route.ts` — POST
3. `app/api/admin/attendance-import/route.ts` — POST
4. `app/api/admin/bulk-payroll-export/route.ts` — POST
5. `app/api/admin/bulk-sign-salary/route.ts` — POST
6. `app/api/admin/column-aliases/route.ts` — POST, PUT
7. `app/api/admin/column-aliases/[id]/route.ts` — PUT, DELETE
8. `app/api/admin/dashboard-stats/route.ts` — (check if POST exists, only wire mutations)
9. `app/api/admin/data-validation/route.ts` — DELETE
10. `app/api/admin/department-permissions/route.ts` — POST, DELETE
11. `app/api/admin/departments/route.ts` — POST, PUT
12. `app/api/admin/detect-columns/route.ts` — POST
13. `app/api/admin/employees/route.ts` — POST
14. `app/api/admin/employees/[id]/route.ts` — PUT, DELETE
15. `app/api/admin/export-import-errors/route.ts` — POST
16. `app/api/admin/import-dual-files/route.ts` — POST
17. `app/api/admin/import-employees/route.ts` — POST
18. `app/api/admin/import-history/route.ts` — POST, DELETE
19. `app/api/admin/mapping-configurations/route.ts` — POST, PUT
20. `app/api/admin/overtime-registration-export/route.ts` — POST
21. `app/api/admin/payroll/[id]/route.ts` — PUT
22. `app/api/admin/payroll/audit/[id]/route.ts` — POST
23. `app/api/admin/payroll/search/route.ts` — POST
24. `app/api/admin/payroll-import/route.ts` — POST
25. `app/api/admin/setup-management-signatures/route.ts` — POST
26. `app/api/admin/setup-new-positions/route.ts` — POST
27. `app/api/admin/setup-test-passwords/route.ts` — POST
28. `app/api/admin/sync-template/route.ts` — (check if POST exists)
29. `app/api/admin/update-management-signature-date/route.ts` — POST
30. `app/api/admin/update-signature-date/route.ts` — POST
31. `app/api/admin/upload/route.ts` — POST

**Skip (no CSRF needed):**
- `app/api/admin/login/route.ts` — pre-auth
- `app/api/admin/logout/route.ts` — stateless

- [ ] **Step 2: Verify compiles**

Run: `npx tsc --noEmit`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/
git commit -m "fix(security): wire CSRF protection into all admin mutation routes"
```

---

## Task 8: Remove Debug Fields From API Responses

**Files:**
- Modify: `app/api/admin/payroll/search/route.ts` (6 occurrences)
- Modify: `app/api/admin/payroll-export/route.ts` (3 occurrences)
- Modify: `app/api/admin/payroll/audit/[id]/route.ts` (5 occurrences)

- [ ] **Step 1: Remove all `debug:` fields from `payroll/search/route.ts`**

Remove these `debug:` key-value pairs from all 6 error response objects (lines 85-86, 96-97, 151-157, 365-366, 425-432, 478-479). The pattern is always:

```diff
  return NextResponse.json(
    {
      error: "...",
-     debug:
-       process.env.NODE_ENV === "development" ? someError : undefined,
    },
    { status: 500 },
  );
```

- [ ] **Step 2: Remove all `debug:` fields from `payroll-export/route.ts`**

Remove from lines 133-139, 184-190, 635.

- [ ] **Step 3: Remove all `debug:` fields from `payroll/audit/[id]/route.ts`**

Remove from lines 90-91, 106-107, 116-117, 129-130, 155-156.

- [ ] **Step 4: Verify compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/payroll/search/route.ts app/api/admin/payroll-export/route.ts app/api/admin/payroll/audit/\[id\]/route.ts
git commit -m "fix(security): remove debug fields from API error responses"
```

---

## Task 9: Remove Sensitive Console.logs From payroll/search

**Files:**
- Modify: `app/api/admin/payroll/search/route.ts`

- [ ] **Step 1: Remove all emoji-prefixed diagnostic console.log calls**

Remove these lines entirely (17 console.log calls):
- Line 32-35: `console.log("🔍 Search API called:", ...)`
- Line 40: `console.log("❌ Authentication failed")`
- Line 47: `console.log("✅ Admin authenticated:", admin.username)`
- Line 54: `console.log("📋 Search params:", ...)`
- Line 57: `console.log("❌ Invalid query length")`
- Line 65: `console.log("📡 Supabase client created")`
- Line 74-78: `console.log("🔌 Database connectivity test:", ...)`
- Line 81: `console.error("❌ Database connectivity failed:", ...)`
- Line 92: `console.error("❌ Database connection exception:", ...)`
- Line 104: `console.log("🔍 Checking table data...")`
- Line 114-119: `console.log("📊 Data check:", ...)`
- Line 123: `console.log("⚠️ Count queries failed, ...")`
- Line 133-138: `console.log("📊 Existence check:", ...)`
- Line 142-145: `console.error("❌ Database access failed:", ...)`
- Line 206: `console.log("🔍 Building query...")`
- Line 240: `console.log("📊 Query built, adding filters...")`
- Line 243: `console.log("📅 Adding month filter:", ...)`
- Line 247: `console.log("🚀 Executing query...")`
- Line 251-256: `console.log("📊 Query result:", ...)`
- Line 260: `console.log("🔄 Main query failed, ...")`
- Line 272: `console.error("❌ Simple query also failed:", ...)`
- Line 274-278: `console.log("✅ Simple query succeeded:", ...)`
- Line 298: `console.log("✅ Manual join completed")`

- [ ] **Step 2: Simplify error console.error calls**

Replace detailed error logging:

```diff
- console.error("Error searching payroll data:", {
-   error: payrollError,
-   query,
-   salaryMonth,
-   timestamp: new Date().toISOString(),
- });
+ console.error("Payroll search error:", payrollError?.message);
```

```diff
- console.error("❌ Employee search error:", {
-   error: error instanceof Error ? error.message : error,
-   stack: error instanceof Error ? error.stack : undefined,
-   timestamp: new Date().toISOString(),
- });
+ console.error("Employee search error:", error instanceof Error ? error.message : error);
```

```diff
- console.error("Error fetching salary months:", {
-   error: monthsError,
-   timestamp: new Date().toISOString(),
- });
+ console.error("Salary months fetch error:", monthsError?.message);
```

- [ ] **Step 3: Verify compiles**

Run: `npx tsc --noEmit app/api/admin/payroll/search/route.ts`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/payroll/search/route.ts
git commit -m "fix(security): remove sensitive console.logs from payroll search"
```

---

## Task 10: Delete Debug API Routes

**Files:**
- Delete: `app/api/debug/count-departments/route.ts`
- Delete: `app/api/debug/departments/route.ts`
- Delete: `app/api/debug/positions/route.ts`
- Delete: `app/api/debug/batch-ids/route.ts`
- Delete: `app/api/debug/verify-bulk-signature/route.ts`

- [ ] **Step 1: Delete entire debug directory**

```bash
rm -rf app/api/debug/
```

- [ ] **Step 2: Verify no imports reference debug routes**

```bash
grep -r "api/debug" app/ lib/ components/ --include="*.ts" --include="*.tsx"
```

Expected: No results (debug routes are standalone endpoints, not imported)

- [ ] **Step 3: Commit**

```bash
git add -A app/api/debug/
git commit -m "fix(security): delete debug API routes exposing internal data"
```

---

## Task 11: Full Build Verification

- [ ] **Step 1: Run format + lint + typecheck**

```bash
npm run format && npm run lint && npm run typecheck
```

Expected: All pass with no errors

- [ ] **Step 2: Fix any errors if found**

If lint or typecheck reports errors, fix them in the affected files.

- [ ] **Step 3: Final commit if any formatting changes**

```bash
git add -A
git commit -m "chore: format after security remediation"
```
