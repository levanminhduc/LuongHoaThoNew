"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  Search,
  Copy,
  Download,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BarChart3,
  BookOpen,
  Filter,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImportError {
  row: number;
  employee_id?: string;
  salary_month?: string;
  field?: string;
  error: string;
  errorType:
    | "validation"
    | "duplicate"
    | "employee_not_found"
    | "database"
    | "format";
  originalData?: Record<string, unknown>;
}

interface EnhancedImportError extends ImportError {
  column?: string;
  value?: unknown;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  suggestion?: string;
  expectedFormat?: string;
  currentValue?: string;
}

interface ImportErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  errors: ImportError[];
  totalRecords: number;
  successCount: number;
  skippedCount?: number;
  originalHeaders?: string[];
}

interface ErrorStats {
  totalErrors: number;
  validationErrors: number;
  duplicateErrors: number;
  employeeNotFoundErrors: number;
  databaseErrors: number;
  formatErrors: number;
}

interface CommonErrorSolution {
  errorType: string;
  title: string;
  cause: string;
  solution: string;
  example: string;
}

const ITEMS_PER_PAGE = 20;

const determineSeverity = (
  errorType: string,
): "low" | "medium" | "high" | "critical" => {
  switch (errorType) {
    case "employee_not_found":
      return "critical";
    case "database":
      return "high";
    case "duplicate":
      return "medium";
    case "validation":
      return "medium";
    case "format":
      return "low";
    default:
      return "medium";
  }
};

const getSuggestion = (errorType: string, field?: string): string => {
  switch (errorType) {
    case "employee_not_found":
      return "Kiểm tra lại Mã Nhân Viên trong file Excel. Đảm bảo nhân viên đã được tạo trong hệ thống.";
    case "duplicate":
      return "Xóa các dòng trùng lặp hoặc kiểm tra lại Mã NV và Tháng Lương.";
    case "validation":
      return field
        ? `Kiểm tra định dạng và giá trị của trường ${field}. Đảm bảo đúng kiểu dữ liệu.`
        : "Kiểm tra lại các trường bắt buộc và định dạng dữ liệu.";
    case "database":
      return "Lỗi hệ thống. Vui lòng liên hệ quản trị viên hoặc thử lại sau.";
    case "format":
      return "Kiểm tra định dạng file Excel. Đảm bảo các cột đúng thứ tự và tên header.";
    default:
      return "Vui lòng kiểm tra lại dữ liệu và thử lại.";
  }
};

const getErrorTypeColor = (errorType: string): string => {
  switch (errorType) {
    case "validation":
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
    case "duplicate":
      return "bg-orange-100 text-orange-800 border-orange-300";
    case "employee_not_found":
      return "bg-red-100 text-red-800 border-red-300";
    case "database":
      return "bg-purple-100 text-purple-800 border-purple-300";
    case "format":
      return "bg-blue-100 text-blue-800 border-blue-300";
    default:
      return "bg-gray-100 text-gray-800 border-gray-300";
  }
};

const getErrorTypeBadgeColor = (errorType: string): string => {
  switch (errorType) {
    case "validation":
      return "bg-yellow-500";
    case "duplicate":
      return "bg-orange-500";
    case "employee_not_found":
      return "bg-red-500";
    case "database":
      return "bg-purple-500";
    case "format":
      return "bg-blue-500";
    default:
      return "bg-gray-500";
  }
};

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case "critical":
      return <XCircle className="h-4 w-4 text-red-600" />;
    case "high":
      return <AlertCircle className="h-4 w-4 text-orange-600" />;
    case "medium":
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    case "low":
      return <AlertCircle className="h-4 w-4 text-blue-600" />;
    default:
      return <AlertCircle className="h-4 w-4 text-gray-600" />;
  }
};

const transformToEnhancedError = (error: ImportError): EnhancedImportError => {
  const severity = determineSeverity(error.errorType);
  const suggestion = getSuggestion(error.errorType, error.field);

  return {
    ...error,
    severity,
    message: error.error,
    suggestion,
    column: error.field,
    currentValue: error.employee_id || error.salary_month,
  };
};

