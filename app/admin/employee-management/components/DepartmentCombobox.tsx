"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { FocusScope } from "@radix-ui/react-focus-scope";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
import { FormControl } from "@/components/ui/form";

interface DepartmentComboboxProps {
  value?: string;
  onSelect: (value: string) => void;
  departments: string[];
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
}

export function DepartmentCombobox({
  value,
  onSelect,
  departments,
  disabled,
  isLoading,
  className,
}: DepartmentComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const filteredDepartments = React.useMemo(() => {
    let result = departments;

    if (search) {
      const lowerSearch = search.toLowerCase();
      result = departments.filter((dept) =>
        dept.toLowerCase().includes(lowerSearch),
      );
    }

    return [...result].sort((a, b) =>
      a.localeCompare(b, "vi", { numeric: true }),
    );
  }, [departments, search]);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <FormControl>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between",
              !value && "text-muted-foreground",
              className,
            )}
            disabled={disabled}
          >
            {value || "Chọn phòng ban"}
            {isLoading ? (
              <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin opacity-50" />
            ) : (
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            )}
          </Button>
        </FormControl>
      </PopoverTrigger>
      <PopoverContent
        className="w-[300px] p-0"
        align="start"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
        }}
      >
        <FocusScope
          trapped={true}
          loop={true}
          onMountAutoFocus={(e) => {
            e.preventDefault();
            const input = document.querySelector(
              "[cmdk-input]",
            ) as HTMLInputElement;
            if (input) {
              input.focus();
            }
          }}
          onUnmountAutoFocus={(e) => {
            e.preventDefault();
          }}
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Tìm kiếm phòng ban..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>Không tìm thấy phòng ban.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="none_selected"
                  onSelect={() => {
                    onSelect("");
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      !value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  Không chọn
                </CommandItem>
                {filteredDepartments.map((dept) => (
                  <CommandItem
                    key={dept}
                    value={dept}
                    onSelect={() => {
                      onSelect(dept);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === dept ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {dept}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </FocusScope>
      </PopoverContent>
    </Popover>
  );
}
