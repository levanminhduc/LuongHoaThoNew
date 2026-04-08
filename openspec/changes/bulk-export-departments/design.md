## Context

The existing `/api/admin/payroll-export` endpoint exports payroll data for a single department per request, returning one XLSX file. With ~70 departments, admins must repeat this action 70 times. The new bulk export reuses the same XLSX generation logic (PAYROLL_FIELDS, FIELD_HEADERS, HIDDEN_FIELDS, styling) but operates on multiple departments in a single request, outputting one flat sheet with all records combined.

## Goals / Non-Goals

**Goals:**

- New page `/admin/bulk-export` for admins only
- Department checklist loaded from DB (distinct departments from employees table)
- Single POST request returns one XLSX file with all selected departments' data in one sheet
- Rows sorted alphabetically by department name, then by employee_id within each department
- Empty departments (no payroll data for selected month) included as a single row: `"<dept name>" | "Không có dữ liệu"`
- Support both `monthly` and `t13` payroll types

**Non-Goals:**

- Multi-sheet output (one sheet per dept) — use existing single-dept export for that
- ZIP file output
- Progress streaming / SSE
- Non-admin roles (this endpoint is admin-only)

## Decisions

### Decision 1: Single flat sheet instead of multi-sheet

**Chosen**: All departments merged into one sheet, sorted by dept name.

**Rationale**: Simpler to implement (no sheet management), easier to use in Excel (filter/sort by dept column), smaller code surface. User explicitly requested this.

**Alternative considered**: One sheet per dept — rejected per user requirement change.

---

### Decision 2: New POST endpoint instead of extending existing GET

**Chosen**: `POST /api/admin/bulk-payroll-export` accepting `{ departments: string[], salary_month: string, payroll_type: "monthly" | "t13" }`.

**Rationale**: Array of departments doesn't fit cleanly in GET query params. POST body is cleaner. Keeps existing endpoint unchanged.

**Alternative considered**: GET with `departments=A,B,C` comma-separated — rejected for readability and potential URL length limits with 70 dept names.

---

### Decision 3: Single DB query for all departments

**Chosen**: Query all payrolls + employees in one Supabase call, filter in-memory by selected departments, then group/sort in JS.

**Rationale**: Minimizes DB round trips. Single query returns all data; JS grouping is O(n). 70 separate queries would be 70× slower.

**Shared code**: Extract `PAYROLL_FIELDS`, `FIELD_HEADERS`, `HIDDEN_FIELDS`, and cell styling logic from `/api/admin/payroll-export/route.ts` into `lib/excel/payroll-excel-builder.ts` so both endpoints reuse the same implementation.

---

### Decision 4: Department list source

**Chosen**: API `GET /api/admin/departments` (already exists) to populate the checklist on the frontend. If not sufficient, query `SELECT DISTINCT department FROM employees` via Supabase.

**Rationale**: Reuse existing endpoint rather than building new one.

---

### Decision 5: Empty department row format

**Chosen**: When a selected department has no payroll records for the month, insert a single row with `employee_id = dept_name`, `salary_month = "Không có dữ liệu"`, all other fields empty.

**Rationale**: Makes it obvious in the output that the dept was included but had no data, preventing confusion over missing depts.

## Risks / Trade-offs

- **Large file size**: 70 depts × ~50 employees × 39 fields = ~3,500 rows. XLSX generation in memory should be fast (<2s), but monitor for very large datasets.
  → Mitigation: No pagination needed at this scale; xlsx-js-style handles it.

- **Request timeout**: Next.js default timeout is 30s. Single DB query + XLSX build for 70 depts should complete in <5s.
  → Mitigation: No special config needed; add server-side timing log to monitor.

- **Sheet name column**: The flat sheet needs a visible "Phòng Ban" column to identify which dept each row belongs to. Must be added as the first column before employee_id.

## Open Questions

- None. All decisions confirmed with user.
