"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Empty } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import {
  H1,
  H2,
  H3,
  H4,
  P,
  Lead,
  Large,
  Small,
  Muted,
  InlineCode,
  Blockquote,
} from "@/components/ui/typography";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  InputGroup,
  InputGroupAddon,
  inputGroupInputClassName,
} from "@/components/ui/input-group";
import {
  NativeSelect,
  NativeSelectGroup,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Field,
  FieldControl,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  Item,
  ItemAction,
  ItemContent,
  ItemDescription,
  ItemIcon,
  ItemTitle,
} from "@/components/ui/item";
import { Kbd } from "@/components/ui/kbd";
import {
  TableSkeleton,
  DashboardCardsSkeleton,
  FormSkeleton,
  EmployeeListSkeleton,
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
import {
  Loader2,
  Inbox,
  Search,
  AlertCircle,
  Settings,
  User,
  Bell,
  FileText,
} from "lucide-react";

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

      <div>
        <h3 className="font-semibold mb-3">Empty State</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-md border">
            <Empty
              icon={<Inbox />}
              title="Chưa có dữ liệu"
              description="Thêm dữ liệu để bắt đầu theo dõi quy trình."
              action={<Button>Thêm mới</Button>}
            />
          </div>
          <div className="rounded-md border">
            <Empty
              size="sm"
              icon={<Search />}
              title="Không tìm thấy"
              description="Thử lại với từ khóa khác hoặc xóa bộ lọc."
              action={
                <Button variant="outline" size="sm">
                  Đặt lại
                </Button>
              }
            />
          </div>
          <div className="rounded-md border md:col-span-2">
            <Empty
              size="lg"
              icon={<AlertCircle />}
              title="Chưa có báo cáo"
              description="Tạo báo cáo mới để theo dõi tiến độ dự án của bạn."
              action={<Button variant="secondary">Tạo báo cáo</Button>}
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3">Spinner</h3>
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <Spinner size="xs" />
            <span className="text-sm">XS</span>
          </div>
          <div className="flex items-center gap-2">
            <Spinner size="sm" />
            <span className="text-sm">SM</span>
          </div>
          <div className="flex items-center gap-2">
            <Spinner />
            <span className="text-sm">Default</span>
          </div>
          <div className="flex items-center gap-2">
            <Spinner size="lg" />
            <span className="text-sm">LG</span>
          </div>
          <div className="flex items-center gap-2">
            <Spinner size="xl" variant="muted" />
            <span className="text-sm">XL Muted</span>
          </div>
          <div className="flex items-center gap-2">
            <Spinner variant="destructive" />
            <span className="text-sm">Destructive</span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3">Typography</h3>
        <div className="space-y-4">
          <H1>Heading 1</H1>
          <H2>Heading 2</H2>
          <H3>Heading 3</H3>
          <H4>Heading 4</H4>
          <Lead>Lead text để nhấn mạnh thông điệp chính.</Lead>
          <P>
            Đoạn văn mô tả với <InlineCode>InlineCode</InlineCode> để minh họa
            đoạn mã ngắn.
          </P>
          <Large>Large text để làm nổi bật thông tin.</Large>
          <Small>Small text cho ghi chú ngắn.</Small>
          <Muted>Muted text cho thông tin phụ.</Muted>
          <Blockquote>
            Blockquote dùng cho nội dung trích dẫn hoặc thông điệp nhấn mạnh.
          </Blockquote>
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3">Button Group</h3>
        <div className="flex flex-wrap items-start gap-6">
          <ButtonGroup>
            <Button variant="outline">Tuần</Button>
            <Button variant="outline">Tháng</Button>
            <Button variant="outline">Năm</Button>
          </ButtonGroup>
          <ButtonGroup spacing="separated">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
          </ButtonGroup>
          <ButtonGroup orientation="vertical" spacing="attached">
            <Button variant="outline">Danh sách</Button>
            <Button variant="outline">Bảng</Button>
            <Button variant="outline">Biểu đồ</Button>
          </ButtonGroup>
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3">Input Group</h3>
        <div className="space-y-4 max-w-xl">
          <InputGroup>
            <InputGroupAddon>https://</InputGroupAddon>
            <input
              className={inputGroupInputClassName}
              placeholder="example.com"
            />
          </InputGroup>
          <InputGroup size="sm">
            <InputGroupAddon position="left" size="sm">
              @
            </InputGroupAddon>
            <input
              className={inputGroupInputClassName}
              placeholder="username"
            />
            <InputGroupAddon position="right" size="sm">
              .com
            </InputGroupAddon>
          </InputGroup>
          <InputGroup size="lg">
            <InputGroupAddon position="left" size="lg">
              +84
            </InputGroupAddon>
            <input
              className={inputGroupInputClassName}
              placeholder="Số điện thoại"
            />
          </InputGroup>
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3">Native Select</h3>
        <div className="space-y-3 max-w-sm">
          <NativeSelect defaultValue="monthly">
            <NativeSelectOption value="monthly">Theo tháng</NativeSelectOption>
            <NativeSelectOption value="quarterly">Theo quý</NativeSelectOption>
            <NativeSelectOption value="yearly">Theo năm</NativeSelectOption>
          </NativeSelect>
          <NativeSelect size="sm" defaultValue="active">
            <NativeSelectOption value="active">
              Đang hoạt động
            </NativeSelectOption>
            <NativeSelectOption value="paused">Tạm dừng</NativeSelectOption>
            <NativeSelectOption value="archived">Lưu trữ</NativeSelectOption>
          </NativeSelect>
          <NativeSelect variant="ghost" defaultValue="team-a">
            <NativeSelectGroup label="Tổ sản xuất">
              <NativeSelectOption value="team-a">Tổ A</NativeSelectOption>
              <NativeSelectOption value="team-b">Tổ B</NativeSelectOption>
            </NativeSelectGroup>
            <NativeSelectGroup label="Văn phòng">
              <NativeSelectOption value="office">Văn phòng</NativeSelectOption>
            </NativeSelectGroup>
          </NativeSelect>
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3">Field</h3>
        <div className="space-y-4 max-w-md">
          <Field>
            <FieldLabel required>Họ và tên</FieldLabel>
            <FieldControl>
              <Input placeholder="Nguyễn Văn A" />
            </FieldControl>
            <FieldDescription>Nhập đầy đủ họ và tên.</FieldDescription>
          </Field>
          <Field error>
            <FieldLabel>Số điện thoại</FieldLabel>
            <FieldControl>
              <Input placeholder="090xxxxxxx" />
            </FieldControl>
            <FieldError>Số điện thoại không hợp lệ.</FieldError>
          </Field>
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3">Item</h3>
        <div className="space-y-2 max-w-lg">
          <Item interactive variant="outline">
            <ItemIcon>
              <User />
            </ItemIcon>
            <ItemContent>
              <ItemTitle>Nguyễn Văn A</ItemTitle>
              <ItemDescription>Ký tháng 01/2024</ItemDescription>
            </ItemContent>
            <ItemAction>
              <Button variant="outline" size="sm">
                Xem
              </Button>
            </ItemAction>
          </Item>
          <Item variant="filled">
            <ItemIcon>
              <FileText />
            </ItemIcon>
            <ItemContent>
              <ItemTitle>Bảng lương tháng 02</ItemTitle>
              <ItemDescription>Đã chốt, chờ ký</ItemDescription>
            </ItemContent>
            <ItemAction>
              <Button size="sm">Mở</Button>
            </ItemAction>
          </Item>
          <Item interactive variant="ghost">
            <ItemIcon>
              <Bell />
            </ItemIcon>
            <ItemContent>
              <ItemTitle>Thông báo mới</ItemTitle>
              <ItemDescription>Có 3 thông báo chưa đọc</ItemDescription>
            </ItemContent>
            <ItemAction>
              <Button variant="ghost" size="sm">
                Tắt
              </Button>
            </ItemAction>
          </Item>
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3">Kbd</h3>
        <div className="flex flex-wrap items-center gap-3">
          <Kbd>Esc</Kbd>
          <Kbd keys={["Ctrl", "K"]} />
          <Kbd variant="outline" size="lg">
            Enter
          </Kbd>
          <Kbd variant="ghost" size="sm">
            Cmd
          </Kbd>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Settings className="size-4" />
            Mở nhanh
            <Kbd keys={["Ctrl", ","]} />
          </div>
        </div>
      </div>

      <DeleteAlertDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={() => {
          deleteMutation.mutate(undefined);
        }}
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
