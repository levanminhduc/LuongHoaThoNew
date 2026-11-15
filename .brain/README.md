# .brain — bộ não của repo

Thư mục này là trí nhớ dùng chung của người và các agent Claude Code làm việc trên repo. Hãy commit nó cùng với code.

| File           | Trả lời câu hỏi                                                            | Ai ghi                                              |
| -------------- | -------------------------------------------------------------------------- | --------------------------------------------------- |
| `SYSTEM.md`    | Hệ thống hiện có gì? (module, API, dữ liệu, sự kiện, component dùng chung) | `/brain-init`, `/go` khi đóng việc, `/sync`         |
| `REGISTRY.md`  | Đã và đang làm những gì? Việc nào chạm contract nào?                       | `/feature`, `/fix`, `/go`, `/sync`                  |
| `DECISIONS.md` | Vì sao hệ thống như hiện tại?                                              | orchestrator, khi một quyết định đáng nhớ được chốt |
| `KNOWLEDGE.md` | Repo này có bẫy gì, chạy thế nào?                                          | orchestrator, từ dòng LEARNED của các agent         |
| `BACKLOG.md`   | Thấy rồi nhưng chưa làm gì?                                                | orchestrator, từ NOTICED và NITS; bạn               |
| `features/`    | Spec và kế hoạch của từng tính năng (F-XXX)                                | `/feature`                                          |
| `bugs/`        | Hồ sơ từng bug: triệu chứng, nguyên nhân gốc, cách sửa (B-XXX)             | `/fix`                                              |
| `reports/`     | Nhật ký từng lần chạy: ai làm bước nào, kết quả kiểm tra                   | `/go`                                               |
| `team/`        | Điểm của từng agent, bài học, lịch sử nâng cấp agent                       | `/go`, `/retro`                                     |

Quy ước:

- Mỗi sự thật chỉ nằm ở một file. Bản đồ ở SYSTEM, lý do ở DECISIONS, mẹo ở KNOWLEDGE, quy ước code ở `CLAUDE.md`.
- Chỉ phiên chính (orchestrator) được ghi vào đây. Các agent con báo cáo lại, orchestrator chọn lọc rồi ghi.
- Giữ ngắn. SYSTEM và KNOWLEDGE được đọc thường xuyên, mỗi dòng thừa đều tốn context.
- Bạn sửa tay được mọi file. Sau khi sửa code ngoài luồng, chạy `/sync` để bản đồ khớp lại.
