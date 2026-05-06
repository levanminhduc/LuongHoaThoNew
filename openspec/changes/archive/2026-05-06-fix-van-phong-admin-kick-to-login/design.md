## Context

The admin shell (`/admin/*`) is shared by two user categories: `admin` (full access) and `van_phong` (employee-management only). Login correctly redirects `van_phong` to `/admin/employee-management`, but the surrounding UI and API layer are not role-aware, causing unintended redirects to `/admin/login` whenever `van_phong` touches a forbidden area.

Two independent defects combine to produce the reported behaviour:

1. **UI navigation gap** — `admin-sidebar.tsx` and `admin-header.tsx` render the same link set for every role. Clicking "Dashboard" from either component triggers `admin-dashboard-v2.tsx`, whose role-switch `default` branch calls `router.push("/admin/login")`.
2. **Wrong HTTP status on auth failure** — ~22 admin API routes call a local `verifyAdminToken` that returns `null` on any failure, and respond with HTTP 401. The API client (`lib/api/client.ts:175-177`) maps every 401 to `AUTH_EXPIRED`, clears the JWT, and redirects to login — even when the token itself was valid but the role was wrong.

## Goals / Non-Goals

**Goals:**

- `van_phong` users navigate `/admin/employee-management` without ever being redirected to `/admin/login` as a result of normal UI interaction
- Admin API routes return 403 (not 401) when a valid token has insufficient role, preserving the session
- All other roles remain functionally unchanged
- New `verifyAdminAccess()` helper is reusable across all 22 affected routes with a mechanical one-for-one substitution

**Non-Goals:**

- A dedicated dashboard or landing page for `van_phong`
- Middleware-level route enforcement (no `middleware.ts` exists; out of scope)
- Changes to `lib/api/client.ts` (already handles 403 correctly via `mapStatusToCode`)
- Refactoring routes that already use `verifyEmployeeManagementAccess`, `verifyAuditLogsAccess`, or `requireRole()` — these already return semantically correct codes

## Decisions

### D1 — Role-filter source: localStorage `user_info`

`admin-dashboard-v2.tsx` already reads `localStorage.getItem("user_info")` and JSON-parses it to derive the role for its redirect switch. The sidebar and header will use the same pattern for consistency.

Alternatives considered:
- **Context / React state**: Would require a new provider wrapping the admin layout — more invasive change for a bug fix.
- **Server Component prop drilling**: Admin layout is a client-heavy shell; adding server-side role propagation touches more files than the fix warrants.

Fallback: if `user_info` is absent or malformed, both sidebar and header default to admin-only menus (safe — admins still see everything, non-admins see nothing they should not).

### D2 — Sidebar role filter: `allowedRoles` field on NavItem

Add an optional `allowedRoles?: string[]` field to the `NavItem` interface. Items without the field are admin-only. Items with the field are shown when `currentRole` is in the array. Role derivation happens once at component mount and is memoised to avoid repeated localStorage reads.

If the sidebar file exceeds 200 lines after the change, the role-derivation logic is extracted to a small inline helper (not a new file — the logic is 5-10 lines and does not warrant a separate module under KISS).

### D3 — Header: conditional href and menu item

Two targeted changes in `admin-header.tsx`:
- Breadcrumb "Admin" `href` is computed from role: `admin` → `/admin/dashboard`, `van_phong` → `/admin/employee-management`
- The "Dashboard" `DropdownMenuItem` is conditionally rendered (`role !== "van_phong"`)

No structural changes to the component; only two inline ternary expressions are added.

### D4 — Dashboard page guard: add `van_phong` case to switch

`admin-dashboard-v2.tsx` switch already handles `giam_doc`, `ke_toan`, `nguoi_lap_bieu`, `truong_phong`, `to_truong`. Adding `case "van_phong": router.push("/admin/employee-management"); break;` before `default` is the minimal correct fix. The `default` branch (which redirects to login) is left intact for truly unknown roles.

### D5 — New `verifyAdminAccess()` helper in `lib/auth-middleware.ts`

Returns a discriminated union:

```typescript
type AdminAccessResult =
  | { ok: true; user: JWTPayload }
  | { ok: false; status: 401 | 403; error: string };
```

Implementation:
- Calls existing `verifyToken(request)` (already exported from `lib/auth-middleware.ts`)
- `null` result → `{ ok: false, status: 401, error: "Phiên đăng nhập đã hết hạn" }`
- `decoded.role !== "admin"` → `{ ok: false, status: 403, error: "Không có quyền truy cập" }`
- Otherwise → `{ ok: true, user: decoded }`

This is additive — no existing exports are modified.

### D6 — 22 API routes: mechanical substitution

Each affected route replaces its local auth block with:

```typescript
const auth = verifyAdminAccess(request);
if (!auth.ok) {
  return NextResponse.json({ error: auth.error }, { status: auth.status });
}
const admin = auth.user;
```

The variable name `admin` is preserved so downstream usage within each handler needs no further changes. Routes with multiple HTTP methods (GET/POST/PUT/DELETE) each get the substitution independently. Existing `CACHE_HEADERS`, `cors`, and other response options are preserved.

## Risks / Trade-offs

- **localStorage coupling** — Reading auth state from localStorage ties sidebar/header behaviour to client-side storage. If a future session refresh changes the stored role without a page reload, the UI could show a stale menu. Mitigation: this is the existing pattern in the codebase; no regression introduced. A proper auth context refactor is a separate concern.
- **22-file mechanical change** — High file count increases the chance of a missed handler. Mitigation: tasks.md enumerates every file explicitly; verify step checks for any remaining `decoded.role === "admin"` pattern in `app/api/admin/` after the batch update.
- **File size (admin-sidebar.tsx)** — Currently 281 lines. Adding role-filter logic without extraction risks pushing it further over the 200-line guideline. Mitigation: extract role-derivation to an inline helper at the top of the file; filter arrays inline. If still over limit, split into `admin-sidebar-items.ts` for the nav item definitions only.

## Migration Plan

No database migrations. No deployment coordination needed — changes are entirely within the Next.js application layer.

Deploy order (all in one release):
1. `lib/auth-middleware.ts` — new export, fully backward-compatible
2. 22 API routes — consume new helper; behaviour change is 401 → 403 for non-admin valid tokens (client already handles this correctly)
3. Frontend components — sidebar, header, dashboard guard

Rollback: revert the PR. No state is persisted that would require data migration.

## Open Questions

None. All decisions were resolved during the exploration phase before this spec was created.
