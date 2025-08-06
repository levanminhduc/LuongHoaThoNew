"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search, ArrowUpDown, Filter } from "lucide-react"

interface PayrollRecord {
  id: number
  employee_id: string
  salary_month: string
  tien_luong_thuc_nhan_cuoi_ky: number
  is_signed: boolean
  signed_at: string | null
  employees: {
    employee_id: string
    full_name: string
    department: string
    chuc_vu: string
  }
}

interface EmployeeTableProps {
  payrolls: PayrollRecord[]
  onFiltersChange?: (filters: {
    searchTerm: string
    statusFilter: string
    sortBy: string
    sortOrder: "asc" | "desc"
  }) => void
}

export default function EmployeeTable({ payrolls, onFiltersChange }: EmployeeTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<string>("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)

  // Notify parent of filter changes
  useEffect(() => {
    onFiltersChange?.({
      searchTerm,
      statusFilter,
      sortBy,
      sortOrder
    })
  }, [searchTerm, statusFilter, sortBy, sortOrder, onFiltersChange])

  const filteredAndSortedPayrolls = (() => {
    if (!payrolls) return []
    
    // Filter by search term
    let filtered = payrolls.filter(payroll =>
      payroll.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payroll.employees?.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    
    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(payroll => {
        if (statusFilter === "signed") return payroll.is_signed
        if (statusFilter === "unsigned") return !payroll.is_signed
        return true
      })
    }
    
    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortBy) {
        case "name":
          aValue = a.employees?.full_name || ""
          bValue = b.employees?.full_name || ""
          break
        case "employee_id":
          aValue = a.employee_id
          bValue = b.employee_id
          break
        case "salary":
          aValue = a.tien_luong_thuc_nhan_cuoi_ky
          bValue = b.tien_luong_thuc_nhan_cuoi_ky
          break
        case "position":
          aValue = a.employees?.chuc_vu || ""
          bValue = b.employees?.chuc_vu || ""
          break
        case "status":
          aValue = a.is_signed ? 1 : 0
          bValue = b.is_signed ? 1 : 0
          break
        default:
          aValue = a.employees?.full_name || ""
          bValue = b.employees?.full_name || ""
      }
      
      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }
      
      if (sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })
    
    return filtered
  })()

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedPayrolls.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedPayrolls = filteredAndSortedPayrolls.slice(startIndex, endIndex)

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, sortBy, sortOrder])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount)
  }

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

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã NV</TableHead>
                <TableHead>Họ Tên</TableHead>
                <TableHead>Chức Vụ</TableHead>
                <TableHead className="text-right">Lương</TableHead>
                <TableHead className="text-center">Trạng Thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPayrolls.length > 0 ? (
                paginatedPayrolls.map((payroll) => (
                  <TableRow key={payroll.id}>
                    <TableCell className="font-medium">
                      {payroll.employee_id}
                    </TableCell>
                    <TableCell>{payroll.employees?.full_name}</TableCell>
                    <TableCell>{payroll.employees?.chuc_vu}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(payroll.tien_luong_thuc_nhan_cuoi_ky)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={payroll.is_signed ? "default" : "secondary"}>
                        {payroll.is_signed ? "Đã ký" : "Chưa ký"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {filteredAndSortedPayrolls.length === 0 
                      ? "Không tìm thấy nhân viên nào phù hợp với bộ lọc"
                      : "Không có dữ liệu"
                    }
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
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
                )
              })}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  )
}