const calculateErrorStats = (errors: ImportError[]): ErrorStats => {
  return {
    totalErrors: errors.length,
    validationErrors: errors.filter((e) => e.errorType === "validation").length,
    duplicateErrors: errors.filter((e) => e.errorType === "duplicate").length,
    employeeNotFoundErrors: errors.filter(
      (e) => e.errorType === "employee_not_found",
    ).length,
    databaseErrors: errors.filter((e) => e.errorType === "database").length,
    formatErrors: errors.filter((e) => e.errorType === "format").length,
  };
};

const COMMON_ERROR_SOLUTIONS: CommonErrorSolution[] = [
  {
    errorType: "employee_not_found",
    title: "Không Tìm Thấy Nhân Viên",
    cause: "Mã Nhân Viên không tồn tại trong hệ thống",
    solution:
      "1. Kiểm tra lại Mã NV trong file Excel\n2. Đảm bảo nhân viên đã được tạo trong hệ thống\n3. Kiểm tra chính tả và khoảng trắng thừa",
    example: 'Ví dụ: "NV001" thay vì "NV 001" hoặc "nv001"',
  },
  {
    errorType: "duplicate",
    title: "Dữ Liệu Trùng Lặp",
    cause: "Cùng Mã NV và Tháng Lương xuất hiện nhiều lần",
    solution:
      "1. Xóa các dòng trùng lặp trong file Excel\n2. Kiểm tra lại dữ liệu trước khi import\n3. Sử dụng chức năng Remove Duplicates trong Excel",
    example: "Ví dụ: NV001 - 2024-01 chỉ được xuất hiện 1 lần",
  },
  {
    errorType: "validation",
    title: "Lỗi Validation Dữ Liệu",
    cause: "Dữ liệu không đúng định dạng hoặc thiếu trường bắt buộc",
    solution:
      "1. Kiểm tra các trường bắt buộc: Mã NV, Tháng Lương\n2. Đảm bảo định dạng Tháng Lương: YYYY-MM\n3. Kiểm tra kiểu dữ liệu (số, text, ngày tháng)",
    example: 'Ví dụ: Tháng Lương phải là "2024-01" không phải "01/2024"',
  },
  {
    errorType: "format",
    title: "Lỗi Định Dạng File",
    cause: "File Excel không đúng cấu trúc hoặc thiếu header",
    solution:
      "1. Tải template mẫu từ hệ thống\n2. Đảm bảo các cột đúng thứ tự\n3. Không thay đổi tên header",
    example: "Sử dụng template chuẩn từ hệ thống để tránh lỗi",
  },
];

