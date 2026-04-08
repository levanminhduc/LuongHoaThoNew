## Context

The admin bulk-signature page (`/admin/bulk-signature`) includes an "Update Employee Signature Date" feature that updates the `signed_at` timestamp for already-signed employees. Currently, the API route (`POST /api/admin/update-signature-date`) processes each employee individually in a sequential loop — 2 UPDATE queries per employee (payrolls + signature_logs). With ~1600 employees, this produces ~3200 round-trips to Supabase, taking 2-5 minutes with risk of HTTP timeout.

The project already uses a PostgreSQL RPC pattern (`bulk_sign_salaries`) for bulk operations. The frontend has no existing SSE usage.

**Current code files:**

- API: `app/api/admin/update-signature-date/route.ts` (POST + GET handlers)
- Frontend: `components/admin/employee-signature-date-form.tsx`
- Parent dialog: `components/admin/UpdateSignatureDateDialog.tsx`

## Goals / Non-Goals

**Goals:**

- Reduce processing time from ~2-5 minutes to ~3-8 seconds for ~1600 employees
- Provide real-time progress feedback via SSE streaming
- Maintain best-effort error handling (continue on failure, collect errors)
- Keep random timestamp generation logic (random day within range + random hour 0-23 + random minute 0-59)
- Use existing project pattern: PostgreSQL RPC function called from API route

**Non-Goals:**

- Optimizing the bulk-sign-salary feature (separate feature, separate scope)
- Optimizing management signature date updates (only 3 records, not a bottleneck)
- Changing the GET handler of `/api/admin/update-signature-date`
- Adding transaction/rollback semantics (best-effort is acceptable per user decision)

## Decisions

### 1. PostgreSQL RPC for batch processing

**Decision**: Create `bulk_update_signature_dates()` PL/pgSQL function that accepts an array of employee IDs, generates random timestamps per employee internally, and updates `payrolls.signed_at`, `payrolls.updated_at`, and `signature_logs.signed_at`. Each employee's updates are wrapped in a PL/pgSQL `BEGIN...EXCEPTION...END` subtransaction block for per-employee atomicity.

**Rationale**: Eliminates N round-trips per batch. The DB function executes all updates locally without network latency per row. Project already uses this pattern with `bulk_sign_salaries`.

**Alternative considered**: Batch UPDATE from API using `.in()` — rejected because each employee needs an independently random timestamp, which requires either CASE WHEN SQL or individual updates. RPC keeps random generation server-side with zero round-trips.

### 2. SSE streaming for progress

**Decision**: Use `ReadableStream` + `TextEncoder` in the Next.js API route to stream SSE events. Frontend consumes via `fetch()` + `ReadableStream.getReader()`.

**Rationale**: Native browser API, no library needed. Next.js App Router supports streaming responses natively. No need for `EventSource` API since we need POST with auth headers (EventSource only supports GET).

**Alternative considered**: `EventSource` API — rejected because it only supports GET requests and cannot send custom Authorization headers.

### 3. Batch size: 200 employees per RPC call

**Decision**: Split employee IDs into batches of 200, call RPC per batch, stream progress after each batch completes.

**Rationale**: 200 is large enough to minimize RPC call overhead (8 calls for 1600 NV) while small enough to provide smooth progress updates (~12.5% per batch).

### 4. SSE event protocol

**Decision**: Use newline-delimited JSON events with `data:` prefix per SSE spec.

Event types:

- `start`: `{type, total, batches}` — initial metadata
- `batch_complete`: `{type, batch, processed, success, failed, elapsed_ms}` — per-batch progress
- `error`: `{type, batch, message}` — RPC call failure for a specific batch (batch number included for tracking)
- `complete`: `{type, total, success, failed, duration_seconds, errors[first_10]}` — final summary (errors array limited to first 10 entries)

### 5. Frontend SSE consumption via fetch + ReadableStream

**Decision**: Use `fetch()` with streaming body reader instead of `EventSource`.

**Rationale**: `EventSource` only works with GET. We need POST with JSON body + Authorization header. The `fetch` ReadableStream API provides full control.

### 6. Error handling on SSE disconnect

**Decision**: Show inline error message + "Thử lại" (Retry) button. Retry re-runs the entire operation. The RPC function overwrites `signed_at` with new random timestamps — if the previous server-side operation is still running after disconnect, the result is last-write-wins which is acceptable for this use case. No cancellation or locking mechanism is needed.

## Risks / Trade-offs

- **[SSE not supported by old browsers]** → Mitigation: All target users are on modern Chrome/Edge. SSE via fetch ReadableStream is supported in all modern browsers.
- **[RPC function error mid-batch]** → Mitigation: Best-effort — errors collected in JSONB array, returned to API, streamed to client. Other batches continue.
- **[Supabase RPC timeout for large batches]** → Mitigation: 200 per batch keeps each RPC call fast (~1-2s). Supabase default statement timeout is 60s.
- **[No rollback if SSE disconnects mid-operation]** → Mitigation: Acceptable per user decision. Re-running overwrites `signed_at` with new random timestamps (last-write-wins, not idempotent in the strict sense, but safe for this use case).
- **[First SSE usage in project]** → Mitigation: Pattern is simple (ReadableStream + TextEncoder), well-documented, and isolated to one endpoint.
