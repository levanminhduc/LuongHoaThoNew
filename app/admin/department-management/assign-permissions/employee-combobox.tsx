"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getRoleLabel, getRoleRank } from "@/lib/constants/role-labels";
import type { Employee } from "@/lib/hooks/use-employees";

interface EmployeeComboboxProps {
  employees: Employee[];
  value: string;
  onValueChange: (value: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function EmployeeCombobox({
  employees,
  value,
  onValueChange,
  isLoading,
  disabled,
  placeholder = "Chọn nhân viên...",
  className,
}: EmployeeComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const selected = employees.find((e) => e.employee_id === value);

  const sorted = React.useMemo(
    () =>
      [...employees].sort((a, b) => {
        const rankDiff = getRoleRank(a.chuc_vu) - getRoleRank(b.chuc_vu);
        if (rankDiff !== 0) return rankDiff;

        const deptDiff = (a.department ?? "").localeCompare(
          b.department ?? "",
          "vi",
          { numeric: true, sensitivity: "base" },
        );
        if (deptDiff !== 0) return deptDiff;

        return a.full_name.localeCompare(b.full_name, "vi", {
          sensitivity: "base",
        });
      }),
    [employees],
  );

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return sorted;

    return sorted.filter((employee) =>
      [
        employee.full_name,
        employee.employee_id,
        employee.department ?? "",
        getRoleLabel(employee.chuc_vu),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [sorted, search]);

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isLoading}
          className={cn(
            "h-auto min-h-10 w-full justify-between font-normal",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          {selected ? (
            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-medium">{selected.full_name}</span>
              <Badge variant="outline" className="text-xs">
                {getRoleLabel(selected.chuc_vu)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                ({selected.employee_id})
              </span>
              {selected.department && (
                <span className="text-xs text-blue-600">
                  {selected.department}
                </span>
              )}
            </span>
          ) : (
            placeholder
          )}
          {isLoading ? (
            <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin opacity-50" />
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Tìm theo tên, mã NV, phòng ban..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>Không tìm thấy nhân viên.</CommandEmpty>
            <CommandGroup>
              {filtered.map((employee) => (
                <CommandItem
                  key={employee.employee_id}
                  value={employee.employee_id}
                  onSelect={() => {
                    onValueChange(
                      employee.employee_id === value
                        ? ""
                        : employee.employee_id,
                    );
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      value === employee.employee_id
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                  <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-medium">{employee.full_name}</span>
                    <Badge variant="outline" className="text-xs">
                      {getRoleLabel(employee.chuc_vu)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      ({employee.employee_id})
                    </span>
                    {employee.department && (
                      <span className="text-xs text-blue-600">
                        {employee.department}
                      </span>
                    )}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
