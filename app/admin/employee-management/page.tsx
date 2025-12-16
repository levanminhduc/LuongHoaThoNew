"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import EmployeeFormExample from "@/components/examples/employee-form-example";
import EmployeeAuditLogs from "./components/EmployeeAuditLogs";
import SecurityNotice from "./components/SecurityNotice";

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

interface EmployeeResponse {
  employees: Employee[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  departments: string[];
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
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
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

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search }),
        ...(selectedDepartment &&
          selectedDepartment !== "all_departments" && {
            department: selectedDepartment,
          }),
        ...(selectedRole &&
          selectedRole !== "all_roles" && { role: selectedRole }),
      });

      const token = localStorage.getItem("admin_token");
      const response = await fetch(`/api/admin/employees?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch employees");
      }

      const data: EmployeeResponse = await response.json();
      setEmployees(data.employees);
      setPagination(data.pagination);
      setDepartments(data.departments);
    } catch (error) {
      console.error("Error fetching employees:", error);
      showErrorToast("Lỗi khi tải danh sách nhân viên");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(
      () => {
        fetchEmployees();
      },
      search ? 500 : 0,
    );

    return () => clearTimeout(timeoutId);
  }, [pagination.page, search, selectedDepartment, selectedRole]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (type: "department" | "role", value: string) => {
    if (type === "department") {
      setSelectedDepartment(value);
    } else {
      setSelectedRole(value);
    }
    setPagination((prev) => ({ ...prev, page: 1 }));
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
      const token = localStorage.getItem("admin_token");
      const response = await fetch(`/api/admin/employees/${employeeId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete employee");
      }

      const result = await response.json();
      const employee = employees.find((e) => e.employee_id === employeeId);
      showDeleteSuccessToast(employee?.full_name || employeeId, "nhân viên");
      fetchEmployees();
    } catch (error) {
      console.error("Error deleting employee:", error);
      showErrorToast("Lỗi khi xóa nhân viên");
    } finally {
      setDeletingId(null);
    }
  };

  const handleEmployeeCreated = () => {
    setIsCreateDialogOpen(false);
    fetchEmployees();
    showSuccessToast("Tạo nhân viên thành công");
  };

  const handleEmployeeUpdated = () => {
    setEditingEmployee(null);
    fetchEmployees();
    showUpdateSuccessToast("Thông tin nhân viên");
  };

  const activeEmployees = employees.filter((emp) => emp.is_active).length;
  const inactiveEmployees = employees.filter((emp) => !emp.is_active).length;

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
            <ScrollArea className="max-h-[65vh] pr-4">
              <EmployeeFormExample onSuccess={handleEmployeeCreated} />
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
            <Button
              variant="outline"
              onClick={fetchEmployees}
              className="w-full sm:w-auto"
            >
              Làm mới
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
                              <ScrollArea className="max-h-[65vh] pr-4">
                                {editingEmployee && (
                                  <EmployeeFormExample
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
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
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

              {/* Desktop Table Layout */}
              <div className="hidden md:block border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[100px]">Mã NV</TableHead>
                      <TableHead className="min-w-[150px]">Họ và Tên</TableHead>
                      <TableHead className="min-w-[120px]">Chức Vụ</TableHead>
                      <TableHead className="min-w-[120px]">Phòng Ban</TableHead>
                      <TableHead className="min-w-[100px]">SĐT</TableHead>
                      <TableHead className="min-w-[120px]">
                        Trạng Thái
                      </TableHead>
                      <TableHead className="min-w-[200px]">Thao Tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.length > 0 ? (
                      employees.map((employee) => (
                        <TableRow key={employee.employee_id}>
                          <TableCell className="font-medium">
                            {employee.employee_id}
                          </TableCell>
                          <TableCell>{employee.full_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {
                                roleLabels[
                                  employee.chuc_vu as keyof typeof roleLabels
                                ]
                              }
                            </Badge>
                          </TableCell>
                          <TableCell>{employee.department || "-"}</TableCell>
                          <TableCell>{employee.phone_number || "-"}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                employee.is_active ? "default" : "secondary"
                              }
                            >
                              {employee.is_active
                                ? "Hoạt động"
                                : "Không hoạt động"}
                            </Badge>
                          </TableCell>
                          <TableCell>
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
                                    <DialogTitle>
                                      Chỉnh Sửa Nhân Viên
                                    </DialogTitle>
                                    <DialogDescription>
                                      Cập nhật thông tin nhân viên{" "}
                                      {employee.full_name}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <ScrollArea className="max-h-[65vh] pr-4">
                                    {editingEmployee && (
                                      <EmployeeFormExample
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
                                    onClick={() =>
                                      setAuditLogsEmployee(employee)
                                    }
                                  >
                                    <FileText className="w-4 h-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl">
                                  <DialogHeader>
                                    <DialogTitle>Lịch Sử Thay Đổi</DialogTitle>
                                    <DialogDescription>
                                      Audit logs cho nhân viên{" "}
                                      {employee.full_name}
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
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                                ) : (
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center py-8 text-muted-foreground"
                        >
                          Không có dữ liệu
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {pagination.totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        page: prev.page - 1,
                      }))
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
                      setPagination((prev) => ({
                        ...prev,
                        page: prev.page + 1,
                      }))
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