export default function ImportErrorModal({
  isOpen,
  onClose,
  errors,
  totalRecords,
  successCount,
  skippedCount = 0,
  originalHeaders = [],
}: ImportErrorModalProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  const enhancedErrors = useMemo(
    () => errors.map(transformToEnhancedError),
    [errors],
  );

  const errorStats = useMemo(() => calculateErrorStats(errors), [errors]);

  const filteredErrors = useMemo(() => {
    let filtered = enhancedErrors;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (error) =>
          error.message.toLowerCase().includes(query) ||
          error.employee_id?.toLowerCase().includes(query) ||
          error.salary_month?.toLowerCase().includes(query) ||
          error.field?.toLowerCase().includes(query) ||
          error.row.toString().includes(query),
      );
    }

    if (filterType !== "all") {
      filtered = filtered.filter((error) => error.errorType === filterType);
    }

    return filtered;
  }, [enhancedErrors, searchQuery, filterType]);

  const totalPages = Math.ceil(filteredErrors.length / ITEMS_PER_PAGE);
  const paginatedErrors = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredErrors.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredErrors, currentPage]);

  const handleCopyError = (message: string) => {
    navigator.clipboard.writeText(message);
    toast({
      title: "Đã copy",
      description: "Nội dung lỗi đã được copy vào clipboard",
      duration: 2000,
    });
  };

  const handleExportErrors = async () => {
    setIsExporting(true);
    try {
      const token = localStorage.getItem("admin_token");
      if (!token) {
        toast({
          title: "Lỗi",
          description: "Không có quyền truy cập",
          variant: "destructive",
        });
        return;
      }

      const exportErrors = errors.map((err) => ({
        row: err.row,
        employee_id: err.employee_id,
        salary_month: err.salary_month,
        errorType: err.errorType,
        error: err.error,
        message: err.error,
        originalData: err.originalData,
      }));

      const response = await fetch("/api/admin/export-import-errors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          errors: exportErrors,
          format: "excel",
          fileName: "bao_cao_loi_import",
          includeOriginalData: true,
          originalHeaders,
        }),
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bao_cao_loi_import_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Thành công",
        description: "Đã tải xuống báo cáo lỗi Excel",
        duration: 3000,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Lỗi",
        description: "Không thể export báo cáo lỗi",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Chi Tiết Lỗi Import ({errors.length} lỗi)
          </DialogTitle>
        </DialogHeader>

        <Tabs
          defaultValue="all-errors"
          className="w-full flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
            <TabsTrigger value="all-errors" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Tất Cả Lỗi
            </TabsTrigger>
            <TabsTrigger value="statistics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Thống Kê
            </TabsTrigger>
            <TabsTrigger value="guide" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Hướng Dẫn
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all-errors" className="space-y-4 mt-0">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Tìm kiếm lỗi (Row, Mã NV, Field, Message)..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
              <Select
                value={filterType}
                onValueChange={(value) => {
                  setFilterType(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Lọc theo loại" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả lỗi</SelectItem>
                  <SelectItem value="validation">Validation</SelectItem>
                  <SelectItem value="duplicate">Duplicate</SelectItem>
                  <SelectItem value="employee_not_found">
                    Employee Not Found
                  </SelectItem>
                  <SelectItem value="database">Database</SelectItem>
                  <SelectItem value="format">Format</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleExportErrors}
                disabled={isExporting}
                className="w-full sm:w-auto"
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? "Đang xuất..." : "Tải Excel"}
              </Button>
            </div>

            <div className="text-sm text-gray-600">
              Hiển thị {filteredErrors.length} / {errors.length} lỗi
            </div>

            <ScrollArea className="h-[400px] rounded-md border">
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">Row</TableHead>
                      <TableHead className="w-[100px]">Mã NV</TableHead>
                      <TableHead className="w-[100px]">Tháng</TableHead>
                      <TableHead className="w-[120px]">Field</TableHead>
                      <TableHead className="w-[120px]">Loại Lỗi</TableHead>
                      <TableHead className="w-[80px]">Severity</TableHead>
                      <TableHead>Lỗi</TableHead>
                      <TableHead className="w-[80px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedErrors.map((error, index) => (
                      <TableRow
                        key={index}
                        className={getErrorTypeColor(error.errorType)}
                      >
                        <TableCell className="font-medium">
                          {error.row}
                        </TableCell>
                        <TableCell>{error.employee_id || "N/A"}</TableCell>
                        <TableCell>{error.salary_month || "N/A"}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {error.field || "N/A"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`${getErrorTypeBadgeColor(error.errorType)} text-white`}
                          >
                            {error.errorType}
                          </Badge>
                        </TableCell>
                        <TableCell>{getSeverityIcon(error.severity)}</TableCell>
                        <TableCell className="max-w-[300px]">
                          <div className="space-y-1">
                            <div className="text-sm font-medium">
                              {error.message}
                            </div>
                            {error.suggestion && (
                              <div className="text-xs text-gray-600">
                                💡 {error.suggestion}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyError(error.message)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="md:hidden space-y-3 p-4">
                {paginatedErrors.map((error, index) => (
                  <Card
                    key={index}
                    className={`${getErrorTypeColor(error.errorType)} border-l-4`}
                  >
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge
                            className={`${getErrorTypeBadgeColor(error.errorType)} text-white`}
                          >
                            {error.errorType}
                          </Badge>
                          {getSeverityIcon(error.severity)}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyError(error.message)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex gap-2">
                          <span className="font-semibold">Row:</span>
                          <span>{error.row}</span>
                        </div>
                        {error.employee_id && (
                          <div className="flex gap-2">
                            <span className="font-semibold">Mã NV:</span>
                            <span>{error.employee_id}</span>
                          </div>
                        )}
                        {error.salary_month && (
                          <div className="flex gap-2">
                            <span className="font-semibold">Tháng:</span>
                            <span>{error.salary_month}</span>
                          </div>
                        )}
                        {error.field && (
                          <div className="flex gap-2">
                            <span className="font-semibold">Field:</span>
                            <span className="font-mono text-xs">
                              {error.field}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="pt-2 border-t">
                        <div className="text-sm font-medium text-red-800">
                          {error.message}
                        </div>
                        {error.suggestion && (
                          <div className="text-xs text-gray-600 mt-1">
                            💡 {error.suggestion}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Trang {currentPage} / {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="statistics" className="mt-0">
            <ScrollArea className="h-[500px]">
              <div className="space-y-4 pr-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-600">
                        Tổng Lỗi
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-red-600">
                        {errorStats.totalErrors}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {(
                          (errorStats.totalErrors / totalRecords) *
                          100
                        ).toFixed(1)}
                        % tổng số records
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-600">
                        Thành Công
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-green-600">
                        {successCount}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {((successCount / totalRecords) * 100).toFixed(1)}% tổng
                        số records
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-600">
                        Bỏ Qua (Skip)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-orange-600">
                        {skippedCount}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Records thiếu Mã NV/Tháng
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-600">
                        Tỷ Lệ Thành Công
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-blue-600">
                        {((successCount / totalRecords) * 100).toFixed(1)}%
                      </div>
                      <Progress
                        value={(successCount / totalRecords) * 100}
                        className="mt-2"
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-600">
                        Tổng Quan
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span>Tổng records:</span>
                          <span className="font-semibold">{totalRecords}</span>
                        </div>
                        <div className="flex justify-between text-green-600">
                          <span>Thành công:</span>
                          <span className="font-semibold">{successCount}</span>
                        </div>
                        <div className="flex justify-between text-red-600">
                          <span>Lỗi:</span>
                          <span className="font-semibold">{errorStats.totalErrors}</span>
                        </div>
                        <div className="flex justify-between text-orange-600">
                          <span>Bỏ qua:</span>
                          <span className="font-semibold">{skippedCount}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Phân Loại Lỗi Theo Loại</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-yellow-500" />
                          <span className="text-sm">Validation Errors</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">
                            {errorStats.validationErrors}
                          </span>
                          <span className="text-xs text-gray-500">
                            (
                            {(
                              (errorStats.validationErrors /
                                errorStats.totalErrors) *
                              100
                            ).toFixed(1)}
                            %)
                          </span>
                        </div>
                      </div>
                      <Progress
                        value={
                          (errorStats.validationErrors /
                            errorStats.totalErrors) *
                          100
                        }
                        className="h-2"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-orange-500" />
                          <span className="text-sm">Duplicate Errors</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">
                            {errorStats.duplicateErrors}
                          </span>
                          <span className="text-xs text-gray-500">
                            (
                            {(
                              (errorStats.duplicateErrors /
                                errorStats.totalErrors) *
                              100
                            ).toFixed(1)}
                            %)
                          </span>
                        </div>
                      </div>
                      <Progress
                        value={
                          (errorStats.duplicateErrors /
                            errorStats.totalErrors) *
                          100
                        }
                        className="h-2"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-500" />
                          <span className="text-sm">Employee Not Found</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">
                            {errorStats.employeeNotFoundErrors}
                          </span>
                          <span className="text-xs text-gray-500">
                            (
                            {(
                              (errorStats.employeeNotFoundErrors /
                                errorStats.totalErrors) *
                              100
                            ).toFixed(1)}
                            %)
                          </span>
                        </div>
                      </div>
                      <Progress
                        value={
                          (errorStats.employeeNotFoundErrors /
                            errorStats.totalErrors) *
                          100
                        }
                        className="h-2"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-purple-500" />
                          <span className="text-sm">Database Errors</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">
                            {errorStats.databaseErrors}
                          </span>
                          <span className="text-xs text-gray-500">
                            (
                            {(
                              (errorStats.databaseErrors /
                                errorStats.totalErrors) *
                              100
                            ).toFixed(1)}
                            %)
                          </span>
                        </div>
                      </div>
                      <Progress
                        value={
                          (errorStats.databaseErrors / errorStats.totalErrors) *
                          100
                        }
                        className="h-2"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500" />
                          <span className="text-sm">Format Errors</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">
                            {errorStats.formatErrors}
                          </span>
                          <span className="text-xs text-gray-500">
                            (
                            {(
                              (errorStats.formatErrors /
                                errorStats.totalErrors) *
                              100
                            ).toFixed(1)}
                            %)
                          </span>
                        </div>
                      </div>
                      <Progress
                        value={
                          (errorStats.formatErrors / errorStats.totalErrors) *
                          100
                        }
                        className="h-2"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top Lỗi Phổ Biến</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(
                        enhancedErrors.reduce(
                          (acc, error) => {
                            const key = error.message;
                            acc[key] = (acc[key] || 0) + 1;
                            return acc;
                          },
                          {} as Record<string, number>,
                        ),
                      )
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 5)
                        .map(([message, count], index) => (
                          <div
                            key={index}
                            className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex-1">
                              <div className="text-sm font-medium">
                                {message}
                              </div>
                            </div>
                            <Badge variant="secondary">{count} lần</Badge>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="guide" className="mt-0">
            <ScrollArea className="h-[500px]">
              <div className="space-y-4 pr-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />4 Bước
                      Khắc Phục Lỗi Import
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                          1
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm mb-1">
                            Tải Báo Cáo Lỗi Excel
                          </h4>
                          <p className="text-sm text-gray-600">
                            {`Click nút "Tải Excel" ở tab "Tất Cả Lỗi" để tải
                            xuống file Excel chứa chi tiết tất cả lỗi.`}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                          2
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm mb-1">
                            {`Xem Sheet "Error Details"`}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {`Mở file Excel và xem sheet "Error Details" để hiểu
                            rõ từng lỗi. Chú ý cột "Suggestion" để biết cách
                            fix.`}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                          3
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm mb-1">
                            {`Sử Dụng Sheet "Fix Template"`}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {`Điền giá trị đúng vào cột "Corrected Value" trong
                            sheet "Fix Template". Đây là template giúp bạn track
                            việc fix lỗi.`}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                          4
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm mb-1">
                            Fix File Gốc & Re-import
                          </h4>
                          <p className="text-sm text-gray-600">
                            Quay lại file Excel gốc, sửa các lỗi theo hướng dẫn,
                            sau đó import lại vào hệ thống.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-orange-600" />
                      Lỗi Thường Gặp & Cách Khắc Phục
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {COMMON_ERROR_SOLUTIONS.map((solution, index) => (
                      <div
                        key={index}
                        className="p-4 border rounded-lg space-y-2 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Badge
                            className={`${getErrorTypeBadgeColor(solution.errorType)} text-white`}
                          >
                            {solution.errorType}
                          </Badge>
                          <h4 className="font-semibold text-sm">
                            {solution.title}
                          </h4>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div>
                            <span className="font-semibold text-red-600">
                              Nguyên nhân:
                            </span>{" "}
                            {solution.cause}
                          </div>
                          <div>
                            <span className="font-semibold text-green-600">
                              Giải pháp:
                            </span>
                            <pre className="mt-1 text-xs bg-gray-50 p-2 rounded whitespace-pre-wrap">
                              {solution.solution}
                            </pre>
                          </div>
                          <div className="text-xs text-gray-600 italic">
                            {solution.example}
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
