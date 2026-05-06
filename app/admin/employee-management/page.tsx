"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DeleteAlertDialog } from "@/components/ui/alert-dialogs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  UserCheck,
  UserX,
  FileText,
} from "lucide-react";
import {
  showSuccessToast,
  showErrorToast,
  showDeleteSuccessToast,
  showUpdateSuccessToast,
} from "@/lib/toast-utils";
import EmployeeForm from "./components/EmployeeForm";
import EmployeeAuditLogs from "./components/EmployeeAuditLogs";
import SecurityNotice from "./components/SecurityNotice";
import { Spinner } from "@/components/ui/spinner";
import {
  useEmployeeMutation,
  useEmployeesQuery,
} from "@/lib/hooks/use-employees";
import {
  VirtualizedTable,
  type VirtualColumn,
} from "@/components/ui/virtualized-table";

interface Employee {
  employee_id: string;
  full_name: string;
  department: string | null;
  chuc_vu: string;
  phone_number: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const roleLabels = {
  admin: "Admin",
  giam_doc: "Giám Đốc",
  ke_toan: "Kế Toán",
  nguoi_lap_bieu: "Người Lập Biểu",
  truong_phong: "Trưởng Phòng",
  to_truong: "Tổ Trưởng",
  nhan_vien: "Nhân Viên",
  van_phong: "Văn Phòng",
};

export default function EmployeeManagementPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [selectedDepartment, setSelectedDepartment] =
    useState("all_departments");
  const [selectedRole, setSelectedRole] = useState("all_roles");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [auditLogsEmployee, setAuditLogsEmployee] = useState<Employee | null>(
    null,
  );
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(
    null,
  );
  const employeesQuery = useEmployeesQuery({
    page,
    limit,
    search,
    department: selectedDepartment,
    role: selectedRole,
  });
  const employeeMutation = useEmployeeMutation();
  const employees = employeesQuery.data?.employees ?? [];
  const departments = employeesQuery.data?.departments ?? [];
  const pagination = employeesQuery.data?.pagination ?? {
    page,
    limit,
    total: 0,
    totalPages: 0,
  };
  const loading = employeesQuery.isLoading;

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleFilterChange = (type: "department" | "role", value: string) => {
    if (type === "department") {
      setSelectedDepartment(value);
    } else {
      setSelectedRole(value);
    }
    setPage(1);
  };

