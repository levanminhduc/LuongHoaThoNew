import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

const fieldVariants = cva("space-y-2", {
  variants: {
    size: {
      default: "",
      sm: "space-y-1",
      lg: "space-y-3",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

interface FieldContextValue {
  id: string;
  error?: boolean;
}

const FieldContext = React.createContext<FieldContextValue | undefined>(
  undefined,
);

const useField = () => {
  const context = React.useContext(FieldContext);
  if (!context) {
    throw new Error("useField must be used within a Field");
  }
  return context;
};

export interface FieldProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof fieldVariants> {
  error?: boolean;
}

const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  ({ className, size, error, children, ...props }, ref) => {
    const id = React.useId();

    return (
      <FieldContext.Provider value={{ id, error }}>
        <div
          ref={ref}
          className={cn(fieldVariants({ size, className }))}
          {...props}
        >
          {children}
        </div>
      </FieldContext.Provider>
    );
  },
);
Field.displayName = "Field";

export interface FieldLabelProps
  extends React.ComponentPropsWithoutRef<typeof Label> {
  required?: boolean;
}

const FieldLabel = React.forwardRef<
  React.ElementRef<typeof Label>,
  FieldLabelProps
>(({ className, required, children, ...props }, ref) => {
  const { id, error } = useField();

  return (
    <Label
      ref={ref}
      htmlFor={id}
      className={cn(error && "text-destructive", className)}
      {...props}
    >
      {children}
      {required && <span className="ml-1 text-destructive">*</span>}
    </Label>
  );
});
FieldLabel.displayName = "FieldLabel";

export interface FieldControlProps {
  children: React.ReactElement<Record<string, unknown>>;
}

const FieldControl = ({ children }: FieldControlProps) => {
  const { id, error } = useField();

  return React.cloneElement(children, {
    id,
    "aria-invalid": error ? "true" : undefined,
    ...(children.props as Record<string, unknown>),
  });
};
FieldControl.displayName = "FieldControl";

export type FieldDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

const FieldDescription = React.forwardRef<
  HTMLParagraphElement,
  FieldDescriptionProps
>(({ className, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
});
FieldDescription.displayName = "FieldDescription";

export type FieldErrorProps = React.HTMLAttributes<HTMLParagraphElement>;

const FieldError = React.forwardRef<HTMLParagraphElement, FieldErrorProps>(
  ({ className, children, ...props }, ref) => {
    const { error } = useField();

    if (!error || !children) {
      return null;
    }

    return (
      <p
        ref={ref}
        className={cn("text-sm font-medium text-destructive", className)}
        {...props}
      >
        {children}
      </p>
    );
  },
);
FieldError.displayName = "FieldError";

export {
  Field,
  FieldLabel,
  FieldControl,
  FieldDescription,
  FieldError,
  fieldVariants,
  useField,
};
