"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full font-medium transition-all duration-200",
  {
    variants: {
      variant: {
        primary:
          "bg-blue-600 text-white hover:bg-blue-700",
        secondary:
          "bg-gray-700 text-gray-100 hover:bg-gray-600",
        success:
          "bg-green-600 text-white hover:bg-green-700",
        warning:
          "bg-yellow-600 text-white hover:bg-yellow-700",
        error:
          "bg-red-600 text-white hover:bg-red-700",
        outline:
          "border border-gray-600 bg-transparent text-gray-300 hover:bg-gray-800 hover:text-white",
        ghost:
          "text-gray-400 hover:bg-gray-800 hover:text-white",
        blue:
          "bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20",
        green:
          "bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20",
        yellow:
          "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/20",
        red:
          "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20",
        purple:
          "bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20",
        indigo:
          "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20",
      },
      size: {
        xs: "px-1.5 py-0.5 text-xs",
        sm: "px-2.5 py-0.5 text-xs",
        md: "px-3 py-1 text-sm",
        lg: "px-4 py-1.5 text-sm",
        xl: "px-5 py-2 text-base",
      },
      fullWidth: {
        true: "w-full",
      },
      interactive: {
        true: "cursor-pointer active:scale-[0.98]",
        false: "cursor-default",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      interactive: false,
      fullWidth: false,
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  closeable?: boolean;
  onClose?: () => void;
  asChild?: boolean;
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      interactive,
      leftIcon,
      rightIcon,
      closeable = false,
      onClose,
      children,
      asChild = false,
      ...props
    },
    ref
  ) => {
    const [isClosed, setIsClosed] = React.useState(false);

    const handleClose = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsClosed(true);
      onClose?.();
    };

    if (isClosed && closeable) {
      return null;
    }

    const badgeClasses = cn(
      badgeVariants({ variant, size, fullWidth, interactive }),
      className
    );

    if (asChild) {
      const Comp = "span";
      return (
        <Comp
          className={badgeClasses}
          ref={ref as React.Ref<HTMLSpanElement>}
          {...(props as React.HTMLAttributes<HTMLSpanElement>)}
        >
          {leftIcon && <span className="mr-1.5">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="ml-1.5">{rightIcon}</span>}
          {closeable && (
            <button
              type="button"
              onClick={handleClose}
              className="ml-1.5 -mr-0.5 h-4 w-4 rounded-full hover:bg-current/20 focus:outline-none focus:ring-1 focus:ring-current"
              aria-label="Remove badge"
            >
              ×
            </button>
          )}
        </Comp>
      );
    }

    return (
      <div className={badgeClasses} ref={ref} {...props}>
        {leftIcon && <span className="mr-1.5">{leftIcon}</span>}
        {children}
        {rightIcon && <span className="ml-1.5">{rightIcon}</span>}
        {closeable && (
          <button
            type="button"
            onClick={handleClose}
            className="ml-1.5 -mr-0.5 h-4 w-4 rounded-full hover:bg-current/20 focus:outline-none focus:ring-1 focus:ring-current"
            aria-label="Remove badge"
          >
            ×
          </button>
        )}
      </div>
    );
  }
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
