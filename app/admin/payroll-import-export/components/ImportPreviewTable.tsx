"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import {
  formatCurrency,
  formatDateVietnam,
} from "@/lib/utils/payroll-formatting";
import type { ImportPreviewTableProps } from "@/lib/types/payroll-preview";

export function ImportPreviewTable({
  data,
  loading,
  error,
}: ImportPreviewTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Đang tải dữ liệu...</span>
        {data.length > 500 && (
          <div className="text-xs text-gray-400 mt-1">
            (Đang tải {data.length > 1000 ? "nhiều" : "một số"} records...)
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        <p>Lỗi: {error}</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Không có dữ liệu để hiển thị</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {data.length > 1000 && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-800 text-sm">
            <span className="font-medium">⚠️ Lưu ý:</span>
            <span>
              Đang hiển thị {data.length} records. Có thể mất vài giây để render
              hoàn toàn.
            </span>
          </div>
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">STT</TableHead>
            <TableHead>Mã NV</TableHead>
            <TableHead>Họ Tên</TableHead>
            <TableHead>Phòng Ban</TableHead>
            <TableHead>Tháng Lương</TableHead>
            <TableHead className="text-right">Lương Thực Nhận</TableHead>
            <TableHead>Trạng Thái</TableHead>
            <TableHead>Ngày Import</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((record, index) => (
            <TableRow key={record.id}>
              <TableCell className="text-center font-medium text-gray-500">
                {index + 1}
              </TableCell>
              <TableCell className="font-medium">
                {record.employee_id}
              </TableCell>
              <TableCell>{record.employees.full_name}</TableCell>
              <TableCell>{record.employees.department}</TableCell>
              <TableCell>
                <Badge variant="outline">{record.salary_month}</Badge>
              </TableCell>
              <TableCell className="text-right font-semibold">
                {formatCurrency(record.tien_luong_thuc_nhan_cuoi_ky)}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    record.import_status === "imported"
                      ? "default"
                      : "secondary"
                  }
                >
                  {record.import_status === "imported"
                    ? "Đã import"
                    : record.import_status}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-gray-600">
                {formatDateVietnam(record.created_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
        <div>
          Hiển thị{" "}
          <span className="font-medium text-gray-700">{data.length}</span>{" "}
          records
        </div>
        {data.length >= 1700 && (
          <div className="text-orange-600">
            Đã đạt giới hạn 1700 records. Xem thêm tại Dashboard.
          </div>
        )}
      </div>
    </div>
  );
}
