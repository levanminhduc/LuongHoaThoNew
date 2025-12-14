"use client";

import { useState, useEffect, Suspense } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Save,
  AlertCircle,
  CheckCircle,
  User,
  Building2,
  Shield,
  Info,
} from "lucide-react";

interface Employee {
  employee_id: string;
  full_name: string;
  department: string;
  chuc_vu: string;
}

interface Department {
  name: string;
  employeeCount: number;
  payrollCount: number;
}

interface ExistingPermission {
  id: number;
  employee_id: string;
  department: string;
  is_active: boolean;
}

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
  const preselectedDepartment = searchParams.get("department");

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [existingPermissions, setExistingPermissions] = useState<
    ExistingPermission[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(
    preselectedDepartment ? [preselectedDepartment] : [],
  );
  const [notes, setNotes] = useState("");

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

      // Load departments
      const deptResponse = await fetch(
        "/api/admin/departments?include_stats=true",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (deptResponse.ok) {
        interface Department {
          name: string;
        }

        const deptData = await deptResponse.json();
        // Sắp xếp departments theo chữ cái A-Z
        const sortedDepartments = (deptData.departments || []).sort(
          (a: Department, b: Department) =>
            a.name.localeCompare(b.name, "vi", { sensitivity: "base" }),
        );
        setDepartments(sortedDepartments);
      }

      // Load employees (all management roles)
      // API chỉ hỗ trợ single role, nên cần gọi 5 lần cho tất cả management roles
      const [
        giamDocResponse,
        keToanResponse,
        nguoiLapBieuResponse,
        truongPhongResponse,
        toTruongResponse,
      ] = await Promise.all([
        fetch("/api/admin/employees?role=giam_doc&limit=1000", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch("/api/admin/employees?role=ke_toan&limit=1000", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch("/api/admin/employees?role=nguoi_lap_bieu&limit=1000", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch("/api/admin/employees?role=truong_phong&limit=1000", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch("/api/admin/employees?role=to_truong&limit=1000", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      let allEmployees: Employee[] = [];

      if (giamDocResponse.ok) {
        const giamDocData = await giamDocResponse.json();
        allEmployees = [...allEmployees, ...(giamDocData.employees || [])];
      }

      if (keToanResponse.ok) {
        const keToanData = await keToanResponse.json();
        allEmployees = [...allEmployees, ...(keToanData.employees || [])];
      }

      if (nguoiLapBieuResponse.ok) {
        const nguoiLapBieuData = await nguoiLapBieuResponse.json();
        allEmployees = [...allEmployees, ...(nguoiLapBieuData.employees || [])];
      }

      if (truongPhongResponse.ok) {
        const truongPhongData = await truongPhongResponse.json();
        allEmployees = [...allEmployees, ...(truongPhongData.employees || [])];
      }

      if (toTruongResponse.ok) {
        const toTruongData = await toTruongResponse.json();
        allEmployees = [...allEmployees, ...(toTruongData.employees || [])];
      }

      if (allEmployees.length === 0) {
        console.error("Failed to load management employees");
      }

      setEmployees(allEmployees);

      // Load existing permissions
      const permResponse = await fetch("/api/admin/department-permissions", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (permResponse.ok) {
        const permData = await permResponse.json();
        setExistingPermissions(permData.permissions || []);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      setError("Có lỗi xảy ra khi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEmployee) {
      setError("Vui lòng chọn nhân viên");
      return;
    }

    if (selectedDepartments.length === 0) {
      setError("Vui lòng chọn ít nhất một department");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem("admin_token");
      const results = [];

      // Create permissions for each selected department
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

        // Debug logging
        console.log("=== DEBUG FRONTEND REQUEST ===");
        console.log("Request data:", requestData);
        console.log(
          "Token:",
          token ? `${token.substring(0, 20)}...` : "NO TOKEN",
        );
        console.log("Department:", department);
        console.log("Selected employee:", selectedEmployee);

        const response = await fetch("/api/admin/department-permissions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        });

        if (response.ok) {
          const successData = await response.json();
          console.log("Success response:", successData);
          results.push(`${department}: Thành công`);
        } else {
          const errorData = await response.json();
          console.log("Error response:", errorData);
          console.log("Response status:", response.status);
          results.push(`${department}: Lỗi - ${errorData.error}`);
        }
      }

      setSuccess(`Kết quả cấp quyền:\n${results.join("\n")}`);

      // Reset form
      setSelectedEmployee("");
      setSelectedDepartments([]);
      setNotes("");

      // Reload data
      await loadData();
    } catch (error) {
      console.error("Error assigning permissions:", error);
      setError("Có lỗi xảy ra khi cấp quyền");
    } finally {
      setSubmitting(false);
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
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
              <div>
                <Label htmlFor="employee">Nhân viên *</Label>
                <Select
                  value={selectedEmployee}
                  onValueChange={setSelectedEmployee}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn nhân viên..." />
                  </SelectTrigger>
                  <SelectContent className="max-w-[90vw] sm:max-w-md">
                    {employees.map((employee) => (
                      <SelectItem
                        key={employee.employee_id}
                        value={employee.employee_id}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 w-full min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium truncate">
                              {employee.full_name}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-xs shrink-0"
                            >
                              {employee.chuc_vu}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground sm:ml-auto">
                            <span className="shrink-0">
                              ({employee.employee_id})
                            </span>
                            <span className="text-blue-600 truncate">
                              {employee.department}
                            </span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Save className="h-4 w-4 mr-2" />
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
