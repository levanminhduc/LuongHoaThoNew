"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, ArrowUpDown, Filter, Eye } from "lucide-react";

interface PayrollRecord {
  id: number;
  employee_id: string;
  salary_month: string;

  // Hệ số và thông số cơ bản
  he_so_lam_viec?: number;
  he_so_phu_cap_ket_qua?: number;
  he_so_luong_co_ban?: number;
  luong_toi_thieu_cty?: number;

  // Thời gian làm việc
  ngay_cong_trong_gio?: number;
  gio_cong_tang_ca?: number;
  gio_an_ca?: number;
  tong_gio_lam_viec?: number;
  tong_he_so_quy_doi?: number;
  ngay_cong_chu_nhat?: number;

  // Lương sản phẩm và đơn giá
  tong_luong_san_pham_cong_doan?: number;
  don_gia_tien_luong_tren_gio?: number;
  tien_luong_san_pham_trong_gio?: number;
  tien_luong_tang_ca?: number;
  tien_luong_30p_an_ca?: number;
  tien_khen_thuong_chuyen_can?: number;
  luong_hoc_viec_pc_luong?: number;
  tong_cong_tien_luong_san_pham?: number;

  // Phụ cấp và hỗ trợ
  ho_tro_thoi_tiet_nong?: number;
  bo_sung_luong?: number;
  pc_luong_cho_viec?: number;
  tien_luong_chu_nhat?: number;
  luong_cnkcp_vuot?: number;
  tien_tang_ca_vuot?: number;
  bhxh_21_5_percent?: number;
  pc_cdcs_pccc_atvsv?: number;
  luong_phu_nu_hanh_kinh?: number;

  // Tổng lương và phụ cấp khác
  tong_cong_tien_luong?: number;
  tien_boc_vac?: number;
  ho_tro_xang_xe?: number;

  // Thuế và khấu trừ
  thue_tncn_nam_2024?: number;
  tam_ung?: number;
  thue_tncn?: number;
  bhxh_bhtn_bhyt_total?: number;
  truy_thu_the_bhyt?: number;

  // Lương thực nhận cuối kỳ
  tien_luong_thuc_nhan_cuoi_ky: number;

  // Thông tin ký
  is_signed: boolean;
  signed_at: string | null;
  signed_by_name?: string;
  signature_ip?: string;
  signature_device?: string;

  employees: {
    employee_id: string;
    full_name: string;
    department: string;
    chuc_vu: string;
  };
}

interface EmployeeTableProps {
  payrolls: PayrollRecord[];
  onFiltersChange?: (filters: {
    searchTerm: string;
    statusFilter: string;
    sortBy: string;
    sortOrder: "asc" | "desc";
  }) => void;
  onViewEmployee?: (employeeId: string) => void;
}

