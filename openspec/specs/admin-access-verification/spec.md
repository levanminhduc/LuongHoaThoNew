# admin-access-verification Specification

## Purpose
TBD - created by archiving change fix-van-phong-admin-kick-to-login. Update Purpose after archive.
## Requirements
### Requirement: verifyAdminAccess returns a discriminated union result
The function `verifyAdminAccess(request: NextRequest)` SHALL be exported from `lib/auth-middleware.ts` and SHALL return one of three states without throwing:

- `{ ok: true; user: JWTPayload }` when the request carries a valid JWT with `role === "admin"`
- `{ ok: false; status: 401; error: string }` when the JWT is absent, expired, or has an invalid signature
- `{ ok: false; status: 403; error: string }` when the JWT is valid but `role !== "admin"`

Error strings SHALL be in Vietnamese: 401 → `"Phiên đăng nhập đã hết hạn"`, 403 → `"Không có quyền truy cập"`.

#### Scenario: Valid admin token grants access
- **WHEN** a request carries a valid JWT where `role === "admin"`
- **THEN** `verifyAdminAccess` SHALL return `{ ok: true, user: <decoded payload> }`

#### Scenario: Missing or invalid token returns 401
- **WHEN** a request has no Authorization header, or carries a malformed or expired JWT
- **THEN** `verifyAdminAccess` SHALL return `{ ok: false, status: 401, error: "Phiên đăng nhập đã hết hạn" }`

#### Scenario: Valid token with non-admin role returns 403
- **WHEN** a request carries a valid JWT where `role` is any value other than `"admin"` (e.g. `"van_phong"`, `"ke_toan"`)
- **THEN** `verifyAdminAccess` SHALL return `{ ok: false, status: 403, error: "Không có quyền truy cập" }`

### Requirement: Admin API routes use verifyAdminAccess and return correct HTTP status
All 22 admin-only API route handlers that previously called a local `verifyAdminToken` SHALL be updated to call `verifyAdminAccess`. When the result is `ok: false`, the handler SHALL return a JSON response with the `status` and `error` from the result and SHALL NOT clear or invalidate the client's JWT.

#### Scenario: Non-admin valid token receives 403, not 401
- **WHEN** a `van_phong` user (valid JWT, wrong role) calls any of the 22 affected admin API routes
- **THEN** the API SHALL respond with HTTP 403
- **THEN** the API SHALL NOT respond with HTTP 401
- **THEN** the client's stored JWT SHALL remain intact (no session clearing)

#### Scenario: Missing token still receives 401
- **WHEN** an unauthenticated request (no Authorization header) calls any of the 22 affected admin API routes
- **THEN** the API SHALL respond with HTTP 401

#### Scenario: Admin token receives normal response
- **WHEN** a request with a valid admin JWT calls any of the 22 affected admin API routes
- **THEN** the handler SHALL execute its existing logic and return the normal response unchanged

### Requirement: verifyAdminAccess is additive and does not break existing exports
Adding `verifyAdminAccess` to `lib/auth-middleware.ts` SHALL NOT modify, rename, or remove any existing exported function or type. All callers of the existing `verifyToken`, `verifyEmployeeManagementAccess`, `requireRole`, and related helpers SHALL continue to work without modification.

#### Scenario: Existing middleware callers are unaffected
- **WHEN** any route that uses `verifyEmployeeManagementAccess`, `verifyAuditLogsAccess`, or `requireRole` is called
- **THEN** its behaviour SHALL be identical to before this change