  const handleDeleteDialogChange = (open: boolean) => {
    setShowDeleteDialog(open);
    if (!open) {
      setEmployeeToDelete(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!employeeToDelete) return;
    await handleDelete(employeeToDelete.employee_id);
    handleDeleteDialogChange(false);
  };

  const handleDelete = async (employeeId: string) => {
    try {
      setDeletingId(employeeId);
      await employeeMutation.mutateAsync({
        action: "delete",
        employee: { employee_id: employeeId },
      });
      const employee = employees.find((e) => e.employee_id === employeeId);
      showDeleteSuccessToast(employee?.full_name || employeeId, "nhân viên");
    } catch (error) {
      console.error("Error deleting employee:", error);
      showErrorToast("Lỗi khi xóa nhân viên");
    } finally {
      setDeletingId(null);
    }
  };

  const handleEmployeeCreated = () => {
    setIsCreateDialogOpen(false);
    showSuccessToast("Tạo nhân viên thành công");
  };

  const handleEmployeeUpdated = () => {
    setEditingEmployee(null);
    showUpdateSuccessToast("Thông tin nhân viên");
  };

  const activeEmployees = employees.filter((emp) => emp.is_active).length;
  const inactiveEmployees = employees.filter((emp) => !emp.is_active).length;
  const employeeColumns: VirtualColumn<Employee>[] = [
    {
      key: "employee_id",
      header: "Mã NV",
      width: "110px",
      cell: (employee) => (
        <span className="font-medium">{employee.employee_id}</span>
      ),
    },
    {
      key: "full_name",
      header: "Họ và Tên",
      width: "minmax(180px, 1.4fr)",
      cell: (employee) => employee.full_name,
    },
    {
      key: "chuc_vu",
      header: "Chức Vụ",
      width: "150px",
      cell: (employee) => (
        <Badge variant="outline">
          {roleLabels[employee.chuc_vu as keyof typeof roleLabels]}
        </Badge>
      ),
    },
    {
      key: "department",
      header: "Phòng Ban",
      width: "minmax(140px, 1fr)",
      cell: (employee) => employee.department || "-",
    },
    {
      key: "phone_number",
      header: "SĐT",
      width: "130px",
      cell: (employee) => employee.phone_number || "-",
    },
    {
      key: "is_active",
      header: "Trạng Thái",
      width: "130px",
      cell: (employee) => (
        <Badge variant={employee.is_active ? "default" : "secondary"}>
          {employee.is_active ? "Hoạt động" : "Không hoạt động"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Thao Tác",
      width: "220px",
      cell: (employee) => (
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingEmployee(employee)}
              >
                <Edit className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle>Chỉnh Sửa Nhân Viên</DialogTitle>
                <DialogDescription>
                  Cập nhật thông tin nhân viên {employee.full_name}
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[65vh] p-1 pr-4">
                {editingEmployee && (
                  <EmployeeForm
                    employee={editingEmployee}
                    onSuccess={handleEmployeeUpdated}
                  />
                )}
              </ScrollArea>
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAuditLogsEmployee(employee)}
              >
                <FileText className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Lịch Sử Thay Đổi</DialogTitle>
                <DialogDescription>
                  Audit logs cho nhân viên {employee.full_name}
                </DialogDescription>
              </DialogHeader>
              {auditLogsEmployee && (
                <EmployeeAuditLogs
                  employeeId={auditLogsEmployee.employee_id}
                  employeeName={auditLogsEmployee.full_name}
                />
              )}
            </DialogContent>
          </Dialog>
          <Button
            variant="outline"
            size="sm"
            disabled={deletingId === employee.employee_id}
            onClick={() => {
              setEmployeeToDelete(employee);
              setShowDeleteDialog(true);
            }}
          >
            {deletingId === employee.employee_id ? (
              <Spinner size="sm" variant="destructive" />
            ) : (
              <Trash2 className="w-4 h-4 text-red-600" />
            )}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <SecurityNotice />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">
            Quản Lý Nhân Viên
          </h1>
          <p className="text-muted-foreground">
            Quản lý thông tin nhân viên trong hệ thống
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Thêm Nhân Viên
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Thêm Nhân Viên Mới</DialogTitle>
              <DialogDescription>
                Nhập thông tin nhân viên mới vào hệ thống
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[65vh] p-1 pr-4">
              <EmployeeForm onSuccess={handleEmployeeCreated} />
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tổng Nhân Viên
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">
              {pagination.total}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Tất cả nhân viên
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Đang Hoạt Động
            </CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-green-600">
              {activeEmployees}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Nhân viên active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Không Hoạt Động
            </CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-red-600">
              {inactiveEmployees}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Nhân viên inactive
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh Sách Nhân Viên</CardTitle>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Tìm kiếm theo mã NV, tên, hoặc SĐT..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 w-full sm:w-auto flex-1"
              />
            </div>
            <Select
              value={selectedDepartment}
              onValueChange={(value) => handleFilterChange("department", value)}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Chọn phòng ban" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_departments">
                  Tất cả phòng ban
                </SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedRole}
              onValueChange={(value) => handleFilterChange("role", value)}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Chọn chức vụ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_roles">Tất cả chức vụ</SelectItem>
                {Object.entries(roleLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(limit)}
              onValueChange={(value) => {
                setLimit(Number(value));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Hiển thị" />
              </SelectTrigger>
              <SelectContent>
                {[20, 50, 100, 200].map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    Hiển thị {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => employeesQuery.refetch()}
              disabled={employeesQuery.isFetching}
              className="w-full sm:w-auto"
            >
              Làm mới
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {employeesQuery.error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>
                {employeesQuery.error instanceof Error
                  ? employeesQuery.error.message
                  : "Lỗi khi tải danh sách nhân viên"}
              </AlertDescription>
            </Alert>
          )}
          {employeesQuery.isFetching && !loading && (
            <div className="mb-3 text-sm text-muted-foreground">
              Đang cập nhật...
            </div>
          )}
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner size="lg" />
            </div>
          ) : (
            <>
              {/* Mobile Card Layout */}
              <div className="md:hidden space-y-3">
                {employees.length > 0 ? (
                  employees.map((employee) => (
                    <Card
                      key={employee.employee_id}
                      className="p-4 hover:shadow-md transition-shadow duration-200"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground font-mono">
                              {employee.employee_id}
                            </p>
                            <h4 className="font-semibold text-base">
                              {employee.full_name}
                            </h4>
                          </div>
                          <div className="flex flex-wrap gap-2 justify-end">
                            <Badge variant="secondary">
                              {employee.department || "-"}
                            </Badge>
                            <Badge variant="outline">
                              {
                                roleLabels[
                                  employee.chuc_vu as keyof typeof roleLabels
                                ]
                              }
                            </Badge>
                            <Badge
                              variant={
                                employee.is_active ? "default" : "secondary"
                              }
                            >
                              {employee.is_active
                                ? "Hoạt động"
                                : "Không hoạt động"}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingEmployee(employee)}
                                className="touch-manipulation"
                                title="Chỉnh sửa"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
                              <DialogHeader>
                                <DialogTitle>Chỉnh Sửa Nhân Viên</DialogTitle>
                                <DialogDescription>
                                  Cập nhật thông tin nhân viên{" "}
                                  {employee.full_name}
                                </DialogDescription>
                              </DialogHeader>
                              <ScrollArea className="max-h-[65vh] p-1 pr-4">
                                {editingEmployee && (
                                  <EmployeeForm
                                    employee={editingEmployee}
                                    onSuccess={handleEmployeeUpdated}
                                  />
                                )}
                              </ScrollArea>
                            </DialogContent>
                          </Dialog>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setAuditLogsEmployee(employee)}
                                className="touch-manipulation"
                                title="Lịch sử"
                              >
                                <FileText className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl">
                              <DialogHeader>
                                <DialogTitle>Lịch Sử Thay Đổi</DialogTitle>
                                <DialogDescription>
                                  Audit logs cho nhân viên {employee.full_name}
                                </DialogDescription>
                              </DialogHeader>
                              {auditLogsEmployee && (
                                <EmployeeAuditLogs
                                  employeeId={auditLogsEmployee.employee_id}
                                  employeeName={auditLogsEmployee.full_name}
                                />
                              )}
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={deletingId === employee.employee_id}
                            className="touch-manipulation"
                            title="Xóa"
                            onClick={() => {
                              setEmployeeToDelete(employee);
                              setShowDeleteDialog(true);
                            }}
                          >
                            {deletingId === employee.employee_id ? (
                              <Spinner size="sm" variant="destructive" />
                            ) : (
                              <Trash2 className="w-4 h-4 text-red-600" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Không có dữ liệu
                  </div>
                )}
              </div>

              <div className="hidden md:block border rounded-lg overflow-x-auto">
                <VirtualizedTable
                  data={employees}
                  columns={employeeColumns}
                  rowKey={(employee) => employee.employee_id}
                  containerHeight={600}
                  caption="Danh sách nhân viên"
                  emptyState="Không có dữ liệu"
                />
              </div>

              {pagination.totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={pagination.page === 1}
                    className="touch-manipulation"
                  >
                    Trước
                  </Button>
                  <span className="flex items-center px-4 text-sm">
                    Trang {pagination.page} / {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setPage((prev) => Math.min(pagination.totalPages, prev + 1))
                    }
                    disabled={pagination.page === pagination.totalPages}
                    className="touch-manipulation"
                  >
                    Sau
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <DeleteAlertDialog
        open={showDeleteDialog}
        onOpenChange={handleDeleteDialogChange}
        onConfirm={handleConfirmDelete}
        itemName={employeeToDelete?.full_name}
        title="Xác nhận xóa"
        description={
          employeeToDelete
            ? `Bạn có chắc chắn muốn xóa nhân viên "${employeeToDelete.full_name}"? Hành động này không thể hoàn tác.`
            : undefined
        }
        loading={
          !!employeeToDelete && deletingId === employeeToDelete.employee_id
        }
      />
    </div>
  );
}