export default function EmployeeTable({
  payrolls,
  onFiltersChange,
  onViewEmployee,
}: EmployeeTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);

  // Notify parent of filter changes
  useEffect(() => {
    onFiltersChange?.({
      searchTerm,
      statusFilter,
      sortBy,
      sortOrder,
    });
  }, [searchTerm, statusFilter, sortBy, sortOrder, onFiltersChange]);

  const filteredAndSortedPayrolls = (() => {
    if (!payrolls) return [];

    // Filter by search term
    let filtered = payrolls.filter(
      (payroll) =>
        payroll.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payroll.employees?.full_name
          .toLowerCase()
          .includes(searchTerm.toLowerCase()),
    );

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((payroll) => {
        if (statusFilter === "signed") return payroll.is_signed;
        if (statusFilter === "unsigned") return !payroll.is_signed;
        return true;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: string | number = "";
      let bValue: string | number = "";

      switch (sortBy) {
        case "name":
          aValue = a.employees?.full_name || "";
          bValue = b.employees?.full_name || "";
          break;
        case "employee_id":
          aValue = a.employee_id;
          bValue = b.employee_id;
          break;
        case "salary":
          aValue = a.tien_luong_thuc_nhan_cuoi_ky;
          bValue = b.tien_luong_thuc_nhan_cuoi_ky;
          break;
        case "position":
          aValue = a.employees?.chuc_vu || "";
          bValue = b.employees?.chuc_vu || "";
          break;
        case "status":
          aValue = a.is_signed ? 1 : 0;
          bValue = b.is_signed ? 1 : 0;
          break;
        default:
          aValue = a.employees?.full_name || "";
          bValue = b.employees?.full_name || "";
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  })();

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedPayrolls.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedPayrolls = filteredAndSortedPayrolls.slice(
    startIndex,
    endIndex,
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, sortBy, sortOrder]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm nhân viên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Lọc trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="signed">Đã ký</SelectItem>
              <SelectItem value="unsigned">Chưa ký</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-40">
              <ArrowUpDown className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Sắp xếp" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Họ tên</SelectItem>
              <SelectItem value="employee_id">Mã NV</SelectItem>
              <SelectItem value="salary">Lương</SelectItem>
              <SelectItem value="position">Chức vụ</SelectItem>
              <SelectItem value="status">Trạng thái</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="w-full sm:w-auto"
          >
            {sortOrder === "asc" ? "↑" : "↓"}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="whitespace-nowrap">
            {filteredAndSortedPayrolls.length} nhân viên
          </Badge>
          {totalPages > 1 && (
            <Badge variant="secondary" className="whitespace-nowrap">
              Trang {currentPage}/{totalPages}
            </Badge>
          )}
        </div>
      </div>

      {/* Mobile Card Layout */}
      <div className="block sm:hidden space-y-3">
        {paginatedPayrolls.length > 0 ? (
          paginatedPayrolls.map((payroll, index) => (
            <Card
              key={payroll.id}
              className="p-4 hover:shadow-md transition-shadow duration-200"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        #{(currentPage - 1) * pageSize + index + 1}
                      </span>
                      <h4 className="font-semibold text-sm truncate">
                        {payroll.employees?.full_name}
                      </h4>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Mã: {payroll.employee_id}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={payroll.is_signed ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {payroll.is_signed ? "Đã ký" : "Chưa ký"}
                    </Badge>
                    {onViewEmployee && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewEmployee(payroll.employee_id)}
                        className="h-8 w-8 p-0 touch-manipulation"
                        title="Xem chi tiết lương"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Chức vụ:</span>
                    <p className="font-medium mt-1">
                      {payroll.employees?.chuc_vu}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ngày công:</span>
                    <p className="font-medium mt-1">
                      {payroll.ngay_cong_trong_gio || 0} ngày
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      Thưởng Chuyên Cần:
                    </span>
                    <p className="font-medium mt-1">
                      {formatCurrency(payroll.tien_khen_thuong_chuyen_can || 0)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">PC Chờ Việc:</span>
                    <p className="font-medium mt-1">
                      {formatCurrency(payroll.pc_luong_cho_viec || 0)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Hệ số LV:</span>
                    <p className="font-medium mt-1">
                      {(payroll.he_so_lam_viec || 0).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      Lương thực nhận:
                    </span>
                    <span className="font-semibold text-sm">
                      {formatCurrency(payroll.tien_luong_thuc_nhan_cuoi_ky)}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Không có dữ liệu
          </div>
        )}
      </div>

      {/* Desktop Table Layout */}
      <Card className="hidden sm:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center w-16">STT</TableHead>
                  <TableHead className="min-w-[100px]">Mã NV</TableHead>
                  <TableHead className="min-w-[150px]">Họ Tên</TableHead>
                  <TableHead className="min-w-[120px]">Chức Vụ</TableHead>
                  <TableHead className="text-center min-w-[80px]">
                    Ngày Công
                  </TableHead>
                  <TableHead className="text-right min-w-[120px]">
                    Thưởng Chuyên Cần
                  </TableHead>
                  <TableHead className="text-right min-w-[120px]">
                    PC Chờ Việc
                  </TableHead>
                  <TableHead className="text-center min-w-[80px]">
                    Hệ Số LV
                  </TableHead>
                  <TableHead className="text-right min-w-[140px]">
                    Thực Nhận
                  </TableHead>
                  <TableHead className="text-center min-w-[100px]">
                    Trạng Thái
                  </TableHead>
                  {onViewEmployee && (
                    <TableHead className="text-center min-w-[80px]">
                      Thao Tác
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPayrolls.length > 0 ? (
                  paginatedPayrolls.map((payroll, index) => (
                    <TableRow key={payroll.id} className="hover:bg-gray-50">
                      <TableCell className="text-center font-medium text-gray-500">
                        {(currentPage - 1) * pageSize + index + 1}
                      </TableCell>
                      <TableCell className="font-medium font-mono text-sm">
                        {payroll.employee_id}
                      </TableCell>
                      <TableCell className="font-medium">
                        {payroll.employees?.full_name}
                      </TableCell>
                      <TableCell>{payroll.employees?.chuc_vu}</TableCell>
                      <TableCell className="text-center">
                        {payroll.ngay_cong_trong_gio || 0}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(
                          payroll.tien_khen_thuong_chuyen_can || 0,
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(payroll.pc_luong_cho_viec || 0)}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {(payroll.he_so_lam_viec || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(payroll.tien_luong_thuc_nhan_cuoi_ky)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={payroll.is_signed ? "default" : "secondary"}
                        >
                          {payroll.is_signed ? "Đã ký" : "Chưa ký"}
                        </Badge>
                      </TableCell>
                      {onViewEmployee && (
                        <TableCell className="text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onViewEmployee(payroll.employee_id)}
                            className="h-8 w-8 p-0"
                            title="Xem chi tiết lương"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={onViewEmployee ? 11 : 10}
                      className="text-center py-8 text-muted-foreground"
                    >
                      {filteredAndSortedPayrolls.length === 0
                        ? "Không tìm thấy nhân viên nào phù hợp với bộ lọc"
                        : "Không có dữ liệu"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4">
          {/* Mobile: Simple pagination */}
          <div className="flex sm:hidden justify-center w-full">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0 touch-manipulation"
              >
                ←
              </Button>
              <span className="text-sm px-3 py-1 bg-gray-100 rounded">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0 touch-manipulation"
              >
                →
              </Button>
            </div>
          </div>

          {/* Desktop: Full pagination */}
          <div className="hidden sm:flex justify-center w-full">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    className={
                      currentPage === 1
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        onClick={() => setCurrentPage(pageNum)}
                        isActive={currentPage === pageNum}
                        className="cursor-pointer"
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}

                <PaginationItem>
                  <PaginationNext
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    className={
                      currentPage === totalPages
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      )}
    </div>
  );
}
