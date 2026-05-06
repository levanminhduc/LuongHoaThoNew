## Why

Users with role `van_phong` are forcibly redirected to `/admin/login` when interacting with admin pages, destroying their session. The root cause is two independent gaps: the admin UI is not role-aware (sidebar and header expose links that are forbidden for `van_phong`), and 22 admin API routes return HTTP 401 instead of 403 when a valid-but-non-admin token is rejected, causing the client to treat it as session expiry and clear the token.

## What Changes

- **Admin sidebar** filters navigation items by the authenticated user's role so `van_phong` only sees "Quản Lý Nhân Viên"
- **Admin header** dynamically resolves the "Admin" breadcrumb href and hides the "Dashboard" dropdown entry for `van_phong`
- **`/admin/dashboard` page guard** redirects `van_phong` users to `/admin/employee-management` instead of to `/admin/login`
- **`lib/auth-middleware.ts`** gains a new `verifyAdminAccess()` helper that returns a discriminated union (`{ ok: true, user }` | `{ ok: false, status: 401 | 403, error }`) so callers can distinguish expired tokens from insufficient permissions
- **22 admin API routes** are updated to use `verifyAdminAccess()` so they return 403 (not 401) when a valid non-admin token is presented, preventing the client from incorrectly clearing the session

## Capabilities

### New Capabilities

- `role-aware-admin-ui`: Role-filtered sidebar, header, and page-level guard for the admin shell so `van_phong` sees only the pages they are permitted to access
- `admin-access-verification`: A reusable auth helper (`verifyAdminAccess`) that separates authentication failures (401) from authorization failures (403) for admin-only API routes

### Modified Capabilities

<!-- No existing spec-level requirements are changing — this is a bug fix that corrects existing behavior to match the intended access model. -->

## Impact

- **Components**: `components/admin/admin-sidebar.tsx`, `components/admin/admin-header.tsx`
- **Pages**: `app/admin/dashboard/admin-dashboard-v2.tsx`
- **Library**: `lib/auth-middleware.ts` (additive export only)
- **API routes**: 22 files under `app/api/admin/` — auth block replaced; all other logic unchanged
- **No database changes**
- **No client-visible API contract changes** — status code semantics become more correct (403 vs 401), which the existing `lib/api/client.ts` already handles correctly
