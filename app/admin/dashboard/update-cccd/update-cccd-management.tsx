"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Search,
  UserCheck,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { EmployeeSearchForm } from "./components/employee-search-form";
import { CCCDUpdateForm } from "./components/cccd-update-form";

interface Employee {
  employee_id: string;
  full_name: string;
  department: string;
  chuc_vu: string;
  is_active: boolean;
}

interface UpdateResult {
  success: boolean;
  message: string;
  employee?: {
    employee_id: string;
    full_name: string;
  };
}

export function UpdateCCCDManagement() {
  const router = useRouter();
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null,
  );
  const [updateResult, setUpdateResult] = useState<UpdateResult | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      router.push("/admin/login");
      return;
    }
  }, [router]);

  const handleEmployeeSelect = (employee: Employee) => {
    setSelectedEmployee(employee);
    setUpdateResult(null);
  };

  const handleCCCDUpdate = async (newCCCD: string) => {
    if (!selectedEmployee) return;

    setIsUpdating(true);
    setUpdateResult(null);

    try {
      const token = localStorage.getItem("admin_token");
      const response = await fetch("/api/employees/update-cccd", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          employee_id: selectedEmployee.employee_id,
          new_cccd: newCCCD,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setUpdateResult({
          success: true,
          message: data.message,
          employee: data.employee,
        });
        setTimeout(() => {
          setSelectedEmployee(null);
          setUpdateResult(null);
        }, 3000);
      } else {
        setUpdateResult({
          success: false,
          message: data.error || "Có lỗi xảy ra khi cập nhật CCCD",
        });
      }
    } catch (error) {
      console.error("Error updating CCCD:", error);
      setUpdateResult({
        success: false,
        message: "Lỗi kết nối. Vui lòng thử lại.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBack = () => {
    setSelectedEmployee(null);
    setUpdateResult(null);
  };

  const handleBackToDashboard = () => {
    router.push("/admin/dashboard");
  };

  return (
    <div className="container mx-auto px-3 sm:px-6 py-4 sm:py-6 max-w-4xl">
      <div className="mb-4 sm:mb-6">
        <Button
          variant="outline"
          onClick={handleBackToDashboard}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại Dashboard
        </Button>

        <div className="flex items-center gap-3 mb-2">
          <UserCheck className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
          <h1 className="text-xl sm:text-2xl font-bold">
            Quản Lý Cập Nhật CCCD
          </h1>
        </div>
        <p className="text-sm sm:text-base text-gray-600">
          Tìm kiếm và cập nhật số CCCD cho nhân viên trong hệ thống
        </p>
      </div>

      {updateResult && (
        <Alert
          className={`mb-6 ${updateResult.success ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}`}
        >
          <div className="flex items-center gap-2">
            {updateResult.success ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600" />
            )}
            <AlertDescription
              className={
                updateResult.success ? "text-green-800" : "text-red-800"
              }
            >
              {updateResult.message}
            </AlertDescription>
          </div>
        </Alert>
      )}

      <div className="grid gap-6">
        {!selectedEmployee ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Tìm Kiếm Nhân Viên
              </CardTitle>
              <CardDescription>
                Nhập mã nhân viên hoặc tên để tìm kiếm nhân viên cần cập nhật
                CCCD
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmployeeSearchForm onEmployeeSelect={handleEmployeeSelect} />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Thông Tin Nhân Viên</CardTitle>
                  <Button variant="outline" size="sm" onClick={handleBack}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Chọn nhân viên khác
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Mã nhân viên
                    </label>
                    <p className="text-lg font-semibold">
                      {selectedEmployee.employee_id}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Họ và tên
                    </label>
                    <p className="text-lg font-semibold">
                      {selectedEmployee.full_name}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Phòng ban
                    </label>
                    <p className="text-lg">{selectedEmployee.department}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Chức vụ
                    </label>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {selectedEmployee.chuc_vu}
                      </Badge>
                      {selectedEmployee.is_active && (
                        <Badge
                          variant="default"
                          className="bg-green-100 text-green-800"
                        >
                          Đang hoạt động
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cập Nhật Số CCCD</CardTitle>
                <CardDescription>
                  Nhập số CCCD mới cho nhân viên {selectedEmployee.full_name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CCCDUpdateForm
                  onSubmit={handleCCCDUpdate}
                  isLoading={isUpdating}
                  employeeName={selectedEmployee.full_name}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
