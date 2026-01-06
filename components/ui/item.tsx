import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const itemVariants = cva(
  "flex items-center gap-3 rounded-md transition-colors",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        outline: "border border-border hover:bg-accent",
        filled: "bg-muted",
      },
      size: {
        default: "p-3",
        sm: "p-2 gap-2",
        lg: "p-4 gap-4",
      },
      interactive: {
        true: "cursor-pointer",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      interactive: false,
    },
  },
);

export interface ItemProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof itemVariants> {
  asChild?: boolean;
}

const Item = React.forwardRef<HTMLDivElement, ItemProps>(
  (
    { className, variant, size, interactive, asChild = false, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : "div";
    return (
      <Comp
        ref={ref}
        className={cn(itemVariants({ variant, size, interactive, className }))}
        {...props}
      />
    );
  },
);
Item.displayName = "Item";

export type ItemIconProps = React.HTMLAttributes<HTMLDivElement>;

const ItemIcon = React.forwardRef<HTMLDivElement, ItemIconProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-5",
          className,
        )}
        {...props}
      />
    );
  },
);
ItemIcon.displayName = "ItemIcon";

export type ItemContentProps = React.HTMLAttributes<HTMLDivElement>;

const ItemContent = React.forwardRef<HTMLDivElement, ItemContentProps>(
  ({ className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("flex-1 min-w-0", className)} {...props} />
    );
  },
);
ItemContent.displayName = "ItemContent";

export type ItemTitleProps = React.HTMLAttributes<HTMLDivElement>;

const ItemTitle = React.forwardRef<HTMLDivElement, ItemTitleProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("text-sm font-medium leading-none", className)}
        {...props}
      />
    );
  },
);
ItemTitle.displayName = "ItemTitle";

export type ItemDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

const ItemDescription = React.forwardRef<
  HTMLParagraphElement,
  ItemDescriptionProps
>(({ className, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn("text-sm text-muted-foreground mt-1 truncate", className)}
      {...props}
    />
  );
});
ItemDescription.displayName = "ItemDescription";

export type ItemActionProps = React.HTMLAttributes<HTMLDivElement>;

const ItemAction = React.forwardRef<HTMLDivElement, ItemActionProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex shrink-0 items-center gap-2", className)}
        {...props}
      />
    );
  },
);
ItemAction.displayName = "ItemAction";

export {
  Item,
  ItemIcon,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemAction,
  itemVariants,
};
