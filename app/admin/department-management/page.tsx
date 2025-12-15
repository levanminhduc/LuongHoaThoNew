"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import DepartmentDebugInfo from "@/components/debug/DepartmentDebugInfo";
import {
  Building2,
  Users,
  Shield,
  Plus,
  Eye,
  UserCheck,
  AlertCircle,
} from "lucide-react";

interface Department {
  name: string;
  employeeCount: number;
  payrollCount: number;
  signedCount: number;
  signedPercentage: string;
  totalSalary: number;
  averageSalary: number;
  managers: Array<{ employee_id: string; full_name: string }>;
  supervisors: Array<{ employee_id: string; full_name: string }>;
}

interface DepartmentPermission {
  id: number;
  employee_id: string;
  department: string;
  granted_by: string;
  granted_at: string;
  is_active: boolean;
  employees?: {
    employee_id: string;
    full_name: string;
    chuc_vu: string;
  };
}

export default function DepartmentManagementPage() {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [permissions, setPermissions] = useState<DepartmentPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    checkAuthentication();
    loadData();
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

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("admin_token");

      // Load departments with statistics (only active employees)
      const deptResponse = await fetch(
        "/api/admin/departments?include_stats=true",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (deptResponse.ok) {
        const deptData = await deptResponse.json();
        // Sắp xếp departments theo chữ cái A-Z
        const sortedDepartments = (deptData.departments || []).sort(
          (a: Department, b: Department) =>
            a.name.localeCompare(b.name, "vi", { sensitivity: "base" }),
        );
        setDepartments(sortedDepartments);
      }

      // Load department permissions
      const permResponse = await fetch("/api/admin/department-permissions", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (permResponse.ok) {
        const permData = await permResponse.json();
        setPermissions(permData.permissions || []);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      setError("Có lỗi xảy ra khi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  const getPermissionCount = (department: string) => {
    return permissions.filter((p) => p.department === department && p.is_active)
      .length;
  };

  const getManagersWithPermissions = (department: string) => {
    return permissions.filter(
      (p) =>
        p.department === department &&
        p.is_active &&
        p.employees?.chuc_vu === "truong_phong",
    );
  };

  const filteredDepartments = departments.filter((dept) =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
            Quản Lý Phân Quyền Department
          </h1>
          <p className="text-sm text-gray-600">
            Cấp quyền truy cập departments cho Trưởng Phòng và Tổ Trưởng
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() =>
              router.push("/admin/department-management/assign-permissions")
            }
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Cấp Quyền Mới
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              router.push("/admin/department-management/permissions")
            }
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            Xem Tất Cả Quyền
          </Button>
        </div>
      </div>

      {error && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tổng Departments
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">
              {departments.length}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Departments trong hệ thống
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tổng Nhân Viên
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">
              {departments.reduce((sum, dept) => sum + dept.employeeCount, 0)}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Nhân viên trong tất cả departments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quyền Đã Cấp</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">
              {permissions.filter((p) => p.is_active).length}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Department permissions active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Managers Có Quyền
            </CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">
              {
                new Set(
                  permissions
                    .filter((p) => p.is_active)
                    .map((p) => p.employee_id),
                ).size
              }
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Managers được cấp quyền
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
        <Input
          placeholder="Tìm kiếm department..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:w-auto flex-1"
        />
        <Button
          variant="outline"
          onClick={loadData}
          className="w-full sm:w-auto"
        >
          Làm mới
        </Button>
      </div>

      {/* Departments Grid */}
      {filteredDepartments.length > 0 && (
        <>
          <div className="hidden md:block border rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
              {filteredDepartments.map((dept) => (
                <Card key={dept.name} className="relative">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        {dept.name}
                      </span>
                      <Badge
                        variant={
                          getPermissionCount(dept.name) > 0
                            ? "default"
                            : "secondary"
                        }
                      >
                        {getPermissionCount(dept.name)} quyền
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {dept.employeeCount} nhân viên • {dept.payrollCount} bảng
                      lương
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Managers</p>
                        <p className="font-semibold">{dept.managers.length}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Supervisors</p>
                        <p className="font-semibold">
                          {dept.supervisors.length}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Đã ký</p>
                        <p className="font-semibold">
                          {dept.signedPercentage}%
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Lương TB</p>
                        <p className="font-semibold">
                          {(dept.averageSalary / 1000).toFixed(0)}K
                        </p>
                      </div>
                    </div>

                    {getManagersWithPermissions(dept.name).length > 0 && (
                      <div className="border-t pt-3">
                        <p className="text-sm font-medium text-muted-foreground mb-2">
                          Managers có quyền:
                        </p>
                        <div className="space-y-1">
                          {getManagersWithPermissions(dept.name).map((perm) => (
                            <Badge
                              key={perm.id}
                              variant="outline"
                              className="text-xs"
                            >
                              {perm.employees?.full_name || perm.employee_id}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() =>
                          router.push(
                            `/admin/department-management/assign-permissions?department=${encodeURIComponent(dept.name)}`,
                          )
                        }
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Cấp Quyền
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() =>
                          router.push(
                            `/admin/department-management/permissions?department=${encodeURIComponent(dept.name)}`,
                          )
                        }
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Xem Chi Tiết
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="md:hidden space-y-3">
            {filteredDepartments.map((dept) => (
              <Card key={dept.name}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-semibold text-base">{dept.name}</span>
                    <Badge>{dept.employeeCount} nhân viên</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {dept.employeeCount} nhân viên • {dept.payrollCount} bảng
                    lương
                  </p>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() =>
                        router.push(
                          `/admin/department-management/assign-permissions?department=${encodeURIComponent(dept.name)}`,
                        )
                      }
                    >
                      Cấp Quyền
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() =>
                        router.push(
                          `/admin/department-management/permissions?department=${encodeURIComponent(dept.name)}`,
                        )
                      }
                    >
                      Xem Chi Tiết
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {filteredDepartments.length === 0 && !loading && (
        <Card className="text-center py-12">
          <CardContent>
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Chưa có departments</h3>
            <p className="text-muted-foreground mb-4">
              {departments.length === 0
                ? "Hệ thống chưa có departments nào. Hãy thêm nhân viên và departments trước."
                : "Không tìm thấy department phù hợp."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Debug Component */}
      <DepartmentDebugInfo />
    </div>
  );
}
