# B-XXX <Title>

Status: DRAFT <!-- DRAFT → APPROVED → IN_PROGRESS → DONE. Fix nhỏ được tự duyệt theo bảng Autonomy trong CLAUDE.md -->
Size: small | large <!-- small = sửa tối đa 2 file code, không đụng contract, Risk normal -->
Risk: normal | high
Session model: opus <!-- fable nếu việc sửa là migration, sửa dữ liệu hoặc đổi kiến trúc -->
Hotfix: no <!-- yes = khẩn cấp: sửa trước, viết test ngay sau -->
Introduced by: F-XXX | legacy | unknown <!-- commit sha nếu tìm được -->

## 1. Symptom

Điều quan sát được: ở đâu, với ai, từ khi nào. Thông báo lỗi hoặc log nguyên văn (rút gọn).
Mong đợi: ... Thực tế: ...

## 2. Reproduction

Lệnh hoặc test tái hiện (đang FAIL): ...

## 3. Root cause

Nguyên nhân gốc, không phải triệu chứng, kèm bằng chứng path:line.
Vùng ảnh hưởng: các chỗ khác dính cùng nguyên nhân.
Vì sao trước đây không bắt được: ...

## 4. Contracts

<!-- Thường là "Không đổi". Nếu phải sửa contract: ghi dòng contract với dấu ngã kèm việc đang sở hữu, và Size = large -->

Không đổi.

## 5. Plan

<!-- Tag và hậu tố giống spec tính năng: [haiku] [sonnet] [opus] · (test) · (doc) -->

### S1 [sonnet] (test) Regression test tái hiện bug <!-- không có khung test: bỏ bước này, dùng lệnh tái hiện ở mục 2 -->

Files: ...
Do: test khẳng định đúng hành vi mong đợi ở mục 1.
Done when: test FAIL với đúng triệu chứng đã báo.

### S2 [sonnet] Sửa nguyên nhân gốc

Files: ...
Do: ...
Done when: test ở S1 PASS mà không sửa test; các chỗ trong vùng ảnh hưởng đã được xử lý.

### S_last [opus] Update brain

Orchestrator đóng hồ sơ, cập nhật REGISTRY và các file trí nhớ.

## 6. Verification

- Commands: test / lint / typecheck / build
- Cần xác nhận: sửa đúng nguyên nhân gốc; test hồi quy fail trước và pass sau.

## 7. Lesson

<!-- Điền khi đóng. Bẫy gì đáng nhớ → KNOWLEDGE.md. Vì sao lọt qua kiểm tra → Retro note trong báo cáo. -->
