"use client";

import { Search, Filter, Download, RefreshCw, ChevronDown } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface DataTableToolbarProps {
  title?: string;
  description?: string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  monthOptions?: { value: string; label: string }[];
  selectedMonth?: string;
  onMonthChange?: (value: string) => void;
  filterOptions?: { id: string; label: string; checked: boolean }[];
  onFilterChange?: (id: string, checked: boolean) => void;
  onExport?: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  actions?: React.ReactNode;
  className?: string;
}

export function DataTableToolbar({
  title,
  description,
  searchPlaceholder = "Tìm kiếm...",
  searchValue,
  onSearchChange,
  monthOptions,
  selectedMonth,
  onMonthChange,
  filterOptions,
  onFilterChange,
  onExport,
  onRefresh,
  isLoading,
  actions,
  className,
}: DataTableToolbarProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {title && (
              <CardTitle className="text-lg lg:text-xl">{title}</CardTitle>
            )}
            {description && (
              <CardDescription className="mt-1">{description}</CardDescription>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
          {monthOptions && onMonthChange && (
            <Combobox
              aria-label="Chọn tháng lương"
              options={monthOptions}
              value={selectedMonth}
              onValueChange={onMonthChange}
              placeholder="Chọn tháng"
              searchPlaceholder="Tìm tháng..."
              emptyText="Không tìm thấy tháng."
              className="w-full sm:w-[180px]"
            />
          )}

          {onSearchChange && (
            <div className="relative flex-1 sm:max-w-[300px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Tìm kiếm"
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto">
            {filterOptions && onFilterChange && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter data-icon="inline-start" className="h-4 w-4" />
                    Lọc
                    <ChevronDown data-icon="inline-end" className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Bộ lọc</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {filterOptions.map((option) => (
                    <DropdownMenuCheckboxItem
                      key={option.id}
                      checked={option.checked}
                      onCheckedChange={(checked) =>
                        onFilterChange(option.id, checked)
                      }
                    >
                      {option.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
              >
                <RefreshCw
                  data-icon="inline-start"
                  className={cn("h-4 w-4", isLoading && "animate-spin")}
                />
                <span className="hidden sm:inline ml-2">Làm mới</span>
              </Button>
            )}

            {onExport && (
              <Button variant="outline" size="sm" onClick={onExport}>
                <Download data-icon="inline-start" className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Export</span>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
