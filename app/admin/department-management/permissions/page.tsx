"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  VirtualizedTable,
  type VirtualColumn,
} from "@/components/ui/virtualized-table";
import {
  Search,
  Filter,
  Trash2,
  Plus,
  AlertCircle,
  CheckCircle,
  XCircle,
  Calendar,
  User,
  Building2,
  Loader2,
} from "lucide-react";
import { DeleteAlertDialog } from "@/components/ui/alert-dialogs";
import { formatVietnamTimestamp } from "@/lib/utils/vietnam-timezone";
import {
  useDepartmentPermissionsQuery,
  useRevokeDepartmentPermissionMutation,
} from "@/lib/hooks/use-departments";
import type { DepartmentPermission } from "@/lib/hooks/use-departments";

// Loading component cho Suspense fallback
function PermissionsLoading() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
          <div className="space-y-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Component chính chứa logic useSearchParams (được wrap trong Suspense)
function PermissionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const departmentFilter = searchParams.get("department");

  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [departmentFilterState, setDepartmentFilterState] = useState<string>(
    departmentFilter || "all",
  );
  const [visibleLimit, setVisibleLimit] = useState("all");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [permissionToDelete, setPermissionToDelete] =
    useState<DepartmentPermission | null>(null);
  const permissionsQuery = useDepartmentPermissionsQuery();
  const revokeMutation = useRevokeDepartmentPermissionMutation();
  const permissions = permissionsQuery.data?.permissions ?? [];
  const refreshPermissions = permissionsQuery.refetch;
  const loading = permissionsQuery.isLoading;
  const queryError =
    permissionsQuery.error instanceof Error
      ? permissionsQuery.error.message
      : null;
  const revokingId = revokeMutation.isPending
    ? revokeMutation.variables ?? null
    : null;

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = () => {
    const token = localStorage.getItem("admin_token");
    const userStr = localStorage.getItem("user_info");

    if (!token || !userStr) {
      router.push("/admin/login");
      return;
    }

    try {
      const userData = JSON.parse(userStr);
      if (userData.role !== "admin") {
        router.push("/admin/dashboard");
        return;
      }
    } catch (error) {
      console.error("Error parsing user info:", error);
      router.push("/admin/login");
    }
  };

  const filteredPermissions = useMemo(() => {
    let filtered = permissions;

    if (searchTerm) {
      filtered = filtered.filter(
        (perm) =>
          perm.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          perm.employees?.full_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          perm.department.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((perm) =>
        statusFilter === "active" ? perm.is_active : !perm.is_active,
      );
    }

    if (departmentFilterState !== "all") {
      filtered = filtered.filter(
        (perm) => perm.department === departmentFilterState,
      );
    }

    return filtered;
  }, [departmentFilterState, permissions, searchTerm, statusFilter]);

  const revokePermission = async (permissionId: number) => {
    try {
      await revokeMutation.mutateAsync(permissionId);
      await refreshPermissions();
      alert("Thu hồi quyền thành công!");
    } catch (error) {
      console.error("Error revoking permission:", error);
      setError(error instanceof Error ? error.message : "Có lỗi xảy ra khi thu hồi quyền");
    }
  };

  const handleDeleteDialogChange = (open: boolean) => {
    setShowDeleteDialog(open);
    if (!open) {
      setPermissionToDelete(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!permissionToDelete) return;
    await revokePermission(permissionToDelete.id);
    handleDeleteDialogChange(false);
  };

  const getUniqueValues = (key: keyof DepartmentPermission) => {
    return [
      ...new Set(permissions.map((p) => p[key] as string).filter(Boolean)),
    ];
  };
  const displayedPermissions =
    visibleLimit === "all"
      ? filteredPermissions
      : filteredPermissions.slice(0, Number(visibleLimit));
  const permissionColumns: VirtualColumn<DepartmentPermission>[] = [
    {
      key: "employee",
      header: "Nhân Viên",
      width: "minmax(180px, 1.4fr)",
      cell: (permission) => (
        <div>
          <p className="font-medium">
            {permission.employees?.full_name || "N/A"}
          </p>
          <p className="text-xs text-muted-foreground">
            {permission.employee_id}
          </p>
          <Badge variant="outline" className="text-xs mt-1">
            {permission.employees?.chuc_vu || "N/A"}
          </Badge>
        </div>
      ),
    },
    {
      key: "department",
      header: "Department",
      width: "minmax(150px, 1fr)",
      cell: (permission) => (
        <Badge variant="secondary">{permission.department}</Badge>
      ),
    },
    {
      key: "status",
      header: "Trạng Thái",
      width: "130px",
      cell: (permission) => (
        <Badge variant={permission.is_active ? "default" : "destructive"}>
          {permission.is_active ? "Hoạt động" : "Đã thu hồi"}
        </Badge>
      ),
    },
    {
      key: "granted_by",
      header: "Cấp Bởi",
      width: "minmax(150px, 1fr)",
      cell: (permission) => (
        <p className="text-sm">
          {permission.granted_by_employee?.full_name || permission.granted_by}
        </p>
      ),
    },
    {
      key: "granted_at",
      header: "Ngày Cấp",
      width: "170px",
      cell: (permission) => (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {formatVietnamTimestamp(permission.granted_at)}
        </div>
      ),
    },
    {
      key: "notes",
      header: "Ghi Chú",
      width: "minmax(120px, 1fr)",
      cell: (permission) => (
        <p className="text-xs text-muted-foreground max-w-32 truncate">
          {permission.notes || "-"}
        </p>
      ),
    },
    {
      key: "actions",
      header: "Thao Tác",
      width: "110px",
      className: "text-center",
      cell: (permission) =>
        permission.is_active ? (
          <Button
            variant="outline"
            size="sm"
            disabled={revokingId === permission.id}
            onClick={() => {
              setPermissionToDelete(permission);
              setShowDeleteDialog(true);
            }}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            {revokingId === permission.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        ) : null,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Quản Lý Department Permissions
          </h1>
          <p className="text-sm text-gray-600">
            Xem và quản lý tất cả quyền truy cập departments
          </p>
        </div>
        <Button
          onClick={() =>
            router.push("/admin/department-management/assign-permissions")
          }
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Cấp Quyền Mới
        </Button>
      </div>

      {(error || queryError) && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || queryError}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Bộ Lọc
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Tìm kiếm</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Tìm theo tên, mã NV, department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Trạng thái
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="active">Đang hoạt động</SelectItem>
                  <SelectItem value="inactive">Đã thu hồi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Department
              </label>
              <Select
                value={departmentFilterState}
                onValueChange={setDepartmentFilterState}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả departments</SelectItem>
                  {getUniqueValues("department").map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setDepartmentFilterState("all");
                }}
                className="w-full"
              >
                Xóa bộ lọc
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tổng quyền</p>
                <p className="text-2xl font-bold">{permissions.length}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Đang hoạt động</p>
                <p className="text-2xl font-bold text-green-600">
                  {permissions.filter((p) => p.is_active).length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Đã thu hồi</p>
                <p className="text-2xl font-bold text-red-600">
                  {permissions.filter((p) => !p.is_active).length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Managers có quyền
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {
                    new Set(
                      permissions
                        .filter((p) => p.is_active)
                        .map((p) => p.employee_id),
                    ).size
                  }
                </p>
              </div>
              <User className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Permissions Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Danh Sách Permissions ({filteredPermissions.length})
          </CardTitle>
          <CardDescription>
            Hiển thị {filteredPermissions.length} trong tổng số{" "}
            {permissions.length} permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex justify-end">
            <Select value={visibleLimit} onValueChange={setVisibleLimit}>
              <SelectTrigger className="w-full sm:w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Hiển thị tất cả</SelectItem>
                {[100, 200].map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    Hiển thị {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <VirtualizedTable
              data={displayedPermissions}
              columns={permissionColumns}
              rowKey={(permission) => String(permission.id)}
              containerHeight={600}
              estimateRowHeight={76}
              caption="Danh sách department permissions"
              emptyState={
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    Không tìm thấy permissions
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {permissions.length === 0
                      ? "Chưa có permissions nào được cấp."
                      : "Không có permissions nào phù hợp với bộ lọc hiện tại."}
                  </p>
                  <Button
                    onClick={() =>
                      router.push(
                        "/admin/department-management/assign-permissions",
                      )
                    }
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Cấp Quyền Đầu Tiên
                  </Button>
                </div>
              }
            />
          </div>
        </CardContent>
      </Card>

      <DeleteAlertDialog
        open={showDeleteDialog}
        onOpenChange={handleDeleteDialogChange}
        onConfirm={handleConfirmDelete}
        itemName={
          permissionToDelete?.employees?.full_name ||
          permissionToDelete?.employee_id
        }
        title="Thu hồi quyền truy cập"
        description={
          permissionToDelete
            ? `Bạn có chắc chắn muốn thu hồi quyền của nhân viên "${
                permissionToDelete.employees?.full_name ||
                permissionToDelete.employee_id
              }" đối với department "${permissionToDelete.department}"?`
            : undefined
        }
        loading={!!permissionToDelete && revokingId === permissionToDelete.id}
      />
    </div>
  );
}

// Export default với Suspense boundary để fix Next.js 15 build error
export default function PermissionsPage() {
  return (
    <Suspense fallback={<PermissionsLoading />}>
      <PermissionsContent />
    </Suspense>
  );
}
