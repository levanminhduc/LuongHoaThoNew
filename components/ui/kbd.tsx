import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const kbdVariants = cva(
  "inline-flex items-center justify-center rounded border font-mono font-medium",
  {
    variants: {
      variant: {
        default: "border-border bg-muted text-muted-foreground",
        outline: "border-border bg-background text-foreground",
        ghost: "border-transparent bg-transparent text-muted-foreground",
      },
      size: {
        default: "h-5 min-w-5 px-1.5 text-xs",
        sm: "h-4 min-w-4 px-1 text-[10px]",
        lg: "h-6 min-w-6 px-2 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface KbdProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof kbdVariants> {
  keys?: string[];
}

const Kbd = React.forwardRef<HTMLElement, KbdProps>(
  ({ className, variant, size, keys, children, ...props }, ref) => {
    if (keys && keys.length > 0) {
      return (
        <span className="inline-flex items-center gap-1">
          {keys.map((key, index) => (
            <React.Fragment key={index}>
              <kbd
                ref={index === 0 ? ref : undefined}
                className={cn(kbdVariants({ variant, size, className }))}
                {...props}
              >
                {key}
              </kbd>
              {index < keys.length - 1 && (
                <span className="text-muted-foreground text-xs">+</span>
              )}
            </React.Fragment>
          ))}
        </span>
      );
    }

    return (
      <kbd
        ref={ref}
        className={cn(kbdVariants({ variant, size, className }))}
        {...props}
      >
        {children}
      </kbd>
    );
  },
);
Kbd.displayName = "Kbd";

export { Kbd, kbdVariants };
