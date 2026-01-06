import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const spinnerVariants = cva("animate-spin", {
  variants: {
    size: {
      default: "size-6",
      xs: "size-3",
      sm: "size-4",
      lg: "size-8",
      xl: "size-12",
    },
    variant: {
      default: "text-primary",
      secondary: "text-secondary-foreground",
      muted: "text-muted-foreground",
      destructive: "text-destructive",
    },
  },
  defaultVariants: {
    size: "default",
    variant: "default",
  },
});

export interface SpinnerProps
  extends React.SVGAttributes<SVGSVGElement>,
    VariantProps<typeof spinnerVariants> {}

const Spinner = React.forwardRef<SVGSVGElement, SpinnerProps>(
  ({ className, size, variant, ...props }, ref) => {
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        className={cn(spinnerVariants({ size, variant, className }))}
        {...props}
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    );
  },
);
Spinner.displayName = "Spinner";

export { Spinner, spinnerVariants };
