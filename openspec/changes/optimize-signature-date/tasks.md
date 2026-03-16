## 1. Database Migration

- [x] 1.1 Create SQL migration script `scripts/supabase-setup/31-bulk-update-signature-dates-function.sql` with PL/pgSQL function `bulk_update_signature_dates(p_employee_ids VARCHAR[], p_salary_month VARCHAR, p_base_date DATE, p_random_range_days INT, p_is_t13 BOOLEAN)` that: generates independently random timestamp per employee, updates `payrolls.signed_at`, `payrolls.updated_at` (Vietnam timestamp), and `signature_logs.signed_at`, uses `BEGIN...EXCEPTION...END` subtransaction per employee for cross-table atomicity, filters by payroll_type and is_signed=true, checks BOTH payrolls AND signature_logs row count after UPDATE (0 rows = error for either), returns JSONB with success_count/error_count/errors ← (verify: function handles empty array, t13 filtering accepts YYYY-13 and YYYY-T13, monthly filtering, subtransaction rollback on partial failure, updated_at uses Vietnam time, both tables 0-row detection)

## 2. API Route — SSE Streaming

- [x] 2.1 Modify `app/api/admin/update-signature-date/route.ts` POST handler: add Zod validation schema for request body (salary_month, base_date, random_range_days, scope, employee_ids, is_t13) following project's `lib/validations/` pattern. Keep auth check (403 JSON), validation (400 JSON), no-signed-payrolls (404 JSON) returning normal JSON responses. After validation, fetch signed employee IDs (respecting scope=all/selected), split into batches of 200, create SSE streaming response using `ReadableStream` + `TextEncoder` with headers including `X-Accel-Buffering: no`, call `bulk_update_signature_dates` RPC per batch, check `request.signal.aborted` before each batch to stop on client disconnect, stream `start`/`batch_complete`/`error`/`complete` events. If RPC call fails entirely for a batch, stream `error` event and continue. Keep GET handler unchanged. ← (verify: SSE headers correct including X-Accel-Buffering, Zod schema validates input, event format matches spec, auth/validation still returns JSON not SSE, no-signed-payrolls returns 404 JSON preserving current contract, batch_complete events have cumulative counts, error events streamed for failed RPC calls, client disconnect stops remaining batches)

## 3. Frontend — Progress Bar UI

- [x] 3.1 Modify `components/admin/employee-signature-date-form.tsx`: add progress state (isStreaming, current, total, successCount, failedCount, startTime), replace `fetch().then()` with `fetch()` + response Content-Type detection: if `text/event-stream` → `ReadableStream.getReader()` to parse SSE events with newline-delimited buffer; if `application/json` → handle as JSON response (any error status: 400/403/404/500). Update progress on each `batch_complete` event
- [x] 3.2 Add progress bar UI: animated bar with percentage, "X / Y nhân viên" text, green success count, red failed count, estimated time remaining. Only visible when isStreaming=true
- [x] 3.3 Add completion state UI: green success alert (all passed) or green+orange alert (some failures) showing total, duration, and error count
- [x] 3.4 Add SSE disconnect handling: catch fetch stream errors, display "Kết nối bị gián đoạn" error message with "Thử lại" retry button that re-submits the operation ← (verify: progress bar renders correctly during streaming, completion alert shows correct counts, retry button works after disconnect, component returns to idle state after closing result, JSON fallback works for auth/validation/no-signed-payrolls errors)

## 4. Quality Check

- [x] 4.1 Run `npm run format && npm run lint && npm run typecheck` and fix any errors
