import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";

interface TypographyBaseProps {
  asChild?: boolean;
  className?: string;
  children?: React.ReactNode;
}

function createHeadingComponent(
  defaultElement: "h1" | "h2" | "h3" | "h4",
  defaultClassName: string,
  displayName: string,
) {
  const Component = React.forwardRef<
    HTMLHeadingElement,
    TypographyBaseProps & React.HTMLAttributes<HTMLHeadingElement>
  >(({ asChild = false, className, ...props }, ref) => {
    const Comp = asChild ? Slot : defaultElement;
    return (
      <Comp
        ref={ref as React.Ref<HTMLHeadingElement>}
        className={cn(defaultClassName, className)}
        {...props}
      />
    );
  });
  Component.displayName = displayName;
  return Component;
}

function createParagraphComponent(
  defaultClassName: string,
  displayName: string,
) {
  const Component = React.forwardRef<
    HTMLParagraphElement,
    TypographyBaseProps & React.HTMLAttributes<HTMLParagraphElement>
  >(({ asChild = false, className, ...props }, ref) => {
    const Comp = asChild ? Slot : "p";
    return (
      <Comp
        ref={ref as React.Ref<HTMLParagraphElement>}
        className={cn(defaultClassName, className)}
        {...props}
      />
    );
  });
  Component.displayName = displayName;
  return Component;
}

const H1 = createHeadingComponent(
  "h1",
  "scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl",
  "H1",
);

const H2 = createHeadingComponent(
  "h2",
  "scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0",
  "H2",
);

const H3 = createHeadingComponent(
  "h3",
  "scroll-m-20 text-2xl font-semibold tracking-tight",
  "H3",
);

const H4 = createHeadingComponent(
  "h4",
  "scroll-m-20 text-xl font-semibold tracking-tight",
  "H4",
);

const P = createParagraphComponent("leading-7 [&:not(:first-child)]:mt-6", "P");

const Lead = createParagraphComponent("text-xl text-muted-foreground", "Lead");

const Large = React.forwardRef<
  HTMLDivElement,
  TypographyBaseProps & React.HTMLAttributes<HTMLDivElement>
>(({ asChild = false, className, ...props }, ref) => {
  const Comp = asChild ? Slot : "div";
  return (
    <Comp
      ref={ref as React.Ref<HTMLDivElement>}
      className={cn("text-lg font-semibold", className)}
      {...props}
    />
  );
});
Large.displayName = "Large";

const Small = React.forwardRef<
  HTMLElement,
  TypographyBaseProps & React.HTMLAttributes<HTMLElement>
>(({ asChild = false, className, ...props }, ref) => {
  const Comp = asChild ? Slot : "small";
  return (
    <Comp
      ref={ref}
      className={cn("text-sm font-medium leading-none", className)}
      {...props}
    />
  );
});
Small.displayName = "Small";

const Muted = createParagraphComponent(
  "text-sm text-muted-foreground",
  "Muted",
);

interface InlineCodeProps
  extends React.HTMLAttributes<HTMLElement>,
    TypographyBaseProps {}

const InlineCode = React.forwardRef<HTMLElement, InlineCodeProps>(
  ({ asChild = false, className, ...props }, ref) => {
    const Comp = asChild ? Slot : "code";
    return (
      <Comp
        ref={ref}
        className={cn(
          "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold",
          className,
        )}
        {...props}
      />
    );
  },
);
InlineCode.displayName = "InlineCode";

interface BlockquoteProps
  extends React.BlockquoteHTMLAttributes<HTMLQuoteElement>,
    TypographyBaseProps {}

const Blockquote = React.forwardRef<HTMLQuoteElement, BlockquoteProps>(
  ({ asChild = false, className, ...props }, ref) => {
    const Comp = asChild ? Slot : "blockquote";
    return (
      <Comp
        ref={ref as React.Ref<HTMLQuoteElement>}
        className={cn("mt-6 border-l-2 pl-6 italic", className)}
        {...props}
      />
    );
  },
);
Blockquote.displayName = "Blockquote";

export { H1, H2, H3, H4, P, Lead, Large, Small, Muted, InlineCode, Blockquote };
