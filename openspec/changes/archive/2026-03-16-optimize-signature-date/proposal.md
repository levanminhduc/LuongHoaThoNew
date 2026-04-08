## Why

The "Update Employee Signature Date" feature on the admin/bulk-signature page currently executes ~3200 sequential database queries when processing ~1600 employees (2 individual UPDATE queries per employee). This results in 2-5 minute processing times, risk of HTTP timeouts, no progress feedback to the admin, and no transaction safety. The feature needs optimization to handle the full employee count efficiently.

## What Changes

- Add a new PostgreSQL function `bulk_update_signature_dates()` that processes batch updates internally within the database, generating random timestamps per employee and updating both `payrolls` and `signature_logs` tables. The API calls this RPC in batches of 200 employees per call
- Modify the `POST /api/admin/update-signature-date` API route to use SSE (Server-Sent Events) streaming, calling the RPC function in batches of 200 employees and streaming progress events to the client
- Modify the `EmployeeSignatureDateForm` frontend component to consume SSE events and display a real-time progress bar with success/failure counts
- Add SSE connection error handling with a retry button

## Capabilities

### New Capabilities

- `batch-signature-date-update`: PostgreSQL RPC function for bulk updating signature dates with random timestamp generation, processing employees in batches with best-effort error handling
- `sse-progress-streaming`: SSE streaming response from the API route with progress events (start, batch_complete, error, complete) and frontend progress bar consumption

### Modified Capabilities

## Impact

- **Database**: New migration script for `bulk_update_signature_dates()` PostgreSQL function
- **API**: `app/api/admin/update-signature-date/route.ts` — POST handler rewritten to use SSE streaming + RPC batches (GET handler unchanged)
- **Frontend**: `components/admin/employee-signature-date-form.tsx` — new progress bar UI, SSE event parsing, retry-on-disconnect logic
- **Performance**: Expected improvement from ~2-5 minutes to ~3-8 seconds for ~1600 employees
- **No breaking changes**: GET endpoint and management signature features remain unchanged. POST endpoint preserves existing JSON error contracts (403 auth, 400 validation, 404 no-signed-payrolls) — only successful processing switches from JSON to SSE streaming
