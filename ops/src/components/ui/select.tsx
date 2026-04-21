"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { ChevronDown, Loader2, AlertCircle } from "lucide-react";

const selectVariants = cva(
  "flex w-full rounded-lg border bg-transparent text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none",
  {
    variants: {
      variant: {
        default:
          "border-gray-700 bg-gray-800 text-white focus-visible:border-blue-500 focus-visible:ring-blue-500/20 focus-visible:ring-offset-gray-900 hover:border-gray-600",
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
        true: "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20 hover:border-red-400",
      },
      fullWidth: {
        true: "w-full",
        false: "w-auto",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      fullWidth: true,
    },
  }
);

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size">,
    Omit<VariantProps<typeof selectVariants>, "error" | "hasLeftIcon" | "hasRightIcon"> {
  options: SelectOption[];
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
  helperText?: string;
  errorMessage?: string;
  label?: string;
  containerClassName?: string;
  error?: boolean;
  placeholder?: string;
  placeholderDisabled?: boolean;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
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
      options,
      helperText,
      errorMessage,
      label,
      containerClassName,
      placeholder,
      placeholderDisabled = true,
      fullWidth = true,
      defaultValue,
      value,
      onChange,
      required,
      ...props
    },
    ref
  ) => {
    const hasLeftIcon = !!leftIcon || loading;
    const hasRightIcon = !!rightIcon;

    const effectiveOptions = placeholder
      ? [
          { value: "", label: placeholder, disabled: placeholderDisabled },
          ...options,
        ]
      : options;

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (onChange) {
        onChange(e);
      }
    };

    return (
      <div className={cn("w-full space-y-1.5", containerClassName)}>
        {label && (
          <label
            className={cn(
              "block text-sm font-medium",
              error || errorMessage ? "text-red-400" : "text-gray-300",
              disabled && "opacity-70"
            )}
          >
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </label>
        )}
        <div className="relative">
          {(leftIcon || loading) && (
            <div className="absolute left-3 top-1/2 z-10 flex -translate-y-1/2 items-center pointer-events-none">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              ) : (
                <span className="h-4 w-4 text-gray-400">{leftIcon}</span>
              )}
            </div>
          )}

          <select
            className={cn(
              selectVariants({
                variant,
                size,
                hasLeftIcon,
                hasRightIcon,
                error: !!error || !!errorMessage,
                fullWidth,
              }),
              "pr-10", // Extra padding for chevron
              className
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
            value={value}
            defaultValue={defaultValue}
            onChange={handleChange}
            required={required}
            {...props}
          >
            {effectiveOptions.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="bg-gray-900 text-white"
              >
                {option.label}
              </option>
            ))}
          </select>

          {/* Chevron icon (always shown) */}
          <div className="absolute right-3 top-1/2 z-10 flex -translate-y-1/2 items-center pointer-events-none">
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </div>

          {rightIcon && !loading && (
            <div className="absolute right-10 top-1/2 z-10 flex -translate-y-1/2 items-center pointer-events-none">
              <span className="h-4 w-4 text-gray-400">{rightIcon}</span>
            </div>
          )}

          {(error || errorMessage) && (
            <div className="absolute right-10 top-1/2 z-10 flex -translate-y-1/2 items-center pointer-events-none">
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
  }
);
Select.displayName = "Select";

export { Select, selectVariants };
