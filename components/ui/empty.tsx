import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const emptyVariants = cva(
  "flex flex-col items-center justify-center text-center",
  {
    variants: {
      size: {
        default: "py-12 px-4",
        sm: "py-8 px-3",
        lg: "py-16 px-6",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

export interface EmptyProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof emptyVariants> {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

const Empty = React.forwardRef<HTMLDivElement, EmptyProps>(
  ({ className, size, icon, title, description, action, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(emptyVariants({ size, className }))}
        {...props}
      >
        {icon && (
          <div className="mb-4 text-muted-foreground [&_svg]:size-12">
            {icon}
          </div>
        )}
        {title && (
          <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        )}
        {description && (
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {description}
          </p>
        )}
        {action && <div className="mt-6">{action}</div>}
      </div>
    );
  },
);
Empty.displayName = "Empty";

export { Empty, emptyVariants };
