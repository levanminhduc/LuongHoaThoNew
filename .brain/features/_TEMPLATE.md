# F-XXX <Title>

Status: DRAFT <!-- bạn đổi thành APPROVED để /go chạy. DOC = chỉ giữ làm tài liệu, không chạy -->
Related: <F-yyy extends | F-zzz depends on | —>
Complexity: standard | hard <!-- hard = migration, tối ưu hiệu năng, đổi kiến trúc, refactor lớn, chạy dài nhiều giờ -->
Risk: normal | high <!-- high = xác thực/phân quyền, tiền, dữ liệu cá nhân, migration dữ liệu, API công khai -->
Session model: opus | fable <!-- model để mở session khi /go; hard → fable -->

## 1. Problem & goal

Vì sao làm, "xong" trông thế nào với người dùng.

## 2. Scope

- In: ...
- Out (cố ý không làm): ...

## 3. Acceptance criteria

- Là <vai trò>, tôi muốn <hành động> để <lợi ích>
  - Given ... When ... Then ...

## 4. Contracts

<!-- Mỗi dòng ghi rõ: + mới / ~ sửa (kèm việc đang sở hữu) / = dùng lại. Agent không được vượt ra ngoài danh sách này. -->

- API: `+ GET /reports?from&to` — request/response tóm tắt
- Data: `~ orders.created_at index` (owner F-004)
- Events: `= order.paid` (consume)
- FE: `= <DateRangePicker>` (owner F-007)

## 5. Overlap check

<!-- bắt buộc; ghi "Không có" nếu đã kiểm tra và sạch -->

| Việc liên quan | Chồng ở đâu           | Quyết định              |
| -------------- | --------------------- | ----------------------- |
| F-007          | Đã có DateRangePicker | Dùng lại, không tạo mới |

## 6. Decisions

<!-- Lựa chọn có đánh đổi trong thiết kế này. Đánh dấu (durable) cho cái nào cần nhớ lâu: khi đóng việc nó được chép sang DECISIONS.md -->

- Chọn: ... vì ... Bác bỏ: ... vì ...

## 7. Plan

<!-- Tag quyết định ai làm:
  [haiku]  chore — CHỈ việc cơ học có Example: để copy VÀ có Check: bắt được lỗi
  [sonnet] implementer — logic có phạm vi rõ theo spec (mặc định cho code)
  [opus]   orchestrator tự làm — phán đoán khó: migration, concurrency, hiệu năng, bảo mật, thay đổi xuyên module
  Thêm vào tiêu đề:  (test) → tester viết test từ mục 3, trước khi có code   ·   (doc) → doc-writer -->

### S1 [sonnet] (test) Acceptance tests cho mục 3

Files: ...
Do: mỗi tiêu chí ít nhất một test, qua contract công khai.
Done when: test chạy được và FAIL vì thiếu hành vi (chưa có code).

### S2 [sonnet] <title>

Files: ...
Do: chỉ dẫn chính xác — tên, signature, edge case.
Done when: tiêu chí kiểm tra được; các test ở S1 liên quan PASS mà không sửa test.

### S3 [haiku] <title>

Files: ...
Example: path/to/existing-pattern.ts
Do: ...
Check: <lệnh build/typecheck/lint/test bắt được lỗi>

### S4 [opus] <title>

Files: ...
Do: ... (vì sao bước này cần orchestrator: ...)
Done when: ...

### S_last [opus] Update brain

Orchestrator cập nhật REGISTRY, SYSTEM và các file trí nhớ khi đóng việc.

## 8. Verification

- Commands: test / lint / typecheck / build
- Rủi ro verifier phải soi riêng: ...
