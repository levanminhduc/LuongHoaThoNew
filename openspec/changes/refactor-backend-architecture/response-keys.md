# Đối chiếu key JSON trước/sau khi bỏ `select("*")` (task 14.18)

Nhóm 14 đổi chuỗi select ở 13 chỗ. Nhưng **đổi select chỉ đổi được response khi route trả bản ghi nguyên vẹn ra ngoài**. Chỗ nào route tự dựng object, hoặc kết quả chỉ dùng nội bộ, hoặc đầu ra là file XLSX thì key JSON không thể đổi.

Phân loại trước, rồi mới soi chỗ có rủi ro thật.

## Không thể đổi key — 10 chỗ

| Chỗ đổi                                                           | Vì sao không đổi được response                                                                                                      |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `admin/update-management-signature-date`                          | Chỉ đọc `existing.id` để `.eq()`; response là `{ success, message }`                                                                |
| `management-signature` (POST)                                     | Route tự dựng `existing_signature: { signed_by_id, signed_by_name, signed_at, department }` — 4 key cố định trong code              |
| `signature-status/[month]`                                        | Route tự dựng object 7 key cho từng loại chữ ký                                                                                     |
| `admin/payroll-export` (chữ ký)                                   | Đầu ra là file XLSX                                                                                                                 |
| `admin/bulk-payroll-export` (chữ ký)                              | XLSX                                                                                                                                |
| `admin/attendance-export` (2 chỗ)                                 | XLSX                                                                                                                                |
| `admin/sync-template`                                             | XLSX                                                                                                                                |
| `admin/payroll/[id]` (PUT)                                        | `findPayrollById` chỉ dùng để tính diff audit; response trả `updatedData` từ truy vấn `.update().select()` **khác**, không đụng tới |
| `lib/auth.ts`, `lib/bonus/*`, `lib/management-signature-utils.ts` | Hàm nội bộ, không phải HTTP endpoint                                                                                                |
| `employee/change-password`                                        | Bản ghi dùng để so hash; response là thông báo                                                                                      |

## Có thể đổi key — 3 chỗ, đã đối chiếu từng cái

Cả ba đều trả mảng/object bản ghi thẳng ra client. Với mỗi cái, danh sách "sau" **bằng đúng một type đã khai sẵn trong repo mà client đang dùng** — nên đây không phải là tôi chọn cột, mà là làm cho truy vấn khớp với hợp đồng vốn có.

### 1. `GET /api/admin/column-aliases/[id]` → `data: alias`

- **Trước**: mọi cột của bảng `column_aliases`.
- **Sau**: 9 key — `id, database_field, alias_name, confidence_score, is_active, created_by, created_at, updated_at, config_id`.
- **Căn cứ**: response khai kiểu `ApiResponse<ColumnAlias>`; `interface ColumnAlias` (`lib/column-alias-config.ts:6-16`) có đúng 9 field này.
- **Rủi ro còn lại**: nếu bảng có cột ngoài 9 field đó **và** có client ngoài repo đọc nó. Trong repo thì `lib/hooks/use-column-mapping.ts` đi qua `ApiResponse<ColumnAlias>`, không chạm cột nào khác.

### 2. `GET /api/signature-history` → `signatures[]`

- **Trước**: mọi cột của `management_signatures`, gồm cả `payroll_type` (route có `.eq("payroll_type", ...)` nên chắc chắn cột này tồn tại).
- **Sau**: 11 key = `MANAGEMENT_SIGNATURE_SELECT` — `id, signature_type, salary_month, signed_by_id, signed_by_name, department, signed_at, ip_address, device_info, notes, is_active`.
- **Căn cứ, hai nguồn độc lập**:
  1. Nhánh fallback ngay trong route (khi bảng chưa tồn tại) trả dữ liệu mock liệt kê **đúng 11 field này** — người viết trước đã ghi ra hợp đồng.
  2. Hook client `useSignatureHistoryQuery` (`lib/hooks/use-dashboard.ts:243`) khai `signatures: SignatureRecord[]`, và `SignatureRecord` đó **chính là** interface ở `lib/management-signature-utils.ts:19` — cùng 11 field.
- **Key mất đi**: `payroll_type`. Không nằm trong type client, không nằm trong mock. `grep payroll_type` ở `lib/hooks/` và `components/` không có hit nào liên quan lịch sử ký.

### 3. `GET /api/admin/payroll/audit/[id]` → `auditData[]`

- **Trước**: mọi cột của `payroll_audit_logs`.
- **Sau**: 9 key — `id, employee_id, field_name, old_value, new_value, changed_by, changed_at, change_reason, change_ip`.
- **Căn cứ**: `interface AuditLog` khai ở dòng 19-28 của **chính route đó**, cộng `employee_id` mà nhánh summary dùng để đếm `uniqueEmployees`.

## Chỗ cố ý chưa đổi

| Chỗ                                             | Lý do                                                                                                                                                                                                                             |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `admin/payroll-export:145`                      | Select tường minh làm `tsc` lộ ra hai nhánh của route có hình dạng khác nhau (`employees` là embed PostgREST ở nhánh chính, object ghép tay ở nhánh fallback). Xem task 14.4 — việc cần làm trước là cho hai nhánh cùng hình dạng |
| `payroll-repository:92` (`/api/admin/payrolls`) | Endpoint **không có caller nào**. Xem task 14.3 — chờ quyết định xoá hay giữ                                                                                                                                                      |

## Cách kiểm lại nếu nghi ngờ

Ba endpoint ở mục trên là nơi duy nhất cần soi. Gọi thử từng cái trên bản trước và bản sau rồi so key:

```bash
curl -s -H "Authorization: Bearer $TOKEN" "$HOST/api/signature-history?limit=1" \
  | jq -S '.signatures[0] | keys'
```

Diff rỗng ở 2 endpoint đầu; ở `signature-history` phải thấy đúng một dòng mất đi là `payroll_type`.
