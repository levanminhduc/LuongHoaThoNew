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
import UnsignedEmployeesModal from "@/components/UnsignedEmployeesModal";
import { getPreviousMonth } from "@/utils/dateUtils";
import { type JWTPayload } from "@/lib/auth";
import {
  type MonthStatus,
  type SignatureRecord,
} from "@/lib/management-signature-utils";
import {
  Calculator,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  PenTool,
  BarChart3,
  Eye,
  UserX,
} from "lucide-react";
import { formatTimestampFromDBRaw } from "@/lib/utils/vietnam-timezone";
import DashboardCache from "@/utils/dashboardCache";
import { PageLoading } from "@/components/ui/skeleton-patterns";

export default function AccountantDashboard() {
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
        "accountant",
        selectedMonth,
        "signature-status",
      );
      const cachedHistory = DashboardCache.getCacheData<SignatureRecord[]>(
        "accountant",
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
        fetch(`/api/signature-history?signature_type=ke_toan&limit=10`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setMonthStatus(statusData);
        DashboardCache.setCacheData(
          "accountant",
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
          "accountant",
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
          signature_type: "ke_toan",
          notes: "Xác nhận tính chính xác lương tháng",
          device_info: navigator.userAgent,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setMessage("Ký xác nhận kế toán thành công!");
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
            Dashboard Kế Toán
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
            className="bg-gradient-to-r from-green-500 to-green-600 text-white cursor-pointer hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-md"
            onClick={() => setShowEmployeeModal(true)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Tổng Nhân Viên
              </CardTitle>
              <Calculator className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {monthStatus.employee_completion.total_employees}
              </div>
              <p className="text-xs text-green-100 mt-1">
                Cần xác nhận tài chính • Chạm để xem
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Đã Ký Lương</CardTitle>
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
              <CardTitle className="text-sm font-medium">Xác Nhận KT</CardTitle>
              <PenTool className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {monthStatus.management_signatures.ke_toan ? "✅" : "⏳"}
              </div>
              <p className="text-xs text-green-100 mt-1">
                {monthStatus.management_signatures.ke_toan ? "Đã ký" : "Chờ ký"}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trạng Thái</CardTitle>
              <BarChart3 className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {monthStatus.employee_completion.is_100_percent_complete
                  ? "SẴN SÀNG"
                  : "CHỜ"}
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

      <Tabs defaultValue="financial" className="space-y-4 sm:space-y-6">
        <TabsList className="flex h-auto w-full flex-wrap gap-2 bg-transparent p-0 sm:grid sm:grid-cols-3 sm:bg-muted sm:p-1">
          <TabsTrigger
            value="financial"
            className="flex-1 min-h-[44px] border data-[state=active]:border-primary data-[state=active]:bg-primary/5 sm:border-none sm:data-[state=active]:bg-background"
          >
            <DollarSign className="mr-2 h-4 w-4" />
            Xác Nhận TC
          </TabsTrigger>
          <TabsTrigger
            value="verification"
            className="flex-1 min-h-[44px] border data-[state=active]:border-primary data-[state=active]:bg-primary/5 sm:border-none sm:data-[state=active]:bg-background"
          >
            <Calculator className="mr-2 h-4 w-4" />
            Kiểm Tra
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="flex-1 min-h-[44px] border data-[state=active]:border-primary data-[state=active]:bg-primary/5 sm:border-none sm:data-[state=active]:bg-background"
          >
            <FileText className="mr-2 h-4 w-4" />
            Lịch Sử
          </TabsTrigger>
        </TabsList>

        <TabsContent value="financial" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <DollarSign className="h-5 w-5" />
                Xác Nhận Tài Chính Lương Tháng {selectedMonth}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {monthStatus?.employee_completion.is_100_percent_complete ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-green-700">
                      100% nhân viên đã ký lương - Kế Toán có thể ký
                    </span>
                  </div>

                  {monthStatus.management_signatures.ke_toan ? (
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-green-800 font-medium">
                        ✅ Đã xác nhận tài chính
                      </p>
                      <p className="text-sm text-green-600 mt-1">
                        Ký bởi:{" "}
                        {
                          monthStatus.management_signatures.ke_toan
                            .signed_by_name
                        }
                      </p>
                      <p className="text-sm text-green-600">
                        Thời gian:{" "}
                        {formatTimestampFromDBRaw(
                          monthStatus.management_signatures.ke_toan.signed_at,
                        )}
                      </p>
                      {monthStatus.management_signatures.ke_toan.notes && (
                        <p className="text-sm text-green-600 mt-2">
                          Ghi chú:{" "}
                          {monthStatus.management_signatures.ke_toan.notes}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-800 mb-2">
                          Checklist Xác Nhận Tài Chính:
                        </h4>
                        <ul className="text-sm text-blue-700 space-y-1 pl-1">
                          <li>✅ Kiểm tra tổng số tiền lương</li>
                          <li>✅ Xác minh các khoản khấu trừ</li>
                          <li>✅ Đối chiếu với ngân sách tháng</li>
                          <li>✅ Kiểm tra tính chính xác tính toán</li>
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
                            Ký Xác Nhận Kế Toán
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
                      Chờ nhân viên ký đủ
                    </span>
                  </div>
                  <p className="text-sm text-yellow-700">
                    Hiện tại:{" "}
                    {monthStatus?.employee_completion.signed_employees}/
                    {monthStatus?.employee_completion.total_employees} nhân viên
                    đã ký (
                    {monthStatus?.employee_completion.completion_percentage.toFixed(
                      1,
                    )}
                    %)
                  </p>
                  <p className="text-sm text-yellow-700 mt-2">
                    Cần đợi 100% nhân viên ký lương trước khi có thể xác nhận
                    tài chính.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verification" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Kiểm Tra Tính Toán Lương</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2">Thống Kê Nhân Viên</h4>
                    <p className="text-sm text-gray-600">
                      Tổng số:{" "}
                      {monthStatus?.employee_completion.total_employees} nhân
                      viên
                    </p>
                    <p className="text-sm text-gray-600">
                      Đã ký: {monthStatus?.employee_completion.signed_employees}{" "}
                      nhân viên
                    </p>
                    <p className="text-sm text-gray-600">
                      Tỷ lệ:{" "}
                      {monthStatus?.employee_completion.completion_percentage.toFixed(
                        1,
                      )}
                      %
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-medium mb-2 text-green-800">
                      Trạng Thái Xác Nhận
                    </h4>
                    <p className="text-sm text-green-700">
                      Giám đốc:{" "}
                      {monthStatus?.management_signatures.giam_doc
                        ? "✅ Đã ký"
                        : "⏳ Chờ ký"}
                    </p>
                    <p className="text-sm text-green-700">
                      Kế toán:{" "}
                      {monthStatus?.management_signatures.ke_toan
                        ? "✅ Đã ký"
                        : "⏳ Chờ ký"}
                    </p>
                    <p className="text-sm text-green-700">
                      Người lập biểu:{" "}
                      {monthStatus?.management_signatures.nguoi_lap_bieu
                        ? "✅ Đã ký"
                        : "⏳ Chờ ký"}
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
              <CardTitle>Lịch Sử Xác Nhận Kế Toán</CardTitle>
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
                    <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Chưa có lịch sử xác nhận kế toán</p>
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
        userRole="ke_toan"
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

      <UnsignedEmployeesModal
        isOpen={showUnsignedModal}
        onClose={() => setShowUnsignedModal(false)}
        selectedMonth={selectedMonth}
        userRole="ke_toan"
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
