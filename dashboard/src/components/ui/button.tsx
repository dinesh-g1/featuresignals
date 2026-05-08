import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-fg-accent)]/40 focus-visible:ring-offset-2 active:scale-[0.97] [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-[#1f883d] text-white shadow-[var(--signal-shadow-sm)] hover:bg-[#1a7431] hover:-translate-y-px",
        default:
          "bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-primary)] border border-[var(--signal-border-default)] shadow-[var(--signal-shadow-xs)] hover:bg-[#e8eaed] hover:-translate-y-px",
        secondary:
          "bg-[var(--signal-bg-primary)] text-[var(--signal-fg-secondary)] border border-[var(--signal-border-default)] shadow-[var(--signal-shadow-xs)] hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-primary)]",
        danger:
          "bg-[var(--signal-bg-danger-emphasis)] text-white shadow-[var(--signal-shadow-sm)] hover:bg-[#a40e26] hover:-translate-y-px",
        "danger-ghost":
          "text-[var(--signal-fg-danger)] hover:bg-[var(--signal-bg-danger-muted)]",
        ghost:
          "text-[var(--signal-fg-secondary)] hover:bg-[var(--signal-bg-secondary)] hover:text-[var(--signal-fg-primary)]",
        link: "text-[var(--signal-fg-accent)] underline-offset-4 hover:underline",
      },
      size: {
        xs: "h-7 px-2.5 text-[11px] gap-1.5 rounded-sm",
        sm: "h-8 px-3 text-xs",
        md: "h-9 px-4 text-sm",
        lg: "h-10 px-5 text-sm",
        xl: "h-11 px-6 text-base",
        icon: "h-9 w-9",
        "icon-sm": "h-8 w-8",
        "icon-xs": "h-7 w-7",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      asChild = false,
      loading,
      children,
      disabled,
      ...rest
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";

    // Signal UI pattern: never disabled, use aria-disabled + inactive visual state
    const isAriaDisabled = disabled || loading;

    if (asChild) {
      return (
        <Comp
          data-slot="button"
          className={cn(
            buttonVariants({ variant, size, fullWidth, className }),
            isAriaDisabled && "opacity-50 pointer-events-none",
          )}
          ref={ref}
          aria-disabled={isAriaDisabled || undefined}
          {...rest}
        >
          {children}
        </Comp>
      );
    }

    return (
      <Comp
        data-slot="button"
        className={cn(
          buttonVariants({ variant, size, fullWidth, className }),
          isAriaDisabled && "opacity-50 pointer-events-none",
        )}
        ref={ref}
        aria-disabled={isAriaDisabled || undefined}
        {...rest}
      >
        {loading && (
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
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
        )}
        {children}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
