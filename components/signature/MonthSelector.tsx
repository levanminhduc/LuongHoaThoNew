"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface MonthInfo {
  value: string;
  label: string;
  year: number;
  month: number;
  isCurrent: boolean;
  isFuture: boolean;
  status?: "complete" | "partial" | "pending" | "unavailable";
}

interface MonthSelectorProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  monthsBack?: number;
  monthsForward?: number;
  showStatus?: boolean;
  monthStatuses?: Record<
    string,
    "complete" | "partial" | "pending" | "unavailable"
  >;
  disabled?: boolean;
  className?: string;
}

export default function MonthSelector({
  selectedMonth,
  onMonthChange,
  monthsBack = 12,
  monthsForward = 3,
  showStatus = false,
  monthStatuses = {},
  disabled = false,
  className = "",
}: MonthSelectorProps) {
  const [availableMonths, setAvailableMonths] = useState<MonthInfo[]>([]);

  useEffect(() => {
    generateAvailableMonths();
  }, [monthsBack, monthsForward, monthStatuses]);

  const generateAvailableMonths = () => {
    const months: MonthInfo[] = [];
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    for (let i = -monthsBack; i <= monthsForward; i++) {
      const date = new Date(currentYear, currentMonth + i, 1);
      const year = date.getFullYear();
      const month = date.getMonth();
      const monthValue = `${year}-${String(month + 1).padStart(2, "0")}`;

      const isCurrent = year === currentYear && month === currentMonth;
      const isFuture = date > currentDate;

      months.push({
        value: monthValue,
        label: date.toLocaleDateString("vi-VN", {
          year: "numeric",
          month: "long",
        }),
        year,
        month: month + 1,
        isCurrent,
        isFuture,
        status: monthStatuses[monthValue],
      });
    }

    setAvailableMonths(months.reverse());
  };

  const getCurrentMonthInfo = () => {
    return availableMonths.find((m) => m.value === selectedMonth);
  };

  const getNextMonth = () => {
    const currentIndex = availableMonths.findIndex(
      (m) => m.value === selectedMonth,
    );
    return currentIndex > 0 ? availableMonths[currentIndex - 1] : null;
  };

  const getPreviousMonth = () => {
    const currentIndex = availableMonths.findIndex(
      (m) => m.value === selectedMonth,
    );
    return currentIndex < availableMonths.length - 1
      ? availableMonths[currentIndex + 1]
      : null;
  };

  const handlePreviousMonth = () => {
    const prevMonth = getPreviousMonth();
    if (prevMonth && !disabled) {
      onMonthChange(prevMonth.value);
    }
  };

  const handleNextMonth = () => {
    const nextMonth = getNextMonth();
    if (nextMonth && !disabled) {
      onMonthChange(nextMonth.value);
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "complete":
        return <CheckCircle className="h-3 w-3 text-green-600" />;
      case "partial":
        return <Clock className="h-3 w-3 text-yellow-600" />;
      case "pending":
        return <AlertCircle className="h-3 w-3 text-blue-600" />;
      case "unavailable":
        return <AlertCircle className="h-3 w-3 text-gray-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "complete":
        return "bg-green-100 text-green-800";
      case "partial":
        return "bg-yellow-100 text-yellow-800";
      case "pending":
        return "bg-blue-100 text-blue-800";
      case "unavailable":
        return "bg-gray-100 text-gray-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case "complete":
        return "Hoàn thành";
      case "partial":
        return "Đang xử lý";
      case "pending":
        return "Chờ xử lý";
      case "unavailable":
        return "Không khả dụng";
      default:
        return "Chưa có dữ liệu";
    }
  };

  const currentMonthInfo = getCurrentMonthInfo();
  const nextMonth = getNextMonth();
  const previousMonth = getPreviousMonth();

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-600" />
          <span className="font-medium">Chọn tháng:</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousMonth}
            disabled={!previousMonth || disabled}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Select
            value={selectedMonth}
            onValueChange={onMonthChange}
            disabled={disabled}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableMonths.map((month) => (
                <SelectItem
                  key={month.value}
                  value={month.value}
                  disabled={month.status === "unavailable"}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>{month.label}</span>
                    <div className="flex items-center gap-2 ml-4">
                      {month.isCurrent && (
                        <Badge variant="outline" className="text-xs">
                          Hiện tại
                        </Badge>
                      )}
                      {month.isFuture && (
                        <Badge variant="secondary" className="text-xs">
                          Tương lai
                        </Badge>
                      )}
                      {showStatus && getStatusIcon(month.status)}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNextMonth}
            disabled={!nextMonth || disabled}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {currentMonthInfo && (
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Tháng được chọn:</span>
            <Badge variant="outline">{currentMonthInfo.label}</Badge>
          </div>

          {currentMonthInfo.isCurrent && (
            <Badge className="bg-blue-100 text-blue-800">
              <Clock className="h-3 w-3 mr-1" />
              Tháng hiện tại
            </Badge>
          )}

          {currentMonthInfo.isFuture && (
            <Badge className="bg-orange-100 text-orange-800">
              <AlertCircle className="h-3 w-3 mr-1" />
              Tháng tương lai
            </Badge>
          )}

          {showStatus && currentMonthInfo.status && (
            <Badge className={getStatusColor(currentMonthInfo.status)}>
              {getStatusIcon(currentMonthInfo.status)}
              <span className="ml-1">
                {getStatusLabel(currentMonthInfo.status)}
              </span>
            </Badge>
          )}
        </div>
      )}

      {showStatus && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-green-600" />
            <span>Hoàn thành</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-yellow-600" />
            <span>Đang xử lý</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3 text-blue-600" />
            <span>Chờ xử lý</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3 text-gray-400" />
            <span>Không khả dụng</span>
          </div>
        </div>
      )}
    </div>
  );
}
