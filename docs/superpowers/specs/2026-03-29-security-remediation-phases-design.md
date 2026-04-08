# Security Remediation Phases 1-2-3

**Date:** 2026-03-29
**Status:** Approved
**Branch:** fix/sql-injection-admin (continuation)
**Prerequisite:** Hotfix complete (spec: `2026-03-29-admin-security-audit-design.md`)

## Scope

Three remediation phases addressing 5 HIGH + 2 MEDIUM vulnerabilities remaining after the CRITICAL hotfix. Raises security score from 6/10 → ~9/10.

| # | Severity | Vulnerability | Phase |
|---|----------|--------------|-------|
| 3 | HIGH | JWT Secret falls back to empty string `""` | 1 |
| 4 | HIGH | CSRF middleware exists but never wired into routes | 1 |
| 5 | HIGH | 4 duplicate in-memory rate limiters across codebase | 2 |
| 6 | MED | `debug` field in API responses leaks internal info | 3 |
| 7 | MED | Console.log leaks admin username, queries, DB details | 3 |
| 8 | — | 5 debug API routes expose internal data | 3 |

## Phase 1: JWT & Auth Hardening

### 1a. JWT Secret — Throw If Empty

**Problem:** `lib/config/jwt.ts` exports `JWT_SECRET = process.env.JWT_SECRET || ""`. If env var missing, any attacker can forge valid JWTs with an empty signing key.

**Solution:** Replace static export with lazy getter function that throws at runtime if env var is missing. Lazy evaluation ensures no throw during build/import — only when code actually verifies a token.

**Current code:**
```typescript
export const JWT_SECRET: string = process.env.JWT_SECRET || "";
```

**New code:**
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

**Impact:** 24 import sites need update (`JWT_SECRET` → `getJwtSecret()`):

| File | Count |
|------|-------|
| `lib/auth-middleware.ts` | 1 |
| `lib/employee-session.ts` | 1 |
| `app/api/admin/login/route.ts` | 1 |
| `app/api/admin/payroll/search/route.ts` | 1 |
| `app/api/admin/payroll/audit/[id]/route.ts` | 1 |
| `app/api/admin/advanced-upload/route.ts` | 1 |
| `app/api/admin/column-aliases/route.ts` | 1 |
| `app/api/admin/column-aliases/[id]/route.ts` | 1 |
| `app/api/admin/dashboard-stats/route.ts` | 1 |
| `app/api/admin/detect-columns/route.ts` | 1 |
| `app/api/admin/download-employee-template/route.ts` | 1 |
| `app/api/admin/download-multiple-samples/route.ts` | 1 |
| `app/api/admin/download-sample/route.ts` | 1 |
| `app/api/admin/export-import-errors/route.ts` | 1 |
| `app/api/admin/import-dual-files/route.ts` | 1 |
| `app/api/admin/import-employees/route.ts` | 1 |
| `app/api/admin/import-history/route.ts` | 1 |
| `app/api/admin/mapping-configurations/route.ts` | 1 |
| `app/api/admin/payroll-export-template/route.ts` | 1 |
| `app/api/admin/payroll-import/route.ts` | 1 |
| `app/api/admin/sync-template/route.ts` | 1 |
| `app/api/admin/upload/route.ts` | 1 |
| `app/api/api-docs/openapi/route.ts` | 1 |
| `app/api/employees/update-cccd/route.ts` | 1 |

**Migration pattern per file:**
```diff
- import { JWT_SECRET } from "@/lib/config/jwt";
+ import { getJwtSecret } from "@/lib/config/jwt";

- jwt.verify(token, JWT_SECRET)
+ jwt.verify(token, getJwtSecret())

- jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" })
+ jwt.sign(payload, getJwtSecret(), { expiresIn: "24h" })
```

### 1b. Wire CSRF Protection Into Admin Mutation Routes

**Problem:** `csrfProtection()` in `lib/security-middleware.ts` checks Origin/Referer headers for same-origin requests. It exists but no route imports it. Cross-origin POST/PUT/DELETE requests currently succeed without restriction.

**Solution:** Add CSRF check at the start of all admin POST/PUT/DELETE handlers. Skip GET routes (already handled by `csrfProtection()` internally). Skip `admin/login` (needs to work from any origin for initial auth).

**Affected admin mutation routes (37 handlers across 28 files):**

All `app/api/admin/*/route.ts` files that export POST, PUT, or DELETE functions, **except** `admin/login/route.ts` and `admin/logout/route.ts`.

**Pattern per handler:**
```diff
+ import { csrfProtection } from "@/lib/security-middleware";

  export async function POST(request: NextRequest) {
    try {
+     const csrfResult = csrfProtection(request);
+     if (csrfResult) return csrfResult;
      // ... existing code
```

**Routes to skip (no CSRF):**
- `admin/login/route.ts` — initial auth, no session yet
- `admin/logout/route.ts` — stateless logout, no risk

## Phase 2: Centralize Rate Limiting (DRY)

### Problem

4 independent in-memory rate limiter implementations:

