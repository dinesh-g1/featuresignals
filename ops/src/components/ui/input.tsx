"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";

const inputVariants = cva(
  "flex w-full rounded-lg border bg-transparent text-sm transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border-gray-700 bg-gray-800 text-white focus-visible:border-blue-500 focus-visible:ring-blue-500/20 focus-visible:ring-offset-gray-900",
        outline:
          "border-gray-600 bg-transparent text-white hover:border-gray-500 focus-visible:border-blue-500 focus-visible:ring-blue-500/20 focus-visible:ring-offset-gray-900",
        ghost:
          "border-transparent bg-gray-900/50 text-white hover:bg-gray-800/50 focus-visible:border-blue-500 focus-visible:ring-blue-500/20 focus-visible:ring-offset-gray-900",
      },
      size: {
        sm: "h-8 px-3 py-1 text-xs",
        md: "h-10 px-3 py-2",
        lg: "h-12 px-4 py-3 text-base",
      },
      hasLeftIcon: {
        true: "pl-10",
      },
      hasRightIcon: {
        true: "pr-10",
      },
      error: {
        true: "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export interface InputProps
  extends
    Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    Omit<VariantProps<typeof inputVariants>, "error"> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
  showPasswordToggle?: boolean;
  helperText?: string;
  errorMessage?: string;
  label?: string;
  containerClassName?: string;
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant,
      size,
      error,
      disabled,
      leftIcon,
      rightIcon,
      loading = false,
      showPasswordToggle = false,
      type,
      helperText,
      errorMessage,
      label,
      containerClassName,
      ...props
    },
    ref,
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const inputType =
      showPasswordToggle && type === "password" && showPassword ? "text" : type;

    const hasLeftIcon = !!leftIcon || loading;
    const hasRightIcon =
      !!rightIcon || (showPasswordToggle && type === "password");

    return (
      <div className={cn("w-full space-y-1.5", containerClassName)}>
        {label && (
          <label
            className={cn(
              "block text-sm font-medium",
              error || errorMessage ? "text-red-400" : "text-gray-300",
              disabled && "opacity-70",
            )}
          >
            {label}
          </label>
        )}
        <div className="relative">
          {(leftIcon || loading) && (
            <div className="absolute left-3 top-1/2 flex -translate-y-1/2 items-center">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              ) : (
                <span className="h-4 w-4 text-gray-400">{leftIcon}</span>
              )}
            </div>
          )}

          <input
            type={inputType}
            className={cn(
              inputVariants({
                variant,
                size,
                hasLeftIcon,
                hasRightIcon,
                error: !!error || !!errorMessage,
              }),
              className,
            )}
            ref={ref}
            disabled={disabled || loading}
            aria-invalid={!!error || !!errorMessage}
            aria-describedby={
              errorMessage
                ? `${props.id}-error`
                : helperText
                  ? `${props.id}-helper`
                  : undefined
            }
            {...props}
          />

          {(rightIcon || (showPasswordToggle && type === "password")) && (
            <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1">
              {showPasswordToggle && type === "password" && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="rounded p-1 text-gray-400 hover:bg-gray-700 hover:text-white"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              )}
              {rightIcon && !showPasswordToggle && (
                <span className="h-4 w-4 text-gray-400">{rightIcon}</span>
              )}
            </div>
          )}

          {(error || errorMessage) && (
            <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center">
              <AlertCircle className="h-4 w-4 text-red-500" />
            </div>
          )}
        </div>

        {(errorMessage || helperText) && (
          <div className="flex items-center justify-between">
            {errorMessage && (
              <p
                id={`${props.id}-error`}
                className="text-xs text-red-500"
                role="alert"
              >
                {errorMessage}
              </p>
            )}
            {helperText && !errorMessage && (
              <p id={`${props.id}-helper`} className="text-xs text-gray-500">
                {helperText}
              </p>
            )}
          </div>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input, inputVariants };
