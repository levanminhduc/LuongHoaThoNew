import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonGroupVariants = cva("inline-flex", {
  variants: {
    orientation: {
      horizontal: "flex-row",
      vertical: "flex-col",
    },
    spacing: {
      default: "",
      attached: "",
      separated: "",
    },
  },
  compoundVariants: [
    {
      orientation: "horizontal",
      spacing: "separated",
      className: "gap-2",
    },
    {
      orientation: "vertical",
      spacing: "separated",
      className: "gap-2",
    },
    {
      orientation: "horizontal",
      spacing: "attached",
      className:
        "[&>*:not(:first-child):not(:last-child)]:rounded-none [&>*:first-child]:rounded-r-none [&>*:last-child]:rounded-l-none [&>*:not(:first-child)]:-ml-px",
    },
    {
      orientation: "vertical",
      spacing: "attached",
      className:
        "[&>*:not(:first-child):not(:last-child)]:rounded-none [&>*:first-child]:rounded-b-none [&>*:last-child]:rounded-t-none [&>*:not(:first-child)]:-mt-px",
    },
  ],
  defaultVariants: {
    orientation: "horizontal",
    spacing: "attached",
  },
});

export interface ButtonGroupProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof buttonGroupVariants> {}

const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ className, orientation, spacing, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="group"
        className={cn(buttonGroupVariants({ orientation, spacing, className }))}
        {...props}
      />
    );
  },
);
ButtonGroup.displayName = "ButtonGroup";

export { ButtonGroup, buttonGroupVariants };
