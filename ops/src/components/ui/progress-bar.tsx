"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const progressBarVariants = cva(
  "overflow-hidden rounded-full bg-gray-800",
  {
    variants: {
      size: {
        xs: "h-1",
        sm: "h-2",
        md: "h-3",
        lg: "h-4",
        xl: "h-6",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

const progressBarFillVariants = cva(
  "h-full rounded-full transition-all duration-300 ease-out",
  {
    variants: {
      variant: {
        primary: "bg-blue-500",
        success: "bg-green-500",
        warning: "bg-yellow-500",
        error: "bg-red-500",
        info: "bg-blue-400",
        purple: "bg-purple-500",
        pink: "bg-pink-500",
        gray: "bg-gray-500",
      },
      striped: {
        true: "bg-stripes",
      },
      animated: {
        true: "animate-pulse",
      },
    },
    defaultVariants: {
      variant: "primary",
      striped: false,
      animated: false,
    },
  }
);

export interface ProgressBarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof progressBarVariants>,
    VariantProps<typeof progressBarFillVariants> {
  value?: number; // 0-100
  showValue?: boolean;
  valuePosition?: "inside" | "outside" | "tooltip";
  label?: string;
  max?: number;
  min?: number;
  indeterminate?: boolean;
}

const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    {
      className,
      value = 0,
      showValue = false,
      valuePosition = "outside",
      label,
      max = 100,
      min = 0,
      size,
      variant,
      striped,
      animated,
      indeterminate = false,
      ...props
    },
    ref
  ) => {
    // Normalize value between min and max
    const normalizedValue = Math.min(
      Math.max(((value - min) / (max - min)) * 100, 0),
      100
    );

    const percentage = Math.round(normalizedValue);

    return (
      <div className={cn("w-full", className)} {...props} ref={ref}>
        {label && (
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-300">{label}</span>
            {showValue && valuePosition === "outside" && (
              <span className="text-sm font-medium text-gray-400">
                {indeterminate ? "—" : `${percentage}%`}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className={cn(progressBarVariants({ size }), "flex-1")}>
            <div
              className={cn(
                progressBarFillVariants({ variant, striped, animated }),
                indeterminate && "indeterminate-progress"
              )}
              style={
                indeterminate
                  ? {
                      width: "100%",
                      animation: "progress-indeterminate 1.5s ease-in-out infinite",
                    }
                  : { width: `${normalizedValue}%` }
              }
            >
              {showValue && valuePosition === "inside" && (
                <div className="flex h-full items-center justify-end px-2">
                  <span className="text-xs font-semibold text-white mix-blend-difference">
                    {indeterminate ? "—" : `${percentage}%`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {!label && showValue && valuePosition === "outside" && (
            <span className="w-12 text-right text-sm font-medium text-gray-400">
              {indeterminate ? "—" : `${percentage}%`}
            </span>
          )}
        </div>

        <style jsx>{`
          .bg-stripes {
            background-image: linear-gradient(
              45deg,
              rgba(255, 255, 255, 0.15) 25%,
              transparent 25%,
              transparent 50%,
              rgba(255, 255, 255, 0.15) 50%,
              rgba(255, 255, 255, 0.15) 75%,
              transparent 75%,
              transparent
            );
            background-size: 1rem 1rem;
          }

          @keyframes progress-indeterminate {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(200%);
            }
          }

          .indeterminate-progress {
            animation: progress-indeterminate 1.5s ease-in-out infinite;
          }
        `}</style>
      </div>
    );
  }
);

ProgressBar.displayName = "ProgressBar";

// Multi-step progress component
export interface MultiStepProgressProps {
  steps: Array<{
    id: string;
    label: string;
    status: "pending" | "active" | "completed" | "error";
    description?: string;
  }>;
  currentStep?: number;
  showConnector?: boolean;
  vertical?: boolean;
}

export function MultiStepProgress({
  steps,
  currentStep = 0,
  showConnector = true,
  vertical = false,
}: MultiStepProgressProps) {
  return (
    <div
      className={cn(
        "w-full",
        vertical ? "flex flex-col gap-2" : "grid grid-cols-4 gap-4"
      )}
    >
      {steps.map((step, index) => {
        const isCompleted = step.status === "completed";
        const isActive = step.status === "active";
        const isError = step.status === "error";

        return (
          <div
            key={step.id}
            className={cn(
              "flex items-center gap-3",
              vertical ? "flex-row" : "flex-col items-start"
            )}
          >
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
                  isCompleted && "border-green-500 bg-green-500 text-white",
                  isActive && "border-blue-500 bg-blue-500 text-white",
                  isError && "border-red-500 bg-red-500 text-white",
                  step.status === "pending" &&
                    "border-gray-600 bg-transparent text-gray-400"
                )}
              >
                {isError ? (
                  <span>!</span>
                ) : (
                  <span>{isCompleted ? "✓" : index + 1}</span>
                )}
              </div>

              <div className={cn(vertical ? "" : "text-center")}>
                <div className="font-medium text-white">{step.label}</div>
                {step.description && (
                  <div className="text-sm text-gray-400">{step.description}</div>
                )}
              </div>
            </div>

            {showConnector && index < steps.length - 1 && (
              <div
                className={cn(
                  "bg-gray-700",
                  vertical
                    ? "ml-4 h-8 w-0.5"
                    : "h-0.5 w-full flex-1 translate-y-4"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Progress bar group for multiple bars
export interface ProgressBarGroupProps {
  children: React.ReactNode;
  spacing?: "none" | "sm" | "md" | "lg";
}

export function ProgressBarGroup({
  children,
  spacing = "md",
}: ProgressBarGroupProps) {
  const spacingClass = {
    none: "gap-0",
    sm: "gap-2",
    md: "gap-4",
    lg: "gap-6",
  }[spacing];

  return <div className={cn("flex flex-col", spacingClass)}>{children}</div>;
}

export { ProgressBar, progressBarVariants, progressBarFillVariants };
