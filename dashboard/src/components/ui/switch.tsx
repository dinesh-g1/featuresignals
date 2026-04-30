"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

/**
 * Primer ToggleSwitch — auto-saving pattern for boolean flags.
 *
 * - Green (#1f883d) when checked (ON)
 * - Gray (#d1d9e0) when unchecked (OFF)
 * - Smooth 200ms animation
 * - No save button needed — use onChange for auto-save
 */
const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> & {
    size?: "sm" | "md";
  }
>(({ className, size = "md", ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      "peer inline-flex shrink-0 cursor-pointer items-center rounded-full transition-all duration-200",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fgColor-accent)]/40 focus-visible:ring-offset-2",
      "data-[state=checked]:bg-[#1f883d]",
      "data-[state=unchecked]:bg-[var(--borderColor-default)]",
      "disabled:cursor-not-allowed disabled:opacity-50",
      size === "sm" ? "h-5 w-9" : "h-7 w-12",
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        "pointer-events-none block rounded-full bg-white shadow-sm transition-transform duration-200",
        size === "sm"
          ? "h-3.5 w-3.5 data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0.5"
          : "h-5 w-5 data-[state=checked]:translate-x-6 data-[state=unchecked]:translate-x-1",
      )}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = "Switch";

export { Switch };
