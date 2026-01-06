import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const inputGroupVariants = cva("flex items-center", {
  variants: {
    size: {
      default: "h-10",
      sm: "h-9",
      lg: "h-11",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

const inputGroupAddonVariants = cva(
  "flex items-center justify-center border bg-muted px-3 text-sm text-muted-foreground",
  {
    variants: {
      position: {
        left: "rounded-l-md border-r-0",
        right: "rounded-r-md border-l-0",
      },
      size: {
        default: "h-10",
        sm: "h-9 px-2 text-xs",
        lg: "h-11 px-4",
      },
    },
    defaultVariants: {
      position: "left",
      size: "default",
    },
  },
);

export interface InputGroupProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof inputGroupVariants> {}

const InputGroup = React.forwardRef<HTMLDivElement, InputGroupProps>(
  ({ className, size, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(inputGroupVariants({ size, className }))}
        {...props}
      />
    );
  },
);
InputGroup.displayName = "InputGroup";

export interface InputGroupAddonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof inputGroupAddonVariants> {}

const InputGroupAddon = React.forwardRef<HTMLDivElement, InputGroupAddonProps>(
  ({ className, position, size, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(inputGroupAddonVariants({ position, size, className }))}
        {...props}
      />
    );
  },
);
InputGroupAddon.displayName = "InputGroupAddon";

const inputGroupInputClassName =
  "flex h-full w-full rounded-none border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 first:rounded-l-md last:rounded-r-md [&:not(:first-child):not(:last-child)]:rounded-none";

export {
  InputGroup,
  InputGroupAddon,
  inputGroupVariants,
  inputGroupAddonVariants,
  inputGroupInputClassName,
};
