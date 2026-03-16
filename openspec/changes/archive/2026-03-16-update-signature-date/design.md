## Context

The payroll system tracks employee salary signatures via `payrolls` (is_signed, signed_at) and `signature_logs` tables, plus management approvals via `management_signatures` table. Currently, `signed_at` is always set to real-time (UTC+7) with no way to adjust after signing. Admin needs to backdate/adjust these timestamps to align records with actual business timelines.

Current signature function: `auto_sign_salary()` sets `v_current_time := CURRENT_TIMESTAMP + INTERVAL '7 hours'`. Bulk signing via `bulk_sign_salaries()` loops through employees calling the same function.

Tables affected:
- `payrolls`: `signed_at`, `updated_at` fields
- `signature_logs`: `signed_at` field, UNIQUE(employee_id, salary_month)
- `management_signatures`: `signed_at` field, UNIQUE(salary_month, signature_type) WHERE is_active=true

## Goals / Non-Goals

**Goals:**
- Allow admin to update `signed_at` for already-signed employee records (payrolls + signature_logs)
- Allow admin to update `signed_at` for existing management signatures
- Allow admin to create management signatures on behalf of role holders with custom date
- Support bulk (all employees) and selective (specific employee IDs) modes
- Generate natural-looking timestamps via random offset (base_date ± N days, random hour 0-24h, random minute 0-59)
- Frontend displays UI only; all logic runs on backend

**Non-Goals:**
- Changing the existing real-time signature flow (employees/management signing normally)
- Signing unsigned employee records (only management can be signed on behalf)
- Schema changes to existing tables
- Audit log UI for viewing date change history (can be added later)

## Decisions

### 1. API Structure: Two separate endpoints
**Decision**: Create two API endpoints — one for employee signatures, one for management signatures.
**Rationale**: Different logic (employee = bulk update existing, management = update OR create). Separate endpoints keep each under 200 lines and follow existing API pattern (`/api/admin/*`).
**Alternative**: Single endpoint with `type` parameter — rejected because it mixes concerns and makes the handler complex.

### 2. Random timestamp generation on backend
**Decision**: Backend generates all random timestamps. Frontend sends only `base_date`, `random_range_days`.
**Rationale**: Keeps frontend simple (UI only). Backend can ensure randomness consistency and validate date ranges. Matches user requirement "frontend chỉ hiển thị, backend làm logic."

### 3. Management signer resolution
**Decision**: When admin creates a management signature on behalf, auto-resolve the signer by querying `employees` table for the first user with matching role (e.g., role=giam_doc → find employee with that role).
**Rationale**: Simpler than requiring admin to pick from a dropdown. One query to DB per signature type.
**Fallback**: If no user with that role exists, return error.

### 4. Direct SQL updates (no RPC function)
**Decision**: Use direct Supabase updates via service client instead of creating new DB functions.
**Rationale**: This is an admin-only correction tool, not a high-frequency operation. Direct updates are simpler and avoid adding more DB functions. Existing RPC functions are for the normal signing flow.
**Alternative**: New RPC function `admin_update_signature_date()` — rejected, YAGNI.

### 5. UI as dialog component
**Decision**: Single dialog with two tabs/sections — employee signatures and management signatures.
**Rationale**: Reuses existing dialog patterns (like BulkSignatureDialog). Admin can handle both in one place.

## Risks / Trade-offs

- **[Data integrity]** Updating signed_at directly bypasses normal signature flow → Mitigation: Admin-only access, operation limited to already-signed records (except management create)
- **[Audit trail]** No dedicated log table for date changes → Mitigation: `updated_at` field in payrolls tracks last modification time. Can add dedicated logging later if needed.
- **[Role resolution]** Auto-resolving signer assumes one primary user per role → Mitigation: Query orders by employee_id and takes first match. If multiple exist, consistent result.

## Open Questions

None — all decisions made during exploration phase.
