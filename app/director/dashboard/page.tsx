"use client";

import { useState, useEffect } from "react";
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
import { getPreviousMonth, getRecentMonthOptions } from "@/utils/dateUtils";
import { type JWTPayload } from "@/lib/auth";
import {
  FileSpreadsheet,
  Users,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  PenTool,
  BarChart3,
  Eye,
  UserX,
} from "lucide-react";
import { formatTimestampFromDBRaw } from "@/lib/utils/vietnam-timezone";
import { PageLoading } from "@/components/patterns/skeleton-patterns";
import {
  useManagementSignatureMutation,
  useSignatureHistoryQuery,
  useSignatureStatusQuery,
} from "@/lib/hooks/use-dashboard";

export default function DirectorDashboard() {
  const [selectedMonth, setSelectedMonth] =
    useState<string>(getPreviousMonth());
  const [message, setMessage] = useState("");
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showOverviewModal, setShowOverviewModal] = useState(false);
  const [showUnsignedModal, setShowUnsignedModal] = useState(false);
  const [user, setUser] = useState<JWTPayload | null>(null);
  const statusQuery = useSignatureStatusQuery(selectedMonth);
  const historyQuery = useSignatureHistoryQuery({ limit: 10 });
  const signatureMutation = useManagementSignatureMutation();
  const monthStatus = statusQuery.data ?? null;
  const signatureHistory = historyQuery.data?.signatures ?? [];
  const loading = statusQuery.isLoading || historyQuery.isLoading;
  const isSigning = signatureMutation.isPending;

  useEffect(() => {
    const userStr = localStorage.getItem("user_info");
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
      } catch (error) {
        console.error("Error parsing user info:", error);
      }
    }
  }, []);

  useEffect(() => {
    if (statusQuery.error || historyQuery.error) {
      setMessage("Lỗi khi tải dữ liệu dashboard");
    }
  }, [historyQuery.error, statusQuery.error]);

  const handleSignature = async () => {
    if (isSigning) return;

    try {
      const data = await signatureMutation.mutateAsync({
          salary_month: selectedMonth,
          signature_type: "giam_doc",
          notes: "Xác nhận lương tháng từ Giám Đốc",
          device_info: navigator.userAgent,
      });

      const result = data as { success?: boolean; error?: string };
      if (result.success === false) {
        setMessage(result.error || "Có lỗi xảy ra khi ký");
      } else {
        setMessage("Ký xác nhận thành công!");
      }
    } catch {
      setMessage("Lỗi kết nối khi ký xác nhận");
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
            Dashboard Giám Đốc
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
              {getRecentMonthOptions().map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="min-h-[44px] sm:min-h-0"
                >
                  {option.label}
                </SelectItem>
              ))}
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
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white cursor-pointer hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md"
            onClick={() => setShowEmployeeModal(true)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Tổng Nhân Viên
              </CardTitle>
              <Users className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {monthStatus.employee_completion.total_employees}
              </div>
              <p className="text-xs text-blue-100 mt-1">
                Tháng: {selectedMonth} • Chạm để xem
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Đã Ký Lương</CardTitle>
              <CheckCircle className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {monthStatus.employee_completion.signed_employees}
              </div>
              <p className="text-xs text-green-100 mt-1">
                {monthStatus.employee_completion.completion_percentage.toFixed(
                  1,
                )}
                % hoàn thành
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ký Xác Nhận</CardTitle>
              <PenTool className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {monthStatus.summary.completed_signatures}/3
              </div>
              <p className="text-xs text-green-100 mt-1">
                Management signatures
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

      <Tabs defaultValue="signature" className="space-y-4 sm:space-y-6">
        <TabsList className="flex h-auto w-full flex-wrap gap-2 bg-transparent p-0 sm:grid sm:grid-cols-3 sm:bg-muted sm:p-1">
          <TabsTrigger
            value="signature"
            className="flex-1 min-h-[44px] border data-[state=active]:border-primary data-[state=active]:bg-primary/5 sm:border-none sm:data-[state=active]:bg-background"
          >
            <PenTool className="mr-2 h-4 w-4" />
            Ký Xác Nhận
          </TabsTrigger>
          <TabsTrigger
            value="progress"
            className="flex-1 min-h-[44px] border data-[state=active]:border-primary data-[state=active]:bg-primary/5 sm:border-none sm:data-[state=active]:bg-background"
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            Tiến Độ
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="flex-1 min-h-[44px] border data-[state=active]:border-primary data-[state=active]:bg-primary/5 sm:border-none sm:data-[state=active]:bg-background"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Lịch Sử
          </TabsTrigger>
        </TabsList>

        <TabsContent value="signature" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <PenTool className="h-5 w-5" />
                Ký Xác Nhận Lương Tháng {selectedMonth}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {monthStatus?.employee_completion.is_100_percent_complete ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-green-700">
                      100% nhân viên đã ký lương
                    </span>
                  </div>

                  {monthStatus.management_signatures.giam_doc ? (
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-green-800 font-medium">
                        ✅ Đã ký xác nhận
                      </p>
                      <p className="text-sm text-green-600 mt-1">
                        Ký bởi:{" "}
                        {
                          monthStatus.management_signatures.giam_doc
                            .signed_by_name
                        }
                      </p>
                      <p className="text-sm text-green-600">
                        Thời gian:{" "}
                        {formatTimestampFromDBRaw(
                          monthStatus.management_signatures.giam_doc.signed_at,
                        )}
                      </p>
                    </div>
                  ) : (
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
                          Ký Xác Nhận Giám Đốc
                        </>
                      )}
                    </Button>
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
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tiến Độ Ký Xác Nhận</CardTitle>
            </CardHeader>
            <CardContent>
              {monthStatus && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Updated to green color scheme to match signature cards */}
                    <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="text-2xl font-bold text-green-600">
                        {monthStatus.management_signatures.giam_doc
                          ? "✅"
                          : "⏳"}
                      </div>
                      <p className="text-sm text-green-800 mt-2">Giám Đốc</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="text-2xl font-bold text-green-600">
                        {monthStatus.management_signatures.ke_toan
                          ? "✅"
                          : "⏳"}
                      </div>
                      <p className="text-sm text-green-800 mt-2">Kế Toán</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="text-2xl font-bold text-green-600">
                        {monthStatus.management_signatures.nguoi_lap_bieu
                          ? "✅"
                          : "⏳"}
                      </div>
                      <p className="text-sm text-green-800 mt-2">
                        Người Lập Biểu
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Lịch Sử Ký Xác Nhận</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {signatureHistory.map((signature) => (
                  <div
                    key={signature.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 sm:p-3 bg-gray-50 rounded-lg gap-2"
                  >
                    <div>
                      <p className="font-medium">{signature.signed_by_name}</p>
                      <p className="text-sm text-gray-600">
                        {signature.signature_type} - {signature.salary_month}
                      </p>
                    </div>
                    <Badge variant="secondary" className="w-fit">
                      {formatTimestampFromDBRaw(signature.signed_at)}
                    </Badge>
                  </div>
                ))}
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
        userRole="giam_doc"
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
        userRole="giam_doc"
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
