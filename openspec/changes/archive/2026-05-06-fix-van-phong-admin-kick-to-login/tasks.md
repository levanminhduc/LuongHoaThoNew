## 1. Auth Helper

- [x] 1.1 In `lib/auth-middleware.ts`, define and export the `AdminAccessResult` discriminated union type (`{ ok: true; user: JWTPayload } | { ok: false; status: 401 | 403; error: string }`)
- [x] 1.2 Implement and export `verifyAdminAccess(request: NextRequest): AdminAccessResult` — calls existing `verifyToken`, returns 401 if null, 403 if role !== "admin", else `{ ok: true, user }` ← (verify: existing exports unchanged, three union branches covered, Vietnamese error strings correct)

## 2. Frontend — Dashboard Page Guard

- [x] 2.1 In `app/admin/dashboard/admin-dashboard-v2.tsx` role-switch, add `case "van_phong": router.push("/admin/employee-management"); break;` immediately before the `default` branch ← (verify: van_phong navigating to /admin/dashboard lands on /admin/employee-management, not /admin/login; default branch still redirects unknown roles to login)

## 3. Frontend — Sidebar Role Filter

- [x] 3.1 In `components/admin/admin-sidebar.tsx`, add optional `allowedRoles?: string[]` to the `NavItem` interface
- [x] 3.2 Add a role-derivation helper at component top: parse `localStorage.getItem("user_info")`, extract `role`, catch parse errors and fall back to `"admin"`
- [x] 3.3 Assign `allowedRoles: ["admin", "van_phong", "nguoi_lap_bieu"]` to the "Quản Lý Nhân Viên" nav item; leave all other items without `allowedRoles` (admin-only default)
- [x] 3.4 Filter each nav item array (`mainItems`, `dataItems`, `toolItems`) to only include items where `allowedRoles` is undefined or includes `currentRole` before rendering ← (verify: van_phong sidebar shows only "Quản Lý Nhân Viên"; admin sidebar shows full menu; missing/malformed localStorage does not throw)

## 4. Frontend — Header Role Awareness

- [x] 4.1 In `components/admin/admin-header.tsx`, derive `currentRole` from `localStorage.getItem("user_info")` using the same parse-with-fallback pattern as the sidebar
- [x] 4.2 Make the "Admin" breadcrumb `href` dynamic: `currentRole === "van_phong" ? "/admin/employee-management" : "/admin/dashboard"`
- [x] 4.3 Conditionally render the "Dashboard" `DropdownMenuItem`: wrap it in `{currentRole !== "van_phong" && (...)}` ← (verify: van_phong breadcrumb links to /admin/employee-management; van_phong dropdown has no Dashboard item; admin sees full dropdown and breadcrumb to /admin/dashboard)

## 5. API Routes — Replace verifyAdminToken with verifyAdminAccess

- [x] 5.1 `app/api/admin/payroll/search/route.ts` — replace local auth block with `verifyAdminAccess` pattern; use `auth.user` as `admin`
- [x] 5.2 `app/api/admin/payroll-import/route.ts` — same substitution (check all HTTP method handlers)
- [x] 5.3 `app/api/admin/payrolls/route.ts` — same substitution
- [x] 5.4 `app/api/admin/payroll-export-template/route.ts` — same substitution
- [x] 5.5 `app/api/admin/import-employees/route.ts` — same substitution
- [x] 5.6 `app/api/admin/dashboard-stats/route.ts` — same substitution
- [x] 5.7 `app/api/admin/bulk-payroll-export/route.ts` — same substitution
- [x] 5.8 `app/api/admin/upload/route.ts` — same substitution
- [x] 5.9 `app/api/admin/sync-template/route.ts` — same substitution
- [x] 5.10 `app/api/admin/payroll/audit/[id]/route.ts` — same substitution
- [x] 5.11 `app/api/admin/mapping-configurations/route.ts` — same substitution
- [x] 5.12 `app/api/admin/export-import-errors/route.ts` — same substitution
- [x] 5.13 `app/api/admin/download-sample/route.ts` — same substitution
- [x] 5.14 `app/api/admin/download-multiple-samples/route.ts` — same substitution
- [x] 5.15 `app/api/admin/download-employee-template/route.ts` — same substitution
- [x] 5.16 `app/api/admin/detect-columns/route.ts` — same substitution
- [x] 5.17 `app/api/admin/column-aliases/route.ts` — same substitution (check GET/POST handlers)
- [x] 5.18 `app/api/admin/column-aliases/[id]/route.ts` — same substitution (check PUT/DELETE handlers)
- [x] 5.19 `app/api/admin/advanced-upload/route.ts` — same substitution
- [x] 5.20 `app/api/admin/generate-alias-template/route.ts` — same substitution
- [x] 5.21 `app/api/admin/payroll-preview/route.ts` — same substitution
- [x] 5.22 `app/api/admin/generate-import-template/route.ts` — same substitution ← (verify: grep `decoded.role === "admin"` in app/api/admin/ returns zero matches; van_phong calling any of these 22 routes gets 403 not 401; admin calling any route gets normal response; existing CACHE_HEADERS and other response options preserved)

## 6. Quality Check

- [x] 6.1 Run `npm run lint` — zero errors
- [x] 6.2 Run `npm run typecheck` — zero errors ← (verify: build is clean; no regressions in type signatures for existing auth helpers)
