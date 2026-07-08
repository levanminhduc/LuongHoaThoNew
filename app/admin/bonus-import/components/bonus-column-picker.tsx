"use client";

import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface BonusColumnPickerProps {
  headers: string[];
  previewRows: unknown[][];
  employeeIdColumn: string;
  amountColumn: string;
  onEmployeeIdColumnChange: (value: string) => void;
  onAmountColumnChange: (value: string) => void;
  disabled: boolean;
}

function columnRole(
  header: string,
  employeeIdColumn: string,
  amountColumn: string,
): { label: string; className: string } {
  if (header === employeeIdColumn) {
    return { label: "Mã NV", className: "bg-blue-100 text-blue-800" };
  }
  if (header === amountColumn) {
    return { label: "Số tiền", className: "bg-green-100 text-green-800" };
  }
  return {
    label: "→ lưu nguyên vào chi tiết",
    className: "bg-gray-100 text-gray-600",
  };
}

export function BonusColumnPicker({
  headers,
  previewRows,
  employeeIdColumn,
  amountColumn,
  onEmployeeIdColumnChange,
  onAmountColumnChange,
  disabled,
}: BonusColumnPickerProps) {
  const selectableHeaders = headers.filter((header) => header !== "");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="employee-id-column">Cột Mã Nhân Viên</Label>
          <Select
            value={employeeIdColumn}
            onValueChange={onEmployeeIdColumnChange}
            disabled={disabled}
          >
            <SelectTrigger id="employee-id-column">
              <SelectValue placeholder="Chọn cột Mã Nhân Viên" />
            </SelectTrigger>
            <SelectContent>
              {selectableHeaders.map((header) => (
                <SelectItem key={header} value={header}>
                  {header}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount-column">Cột Số Tiền Thưởng</Label>
          <Select
            value={amountColumn}
            onValueChange={onAmountColumnChange}
            disabled={disabled}
          >
            <SelectTrigger id="amount-column">
              <SelectValue placeholder="Chọn cột Số Tiền Thưởng" />
            </SelectTrigger>
            <SelectContent>
              {selectableHeaders.map((header) => (
                <SelectItem key={header} value={header}>
                  {header}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">
          Xem trước ({Math.min(previewRows.length, 5)} dòng đầu)
        </p>
        <div className="border rounded-lg overflow-auto max-h-[280px]">
          <Table className="text-sm">
            <TableHeader className="bg-muted">
              <TableRow>
                {headers.map((header, index) => {
                  const role = columnRole(
                    header,
                    employeeIdColumn,
                    amountColumn,
                  );
                  return (
                    <TableHead key={index} className="px-3 py-2 text-left">
                      <div className="font-medium">{header}</div>
                      <Badge className={`mt-1 font-normal ${role.className}`}>
                        {role.label}
                      </Badge>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y">
              {previewRows.slice(0, 5).map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {headers.map((_, colIndex) => (
                    <TableCell key={colIndex} className="px-3 py-2">
                      {String(row[colIndex] ?? "")}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
