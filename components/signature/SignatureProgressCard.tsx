"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Users,
  CheckCircle,
  Clock,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
} from "lucide-react";

interface EmployeeCompletion {
  total_employees: number;
  signed_employees: number;
  completion_percentage: number;
  is_100_percent_complete: boolean;
  unsigned_employees_sample?: Array<{
    employee_id: string;
    full_name: string;
    department: string;
    chuc_vu: string;
  }>;
}

interface SignatureProgressCardProps {
  month: string;
  employeeCompletion: EmployeeCompletion;
  onRefresh?: () => void;
  refreshing?: boolean;
  showDetails?: boolean;
  className?: string;
}

export default function SignatureProgressCard({
  month,
  employeeCompletion,
  onRefresh,
  refreshing = false,
  showDetails = true,
  className = "",
}: SignatureProgressCardProps) {
  const [showUnsignedList, setShowUnsignedList] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>(
    new Date().toISOString(),
  );

  useEffect(() => {
    setLastUpdated(new Date().toISOString());
  }, [employeeCompletion]);

  const getProgressColor = (percentage: number) => {
    if (percentage === 100) return "text-green-600 bg-green-50";
    if (percentage >= 80) return "text-blue-600 bg-blue-50";
    if (percentage >= 60) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage === 100) return "bg-green-500";
    if (percentage >= 80) return "bg-blue-500";
    if (percentage >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <Card className={`${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Tiến Độ Ký Lương Tháng {month}
        </CardTitle>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={refreshing}
              className="h-8"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
            </Button>
          )}
          <Badge
            variant={
              employeeCompletion.is_100_percent_complete
                ? "default"
                : "secondary"
            }
          >
            {employeeCompletion.is_100_percent_complete
              ? "Hoàn thành"
              : "Đang xử lý"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-700">
              {employeeCompletion.total_employees}
            </div>
            <p className="text-sm text-gray-600">Tổng nhân viên</p>
          </div>

          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {employeeCompletion.signed_employees}
            </div>
            <p className="text-sm text-green-700">Đã ký</p>
          </div>

          <div
            className={`text-center p-3 rounded-lg ${getProgressColor(employeeCompletion.completion_percentage)}`}
          >
            <div className="text-2xl font-bold">
              {employeeCompletion.completion_percentage.toFixed(1)}%
            </div>
            <p className="text-sm">Hoàn thành</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Tiến độ:</span>
            <span className="text-sm text-gray-600">
              {employeeCompletion.signed_employees}/
              {employeeCompletion.total_employees}
            </span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${getProgressBarColor(employeeCompletion.completion_percentage)}`}
              style={{ width: `${employeeCompletion.completion_percentage}%` }}
            />
          </div>
        </div>

        {employeeCompletion.is_100_percent_complete ? (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              🎉 Tuyệt vời! 100% nhân viên đã ký lương. Có thể tiến hành ký xác
              nhận management.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-yellow-200 bg-yellow-50">
            <Clock className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Còn{" "}
              {employeeCompletion.total_employees -
                employeeCompletion.signed_employees}{" "}
              nhân viên chưa ký lương. Cần đợi 100% hoàn thành mới có thể ký xác
              nhận.
            </AlertDescription>
          </Alert>
        )}

        {showDetails && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Cập nhật lần cuối:</span>
              <span className="text-sm text-gray-600">
                {formatTime(lastUpdated)}
              </span>
            </div>

            {!employeeCompletion.is_100_percent_complete &&
              employeeCompletion.unsigned_employees_sample &&
              employeeCompletion.unsigned_employees_sample.length > 0 && (
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowUnsignedList(!showUnsignedList)}
                    className="w-full"
                  >
                    {showUnsignedList ? (
                      <>
                        <EyeOff className="h-4 w-4 mr-2" />
                        Ẩn danh sách chưa ký
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Xem nhân viên chưa ký (
                        {employeeCompletion.unsigned_employees_sample.length})
                      </>
                    )}
                  </Button>

                  {showUnsignedList && (
                    <div className="max-h-40 overflow-y-auto space-y-2 p-3 bg-gray-50 rounded-lg">
                      {employeeCompletion.unsigned_employees_sample.map(
                        (employee) => (
                          <div
                            key={employee.employee_id}
                            className="flex justify-between items-center text-sm"
                          >
                            <div>
                              <span className="font-medium">
                                {employee.full_name}
                              </span>
                              <span className="text-gray-500 ml-2">
                                ({employee.employee_id})
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="text-gray-600">
                                {employee.department}
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {employee.chuc_vu}
                              </Badge>
                            </div>
                          </div>
                        ),
                      )}
                      {employeeCompletion.unsigned_employees_sample.length >=
                        10 && (
                        <div className="text-center text-sm text-gray-500 pt-2 border-t">
                          ... và{" "}
                          {employeeCompletion.total_employees -
                            employeeCompletion.signed_employees -
                            10}{" "}
                          nhân viên khác
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
