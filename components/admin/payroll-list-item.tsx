"use client";

import { Eye, MoreVertical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface PayrollListItemProps {
  employeeId: string;
  fullName?: string;
  salaryMonth: string;
  salary: number;
  status: "signed" | "unsigned";
  batchId?: string;
  createdAt?: string;
  onView?: () => void;
  onEdit?: () => void;
  className?: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export function PayrollListItem({
  employeeId,
  fullName,
  salaryMonth,
  salary,
  status,
  batchId,
  createdAt,
  onView,
  onEdit,
  className,
}: PayrollListItemProps) {
  const isSigned = status === "signed";

  return (
    <Card
      className={cn(
        "border-l-4 transition-shadow hover:shadow-md",
        isSigned ? "border-l-green-500" : "border-l-orange-500",
        className,
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm">{employeeId}</p>
              <Badge
                variant={isSigned ? "default" : "secondary"}
                className={cn(
                  "text-[10px] shrink-0",
                  isSigned ? "bg-green-500 hover:bg-green-600" : "",
                )}
              >
                {isSigned ? "Đã ký" : "Chưa ký"}
              </Badge>
            </div>
            {fullName && (
              <p className="text-sm text-muted-foreground truncate">
                {fullName}
              </p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && (
                <DropdownMenuItem onClick={onView}>
                  <Eye className="h-4 w-4 mr-2" />
                  Xem chi tiết
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={onEdit}>Chỉnh sửa</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Separator className="my-3" />

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground text-xs mb-0.5">Tháng lương</p>
            <p className="font-medium">{salaryMonth}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs mb-0.5">
              Lương thực nhận
            </p>
            <p className="font-semibold text-primary">
              {formatCurrency(salary)}
            </p>
          </div>
          {batchId && (
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">Batch</p>
              <p className="font-mono text-xs">{batchId.slice(-8)}</p>
            </div>
          )}
          {createdAt && (
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">Ngày tạo</p>
              <p className="text-xs">
                {new Date(createdAt).toLocaleDateString("vi-VN")}
              </p>
            </div>
          )}
        </div>

        {onView && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-4"
            onClick={onView}
          >
            <Eye className="h-4 w-4 mr-2" />
            Xem Chi Tiết
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

interface PayrollListProps {
  items: PayrollListItemProps[];
  className?: string;
}

export function PayrollList({ items, className }: PayrollListProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item, index) => (
        <PayrollListItem
          key={item.employeeId + item.salaryMonth + index}
          {...item}
        />
      ))}
    </div>
  );
}
