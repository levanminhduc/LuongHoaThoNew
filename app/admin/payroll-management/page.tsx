"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Settings, Shield, CheckCircle, AlertTriangle } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { EmployeeSearch } from "./components/EmployeeSearch";
import { PayrollEditForm } from "./components/PayrollEditForm";
import { AuditTrail } from "./components/AuditTrail";
import type {
  PayrollSearchResult,
  PayrollData,
  PayrollUpdateRequest,
} from "./types";
import {
  usePayrollDetailQuery,
  useUpdatePayrollMutation,
} from "@/lib/hooks/use-payroll";

export default function PayrollManagementPage() {
  const router = useRouter();
  const [selectedEmployee, setSelectedEmployee] =
    useState<PayrollSearchResult | null>(null);
  const [payrollData, setPayrollData] = useState<PayrollData | null>(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const selectedPayrollId = selectedEmployee?.payroll_id ?? null;
  const payrollDetailQuery = usePayrollDetailQuery<PayrollData>(selectedPayrollId);
  const updatePayrollMutation = useUpdatePayrollMutation<PayrollData>();
  const loading = payrollDetailQuery.isFetching;
  const saving = updatePayrollMutation.isPending;

  // Check admin authentication on mount
  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      router.push("/admin");
      return;
    }
  }, [router]);

  const handleEmployeeSelect = async (employee: PayrollSearchResult) => {
    setSelectedEmployee(employee);
    setError("");
    setSuccessMessage("");
  };

  useEffect(() => {
    if (!payrollDetailQuery.data) return;

    setPayrollData(payrollDetailQuery.data.payroll);
  }, [payrollDetailQuery.data]);

  useEffect(() => {
    if (!payrollDetailQuery.error) return;

    setPayrollData(null);
    setError(
      payrollDetailQuery.error instanceof Error
        ? payrollDetailQuery.error.message
        : "Lỗi khi tải dữ liệu lương",
    );
  }, [payrollDetailQuery.error]);

  const handleSavePayroll = async (updateRequest: PayrollUpdateRequest) => {
    if (!payrollData) return;

    setError("");
    setSuccessMessage("");

    try {
      const data = await updatePayrollMutation.mutateAsync({
        payrollId: payrollData.id,
        ...updateRequest,
      });
      setPayrollData(data.payroll);
      setSuccessMessage(`Cập nhật thành công ${data.changesCount} thay đổi`);
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Có lỗi xảy ra khi cập nhật dữ liệu lương",
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Quản Lý Lương Chi Tiết
          </h1>
          <p className="text-sm text-gray-600">
            MAY HÒA THỌ ĐIỆN BÀN - Chỉnh sửa thông tin lương nhân viên
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-green-600" />
          <span className="text-sm text-green-600 font-medium">
            Admin Access
          </span>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Employee Search Section */}
      <div className="mb-8">
        <EmployeeSearch
          onEmployeeSelect={handleEmployeeSelect}
          selectedEmployee={selectedEmployee}
        />
      </div>

      {/* Loading State */}
      {loading && (
        <Card className="mb-8">
          <CardContent className="p-8 text-center">
            <div className="flex justify-center py-4">
              <Spinner size="lg" />
            </div>
            <p className="text-gray-600">Đang tải dữ liệu lương...</p>
          </CardContent>
        </Card>
      )}

      {/* Main Content Grid */}
      {!loading && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Payroll Edit Form - Takes 2 columns */}
          <div className="xl:col-span-2">
            <PayrollEditForm
              payrollData={payrollData}
              onSave={handleSavePayroll}
              loading={saving}
            />
          </div>

          {/* Audit Trail - Takes 1 column */}
          <div className="xl:col-span-1">
            <AuditTrail payrollId={payrollData?.id || null} />
          </div>
        </div>
      )}

      {/* Instructions Card */}
      {!selectedEmployee && (
        <Card className="mt-8 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800">Hướng Dẫn Sử Dụng</CardTitle>
          </CardHeader>
          <CardContent className="text-blue-700">
            <div className="space-y-2">
              <p>
                <strong>Bước 1:</strong> Tìm kiếm nhân viên theo mã nhân viên
                hoặc tên
              </p>
              <p>
                <strong>Bước 2:</strong> Chọn bản ghi lương cần chỉnh sửa
              </p>
              <p>
                <strong>Bước 3:</strong> Thực hiện các thay đổi cần thiết trong
                form
              </p>
              <p>
                <strong>Bước 4:</strong> Nhập lý do thay đổi và lưu
              </p>
              <p>
                <strong>Lưu ý:</strong> Tất cả thay đổi sẽ được ghi lại trong
                lịch sử audit
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
