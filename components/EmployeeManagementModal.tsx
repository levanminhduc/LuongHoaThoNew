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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  UserCheck,
  UserX,
  FileText,
  X,
} from "lucide-react";
import { toast } from "sonner";
import EmployeeForm from "@/app/admin/employee-management/components/EmployeeForm";
import EmployeeAuditLogs from "@/app/admin/employee-management/components/EmployeeAuditLogs";

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

interface EmployeeManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: string;
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

export default function EmployeeManagementModal({
  isOpen,
  onClose,
  userRole,
}: EmployeeManagementModalProps) {
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

  const canCreate = userRole !== "nguoi_lap_bieu";
  const canDelete = userRole !== "nguoi_lap_bieu";
  const restrictedRoles =
    userRole === "nguoi_lap_bieu" ? ["admin", "giam_doc", "ke_toan"] : [];

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
      toast.error("Lỗi khi tải danh sách nhân viên");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const timeoutId = setTimeout(
        () => {
          fetchEmployees();
        },
        search ? 500 : 0,
      );

      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, pagination.page, search, selectedDepartment, selectedRole]);

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
        const error = await response.json();
        throw new Error(error.error || "Failed to delete employee");
      }

      const result = await response.json();
      toast.success(result.message);
      fetchEmployees();
    } catch (error) {
      console.error("Error deleting employee:", error);
      toast.error(
        error instanceof Error ? error.message : "Lỗi khi xóa nhân viên",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleEmployeeCreated = () => {
    setIsCreateDialogOpen(false);
    fetchEmployees();
    toast.success("Tạo nhân viên thành công");
  };

  const handleEmployeeUpdated = () => {
    setEditingEmployee(null);
    fetchEmployees();
    toast.success("Cập nhật nhân viên thành công");
  };

  const activeEmployees = employees.filter((emp) => emp.is_active).length;
  const inactiveEmployees = employees.filter((emp) => !emp.is_active).length;

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">Quản Lý Nhân Viên</DialogTitle>
              <DialogDescription>
                Quản lý thông tin nhân viên trong hệ thống
              </DialogDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(95vh-100px)] px-6 pb-6">
          <div className="space-y-6">
            <div className="flex justify-end">
              {canCreate && (
                <Dialog
                  open={isCreateDialogOpen}
                  onOpenChange={setIsCreateDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button>
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
                      <EmployeeForm
                        onSuccess={handleEmployeeCreated}
                        restrictedRoles={restrictedRoles}
                      />
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Tổng Nhân Viên
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pagination.total}</div>
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
                  <div className="text-2xl font-bold text-green-600">
                    {activeEmployees}
                  </div>
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
                  <div className="text-2xl font-bold text-red-600">
                    {inactiveEmployees}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Danh Sách Nhân Viên</CardTitle>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Tìm kiếm theo mã NV, tên, hoặc SĐT..."
                      value={search}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select
                    value={selectedDepartment}
                    onValueChange={(value) =>
                      handleFilterChange("department", value)
                    }
                  >
                    <SelectTrigger className="w-full sm:w-48">
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
                    <SelectTrigger className="w-full sm:w-48">
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
                    <div className="block sm:hidden space-y-3">
                      {employees.length > 0 ? (
                        employees.map((employee) => (
                          <Card
                            key={employee.employee_id}
                            className="p-4 hover:shadow-md transition-shadow duration-200"
                          >
                            <div className="space-y-3">
                              <div className="flex justify-between items-start gap-2">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-sm truncate">
                                    {employee.full_name}
                                  </h4>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Mã: {employee.employee_id}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          setEditingEmployee(employee)
                                        }
                                        className="h-9 w-9 p-0 touch-manipulation"
                                        title="Chỉnh sửa"
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
                                          <EmployeeForm
                                            employee={editingEmployee}
                                            onSuccess={handleEmployeeUpdated}
                                            restrictedRoles={restrictedRoles}
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
                                        className="h-9 w-9 p-0 touch-manipulation"
                                        title="Lịch sử"
                                      >
                                        <FileText className="w-4 h-4" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-4xl">
                                      <DialogHeader>
                                        <DialogTitle>
                                          Lịch Sử Thay Đổi
                                        </DialogTitle>
                                        <DialogDescription>
                                          Audit logs cho nhân viên{" "}
                                          {employee.full_name}
                                        </DialogDescription>
                                      </DialogHeader>
                                      {auditLogsEmployee && (
                                        <EmployeeAuditLogs
                                          employeeId={
                                            auditLogsEmployee.employee_id
                                          }
                                          employeeName={
                                            auditLogsEmployee.full_name
                                          }
                                        />
                                      )}
                                    </DialogContent>
                                  </Dialog>
                                  {canDelete && (
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          disabled={
                                            deletingId === employee.employee_id
                                          }
                                          className="h-9 w-9 p-0 touch-manipulation"
                                          title="Xóa"
                                        >
                                          {deletingId ===
                                          employee.employee_id ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                                          ) : (
                                            <Trash2 className="w-4 h-4 text-red-600" />
                                          )}
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>
                                            Xác nhận xóa
                                          </AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Bạn có chắc chắn muốn xóa nhân viên{" "}
                                            <strong>
                                              {employee.full_name}
                                            </strong>
                                            ? Hành động này không thể hoàn tác.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>
                                            Hủy
                                          </AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() =>
                                              handleDelete(employee.employee_id)
                                            }
                                          >
                                            Xóa
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                  <span className="text-muted-foreground">
                                    Chức vụ:
                                  </span>
                                  <p className="font-medium mt-1">
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {
                                        roleLabels[
                                          employee.chuc_vu as keyof typeof roleLabels
                                        ]
                                      }
                                    </Badge>
                                  </p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">
                                    Phòng ban:
                                  </span>
                                  <p className="font-medium mt-1">
                                    {employee.department || "-"}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">
                                    SĐT:
                                  </span>
                                  <p className="font-medium mt-1">
                                    {employee.phone_number || "-"}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">
                                    Trạng thái:
                                  </span>
                                  <p className="font-medium mt-1">
                                    <Badge
                                      variant={
                                        employee.is_active
                                          ? "default"
                                          : "secondary"
                                      }
                                      className="text-xs"
                                    >
                                      {employee.is_active
                                        ? "Hoạt động"
                                        : "Không hoạt động"}
                                    </Badge>
                                  </p>
                                </div>
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
                    <div className="hidden sm:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[100px]">
                              Mã NV
                            </TableHead>
                            <TableHead className="min-w-[150px]">
                              Họ và Tên
                            </TableHead>
                            <TableHead className="min-w-[120px]">
                              Chức Vụ
                            </TableHead>
                            <TableHead className="min-w-[120px]">
                              Phòng Ban
                            </TableHead>
                            <TableHead className="min-w-[100px]">SĐT</TableHead>
                            <TableHead className="min-w-[120px]">
                              Trạng Thái
                            </TableHead>
                            <TableHead className="min-w-[200px]">
                              Thao Tác
                            </TableHead>
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
                                <TableCell>
                                  {employee.department || "-"}
                                </TableCell>
                                <TableCell>
                                  {employee.phone_number || "-"}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      employee.is_active
                                        ? "default"
                                        : "secondary"
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
                                          onClick={() =>
                                            setEditingEmployee(employee)
                                          }
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
                                            <EmployeeForm
                                              employee={editingEmployee}
                                              onSuccess={handleEmployeeUpdated}
                                              restrictedRoles={restrictedRoles}
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
                                          <DialogTitle>
                                            Lịch Sử Thay Đổi
                                          </DialogTitle>
                                          <DialogDescription>
                                            Audit logs cho nhân viên{" "}
                                            {employee.full_name}
                                          </DialogDescription>
                                        </DialogHeader>
                                        {auditLogsEmployee && (
                                          <EmployeeAuditLogs
                                            employeeId={
                                              auditLogsEmployee.employee_id
                                            }
                                            employeeName={
                                              auditLogsEmployee.full_name
                                            }
                                          />
                                        )}
                                      </DialogContent>
                                    </Dialog>
                                    {canDelete && (
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={
                                              deletingId ===
                                              employee.employee_id
                                            }
                                          >
                                            {deletingId ===
                                            employee.employee_id ? (
                                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                                            ) : (
                                              <Trash2 className="w-4 h-4 text-red-600" />
                                            )}
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>
                                              Xác nhận xóa
                                            </AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Bạn có chắc chắn muốn xóa nhân
                                              viên{" "}
                                              <strong>
                                                {employee.full_name}
                                              </strong>
                                              ? Hành động này không thể hoàn
                                              tác.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>
                                              Hủy
                                            </AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={() =>
                                                handleDelete(
                                                  employee.employee_id,
                                                )
                                              }
                                            >
                                              Xóa
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    )}
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
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
