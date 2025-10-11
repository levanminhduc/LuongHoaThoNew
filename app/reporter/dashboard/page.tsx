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
import { getPreviousMonth } from "@/utils/dateUtils";
import { type JWTPayload } from "@/lib/auth";
import {
  type MonthStatus,
  type SignatureRecord,
} from "@/lib/management-signature-utils";
import {
  FileText,
  BarChart3,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  Database,
  PenTool,
  FileSpreadsheet,
  LogOut,
  Eye,
  Users,
} from "lucide-react";
import { formatTimestampFromDBRaw } from "@/lib/utils/vietnam-timezone";

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
  const [showEmployeeManagementModal, setShowEmployeeManagementModal] = useState(false);
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
      }

      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setSignatureHistory(historyData.signatures || []);
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

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    router.push("/admin/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải dashboard báo cáo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 space-y-4 sm:space-y-0">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                Dashboard Người Lập Biểu
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 truncate">
                MAY HÒA THỌ ĐIỆN BÀN - Xác nhận báo cáo và thống kê
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <Button
                variant="outline"
                onClick={() => setShowOverviewModal(true)}
                className="hidden sm:flex"
              >
                <Eye className="h-4 w-4 mr-2" />
                Xem Tổng Quan
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOverviewModal(true)}
                className="sm:hidden"
              >
                <Eye className="h-4 w-4" />
                Xem Tổng Quan
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowEmployeeManagementModal(true)}
                className="hidden sm:flex"
              >
                <Users className="h-4 w-4 mr-2" />
                Quản Lý Nhân Viên
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowEmployeeManagementModal(true)}
                className="sm:hidden bg-purple-600 hover:bg-purple-700"
              >
                <Users className="h-4 w-4" />
                Quản Lý NV
              </Button>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => {
                    const date = new Date();
                    date.setMonth(date.getMonth() - i);
                    const value = date.toISOString().slice(0, 7);
                    return (
                      <SelectItem key={value} value={value}>
                        {date.toLocaleDateString("vi-VN", {
                          year: "numeric",
                          month: "long",
                        })}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Đăng Xuất
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {message && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {monthStatus && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card
              className="bg-gradient-to-r from-purple-500 to-purple-600 text-white cursor-pointer hover:from-purple-600 hover:to-purple-700 transition-all duration-200"
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
                <p className="text-xs text-purple-100">
                  Bản ghi cần báo cáo • Click để xem chi tiết
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
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
                <p className="text-xs text-blue-100">
                  {monthStatus.employee_completion.completion_percentage.toFixed(
                    1,
                  )}
                  % hoàn thành
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Xác Nhận BC
                </CardTitle>
                <PenTool className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {monthStatus.management_signatures.nguoi_lap_bieu
                    ? "✅"
                    : "⏳"}
                </div>
                <p className="text-xs text-green-100">
                  {monthStatus.management_signatures.nguoi_lap_bieu
                    ? "Đã ký"
                    : "Chờ ký"}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
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
                <p className="text-xs text-orange-100">
                  {monthStatus.summary.is_fully_signed
                    ? "Hoàn thành"
                    : "Đang xử lý"}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="reports" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Xác Nhận Báo Cáo
            </TabsTrigger>
            <TabsTrigger value="statistics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Thống Kê Dữ Liệu
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Lịch Sử BC
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
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
                        <p className="text-sm text-green-600">
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
                          <ul className="text-sm text-blue-700 space-y-1">
                            <li>✅ Kiểm tra tính đầy đủ của dữ liệu</li>
                            <li>✅ Xác minh tính chính xác thống kê</li>
                            <li>✅ Đối chiếu với báo cáo tháng trước</li>
                            <li>✅ Kiểm tra format và cấu trúc báo cáo</li>
                          </ul>
                        </div>
                        <Button
                          onClick={handleSignature}
                          disabled={isSigning}
                          className="w-full bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSigning ? (
                            <>
                              <Clock className="h-4 w-4 mr-2 animate-spin" />
                              Đang xử lý...
                            </>
                          ) : (
                            <>
                              <PenTool className="h-4 w-4 mr-2" />
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

          <TabsContent value="statistics" className="space-y-6">
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
                        {monthStatus?.management_signatures.ke_toan
                          ? "✅"
                          : "⏳"}
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
                        {monthStatus?.employee_completion
                          .is_100_percent_complete
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

          <TabsContent value="history" className="space-y-6">
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
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
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
                        <Badge variant="secondary">
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
      </div>

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
    </div>
  );
}
