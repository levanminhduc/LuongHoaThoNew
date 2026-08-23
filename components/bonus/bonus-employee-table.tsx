"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle, Clock, User } from "lucide-react";
import { formatCurrency } from "@/lib/utils/date-formatter";
import { findBonusDetailValue } from "@/lib/bonus/bonus-detail-format";
import type { BonusListRow } from "@/lib/bonus/bonus-types";

const MONTH_COUNT_LABELS = ["số tháng", "so thang"] as const;
const TOTAL_AMOUNT_LABELS = [
  "tổng cộng",
  "tong cong",
  "tổng tiền",
  "tong tien",
] as const;

interface BonusEmployeeTableProps {
  rows: BonusListRow[];
  onSelectRow: (row: BonusListRow) => void;
}

export function BonusEmployeeTable({
  rows,
  onSelectRow,
}: BonusEmployeeTableProps) {
  return (
    <div className="overflow-x-auto max-h-96">
      <Table className="w-full text-sm">
        <TableHeader className="bg-gray-50 sticky top-0">
          <TableRow>
            <TableHead className="text-left p-3 font-medium">Mã NV</TableHead>
            <TableHead className="text-left p-3 font-medium">Họ Tên</TableHead>
            <TableHead className="text-right p-3 font-medium">
              Số Tháng
            </TableHead>
            <TableHead className="text-right p-3 font-medium">
              Tổng Tiền
            </TableHead>
            <TableHead className="text-right p-3 font-medium">
              Thực Nhận
            </TableHead>
            <TableHead className="text-center p-3 font-medium">
              Trạng Thái
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.employee_id}
              onClick={() => onSelectRow(row)}
              className="border-b cursor-pointer hover:bg-gray-50"
            >
              <TableCell className="p-3">
                <Badge variant="outline">{row.employee_id}</Badge>
              </TableCell>
              <TableCell className="p-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">{row.full_name}</span>
                </div>
              </TableCell>
              <TableCell className="p-3 text-right">
                {findBonusDetailValue(row.detail_data, MONTH_COUNT_LABELS)}
              </TableCell>
              <TableCell className="p-3 text-right">
                {findBonusDetailValue(row.detail_data, TOTAL_AMOUNT_LABELS)}
              </TableCell>
              <TableCell className="p-3 text-right font-semibold">
                {formatCurrency(row.amount)}
              </TableCell>
              <TableCell className="p-3 text-center">
                {row.is_signed ? (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Đã ký
                  </Badge>
                ) : (
                  <Badge className="bg-yellow-100 text-yellow-800">
                    <Clock className="w-3 h-3 mr-1" />
                    Chưa ký
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
