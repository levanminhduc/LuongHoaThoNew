# Run report — <ID> <Title>

Spec: ../features/F-XXX-<slug>.md | ../bugs/B-XXX-<slug>.md
Mode: auto | step
Started: <YYYY-MM-DD HH:mm> Finished: <YYYY-MM-DD HH:mm | in progress>
Base: <commit sha lúc bắt đầu> Dirty at start: <file đã sửa dở từ trước | none>
Result: IN_PROGRESS | PASS | FAIL | STOPPED (<reason>)

## Summary

<!-- Orchestrator viết khi kết thúc: 3–5 dòng cho người đọc lướt -->

## Steps

<!-- Status: PENDING · RUNNING → kết thúc là DONE · SKIPPED · FAILED · PLAN_ISSUE (leo thang ghi ở bảng Escalations)
     ví dụ: | S1 | Acceptance tests | tester (sonnet) | DONE | 2 | 5 test fail đúng như mong đợi | | -->

| Step | Title | Agent (model) | Status | Files changed | Check | Note |
| ---- | ----- | ------------- | ------ | ------------- | ----- | ---- |

## Step log

<!-- Thêm một khối ngay khi xong mỗi bước. Đây là nhật ký để xem lại và để chạy tiếp khi bị ngắt.
### S1 — <HH:mm> — tester (sonnet) — DONE
- Files: path/a.test.ts
- Check: `<cmd>` → 5 failing as expected
- Notes: PLAN_ISSUE, sửa đổi kế hoạch, quyết định của orchestrator (nếu có)
-->

## Verification

<!-- ví dụ: | 1 | test ✅ lint ❌ (2) | FAIL | 3 |   — ghi "skipped: small fix" ở cột Verifier nếu bỏ qua theo chính sách -->

| Round | Runner (haiku) | Verifier (opus) | Blockers |
| ----- | -------------- | --------------- | -------- |

### Blockers & how they were fixed

<!-- - R1 [S2] path:line — vấn đề → sửa ở R2 bởi implementer-high -->

## Escalations

<!-- ví dụ: | S3 | chore → implementer | NEEDS_SONNET: check failed | -->

| Step | Ladder | Reason |
| ---- | ------ | ------ |

## Learned & noticed

<!-- Gom từ dòng LEARNED / NOTICED / NITS của các agent. Đánh dấu mục nào đã chép sang KNOWLEDGE.md hoặc BACKLOG.md. -->

## Retro notes

<!-- /go ghi nhanh nguyên nhân dự đoán cho mỗi lần leo thang, blocker, PLAN_ISSUE; /retro dùng để rút bài học.
     ví dụ: - S3 escalation — tagging: bước có logic định dạng ngày, không nên gắn [haiku] -->

## Cost check

<!-- /go điền dòng Steps. Dòng Usage do BẠN điền nếu muốn so sánh: gõ /usage trước và sau khi chạy (model không tự chạy được /usage). -->

- Steps by agent: haiku N · sonnet N · orchestrator N
- Usage (tuỳ chọn, bạn điền): before ... after ...

## Contract changes

<!-- từ CONTRACT DIFF của verifier. ví dụ: - + GET /reports?from&to -->

## Brain updates

<!-- ví dụ: - REGISTRY: F-012 → DONE · SYSTEM: APIs, Data · DECISIONS: D-004 · KNOWLEDGE: +1 · BACKLOG: +2 -->

## Open items
