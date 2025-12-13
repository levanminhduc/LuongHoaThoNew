# Hướng Dẫn Sử Dụng UX Components

Tài liệu này hướng dẫn cách sử dụng các components UX mới được thêm vào hệ thống.

## 1. Skeleton Loading States

### Components có sẵn:

- `TableSkeleton`: Loading state cho bảng dữ liệu
- `CardSkeleton`: Loading state cho card
- `FormSkeleton`: Loading state cho form
- `DashboardCardsSkeleton`: Loading state cho dashboard cards
- `PayrollTableSkeleton`: Loading state đặc biệt cho bảng lương
- `EmployeeListSkeleton`: Loading state cho danh sách nhân viên
- `ImportProgressSkeleton`: Loading state cho import progress

### Cách sử dụng:

```tsx
import {
  TableSkeleton,
  DashboardCardsSkeleton,
} from "@/components/ui/skeleton-patterns";

function MyComponent() {
  const [loading, setLoading] = useState(true);

  if (loading) {
    return <TableSkeleton rows={5} columns={6} />;
  }

  return <MyTable data={data} />;
}
```

## 2. Toast Notifications (Sonner)

### Functions có sẵn:

- `showSuccessToast(message, options)`: Hiển thị toast thành công
- `showErrorToast(message, options)`: Hiển thị toast lỗi
- `showWarningToast(message, options)`: Hiển thị toast cảnh báo
- `showInfoToast(message, options)`: Hiển thị toast thông tin
- `showLoadingToast(message, options)`: Hiển thị toast loading
- `showPromiseToast(promise, messages)`: Toast cho async operations

### Special toasts:

- `showImportSuccessToast(successCount, totalRecords, options)`
- `showImportErrorToast(errorCount, totalRecords, options)`
- `showSignatureSuccessToast(employeeName)`
- `showBulkSignatureSuccessToast(signedCount, totalCount, options)`
- `showDeleteSuccessToast(itemName, itemType)`
- `showUpdateSuccessToast(itemName)`
- `showNetworkErrorToast()`
- `showAuthErrorToast()`

### Cách sử dụng:

```tsx
import { showSuccessToast, showErrorToast } from "@/lib/toast-utils";

async function handleSubmit() {
  try {
    await submitData();
    showSuccessToast("Lưu thành công!", {
      description: "Dữ liệu đã được cập nhật",
      action: {
        label: "Xem",
        onClick: () => router.push("/view"),
      },
    });
  } catch (error) {
    showErrorToast("Lưu thất bại", {
      description: error.message,
    });
  }
}
```

## 3. Async Action Hooks

### useAsyncAction Hook

Hook để xử lý async operations với loading state và toast tự động.

```tsx
import { useAsyncAction } from "@/lib/hooks/use-async-action";

function MyComponent() {
  const { execute, loading, error, data } = useAsyncAction(
    async (id: string) => {
      const response = await fetch(`/api/data/${id}`);
      return response.json();
    },
    {
      successMessage: "Tải dữ liệu thành công!",
      errorMessage: (error) => `Lỗi: ${error.message}`,
      showToast: true,
      onSuccess: (data) => {
        console.log("Success:", data);
      },
    },
  );

  return (
    <Button onClick={() => execute("123")} disabled={loading}>
      {loading ? "Đang tải..." : "Tải dữ liệu"}
    </Button>
  );
}
```

### useMutation Hook

Hook đặc biệt cho mutations (create, update, delete).

```tsx
import { useMutation } from "@/lib/hooks/use-async-action";

function MyComponent() {
  const deleteMutation = useMutation(
    async (id: string) => {
      await fetch(`/api/delete/${id}`, { method: "DELETE" });
    },
    {
      successMessage: "Xóa thành công!",
      errorMessage: "Xóa thất bại",
      showToast: true,
      showLoadingToast: true,
      loadingMessage: "Đang xóa...",
    },
  );

  return (
    <Button
      onClick={() => deleteMutation.mutate("123")}
      disabled={deleteMutation.isLoading}
    >
      Xóa
    </Button>
  );
}
```

## 4. Alert Dialogs

### Components có sẵn:

- `DeleteAlertDialog`: Dialog xác nhận xóa
- `LogoutAlertDialog`: Dialog xác nhận đăng xuất
- `ConfirmAlertDialog`: Dialog xác nhận chung

### Cách sử dụng:

```tsx
import { DeleteAlertDialog } from "@/components/ui/alert-dialogs";

function MyComponent() {
  const [showDialog, setShowDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteItem();
      setShowDialog(false);
      showSuccessToast("Xóa thành công");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Button onClick={() => setShowDialog(true)}>Xóa</Button>

      <DeleteAlertDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        onConfirm={handleDelete}
        itemName="Nhân viên NV001"
        loading={deleting}
      />
    </>
  );
}
```

## 5. Import/Export Widgets

### ImportProgress Component

Hiển thị tiến trình import với progress bar.

```tsx
import { ImportProgress } from "@/components/ui/import-export-widgets";

<ImportProgress
  fileName="salary_data.xlsx"
  progress={65}
  currentRecord={650}
  totalRecords={1000}
  status="importing"
  message="Đang import dữ liệu lương..."
/>;
```

### ImportResultSummary Component

Hiển thị tóm tắt kết quả import.

```tsx
import { ImportResultSummary } from "@/components/ui/import-export-widgets";

<ImportResultSummary
  totalRecords={1000}
  successCount={950}
  errorCount={30}
  skippedCount={20}
  processingTime="2m 34s"
  onViewErrors={() => setShowErrorModal(true)}
/>;
```

### FilePreview Component

Hiển thị preview của file trước khi import.

```tsx
import { FilePreview } from "@/components/ui/import-export-widgets";

<FilePreview
  fileName="payroll_january_2024.xlsx"
  fileSize={245678}
  fileType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  rowCount={1000}
  columnCount={39}
  previewData={previewRows}
  onRemove={() => setSelectedFile(null)}
/>;
```

## Demo Page

Xem ví dụ đầy đủ tại: `/examples/ux-components`

Trang demo này chứa tất cả các components và cách sử dụng chúng.
