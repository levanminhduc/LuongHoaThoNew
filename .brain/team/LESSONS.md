# Lessons & upgrade proposals

<!-- Do /retro quản lý. Bạn chỉ cần đổi Status của đề xuất: PROPOSED → APPROVED hoặc REJECTED, rồi chạy /retro apply. -->

Reviewed runs: F-012, F-013

## Lessons

<!-- Mỗi bài học một dòng. Cause: agent-prompt | tagging | spec-quality | project-knowledge | verifier-miss | one-off
     ví dụ: | L-001 | implementer không chạy lint trước khi báo DONE | agent-prompt | implementer | F-012 S1, F-014 S3 | 2 | -->

| ID    | Lesson                                                                                                                                                                                                                                                                                                      | Cause             | Agent / file                          | Evidence                 | Count |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------- | ------------------------ | ----- |
| L-001 | Lệnh Verification của spec chỉ chạy suite mới của feature; suite cũ phủ module bị sửa (parity của repository) không chạy → blocker vòng verify 1                                                                                                                                                            | project-knowledge | feature.md (Verification) · KNOWLEDGE | F-012 S3/B1              | 1     |
| L-002 | Spec mô tả kiểm quyền theo role dạng chặn một role (`nhan_vien → 403`) thay vì allow-list; tester và implementer làm đúng chữ nên lỗ hổng lọt tới verifier                                                                                                                                                  | spec-quality      | feature.md · DECISIONS D-013          | F-012 S6/B2              | 1     |
| L-003 | Lệnh `rg` trong "Done when"/Verification không cùng phạm vi với tiêu chí nghiệm thu nó chứng minh: quá rộng (F-012 S4 khớp nhầm component example → amend) hoặc quá hẹp (F-013 S2: AC nói `scripts/` và README nhưng Done when chỉ liệt kê 2 dòng README, rg `admin123` không quét README → blocker vòng 1) | spec-quality      | feature.md (Plan · Done when)         | F-012 S4, F-013 S2/R1-B1 | 2     |
| L-004 | Spec ghi lệnh test sai (`npm test -- --testPathPattern`) và chữ ký hàm chưa khớp → tester phải amend ở S1                                                                                                                                                                                                   | project-knowledge | KNOWLEDGE (đã ghi)                    | F-012 S1                 | 1     |
| L-005 | Gọi lại verifier bằng SendMessage cho vòng 2 → hand-back thứ hai bị harness từ chối, mất báo cáo; chạy verifier mới mỗi vòng thì ổn (F-013 r2 chạy mới: ổn)                                                                                                                                                 | one-off           | (orchestrator)                        | F-012 verify r2          | 1     |
| L-006 | Spec ghi khối tự kiểm migration bằng `ASSERT`, nhưng `ASSERT` im lặng khi `plpgsql.check_asserts = off` → amend sang `RAISE EXCEPTION`                                                                                                                                                                      | project-knowledge | KNOWLEDGE (đã ghi)                    | F-013 S3                 | 1     |
| L-007 | Prompt sửa blocker của orchestrator đọc cho implementer-high câu "không có policy nào" chưa kiểm với DB/repo → README sai, verifier r2 bắt (N1)                                                                                                                                                             | one-off           | (orchestrator)                        | F-013 R1 fix / N1        | 1     |

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

### P-001 Lệnh kiểm của mỗi bước phải cùng phạm vi với tiêu chí nghiệm thu

Status: APPLIED (2026-11-15)
From: L-003 (F-012 S4, F-013 S2/R1-B1)
Target: ~/.claude/commands/feature.md → mục "3. Write the spec", ngay sau dòng "Each step fits one agent in one pass … checkable \"Done when\"." (file global — ảnh hưởng mọi repo; bài học không riêng repo này)
Change: + " - A `rg`/grep check in \"Done when\" or Verification covers exactly the paths named by the acceptance criterion it proves — no narrower, no wider. Write the criterion number next to the check."
Expected: hết blocker/amend do lệnh kiểm lệch phạm vi AC ở vòng verify 1
Watch: SCORECARD orchestrator [opus] "Verifier blockers" loại (spec) (baseline 2 sau 2 run, 0.5/step) và "Runs PASS at verify round 1" (baseline 0 / 2)
