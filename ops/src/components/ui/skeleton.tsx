"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const skeletonVariants = cva(
  "animate-pulse bg-gray-700",
  {
    variants: {
      variant: {
        default: "bg-gray-700",
        subtle: "bg-gray-800",
        highlight: "bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 bg-[length:200%_100%] animate-shimmer",
        pulse: "bg-gray-700 animate-pulse",
      },
      shape: {
        rectangle: "",
        circle: "rounded-full",
        text: "rounded",
        round: "rounded-lg",
        pill: "rounded-full",
      },
      size: {
        xs: "h-2",
        sm: "h-3",
        md: "h-4",
        lg: "h-6",
        xl: "h-8",
        "2xl": "h-10",
        "3xl": "h-12",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
      animation: {
        none: "",
        pulse: "animate-pulse",
        shimmer: "bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 bg-[length:200%_100%] animate-shimmer",
        fade: "animate-fade-in-out",
      },
    },
    compoundVariants: [
      {
        shape: "text",
        size: "xs",
        className: "h-3",
      },
      {
        shape: "text",
        size: "sm",
        className: "h-4",
      },
      {
        shape: "text",
        size: "md",
        className: "h-5",
      },
      {
        shape: "text",
        size: "lg",
        className: "h-6",
      },
      {
        shape: "text",
        size: "xl",
        className: "h-7",
      },
    ],
    defaultVariants: {
      variant: "default",
      shape: "rectangle",
      size: "md",
      animation: "pulse",
      fullWidth: false,
    },
  }
);

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {
  lines?: number;
  gap?: "none" | "xs" | "sm" | "md" | "lg";
  containerClassName?: string;
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      className,
      variant = "default",
      shape = "rectangle",
      size = "md",
      animation = "pulse",
      fullWidth = false,
      lines = 1,
      gap = "sm",
      containerClassName,
      children,
      ...props
    },
    ref
  ) => {
    const gapClasses = {
      none: "gap-0",
      xs: "gap-1",
      sm: "gap-2",
      md: "gap-3",
      lg: "gap-4",
    };

    if (lines > 1) {
      return (
        <div
          className={cn(
            "flex flex-col",
            gapClasses[gap],
            containerClassName
          )}
        >
          {Array.from({ length: lines }).map((_, index) => (
            <div
              key={index}
              ref={ref}
              className={cn(
                skeletonVariants({
                  variant,
                  shape,
                  size,
                  animation,
                  fullWidth,
                }),
                className
              )}
              {...props}
            />
          ))}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          skeletonVariants({
            variant,
            shape,
            size,
            animation,
            fullWidth,
          }),
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Skeleton.displayName = "Skeleton";

// ============================================================================
// Skeleton Group Component
// ============================================================================

export interface SkeletonGroupProps
  extends React.HTMLAttributes<HTMLDivElement> {
  direction?: "horizontal" | "vertical";
  gap?: "none" | "xs" | "sm" | "md" | "lg";
  wrap?: boolean;
}

const SkeletonGroup = React.forwardRef<HTMLDivElement, SkeletonGroupProps>(
  (
    {
      className,
      direction = "vertical",
      gap = "sm",
      wrap = false,
      children,
      ...props
    },
    ref
  ) => {
    const gapClasses = {
      none: "gap-0",
      xs: "gap-1",
      sm: "gap-2",
      md: "gap-3",
      lg: "gap-4",
    };

    const directionClasses = {
      horizontal: "flex-row",
      vertical: "flex-col",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "flex",
          directionClasses[direction],
          gapClasses[gap],
          wrap && "flex-wrap",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
SkeletonGroup.displayName = "SkeletonGroup";

// ============================================================================
// Specialized Skeleton Components
// ============================================================================

export interface TextSkeletonProps extends Omit<SkeletonProps, "shape" | "lines"> {
  charCount?: number;
  lines?: number;
}

const TextSkeleton = React.forwardRef<HTMLDivElement, TextSkeletonProps>(
  (
    {
      className,
      size = "md",
      charCount,
      lines = 1,
      gap = "sm",
      containerClassName,
      ...props
    },
    ref
  ) => {
    const widthClass = charCount
      ? `w-[${charCount}ch] max-w-full`
      : "";

    if (lines > 1) {
      return (
        <div
          className={cn(
            "flex flex-col",
            gap === "sm" && "gap-2",
            gap === "md" && "gap-3",
            gap === "lg" && "gap-4",
            containerClassName
          )}
        >
          {Array.from({ length: lines }).map((_, index) => (
            <div
              key={index}
              ref={ref}
              className={cn(
                skeletonVariants({
                  shape: "text",
                  size,
                  animation: "pulse",
                }),
                widthClass,
                index === lines - 1 && lines > 1 && "w-3/4", // Last line shorter
                className
              )}
              {...props}
            />
          ))}
        </div>
      );
    }

    return (
      <Skeleton
        ref={ref}
        shape="text"
        size={size}
        className={cn(widthClass, className)}
        {...props}
      />
    );
  }
);
TextSkeleton.displayName = "TextSkeleton";

export interface AvatarSkeletonProps extends Omit<SkeletonProps, "shape" | "size"> {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

const AvatarSkeleton = React.forwardRef<HTMLDivElement, AvatarSkeletonProps>(
  ({ className, size = "md", ...props }, ref) => {
    const sizeClasses = {
      xs: "h-6 w-6",
      sm: "h-8 w-8",
      md: "h-10 w-10",
      lg: "h-12 w-12",
      xl: "h-16 w-16",
    };

    return (
      <Skeleton
        ref={ref}
        shape="circle"
        className={cn(sizeClasses[size], className)}
        {...props}
      />
    );
  }
);
AvatarSkeleton.displayName = "AvatarSkeleton";

export interface CardSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  hasImage?: boolean;
  hasFooter?: boolean;
  lines?: number;
}

const CardSkeleton = React.forwardRef<HTMLDivElement, CardSkeletonProps>(
  (
    {
      className,
      hasImage = false,
      hasFooter = false,
      lines = 2,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lg border border-gray-800 bg-gray-900 p-4",
          className
        )}
        {...props}
      >
        {hasImage && (
          <Skeleton
            shape="rectangle"
            size="xl"
            fullWidth
            className="mb-4 h-32 rounded-lg"
          />
        )}
        <div className="space-y-3">
          <Skeleton shape="text" size="lg" className="w-1/2" />
          <TextSkeleton lines={lines} gap="sm" />
        </div>
        {hasFooter && (
          <div className="mt-4 flex items-center justify-between">
            <Skeleton shape="text" size="sm" className="w-16" />
            <Skeleton shape="rectangle" size="sm" className="w-20" />
          </div>
        )}
      </div>
    );
  }
);
CardSkeleton.displayName = "CardSkeleton";

// ============================================================================
// Export
// ============================================================================

export {
  Skeleton,
  SkeletonGroup,
  TextSkeleton,
  AvatarSkeleton,
  CardSkeleton,
  skeletonVariants,
};
