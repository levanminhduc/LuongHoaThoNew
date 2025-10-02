# TYPESCRIPT INTERFACE UPDATES - TIEN_TANG_CA_VUOT

## Cần cập nhật các file TypeScript sau khi thêm cột `tien_tang_ca_vuot`:

### 1. **types/payroll.ts** (nếu có)

```typescript
export interface PayrollRecord {
  // ... existing fields ...
  tien_tang_ca_vuot?: number | null;
  // ... other fields ...
}
```

### 2. **Supabase Database Types** (nếu có generated types)

```typescript
export interface Database {
  public: {
    Tables: {
      payrolls: {
        Row: {
          // ... existing fields ...
          tien_tang_ca_vuot: number | null;
          // ... other fields ...
        };
        Insert: {
          // ... existing fields ...
          tien_tang_ca_vuot?: number | null;
          // ... other fields ...
        };
        Update: {
          // ... existing fields ...
          tien_tang_ca_vuot?: number | null;
          // ... other fields ...
        };
      };
    };
  };
}
```

### 3. **Component Props** (nếu có specific payroll components)

```typescript
interface PayrollDisplayProps {
  // ... existing fields ...
  tien_tang_ca_vuot?: number;
  // ... other fields ...
}
```

## Lưu ý:

- Cột đã được thêm vào `DEFAULT_FIELD_HEADERS` trong `lib/utils/header-mapping.ts`
- Import/Export sẽ tự động support cột mới
- Preview table sẽ tự động hiển thị cột mới
- Không cần thay đổi API routes vì đã dùng dynamic field mapping
