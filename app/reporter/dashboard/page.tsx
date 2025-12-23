"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import EmployeeListModal from "@/components/EmployeeListModal";
import OverviewModal from "@/components/OverviewModal";
import EmployeeManagementModal from "@/components/EmployeeManagementModal";
import UnsignedEmployeesModal from "@/components/UnsignedEmployeesModal";
import { getPreviousMonth } from "@/utils/dateUtils";
import { type JWTPayload } from "@/lib/auth";
import {
  type MonthStatus,
  type SignatureRecord,
} from "@/lib/management-signature-utils";
import {
  FileText,
  BarChart3,
  CheckCircle,
  Clock,
  AlertCircle,
  Database,
  PenTool,
  FileSpreadsheet,
  Eye,
  Users,
  UserX,
} from "lucide-react";
import { formatTimestampFromDBRaw } from "@/lib/utils/vietnam-timezone";
import DashboardCache from "@/utils/dashboardCache";
import { PageLoading } from "@/components/ui/skeleton-patterns";

export default function ReporterDashboard() {
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] =
    useState<string>(getPreviousMonth());
  const [monthStatus, setMonthStatus] = useState<MonthStatus | null>(null);
  const [signatureHistory, setSignatureHistory] = useState<SignatureRecord[]>(
    [],
  );
  const [message, setMessage] = useState("");
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showOverviewModal, setShowOverviewModal] = useState(false);
  const [showUnsignedModal, setShowUnsignedModal] = useState(false);
  const [showEmployeeManagementModal, setShowEmployeeManagementModal] =
    useState(false);
  const [user, setUser] = useState<JWTPayload | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Load user info from localStorage
    const userStr = localStorage.getItem("user_info");
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
      } catch (error) {
        console.error("Error parsing user info:", error);
      }
    }

    fetchDashboardData();
  }, [selectedMonth]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const cachedStatus = DashboardCache.getCacheData<MonthStatus>(
        "reporter",
        selectedMonth,
        "signature-status",
      );
      const cachedHistory = DashboardCache.getCacheData<SignatureRecord[]>(
        "reporter",
        selectedMonth,
        "signature-history",
      );

      if (cachedStatus && cachedHistory) {
        setMonthStatus(cachedStatus);
        setSignatureHistory(cachedHistory);
        setLoading(false);
        return;
      }

      const token = localStorage.getItem("admin_token");

      const [statusResponse, historyResponse] = await Promise.all([
        fetch(`/api/signature-status/${selectedMonth}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/signature-history?signature_type=nguoi_lap_bieu&limit=10`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setMonthStatus(statusData);
        DashboardCache.setCacheData(
          "reporter",
          selectedMonth,
          "signature-status",
          statusData,
        );
      }

      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        const signatures = historyData.signatures || [];
        setSignatureHistory(signatures);
        DashboardCache.setCacheData(
          "reporter",
          selectedMonth,
          "signature-history",
          signatures,
        );
      }

      if (statusResponse.status === 401 || historyResponse.status === 401) {
        localStorage.removeItem("admin_token");
        router.push("/admin/login");
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setMessage("Lỗi khi tải dữ liệu dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleSignature = async () => {
    if (isSigning) return;

    setIsSigning(true);
    try {
      const token = localStorage.getItem("admin_token");
      const response = await fetch("/api/management-signature", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          salary_month: selectedMonth,
          signature_type: "nguoi_lap_bieu",
          notes: "Xác nhận báo cáo và thống kê lương tháng",
          device_info: navigator.userAgent,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setMessage("Ký xác nhận báo cáo thành công!");
        fetchDashboardData();
      } else {
        setMessage(data.error || "Có lỗi xảy ra khi ký");
      }
    } catch (error) {
      setMessage("Lỗi kết nối khi ký xác nhận");
    } finally {
      setIsSigning(false);
    }
  };

  if (loading) {
    return <PageLoading variant="dashboard" />;
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 sm:pb-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
            Dashboard Người Lập Biểu
          </h1>
          <p className="text-sm text-gray-600">Tháng: {selectedMonth}</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowOverviewModal(true)}
              className="w-full sm:w-auto min-h-[44px] sm:min-h-0 touch-manipulation"
            >
              <Eye className="mr-2 h-4 w-4" />
              Tổng Quan
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUnsignedModal(true)}
              disabled={!monthStatus}
              className="w-full border-red-200 hover:bg-red-50 sm:w-auto min-h-[44px] sm:min-h-0 touch-manipulation"
            >
              <UserX className="mr-2 h-4 w-4 text-red-600" />
              <span className="text-red-700">Chưa Ký</span>
              {monthStatus && (
                <Badge className="ml-2 bg-red-600 text-white">
                  {monthStatus.employee_completion.total_employees -
                    monthStatus.employee_completion.signed_employees}
                </Badge>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEmployeeManagementModal(true)}
              className="w-full sm:w-auto min-h-[44px] sm:min-h-0 touch-manipulation col-span-2"
            >
              <Users className="mr-2 h-4 w-4" />
              Quản Lý NV
            </Button>
          </div>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-full sm:w-40 min-h-[44px] sm:min-h-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                const value = date.toISOString().slice(0, 7);
                return (
                  <SelectItem
                    key={value}
                    value={value}
                    className="min-h-[44px] sm:min-h-0"
                  >
                    {date.toLocaleDateString("vi-VN", {
                      year: "numeric",
                      month: "long",
                    })}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>
      {message && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {monthStatus && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6 mb-6 sm:mb-8">
          <Card
            className="bg-gradient-to-r from-purple-500 to-purple-600 text-white cursor-pointer hover:from-purple-600 hover:to-purple-700 transition-all duration-200 shadow-md"
            onClick={() => setShowEmployeeModal(true)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Tổng Dữ Liệu
              </CardTitle>
              <Database className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {monthStatus.employee_completion.total_employees}
              </div>
              <p className="text-xs text-purple-100 mt-1">
                Bản ghi cần báo cáo • Chạm để xem
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Đã Hoàn Thành
              </CardTitle>
              <CheckCircle className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {monthStatus.employee_completion.signed_employees}
              </div>
              <p className="text-xs text-blue-100 mt-1">
                {monthStatus.employee_completion.completion_percentage.toFixed(
                  1,
                )}
                % hoàn thành
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Xác Nhận BC</CardTitle>
              <PenTool className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {monthStatus.management_signatures.nguoi_lap_bieu ? "✅" : "⏳"}
              </div>
              <p className="text-xs text-green-100 mt-1">
                {monthStatus.management_signatures.nguoi_lap_bieu
                  ? "Đã ký"
                  : "Chờ ký"}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Độ Chính Xác
              </CardTitle>
              <BarChart3 className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {monthStatus.employee_completion.is_100_percent_complete
                  ? "100%"
                  : "CHƯA"}
              </div>
              <p className="text-xs text-orange-100 mt-1">
                {monthStatus.summary.is_fully_signed
                  ? "Hoàn thành"
                  : "Đang xử lý"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="reports" className="space-y-4 sm:space-y-6">
        <TabsList className="flex h-auto w-full flex-wrap gap-2 bg-transparent p-0 sm:grid sm:grid-cols-3 sm:bg-muted sm:p-1">
          <TabsTrigger
            value="reports"
            className="flex-1 min-h-[44px] border data-[state=active]:border-primary data-[state=active]:bg-primary/5 sm:border-none sm:data-[state=active]:bg-background"
          >
            <FileText className="mr-2 h-4 w-4" />
            Xác Nhận BC
          </TabsTrigger>
          <TabsTrigger
            value="statistics"
            className="flex-1 min-h-[44px] border data-[state=active]:border-primary data-[state=active]:bg-primary/5 sm:border-none sm:data-[state=active]:bg-background"
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            Thống Kê
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="flex-1 min-h-[44px] border data-[state=active]:border-primary data-[state=active]:bg-primary/5 sm:border-none sm:data-[state=active]:bg-background"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Lịch Sử
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <FileText className="h-5 w-5" />
                Xác Nhận Báo Cáo Lương Tháng {selectedMonth}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {monthStatus?.employee_completion.is_100_percent_complete ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-green-700">
                      100% dữ liệu đã hoàn thành - Sẵn sàng xác nhận báo cáo
                    </span>
                  </div>

                  {monthStatus.management_signatures.nguoi_lap_bieu ? (
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-green-800 font-medium">
                        ✅ Đã xác nhận báo cáo
                      </p>
                      <p className="text-sm text-green-600 mt-1">
                        Ký bởi:{" "}
                        {
                          monthStatus.management_signatures.nguoi_lap_bieu
                            .signed_by_name
                        }
                      </p>
                      <p className="text-sm text-green-600">
                        Thời gian:{" "}
                        {formatTimestampFromDBRaw(
                          monthStatus.management_signatures.nguoi_lap_bieu
                            .signed_at,
                        )}
                      </p>
                      {monthStatus.management_signatures.nguoi_lap_bieu
                        .notes && (
                        <p className="text-sm text-green-600 mt-2">
                          Ghi chú:{" "}
                          {
                            monthStatus.management_signatures.nguoi_lap_bieu
                              .notes
                          }
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-800 mb-2">
                          Checklist Xác Nhận Báo Cáo:
                        </h4>
                        <ul className="text-sm text-blue-700 space-y-1 pl-1">
                          <li>✅ Kiểm tra tính đầy đủ của dữ liệu</li>
                          <li>✅ Xác minh tính chính xác thống kê</li>
                          <li>✅ Đối chiếu với báo cáo tháng trước</li>
                          <li>✅ Kiểm tra format và cấu trúc báo cáo</li>
                        </ul>
                      </div>
                      <Button
                        onClick={handleSignature}
                        disabled={isSigning}
                        className="w-full bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] text-base"
                      >
                        {isSigning ? (
                          <>
                            <Clock className="h-5 w-5 mr-2 animate-spin" />
                            Đang xử lý...
                          </>
                        ) : (
                          <>
                            <PenTool className="h-5 w-5 mr-2" />
                            Ký Xác Nhận Báo Cáo
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-5 w-5 text-yellow-500" />
                    <span className="text-yellow-800 font-medium">
                      Chờ dữ liệu hoàn thành
                    </span>
                  </div>
                  <p className="text-sm text-yellow-700">
                    Hiện tại:{" "}
                    {monthStatus?.employee_completion.signed_employees}/
                    {monthStatus?.employee_completion.total_employees} bản ghi
                    đã hoàn thành (
                    {monthStatus?.employee_completion.completion_percentage.toFixed(
                      1,
                    )}
                    %)
                  </p>
                  <p className="text-sm text-yellow-700 mt-2">
                    Cần đợi 100% dữ liệu hoàn thành trước khi có thể xác nhận
                    báo cáo.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statistics" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Thống Kê Dữ Liệu Tháng {selectedMonth}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h4 className="font-medium mb-2 text-purple-800">
                      Tổng Quan Dữ Liệu
                    </h4>
                    <p className="text-sm text-purple-600">
                      Tổng bản ghi:{" "}
                      {monthStatus?.employee_completion.total_employees}
                    </p>
                    <p className="text-sm text-purple-600">
                      Đã xử lý:{" "}
                      {monthStatus?.employee_completion.signed_employees}
                    </p>
                    <p className="text-sm text-purple-600">
                      Tỷ lệ:{" "}
                      {monthStatus?.employee_completion.completion_percentage.toFixed(
                        1,
                      )}
                      %
                    </p>
                  </div>
                  {/* Updated to green color scheme to match signature cards */}
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-medium mb-2 text-green-800">
                      Trạng Thái Xác Nhận
                    </h4>
                    <p className="text-sm text-green-700">
                      Giám đốc:{" "}
                      {monthStatus?.management_signatures.giam_doc
                        ? "✅"
                        : "⏳"}
                    </p>
                    <p className="text-sm text-green-700">
                      Kế toán:{" "}
                      {monthStatus?.management_signatures.ke_toan ? "✅" : "⏳"}
                    </p>
                    <p className="text-sm text-green-700">
                      Báo cáo:{" "}
                      {monthStatus?.management_signatures.nguoi_lap_bieu
                        ? "✅"
                        : "⏳"}
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-medium mb-2 text-green-800">
                      Tiến Độ Hoàn Thành
                    </h4>
                    <p className="text-sm text-green-600">
                      Dữ liệu:{" "}
                      {monthStatus?.employee_completion.is_100_percent_complete
                        ? "✅ Hoàn thành"
                        : "⏳ Đang xử lý"}
                    </p>
                    <p className="text-sm text-green-600">
                      Xác nhận: {monthStatus?.summary.completed_signatures}/3
                    </p>
                    <p className="text-sm text-green-600">
                      Tổng thể:{" "}
                      {monthStatus?.summary.is_fully_signed
                        ? "✅ Hoàn thành"
                        : "⏳ Đang xử lý"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Lịch Sử Xác Nhận Báo Cáo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {signatureHistory.length > 0 ? (
                  signatureHistory.map((signature) => (
                    <div
                      key={signature.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 sm:p-3 bg-gray-50 rounded-lg gap-2"
                    >
                      <div>
                        <p className="font-medium">
                          {signature.signed_by_name}
                        </p>
                        <p className="text-sm text-gray-600">
                          Tháng {signature.salary_month}
                        </p>
                        {signature.notes && (
                          <p className="text-sm text-gray-500 mt-1">
                            {signature.notes}
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary" className="w-fit">
                        {formatTimestampFromDBRaw(signature.signed_at)}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Chưa có lịch sử xác nhận báo cáo</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {/* Employee List Modal */}
      <EmployeeListModal
        isOpen={showEmployeeModal}
        onClose={() => setShowEmployeeModal(false)}
        selectedMonth={selectedMonth}
        userRole="nguoi_lap_bieu"
        totalEmployees={monthStatus?.employee_completion.total_employees}
      />

      {/* Overview Modal */}
      {user && (
        <OverviewModal
          isOpen={showOverviewModal}
          onClose={() => setShowOverviewModal(false)}
          user={user}
          initialMonth={selectedMonth}
        />
      )}

      <EmployeeManagementModal
        isOpen={showEmployeeManagementModal}
        onClose={() => setShowEmployeeManagementModal(false)}
        userRole="nguoi_lap_bieu"
      />

      <UnsignedEmployeesModal
        isOpen={showUnsignedModal}
        onClose={() => setShowUnsignedModal(false)}
        selectedMonth={selectedMonth}
        userRole="nguoi_lap_bieu"
        totalUnsigned={
          monthStatus
            ? monthStatus.employee_completion.total_employees -
              monthStatus.employee_completion.signed_employees
            : undefined
        }
      />
    </div>
  );
}
