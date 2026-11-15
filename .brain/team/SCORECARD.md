# Agent scorecard

<!-- /go cập nhật nhẹ sau mỗi lần chạy; /retro rà lại. Số cộng dồn qua mọi việc (F- và B-). -->

Runs counted: 2 Last update: 2026-11-15

| Agent                     | Model·effort  | Steps | Done first try | Escalated away | Verifier blockers | Blockers / step | PLAN_ISSUE (valid/invalid) |
| ------------------------- | ------------- | ----- | -------------- | -------------- | ----------------- | --------------- | -------------------------- |
| chore                     | haiku·low     | 0     | 0              | 0              | 0                 | —               | —                          |
| tester                    | sonnet·medium | 2     | 2              | 0              | 0                 | 0               | —                          |
| implementer               | sonnet·medium | 7     | 7              | 0              | 1                 | 0.14            | 1/0                        |
| implementer-high          | sonnet·high   | 2     | 2              | 0              | 0                 | 0               | —                          |
| doc-writer                | sonnet·medium | 0     | 0              | 0              | 0                 | —               | —                          |
| orchestrator [opus] steps | session       | 4     | 4              | —              | 2 (spec)          | 0.5             | —                          |

| Team metric                                   | Value |
| --------------------------------------------- | ----- |
| Runs PASS at verify round 1                   | 0 / 2 |
| Avg verify rounds                             | 2     |
| Runs STOPPED / FAIL                           | 0     |
| Bugs traced back to a DONE feature (/fix ghi) | 0     |
| debugger: reproduced / asked                  | 0 / 0 |

## History (mỗi run một dòng)

| Run   | Result | Verify rounds | Escalations                              | Notes                                                                     |
| ----- | ------ | ------------- | ---------------------------------------- | ------------------------------------------------------------------------- |
| F-012 | PASS   | 2             | 2 (verify r1 → tester, implementer-high) | 2 blocker vòng 1: suite parity ngoài lệnh Verification; deny-list do spec |
| F-013 | PASS   | 2             | 1 (verify r1 → implementer-high)         | 1 blocker vòng 1: Done when S2 không phủ README theo AC (spec)            |
