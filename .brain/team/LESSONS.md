# Lessons & upgrade proposals

<!-- Do /retro quản lý. Bạn chỉ cần đổi Status của đề xuất: PROPOSED → APPROVED hoặc REJECTED, rồi chạy /retro apply. -->

Reviewed runs: F-012

## Lessons

<!-- Mỗi bài học một dòng. Cause: agent-prompt | tagging | spec-quality | project-knowledge | verifier-miss | one-off
     ví dụ: | L-001 | implementer không chạy lint trước khi báo DONE | agent-prompt | implementer | F-012 S1, F-014 S3 | 2 | -->

| ID  | Lesson | Cause | Agent / file | Evidence | Count |
| --- | ------ | ----- | ------------ | -------- | ----- |
| L-001 | Lệnh Verification của spec chỉ chạy suite mới của feature; suite cũ phủ module bị sửa (parity của repository) không chạy → blocker vòng verify 1 | project-knowledge | feature.md (Verification) · KNOWLEDGE | F-012 S3/B1 | 1 |
| L-002 | Spec mô tả kiểm quyền theo role dạng chặn một role (`nhan_vien → 403`) thay vì allow-list; tester và implementer làm đúng chữ nên lỗ hổng lọt tới verifier | spec-quality | feature.md · DECISIONS D-013 | F-012 S6/B2 | 1 |
| L-003 | "Done when" dùng `rg` quét cả thư mục khớp nhầm file không liên quan (component example) → amend giữa chừng | spec-quality | feature.md (Done when) | F-012 S4 | 1 |
| L-004 | Spec ghi lệnh test sai (`npm test -- --testPathPattern`) và chữ ký hàm chưa khớp → tester phải amend ở S1 | project-knowledge | KNOWLEDGE (đã ghi) | F-012 S1 | 1 |
| L-005 | Gọi lại verifier bằng SendMessage cho vòng 2 → hand-back thứ hai bị harness từ chối, mất báo cáo; chạy verifier mới mỗi vòng thì ổn | one-off | (orchestrator) | F-012 verify r2 | 1 |

## Proposals

<!-- ví dụ:
### P-001 implementer chạy lint trước khi báo DONE
Status: PROPOSED
From: L-001
Target: .claude/agents/implementer.md → ## Learned rules
Change: + "Before reporting DONE, run the project's Lint command on the files you changed and fix what it reports."
Expected: giảm blocker loại lint ở vòng verify 1
Watch: SCORECARD implementer "Blockers / step" (baseline 0.6)
-->
