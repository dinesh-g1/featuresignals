"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { cn } from "@/lib/utils";
import { Check, ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
  error?: boolean;
}

function Select({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  icon,
  disabled = false,
  className,
  size = "md",
  error,
}: SelectProps) {
  return (
    <SelectPrimitive.Root
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        className={cn(
          "group inline-flex w-full items-center justify-between gap-2 rounded-lg border bg-white text-sm font-medium shadow-sm transition-all",
          "text-stone-700",
          error
            ? "border-red-300 focus:border-red-400 focus:ring-red-200"
            : "border-stone-200 hover:border-stone-300",
          "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "data-[placeholder]:text-stone-400",
          size === "sm" && "h-8 px-2.5 text-xs",
          size === "md" && "h-9 px-3",
          size === "lg" && "h-10 px-3.5",
          className,
        )}
      >
        <span className="flex items-center gap-2 truncate">
          {icon && <span className="shrink-0 text-stone-400">{icon}</span>}
          <SelectPrimitive.Value placeholder={placeholder} />
        </span>
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="h-4 w-4 shrink-0 text-stone-400 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className={cn(
            "relative z-50 max-h-72 min-w-[8rem] overflow-hidden rounded-xl border border-stone-200/60 bg-white/95 shadow-xl shadow-stone-900/10 backdrop-blur-lg",
            "animate-scale-in",
          )}
          position="popper"
          sideOffset={4}
          align="start"
        >
          <SelectPrimitive.Viewport className="p-1">
            {options
              .filter((opt) => opt.value !== "")
              .map((opt) => (
                <SelectPrimitive.Item
                  key={opt.value}
                  value={opt.value}
                  className={cn(
                    "relative flex cursor-pointer select-none items-center rounded-lg py-2 pl-8 pr-3 text-sm text-stone-700 outline-none transition-colors",
                    "data-[highlighted]:bg-accent/10 data-[highlighted]:text-accent-dark",
                    "data-[state=checked]:font-medium",
                  )}
                >
                  <span className="absolute left-2 flex h-4 w-4 items-center justify-center">
                    <SelectPrimitive.ItemIndicator>
                      <Check
                        className="h-3.5 w-3.5 text-accent"
                        strokeWidth={2.5}
                      />
                    </SelectPrimitive.ItemIndicator>
                  </span>
                  <SelectPrimitive.ItemText>
                    {opt.label}
                  </SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

Select.displayName = "Select";

export { Select };
