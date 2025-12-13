import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TableSkeleton,
  PayrollTableSkeleton,
  DashboardCardsSkeleton,
  FormSkeleton,
  EmployeeListSkeleton,
  ImportProgressSkeleton,
} from "@/components/ui/skeleton-patterns";
import {
  DeleteAlertDialog,
  LogoutAlertDialog,
  ConfirmAlertDialog,
} from "@/components/ui/alert-dialogs";
import {
  ImportProgress,
  ImportResultSummary,
  FilePreview,
} from "@/components/ui/import-export-widgets";
import {
  showSuccessToast,
  showErrorToast,
  showWarningToast,
  showInfoToast,
  showLoadingToast,
  showImportSuccessToast,
  showSignatureSuccessToast,
} from "@/lib/toast-utils";
import { useAsyncAction, useMutation } from "@/lib/hooks/use-async-action";
import { Loader2 } from "lucide-react";

export default function UXExamplesPage() {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);

  const deleteMutation = useMutation(
    async () => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return { success: true };
    },
    {
      successMessage: "Xóa thành công",
      errorMessage: "Xóa thất bại",
      showToast: true,
      onSuccess: () => {
        setShowDeleteDialog(false);
      },
    },
  );

  const { execute: handleAsyncAction, loading: asyncLoading } = useAsyncAction(
    async () => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return { data: "Success!" };
    },
    {
      successMessage: "Hành động thành công!",
      errorMessage: "Có lỗi xảy ra",
      showToast: true,
    },
  );

  const handleLogout = async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setShowLogoutDialog(false);
    showSuccessToast("Đã đăng xuất thành công");
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>UX Components Demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <h3 className="font-semibold">Toast Notifications</h3>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => showSuccessToast("Thao tác thành công!")}>
                Success Toast
              </Button>
              <Button
                variant="destructive"
                onClick={() => showErrorToast("Có lỗi xảy ra!")}
              >
                Error Toast
              </Button>
              <Button
                variant="outline"
                onClick={() => showWarningToast("Cảnh báo!")}
              >
                Warning Toast
              </Button>
              <Button
                variant="secondary"
                onClick={() => showInfoToast("Thông tin")}
              >
                Info Toast
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const toastId = showLoadingToast("Đang xử lý...");
                  setTimeout(() => {
                    import("sonner").then(({ toast }) => {
                      toast.dismiss(toastId);
                      showSuccessToast("Xong!");
                    });
                  }, 2000);
                }}
              >
                Loading Toast
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">Special Toasts</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() =>
                  showImportSuccessToast(95, 100, {
                    onViewDetails: () => alert("View details"),
                  })
                }
              >
                Import Success
              </Button>
              <Button onClick={() => showSignatureSuccessToast("Nguyễn Văn A")}>
                Signature Success
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">Alert Dialogs</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                Delete Dialog
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowLogoutDialog(true)}
              >
                Logout Dialog
              </Button>
              <Button onClick={() => setShowConfirmDialog(true)}>
                Confirm Dialog
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">Async Actions with Hooks</h3>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleAsyncAction} disabled={asyncLoading}>
                {asyncLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  "Execute Async Action"
                )}
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate(undefined)}
                disabled={deleteMutation.isLoading}
              >
                {deleteMutation.isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang xóa...
                  </>
                ) : (
                  "Delete with Mutation"
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">Skeleton Loading States</h3>
            <Button onClick={() => setShowSkeleton(!showSkeleton)}>
              Toggle Skeleton Demo
            </Button>
          </div>
        </CardContent>
      </Card>

      {showSkeleton && (
        <div className="space-y-8">
          <div>
            <h3 className="font-semibold mb-3">Dashboard Cards Skeleton</h3>
            <DashboardCardsSkeleton cards={4} />
          </div>

          <div>
            <h3 className="font-semibold mb-3">Table Skeleton</h3>
            <TableSkeleton rows={5} columns={6} />
          </div>

          <div>
            <h3 className="font-semibold mb-3">Form Skeleton</h3>
            <FormSkeleton fields={4} />
          </div>

          <div>
            <h3 className="font-semibold mb-3">Employee List Skeleton</h3>
            <EmployeeListSkeleton count={3} />
          </div>
        </div>
      )}

      <div>
        <h3 className="font-semibold mb-3">Import Progress Widget</h3>
        <ImportProgress
          fileName="salary_data_2024.xlsx"
          progress={65}
          currentRecord={650}
          totalRecords={1000}
          status="importing"
          message="Đang import dữ liệu lương..."
        />
      </div>

      <div>
        <h3 className="font-semibold mb-3">Import Result Summary</h3>
        <ImportResultSummary
          totalRecords={1000}
          successCount={950}
          errorCount={30}
          skippedCount={20}
          overwriteCount={10}
          processingTime="2m 34s"
          onViewErrors={() => alert("View errors")}
          onViewSuccess={() => alert("View success")}
        />
      </div>

      <div>
        <h3 className="font-semibold mb-3">File Preview</h3>
        <FilePreview
          fileName="payroll_january_2024.xlsx"
          fileSize={245678}
          fileType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          rowCount={1000}
          columnCount={39}
          previewData={[
            {
              employee_id: "NV001",
              full_name: "Nguyễn Văn A",
              salary_month: "2024-01",
              tien_luong_thuc_nhan: "15000000",
            },
            {
              employee_id: "NV002",
              full_name: "Trần Thị B",
              salary_month: "2024-01",
              tien_luong_thuc_nhan: "12000000",
            },
          ]}
          onRemove={() => alert("Remove file")}
        />
      </div>

      <DeleteAlertDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={() => deleteMutation.mutate(undefined)}
        itemName="Nhân viên NV001"
        loading={deleteMutation.isLoading}
      />

      <LogoutAlertDialog
        open={showLogoutDialog}
        onOpenChange={setShowLogoutDialog}
        onConfirm={handleLogout}
        userName="admin"
      />

      <ConfirmAlertDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        onConfirm={() => {
          showSuccessToast("Đã xác nhận!");
          setShowConfirmDialog(false);
        }}
        title="Xác nhận hành động"
        description="Bạn có chắc chắn muốn thực hiện hành động này không?"
        confirmLabel="Xác nhận"
        cancelLabel="Hủy"
        variant="warning"
      />
    </div>
  );
}
