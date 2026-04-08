## ADDED Requirements

### Requirement: SSE streaming response from API

The POST handler of `/api/admin/update-signature-date` SHALL return a streaming SSE response using `ReadableStream` and `TextEncoder`. The response SHALL have `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`, and `X-Accel-Buffering: no` headers. The `X-Accel-Buffering: no` header prevents reverse proxies (Nginx, Vercel) from buffering SSE chunks.

#### Scenario: Successful streaming of progress events

- **WHEN** admin submits an update for a month with 1600 signed employees (batch_size=200)
- **THEN** the API SHALL stream events in order: 1 `start` event, 8 `batch_complete` events, 1 `complete` event
- **THEN** each event SHALL be formatted as `data: {JSON}\n\n`

#### Scenario: Start event

- **WHEN** the stream begins
- **THEN** the first event SHALL be `{type: "start", total: <signed_count>, batches: <batch_count>}`

#### Scenario: Batch complete event

- **WHEN** a batch of 200 employees finishes processing via RPC
- **THEN** the API SHALL stream `{type: "batch_complete", batch: <n>, processed: <cumulative>, success: <cumulative_success>, failed: <cumulative_failed>, elapsed_ms: <ms_since_start>}`

#### Scenario: Complete event

- **WHEN** all batches have been processed
- **THEN** the API SHALL stream `{type: "complete", total: <total>, success: <total_success>, failed: <total_failed>, duration_seconds: <seconds>, errors: <first_10_errors>}`

#### Scenario: Authentication required

- **WHEN** the request has no valid admin token
- **THEN** the API SHALL return a 403 JSON error (not SSE)

#### Scenario: Validation errors

- **WHEN** the request fails input validation (invalid month format, missing base_date, invalid scope)
- **THEN** the API SHALL return a 400 JSON error (not SSE)

#### Scenario: No signed payrolls found

- **WHEN** the selected month has zero signed payrolls matching the scope (either all=0 or selected employees have no signed payrolls)
- **THEN** the API SHALL return a 404 JSON error `{success: false, error: "Không có bản ghi đã ký trong tháng này"}` (not SSE, preserving current contract)

#### Scenario: RPC call fails entirely for a batch

- **WHEN** a Supabase RPC call fails (timeout, connection error) for a batch
- **THEN** the API SHALL stream `{type: "error", batch: <n>, message: "RPC failed: <error_message>"}` and continue to next batch
- **THEN** no `batch_complete` event SHALL be emitted for the failed batch
- **THEN** the `complete` event SHALL include all failed batch employees in its `failed` count

### Requirement: Frontend SSE consumption with progress bar

The `EmployeeSignatureDateForm` component SHALL consume SSE events via `fetch()` + `ReadableStream.getReader()` and display a progress bar showing current/total employees, percentage, success/failed counts, and estimated time remaining. The component SHALL detect response Content-Type: if `text/event-stream`, parse as SSE stream; if `application/json`, handle as JSON response (any error: auth 403, validation 400, no-signed-payrolls 404, server error 500, or unexpected errors).

#### Scenario: Progress bar during processing

- **WHEN** the SSE stream is active
- **THEN** the component SHALL display: animated progress bar (percentage), "X / Y nhân viên" count, success count (green), failed count (red), estimated time remaining

#### Scenario: Processing complete with all success

- **WHEN** the `complete` event arrives with failed=0
- **THEN** the component SHALL display a green success alert with total count and duration

#### Scenario: Processing complete with some failures

- **WHEN** the `complete` event arrives with failed > 0
- **THEN** the component SHALL display a success alert with counts AND an orange warning showing the number of failures

#### Scenario: SSE connection lost mid-stream

- **WHEN** the fetch stream encounters a network error or is aborted
- **THEN** the component SHALL display an error message "Kết nối bị gián đoạn" with a "Thử lại" retry button
- **THEN** clicking retry SHALL re-submit the entire operation

#### Scenario: Server detects client disconnect

- **WHEN** the SSE client disconnects mid-stream (e.g., browser tab closed, network lost)
- **THEN** the server SHALL stop processing remaining batches by checking the request signal/stream state before each batch
- **THEN** already-processed batches remain committed (best-effort, no rollback)
- **NOTE**: Retry generates new random timestamps. If the previous server-side operation is still running, the last write wins. This is acceptable per design decision — no cancellation or locking mechanism is required.

#### Scenario: Idle state (no processing)

- **WHEN** no update is in progress
- **THEN** the progress bar SHALL NOT be visible; only the date inputs and submit button SHALL be shown
