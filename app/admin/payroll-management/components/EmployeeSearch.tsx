"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Search, User, Calendar, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils/date-formatter";
import type { PayrollSearchResult, MonthOption } from "../types";
import {
  useAvailablePayrollMonthsQuery,
  usePayrollSearchQuery,
} from "@/lib/hooks/use-payroll";
import {
  VirtualizedTable,
  type VirtualColumn,
} from "@/components/ui/virtualized-table";

interface EmployeeSearchProps {
  onEmployeeSelect: (result: PayrollSearchResult) => void;
  selectedEmployee?: PayrollSearchResult | null;
}

export function EmployeeSearch({
  onEmployeeSelect,
  selectedEmployee,
}: EmployeeSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [limit, setLimit] = useState(20);
  const [error, setError] = useState("");
  const monthsQuery = useAvailablePayrollMonthsQuery();
  const searchResultsQuery = usePayrollSearchQuery(
    {
      q: submittedQuery,
      salary_month:
        selectedMonth && selectedMonth !== "__EMPTY__"
          ? selectedMonth
          : undefined,
      limit,
    },
    Boolean(submittedQuery),
  );
  const loading = searchResultsQuery.isFetching;
  const searchResults =
    (searchResultsQuery.data?.results as PayrollSearchResult[] | undefined) ??
    [];
  const availableMonths: MonthOption[] =
    monthsQuery.data?.months.map((month) => ({
      value: month,
      label: formatMonthLabel(month),
    })) ?? [];

  useEffect(() => {
    if (!searchResultsQuery.error) return;

    setError(
      searchResultsQuery.error instanceof Error
        ? searchResultsQuery.error.message
        : "Có lỗi xảy ra khi tìm kiếm",
    );
  }, [searchResultsQuery.error]);

  useEffect(() => {
    if (!searchResultsQuery.data || loading) return;

    if (searchResults.length === 0) {
      setError("Không tìm thấy nhân viên nào phù hợp với từ khóa tìm kiếm");
    }
  }, [searchResults.length, searchResultsQuery.data, loading]);

  function formatMonthLabel(month: string) {
    const [year, monthNum] = month.split("-");
    return `Tháng ${parseInt(monthNum)} - ${year}`;
  }

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setError("Vui lòng nhập ít nhất 2 ký tự để tìm kiếm");
      return;
    }

    setError("");
    setSubmittedQuery(searchQuery.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleSelectEmployee = (result: PayrollSearchResult) => {
    onEmployeeSelect(result);
  };
  const payrollColumns: VirtualColumn<PayrollSearchResult>[] = [
    {
      key: "employee",
      header: "Nhân viên",
      width: "minmax(220px, 1.4fr)",
      cell: (result) => (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-gray-500" />
          <span className="font-medium">{result.full_name}</span>
          <Badge variant="outline">{result.employee_id}</Badge>
        </div>
      ),
    },
    {
      key: "department",
      header: "Bộ phận",
      width: "minmax(160px, 1fr)",
      cell: (result) => (
        <span className="text-sm text-gray-600">
          {result.department} - {result.position}
        </span>
      ),
    },
    {
      key: "salary_month",
      header: "Tháng",
      width: "130px",
      cell: (result) => (
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <Calendar className="w-3 h-3" />
          {formatMonthLabel(result.salary_month)}
        </div>
      ),
    },
    {
      key: "net_salary",
      header: "Thực nhận",
      width: "160px",
      className: "text-right",
      cell: (result) => (
        <div className="flex items-center justify-end gap-1 text-green-600 font-medium">
          <DollarSign className="w-4 h-4" />
          {formatCurrency(result.net_salary)}
        </div>
      ),
    },
    {
      key: "source_file",
      header: "Nguồn",
      width: "minmax(140px, 1fr)",
      cell: (result) => (
        <span className="text-xs text-gray-500">{result.source_file}</span>
      ),
    },
    {
      key: "actions",
      header: "Thao tác",
      width: "110px",
      cell: (result) => (
        <Button size="sm" onClick={() => handleSelectEmployee(result)}>
          Chọn
        </Button>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5" />
          Tìm Kiếm Nhân Viên
        </CardTitle>
        <CardDescription>
          Tìm kiếm nhân viên theo mã nhân viên hoặc tên để chỉnh sửa thông tin
          lương
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Form */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="search">Mã NV hoặc Tên</Label>
            <Input
              id="search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Nhập mã nhân viên hoặc tên..."
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="month">Tháng Lương (Tùy chọn)</Label>
            <Select
              value={selectedMonth || "__EMPTY__"}
              onValueChange={(value) => {
                setSelectedMonth(value === "__EMPTY__" ? "" : value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tất cả tháng" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__EMPTY__">Tất cả tháng</SelectItem>
                {availableMonths.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="limit">Hiển thị</Label>
            <Select
              value={String(limit)}
              onValueChange={(value) => setLimit(Number(value))}
            >
              <SelectTrigger id="limit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[20, 50, 100, 200].map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    {value} bản ghi
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>&nbsp;</Label>
            <Button
              onClick={handleSearch}
              disabled={loading || !searchQuery.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang tìm...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Tìm Kiếm
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Selected Employee Display */}
        {selectedEmployee && (
          <Alert className="border-green-200 bg-green-50">
            <User className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              <strong>Đã chọn:</strong> {selectedEmployee.full_name} (
              {selectedEmployee.employee_id}) -{" "}
              {formatMonthLabel(selectedEmployee.salary_month)}
            </AlertDescription>
          </Alert>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-gray-700">
              Kết quả tìm kiếm ({searchResults.length} bản ghi):
            </h4>
            <VirtualizedTable
              data={searchResults}
              columns={payrollColumns}
              rowKey={(result) =>
                `${result.payroll_id}-${result.employee_id}-${result.salary_month}`
              }
              containerHeight={420}
              caption="Kết quả tìm kiếm lương"
              emptyState="Không có dữ liệu"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
