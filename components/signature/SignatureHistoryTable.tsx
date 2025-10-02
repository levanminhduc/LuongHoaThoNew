"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatVietnamTimestamp } from "@/lib/utils/vietnam-timezone";
import {
  FileSpreadsheet,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  FileText,
  Clock,
} from "lucide-react";

interface SignatureRecord {
  id: string;
  signature_type: "giam_doc" | "ke_toan" | "nguoi_lap_bieu";
  salary_month: string;
  signed_by_id: string;
  signed_by_name: string;
  department: string;
  signed_at: string;
  notes?: string;
  ip_address?: string;
  device_info?: string;
}

interface SignatureHistoryTableProps {
  signatures: SignatureRecord[];
  loading?: boolean;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
    current_page: number;
    total_pages: number;
  };
  onPageChange?: (page: number) => void;
  onFilterChange?: (filters: {
    search?: string;
    signature_type?: string;
    month?: string;
  }) => void;
  showFilters?: boolean;
  className?: string;
}

const SIGNATURE_TYPE_LABELS = {
  giam_doc: "Giám Đốc",
  ke_toan: "Kế Toán",
  nguoi_lap_bieu: "Người Lập Biểu",
};

const SIGNATURE_TYPE_COLORS = {
  giam_doc: "bg-blue-100 text-blue-800",
  ke_toan: "bg-green-100 text-green-800",
  nguoi_lap_bieu: "bg-purple-100 text-purple-800",
};

export default function SignatureHistoryTable({
  signatures,
  loading = false,
  pagination,
  onPageChange,
  onFilterChange,
  showFilters = true,
  className = "",
}: SignatureHistoryTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  const handleFilterChange = () => {
    if (onFilterChange) {
      onFilterChange({
        search: searchTerm || undefined,
        signature_type: selectedType || undefined,
        month: selectedMonth || undefined,
      });
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedType("");
    setSelectedMonth("");
    if (onFilterChange) {
      onFilterChange({});
    }
  };

  // Use centralized Vietnam timezone formatting
  const formatDateTime = formatVietnamTimestamp;

  const formatMonth = (monthString: string) => {
    const [year, month] = monthString.split("-");
    return `${month}/${year}`;
  };

  const getUniqueMonths = () => {
    const months = [...new Set(signatures.map((sig) => sig.salary_month))];
    return months.sort().reverse();
  };

  return (
    <Card className={`${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Lịch Sử Ký Xác Nhận
          {pagination && (
            <Badge variant="outline" className="ml-auto">
              {pagination.total} bản ghi
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {showFilters && (
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tìm kiếm:</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Tên người ký..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Loại chữ ký:</label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tất cả" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tất cả</SelectItem>
                    <SelectItem value="giam_doc">Giám Đốc</SelectItem>
                    <SelectItem value="ke_toan">Kế Toán</SelectItem>
                    <SelectItem value="nguoi_lap_bieu">
                      Người Lập Biểu
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tháng:</label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tất cả" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tất cả</SelectItem>
                    {getUniqueMonths().map((month) => (
                      <SelectItem key={month} value={month}>
                        {formatMonth(month)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Hành động:</label>
                <div className="flex gap-2">
                  <Button onClick={handleFilterChange} size="sm">
                    <Filter className="h-4 w-4 mr-1" />
                    Lọc
                  </Button>
                  <Button onClick={clearFilters} variant="outline" size="sm">
                    Xóa
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Đang tải lịch sử...</p>
          </div>
        ) : signatures.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Không có lịch sử ký xác nhận</p>
          </div>
        ) : (
          <div className="space-y-3">
            {signatures.map((signature) => (
              <div
                key={signature.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <Badge
                        className={
                          SIGNATURE_TYPE_COLORS[signature.signature_type]
                        }
                      >
                        {SIGNATURE_TYPE_LABELS[signature.signature_type]}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1"
                      >
                        <Calendar className="h-3 w-3" />
                        {formatMonth(signature.salary_month)}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">
                        {signature.signed_by_name}
                      </span>
                      <span className="text-gray-500">
                        ({signature.signed_by_id})
                      </span>
                    </div>

                    <div className="text-sm text-gray-600">
                      <span>{signature.department}</span>
                    </div>

                    {signature.notes && (
                      <div className="flex items-start gap-2 text-sm">
                        <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
                        <span className="text-gray-700">{signature.notes}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-right space-y-1">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Clock className="h-3 w-3" />
                      {formatDateTime(signature.signed_at)}
                    </div>
                    {signature.ip_address && (
                      <div className="text-xs text-gray-500">
                        IP: {signature.ip_address}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {pagination && pagination.total_pages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-gray-600">
              Trang {pagination.current_page} / {pagination.total_pages}(
              {pagination.total} bản ghi)
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange?.(pagination.current_page - 1)}
                disabled={pagination.current_page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Trước
              </Button>

              <div className="flex items-center gap-1">
                {Array.from(
                  { length: Math.min(5, pagination.total_pages) },
                  (_, i) => {
                    const page = i + 1;
                    return (
                      <Button
                        key={page}
                        variant={
                          page === pagination.current_page
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => onPageChange?.(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    );
                  },
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange?.(pagination.current_page + 1)}
                disabled={pagination.current_page >= pagination.total_pages}
              >
                Sau
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
