"use client";

import { useState, useEffect, Suspense } from "react";
import type { FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAdminSession } from "@/components/admin/admin-session-provider";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { EmployeeCombobox } from "./employee-combobox";
import {
  Save,
  AlertCircle,
  CheckCircle,
  User,
  Building2,
  Info,
} from "lucide-react";
import {
  useDepartmentPermissionsQuery,
  useDepartmentStatsQuery,
  useGrantDepartmentPermissionMutation,
  useManagementEmployeesQuery,
} from "@/lib/hooks/use-departments";
import { DepartmentPermissionAssignSchema } from "@/lib/validations/admin-employee";

// Loading component cho Suspense fallback
function AssignPermissionsLoading() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Component chính chứa logic useSearchParams (được wrap trong Suspense)
function AssignPermissionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { role } = useAdminSession();
  const preselectedDepartment = searchParams.get("department");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const departmentsQuery = useDepartmentStatsQuery();
  const employeesQuery = useManagementEmployeesQuery();
  const permissionsQuery = useDepartmentPermissionsQuery();
  const grantMutation = useGrantDepartmentPermissionMutation();
  const employees = employeesQuery.data ?? [];
  const departments = [...(departmentsQuery.data?.departments ?? [])].sort(
    (a, b) =>
      a.name.localeCompare(b.name, "vi", {
        numeric: true,
        sensitivity: "base",
      }),
  );
  const existingPermissions = permissionsQuery.data?.permissions ?? [];
  const refreshDepartments = departmentsQuery.refetch;
  const refreshEmployees = employeesQuery.refetch;
  const refreshPermissions = permissionsQuery.refetch;
  const loading =
    departmentsQuery.isLoading ||
    employeesQuery.isLoading ||
    permissionsQuery.isLoading;
  const submitting = grantMutation.isPending;

  // Form state
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(
    preselectedDepartment ? [preselectedDepartment] : [],
  );
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (role !== "admin") {
      router.replace("/admin/dashboard");
    }
  }, [role, router]);

  const handleDepartmentToggle = (department: string, checked: boolean) => {
    if (checked) {
      setSelectedDepartments((prev) => [...prev, department]);
    } else {
      setSelectedDepartments((prev) => prev.filter((d) => d !== department));
    }
  };

  const getExistingPermission = (employeeId: string, department: string) => {
    return existingPermissions.find(
      (p) => p.employee_id === employeeId && p.department === department,
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const parsed = DepartmentPermissionAssignSchema.safeParse({
      employeeId: selectedEmployee,
      departments: selectedDepartments,
    });

    if (!parsed.success) {
      const nextFieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0]);
        if (!nextFieldErrors[field]) nextFieldErrors[field] = issue.message;
      }
      setFieldErrors(nextFieldErrors);
      return;
    }

    setFieldErrors({});
    setError(null);
    setSuccess(null);

    try {
      const results = [];

      for (const department of selectedDepartments) {
        const existingPerm = getExistingPermission(
          selectedEmployee,
          department,
        );

        if (existingPerm && existingPerm.is_active) {
          results.push(`${department}: Đã có quyền`);
          continue;
        }

        const requestData = {
          employee_id: selectedEmployee,
          department: department,
          notes: notes || `Cấp quyền truy cập department ${department}`,
        };

        try {
          await grantMutation.mutateAsync(requestData);
          results.push(`${department}: Thành công`);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Có lỗi xảy ra";
          results.push(`${department}: Lỗi - ${message}`);
        }
      }

      setSuccess(`Kết quả cấp quyền:\n${results.join("\n")}`);

      setSelectedEmployee("");
      setSelectedDepartments([]);
      setNotes("");

      await Promise.all([
        refreshDepartments(),
        refreshEmployees(),
        refreshPermissions(),
      ]);
    } catch (error) {
      console.error("Error assigning permissions:", error);
      setError("Có lỗi xảy ra khi cấp quyền");
    }
  };

  const selectedEmployeeData = employees.find(
    (e) => e.employee_id === selectedEmployee,
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
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          Cấp Quyền Department
        </h1>
        <p className="text-sm text-gray-600">
          Cấp quyền truy cập departments cho Giám Đốc, Kế Toán, Người Lập Biểu,
          Trưởng Phòng và Tổ Trưởng
        </p>
      </div>

      {error && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="whitespace-pre-line">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 whitespace-pre-line">
            {success}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Employee Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Chọn Nhân Viên
            </CardTitle>
            <CardDescription>
              Chọn nhân viên quản lý (Giám Đốc, Kế Toán, Người Lập Biểu, Trưởng
              Phòng, Tổ Trưởng) để cấp quyền truy cập departments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="employee">Nhân viên *</Label>
                <EmployeeCombobox
                  employees={employees}
                  value={selectedEmployee}
                  onValueChange={setSelectedEmployee}
                />
                {fieldErrors.employeeId && (
                  <p
                    role="alert"
                    className="text-sm font-medium text-destructive"
                  >
                    {fieldErrors.employeeId}
                  </p>
                )}
              </div>

              {selectedEmployeeData && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">
                      Thông tin nhân viên
                    </span>
                  </div>
                  <div className="text-sm text-blue-700">
                    <p>
                      <strong>Tên:</strong> {selectedEmployeeData.full_name}
                    </p>
                    <p>
                      <strong>Mã NV:</strong> {selectedEmployeeData.employee_id}
                    </p>
                    <p>
                      <strong>Chức vụ:</strong> {selectedEmployeeData.chuc_vu}
                    </p>
                    <p>
                      <strong>Department hiện tại:</strong>{" "}
                      {selectedEmployeeData.department}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Department Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Chọn Departments
            </CardTitle>
            <CardDescription>
              Chọn các departments mà nhân viên có thể truy cập và quản lý
            </CardDescription>
          </CardHeader>
          <CardContent>
            {fieldErrors.departments && (
              <p
                role="alert"
                className="mb-3 text-sm font-medium text-destructive"
              >
                {fieldErrors.departments}
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {departments.map((department) => {
                const isSelected = selectedDepartments.includes(
                  department.name,
                );
                const existingPerm = selectedEmployee
                  ? getExistingPermission(selectedEmployee, department.name)
                  : null;
                const hasActivePermission = existingPerm?.is_active;

                return (
                  <div
                    key={department.name}
                    className="flex items-start space-x-3 p-3 border rounded-lg"
                  >
                    <Checkbox
                      id={department.name}
                      checked={isSelected}
                      onCheckedChange={(checked) =>
                        handleDepartmentToggle(
                          department.name,
                          checked as boolean,
                        )
                      }
                      disabled={hasActivePermission}
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor={department.name}
                        className={`text-sm font-medium ${hasActivePermission ? "text-muted-foreground" : ""}`}
                      >
                        {department.name}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {department.employeeCount} nhân viên •{" "}
                        {department.payrollCount} bảng lương
                      </p>
                      {hasActivePermission && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          Đã có quyền
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedDepartments.length > 0 && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg">
                <p className="text-sm font-medium text-green-800 mb-2">
                  Departments được chọn ({selectedDepartments.length}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedDepartments.map((dept) => (
                    <Badge key={dept} variant="default" className="text-xs">
                      {dept}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Ghi Chú</CardTitle>
            <CardDescription>
              Thêm ghi chú về lý do cấp quyền (tùy chọn)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              aria-label="Ghi chú lý do cấp quyền"
              placeholder="Ví dụ: Cấp quyền quản lý department Production và QC theo quyết định của Ban Giám Đốc..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/department-management")}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            disabled={
              submitting ||
              !selectedEmployee ||
              selectedDepartments.length === 0
            }
            className="bg-blue-600 hover:bg-blue-700"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Đang cấp quyền...
              </>
            ) : (
              <>
                <Save data-icon="inline-start" className="h-4 w-4" />
                Cấp Quyền
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

// Export default với Suspense boundary để fix Next.js 15 build error
export default function AssignPermissionsPage() {
  return (
    <Suspense fallback={<AssignPermissionsLoading />}>
      <AssignPermissionsContent />
    </Suspense>
  );
}
