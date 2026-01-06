import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

const nativeSelectVariants = cva(
  "flex w-full appearance-none rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      size: {
        default: "h-10 px-3 py-2 pr-8",
        sm: "h-9 px-2 py-1 pr-7 text-xs",
        lg: "h-11 px-4 py-3 pr-10",
      },
      variant: {
        default: "",
        ghost: "border-0 bg-transparent focus:ring-0 focus:ring-offset-0",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  },
);

export interface NativeSelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size">,
    VariantProps<typeof nativeSelectVariants> {
  wrapperClassName?: string;
}

const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, wrapperClassName, size, variant, children, ...props }, ref) => {
    return (
      <div className={cn("relative inline-flex w-full", wrapperClassName)}>
        <select
          ref={ref}
          className={cn(nativeSelectVariants({ size, variant, className }))}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className={cn(
            "pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground",
            size === "sm" ? "size-3" : size === "lg" ? "size-5" : "size-4",
          )}
        />
      </div>
    );
  },
);
NativeSelect.displayName = "NativeSelect";

export type NativeSelectOptionProps =
  React.OptionHTMLAttributes<HTMLOptionElement>;

const NativeSelectOption = React.forwardRef<
  HTMLOptionElement,
  NativeSelectOptionProps
>(({ className, ...props }, ref) => {
  return <option ref={ref} className={cn(className)} {...props} />;
});
NativeSelectOption.displayName = "NativeSelectOption";

export type NativeSelectGroupProps =
  React.OptgroupHTMLAttributes<HTMLOptGroupElement>;

const NativeSelectGroup = React.forwardRef<
  HTMLOptGroupElement,
  NativeSelectGroupProps
>(({ className, ...props }, ref) => {
  return <optgroup ref={ref} className={cn(className)} {...props} />;
});
NativeSelectGroup.displayName = "NativeSelectGroup";

export {
  NativeSelect,
  NativeSelectOption,
  NativeSelectGroup,
  nativeSelectVariants,
};
