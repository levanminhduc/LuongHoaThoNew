# Docs Manager Report — Update Project Documentation

**Date:** 2026-03-09
**Task:** Update 5 core docs to reflect shadcn/ui upgrades and current codebase state

---

## Current State Assessment

All 5 target files already carried `**Cập nhật:** 2026-03-09` and had correct major version numbers (Zod v4, date-fns v4, react-day-picker v9, sonner v2, vaul v1, react-resizable-panels v4, shadcn/ui latest). The dependency upgrades from Phase 6c were already reflected.

---

## Changes Made

### docs/codebase-summary.md

1. **Fixed filename**: `hooks/use-mobile.tsx` → `hooks/use-mobile.ts` (matches actual file on disk)
2. **Added missing API routes**: Inserted `employee/` and `employees/` route groups with their sub-routes (lookup, sign-salary, salary-history, change-password, check-password-status, all-employees, update-cccd). These were undocumented.
3. **Corrected validation schema list**: Updated from "5 schema files for domains: payroll, employee, signature, import, mapping" to the actual file names (`common.ts`, `employee.ts`, `errors.ts`, `payroll.ts`, `index.ts`) — no `signature.ts`, `import.ts`, or `mapping.ts` exist.

### docs/system-architecture.md

1. **Fixed API route count**: Updated "50+ routes" → "70+ routes" (actual count is 71 `route.ts` files).

### docs/project-overview-pdr.md

1. **Expanded Routes prefix section**: Added `/api/employee/*` and `/api/employees/*` entries with descriptions to match actual route structure.

### docs/code-standards.md

No changes required. All versions and patterns were already accurate.

### docs/project-roadmap.md

No changes required. Phase 6c (Dependency Upgrades) was already marked complete with correct version details.

---

## Gaps Identified

The following are pre-existing issues outside the 5 target files:

- `docs/centralized-validation-design.md`: References several files that don't exist (`lib/config/env.ts`, `lib/signature-validation.ts`) — likely a design doc for a planned feature.
- `docs/department-management-design.md`: References unimplemented components (`DepartmentTree`, `WorkshopManagerDashboard`) — these are part of Phase 5 backlog, appropriate to leave as-is.
- Validator false positives: HTTP method names (`GET`, `POST`) flagged as config keys; `createServiceClient()` not found because it's in `utils/supabase/server.ts` which the validator may not scan.

---

## File Sizes (Post-Update)

| File | Lines |
|------|-------|
| project-overview-pdr.md | 247 |
| codebase-summary.md | 305 |
| code-standards.md | 468 |
| system-architecture.md | 387 |
| project-roadmap.md | 247 |

All under the 800 LOC limit.