| File | Config | Shared Store |
|------|--------|-------------|
| `lib/security-middleware.ts` | 5 req/15min (login), 100/min (api), 50/min (payroll), 200/min (admin) | `rateLimitStore` (Map) |
| `app/api/auth/forgot-password/route.ts` | 5 req/15min | `rateLimitMap` (own Map) |
| `app/api/auth/change-password-with-cccd/route.ts` | 5 req/15min | `rateLimitMap` (own Map) |
| `app/api/employee/change-password/route.ts` | 3 req/1min | `rateLimitMap` (own Map) |

Each file duplicates the same logic: Map store, check-and-increment, cleanup. The 3 inline copies also duplicate `hashIp()` and `shrinkUA()` helpers.

### Solution

1. Add new rate limit configs to centralized `RATE_LIMITS` in `lib/security-middleware.ts`:
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

2. Delete inline `rateLimitMap`, `checkRateLimit()`, `RATE_LIMIT_*` constants from the 3 files.

3. Import `rateLimit()` from `@/lib/security-middleware` and call at handler start:
   ```typescript
   const rateLimitResult = rateLimit("passwordReset")(request);
   if (rateLimitResult) return rateLimitResult;
   ```

4. The 3 inline files also have `hashIp()` and `shrinkUA()` helpers used elsewhere in the same file (for security logging). These stay — they serve a different purpose than rate limiting.

### Accepted Risk

In-memory `Map` resets on serverless cold start. Documented as accepted architectural risk — user explicitly chose not to migrate to DB/KV store.

## Phase 3: Information Hygiene

### 3a. Remove `debug` Field From API Responses

**Problem:** 4 files return `debug:` fields in error responses containing raw database errors, table names, RLS policy details, error stacks. Even though gated behind `NODE_ENV === "development"`, if `NODE_ENV` is misconfigured in production, all internal details leak.

**Affected files and occurrences:**

| File | Occurrences |
|------|------------|
| `app/api/admin/payroll/search/route.ts` | 6 |
| `app/api/admin/payroll-export/route.ts` | 3 |
| `app/api/admin/payroll/audit/[id]/route.ts` | 5 |
| `app/api/debug/positions/route.ts` | 1 (deleted in 3c) |

**Solution:** Remove all `debug:` fields from response objects. Keep the user-facing `error:` message. If developers need debug info, they check server logs — not API responses.

**Pattern:**
```diff
  return NextResponse.json(
    {
      error: "Lỗi khi tìm kiếm dữ liệu lương",
-     debug:
-       process.env.NODE_ENV === "development" ? payrollError : undefined,
    },
    { status: 500 },
  );
```

### 3b. Remove Sensitive Console.logs

**Problem:** `app/api/admin/payroll/search/route.ts` has 10+ `console.log()` calls that leak:
- Admin username: `console.log("✅ Admin authenticated:", admin.username)`
- Search queries: `console.log("📋 Search params:", { query, salaryMonth, payrollType })`
- DB connectivity details: `console.log("🔌 Database connectivity test:", ...)`
- Table data counts: `console.log("📊 Data check:", ...)`

**Solution:** Remove all emoji-prefixed diagnostic `console.log()` calls from `payroll/search/route.ts`. Keep `console.error()` for actual errors but strip sensitive fields:

```diff
- console.log("✅ Admin authenticated:", admin.username);
- console.log("📋 Search params:", { query, salaryMonth, payrollType });
- console.log("📡 Supabase client created");
- console.log("🔌 Database connectivity test:", { ... });
- console.log("📊 Data check:", { ... });
- console.log("🔍 Building query...");
- console.log("📊 Query built, adding filters...");
- console.log("📅 Adding month filter:", salaryMonth);
- console.log("🚀 Executing query...");
- console.log("📊 Query result:", { ... });
- console.log("🔄 Main query failed, trying alternative approach...");
- console.log("✅ Simple query succeeded:", ...);
- console.log("✅ Manual join completed");
+ // All diagnostic logs removed for security
```

Keep existing `console.error("Error searching payroll data:", ...)` but remove the detailed object:
```diff
- console.error("Error searching payroll data:", {
-   error: payrollError,
-   query,
-   salaryMonth,
-   timestamp: new Date().toISOString(),
- });
+ console.error("Payroll search error:", payrollError?.message);
```

### 3c. Delete Debug API Routes

**Problem:** 5 routes under `app/api/debug/` expose internal system data. Not needed in production.

**Solution:** Delete entire `app/api/debug/` directory:
- `app/api/debug/count-departments/route.ts`
- `app/api/debug/departments/route.ts`
- `app/api/debug/positions/route.ts`
- `app/api/debug/batch-ids/route.ts`
- `app/api/debug/verify-bulk-signature/route.ts`

## Success Criteria

- `JWT_SECRET` missing → app throws clear error at first token verification, not silently accepts
- All admin POST/PUT/DELETE routes check Origin/Referer headers (except login/logout)
- Zero duplicate rate limiter implementations — single source in `lib/security-middleware.ts`
- Zero `debug:` fields in any API response
- Zero `console.log()` leaking admin usernames or search queries
- Zero debug API routes accessible

## Out of Scope

- Rate limiting migration to DB/KV (accepted: in-memory with cold-start limitation)
- Service role key bypassing RLS (accepted architectural risk)
- CAPTCHA for admin login
- Additional rate limiting for non-sensitive GET endpoints
